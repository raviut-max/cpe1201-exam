// src/app/student/check-score/page.tsx
"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function CheckScorePage() {
  const router = useRouter()
  const [studentId, setStudentId] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState("")
  const [studentInfo, setStudentInfo] = useState<any>(null)

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResults([])
    setStudentInfo(null)

    try {
      // 1. ค้นหา User จาก Student ID
      const profileResult = await supabase
        .from("profiles")
        .select("id, fullname, nickname")
        .eq("student_id", studentId)
        .single()

      const profile = profileResult.data
      const profileError = profileResult.error

      if (profileError || !profile) {
        setError("❌ ไม่พบรหัสนักศึกษานี้ในระบบ")
        setLoading(false)
        return
      }

      setStudentInfo(profile)

      // 2. ค้นหาประวัติการสอบที่ส่งแล้ว
      const recordsResult = await supabase
        .from("exam_records")
        .select(`
          id,
          end_time,
          exam_sessions (
            session_name
          )
        `)
        .eq("user_id", profile.id)
        .eq("status", "submitted")
        .order("end_time", { ascending: false })

      const records = recordsResult.data
      const recordsError = recordsResult.error

      if (recordsError || !records || records.length === 0) {
        setError("📝 ยังไม่พบประวัติการส่งข้อสอบของรหัสนี้")
        setLoading(false)
        return
      }

      // 3. คำนวณคะแนนแต่ละรอบสอบ
      const calculatedResults = []
      
      for (const record of records) {
        // ดึงคำตอบทั้งหมดของผู้สอบคนนี้ในรอบนั้น
        const answersResult = await supabase
          .from("exam_answers")
          .select("selected_choice_id")
          .eq("record_id", record.id)

        const answers = answersResult.data

        if (!answers || answers.length === 0) continue

        // ดึงข้อมูลตัวเลือกที่ถูก/ผิด มาเช็คทีเดียว
        const choiceIds = [...new Set(answers.map((a: any) => a.selected_choice_id))]
        const choicesResult = await supabase
          .from("choices")
          .select("id, is_correct")
          .in("id", choiceIds)

        const choices = choicesResult.data

        let correctCount = 0
        if (choices) {
          const choiceMap = new Map(choices.map((c: any) => [c.id, c.is_correct]))
          
          answers.forEach((ans: any) => {
            if (choiceMap.get(ans.selected_choice_id)) {
              correctCount++
            }
          })
        }

        const totalQuestions = answers.length
        const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0

        calculatedResults.push({
          // ✅ แก้ไขตรงนี้: exam_sessions เป็น Array ต้องเข้าถึง [0] ก่อน
          sessionName: (record.exam_sessions as any[])?.[0]?.session_name || "การสอบ",
          date: new Date(record.end_time).toLocaleString("th-TH"),
          score: score.toFixed(1),
          correct: correctCount,
          total: totalQuestions
        })
      }

      setResults(calculatedResults)
    } catch (err) {
      console.error(err)
      setError("⚠️ เกิดข้อผิดพลาดในการดึงข้อมูล")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-teal-100 to-cyan-200 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 text-teal-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">ตรวจสอบคะแนนสอบ</h1>
          <p className="text-gray-500 text-sm mt-1">กรอกรหัสนักศึกษาเพื่อดูผลสอบ</p>
        </div>

        <form onSubmit={handleCheck} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสนักศึกษา</label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              placeholder="เช่น 123456"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold py-3 rounded-lg hover:from-teal-600 hover:to-cyan-700 shadow-lg transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                กำลังตรวจสอบ...
              </span>
            ) : (
              "🔍 ค้นหาผลสอบ"
            )}
          </button>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        )}

        {studentInfo && results.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600">ผลการค้นหาสำหรับ</p>
              <p className="text-lg font-bold text-gray-800">{studentInfo.fullname}</p>
              {studentInfo.nickname && (
                <p className="text-sm text-teal-600">ชื่อเล่น: {studentInfo.nickname}</p>
              )}
            </div>

            <div className="space-y-3">
              {results.map((res: any, idx: number) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-700 text-sm">{res.sessionName}</span>
                    <span className="text-xs text-gray-500">{res.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">ตอบถูก {res.correct}/{res.total} ข้อ</span>
                    <span className={`text-xl font-bold ${parseFloat(res.score) >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {res.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-6 text-center">
           <button onClick={() => router.push('/student/login')} className="text-sm text-teal-600 hover:underline">
             ← กลับหน้าเข้าสู่ระบบ
           </button>
        </div>
      </div>
    </div>
  )
}