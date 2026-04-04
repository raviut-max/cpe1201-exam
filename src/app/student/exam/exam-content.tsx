// src/app/student/exam/exam-content.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Choice = { id: string; choice_text: string; is_correct: boolean }
type Question = { id: string; type: string; question_text: string; code_snippet: string | null; choices: Choice[] }

export default function ExamContent() {
  const router = useRouter()
  const searchParams = useSearchParams() // ✅ ใช้ในไฟล์นี้ (จะถูกรัดด้วย Suspense จากไฟล์อื่น)
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [recordId, setRecordId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    initializeExam()
  }, [])

  const initializeExam = async () => {
    try {
      const result = await supabase.auth.getUser()
      const user = result.data?.user
      if (!user) { router.push("/student/login"); return }
      setUserId(user.id)

      // ดึง Session (จาก URL หรือล่าสุด)
      let sessionData = null
      const sessionIdFromUrl = searchParams.get('session_id')
      
      if (sessionIdFromUrl) {
        const sessionResult = await supabase.from("exam_sessions").select("*").eq("id", sessionIdFromUrl).single()
        sessionData = sessionResult.data
      }
      if (!sessionData) {
        const sessionResult = await supabase.from("exam_sessions").select("*").order("start_time", { ascending: false }).limit(1).single()
        sessionData = sessionResult.data
      }
      if (!sessionData) { alert("ไม่พบตารางสอบ"); router.push("/student/lobby"); return }
      setSession(sessionData)

      // ตรวจสอบเวลา
      const now = new Date().getTime()
      const start = new Date(sessionData.start_time).getTime()
      const end = new Date(sessionData.end_time).getTime()
      if (now < start) { alert("การสอบยังไม่เริ่ม"); router.push("/student/lobby"); return }
      if (now > end) { alert("การสอบสิ้นสุดเวลาแล้ว"); router.push("/student/lobby"); return }

      // สร้าง/อัปเดต Exam Record
      const recordResult = await supabase.from("exam_records").upsert({
        session_id: sessionData.id, user_id: user.id, start_time: new Date().toISOString(), status: "ongoing"
      }, { onConflict: 'session_id, user_id', ignoreDuplicates: false }).select("id, status").single()

      if (recordResult.error) throw recordResult.error
      const currentRecordId = recordResult.data?.id
      setRecordId(currentRecordId)

      if (recordResult.data?.status === 'submitted') {
        alert("⚠️ คุณได้ส่งข้อสอบนี้เรียบร้อยแล้ว")
        router.push("/student/lobby")
        return
      }

      // ดึงคำตอบเก่า (Resume)
      if (recordResult.data?.status === 'ongoing') {
        const answersResult = await supabase.from("exam_answers").select("question_id, selected_choice_id").eq("record_id", currentRecordId)
        if (answersResult.data && answersResult.data.length > 0) {
          const answerMap: Record<string, string> = {}
          answersResult.data.forEach((a: any) => { answerMap[a.question_id] = a.selected_choice_id })
          setAnswers(answerMap)
        }
      }

      const remaining = Math.max(0, end - now)
      setTimeLeft(remaining)
      await fetchAndShuffleQuestions()
      setLoading(false)
    } catch (error) {
      console.error("Error initializing:", error)
      alert("เกิดข้อผิดพลาดในการโหลดข้อสอบ")
      router.push("/student/lobby")
    }
  }

  const fetchAndShuffleQuestions = async () => {
    try {
      const codeResult = await supabase.from("questions").select("*").eq("type", "code").limit(18)
      const theoryResult = await supabase.from("questions").select("*").eq("type", "theory").limit(12)
      const allQuestions = [...(codeResult.data || []), ...(theoryResult.data || [])]
      if (allQuestions.length === 0) { alert("ไม่พบข้อสอบในระบบ"); router.push("/student/lobby"); return }

      const shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5)
      const finalQuestions: Question[] = []

      for (const q of shuffledQuestions) {
        const choicesResult = await supabase.from("choices").select("*").eq("question_id", q.id)
        if (choicesResult.data && choicesResult.data.length > 0) {
          const correct = choicesResult.data.filter((c: Choice) => c.is_correct)
          const wrong = choicesResult.data.filter((c: Choice) => !c.is_correct).sort(() => Math.random() - 0.5).slice(0, 3)
          finalQuestions.push({ ...q, choices: [...correct, ...wrong].sort(() => Math.random() - 0.5) })
        }
      }
      setQuestions(finalQuestions)
    } catch (error) { console.error("Error fetching questions:", error) }
  }

  useEffect(() => {
    if (timeLeft <= 0 && !loading && !submitting) { submitExam(); return }
    const timer = setInterval(() => setTimeLeft((prev) => Math.max(0, prev - 1000)), 1000)
    return () => clearInterval(timer)
  }, [timeLeft, loading, submitting])

  const handleSelect = (questionId: string, choiceId: string) => setAnswers((prev) => ({ ...prev, [questionId]: choiceId }))

  const submitExam = async () => {
    if (submitting || !recordId || !userId) return
    if (timeLeft > 0 && !confirm("คุณแน่ใจหรือไม่ว่าต้องการส่งข้อสอบ?")) return
    setSubmitting(true)
    try {
      const answersToInsert = Object.entries(answers).map(([questionId, choiceId]) => ({
        record_id: recordId, question_id: questionId, selected_choice_id: choiceId, is_correct: false
      }))
      if (answersToInsert.length > 0) {
        await supabase.from("exam_answers").delete().eq("record_id", recordId)
        await supabase.from("exam_answers").insert(answersToInsert)
      }
      await supabase.from("exam_records").update({ end_time: new Date().toISOString(), status: "submitted" }).eq("id", recordId)
      router.push("/student/exam-result")
    } catch (error) { console.error("Submit error:", error); alert("เกิดข้อผิดพลาดในการส่งข้อสอบ") }
    finally { setSubmitting(false) }
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) { setCurrentIndex(index); window.scrollTo({ top: 0, behavior: "smooth" }) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-lg text-gray-600">กำลังโหลดข้อสอบ...</p></div>
  if (questions.length === 0) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-lg text-red-600">ไม่พบข้อสอบ</p></div>

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white shadow-md z-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-lg font-bold text-gray-800">ข้อสอบ CPE1201</h1>
            <div className={`text-2xl font-mono font-bold px-4 py-1 rounded-lg ${timeLeft < 300000 ? "bg-red-100 text-red-600 animate-pulse" : "bg-teal-100 text-teal-700"}`}>⏱️ {formatTime(timeLeft)}</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-gradient-to-r from-teal-500 to-cyan-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div></div>
          <p className="text-xs text-gray-600 mt-1 text-center">ข้อที่ {currentIndex + 1} จาก {questions.length} ข้อ</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto mt-6 px-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {currentQuestion?.code_snippet && <div className="bg-gray-900 p-6 overflow-x-auto"><pre className="text-green-400 font-mono text-sm whitespace-pre leading-relaxed">{currentQuestion.code_snippet}</pre></div>}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 leading-relaxed">{currentQuestion?.question_text}</h2>
            <div className="space-y-3">
              {currentQuestion?.choices.map((choice, index) => {
                const isSelected = answers[currentQuestion.id] === choice.id
                const letters = ["A", "B", "C", "D"]
                return (
                  <label key={choice.id} className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? "border-teal-500 bg-teal-50" : "border-gray-200 hover:bg-gray-50"}`}>
                    <input type="radio" name={`q-${currentQuestion.id}`} value={choice.id} checked={isSelected} onChange={() => handleSelect(currentQuestion.id, choice.id)} className="w-5 h-5 mt-0.5" />
                    <div className="ml-3 flex-1"><span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-700 font-semibold text-sm mr-3">{letters[index]}</span><span className="text-gray-800 whitespace-pre-wrap">{choice.choice_text}</span></div>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-6 gap-4">
          <button onClick={() => goToQuestion(currentIndex - 1)} disabled={currentIndex === 0} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed">← ข้อก่อนหน้า</button>
          <div className="hidden md:flex gap-2 flex-wrap justify-center max-w-md">
            {questions.map((_, idx) => (<button key={idx} onClick={() => goToQuestion(idx)} className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all ${idx === currentIndex ? "bg-teal-600 text-white" : answers[questions[idx].id] ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"}`}>{idx + 1}</button>))}
          </div>
          {currentIndex === questions.length - 1 ? (<button onClick={submitExam} disabled={submitting} className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 shadow-lg disabled:opacity-50">{submitting ? "กำลังส่ง..." : "✓ ส่งข้อสอบ"}</button>) : (<button onClick={() => goToQuestion(currentIndex + 1)} className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-700 shadow-lg">ข้อถัดไป →</button>)}
        </div>
      </div>
    </div>
  )
}