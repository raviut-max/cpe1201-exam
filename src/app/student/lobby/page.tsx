// src/app/student/lobby/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LobbyPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [status, setStatus] = useState<"upcoming" | "active" | "finished">("upcoming")
  const [loading, setLoading] = useState(true)
  const [isEnteringExam, setIsEnteringExam] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      // 1. ดึงข้อมูลผู้ใช้
      const result = await supabase.auth.getUser()
      const user = result.data?.user
      
      if (user) {
        const profileResult = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
        if (profileResult.data) setUserInfo(profileResult.data)
      }

      // 2. ดึงข้อมูลตารางสอบ
      const sessionResult = await supabase
        .from("exam_sessions")
        .select("*")
        .order("start_time", { ascending: false })
        .limit(1)
        .single()

      if (sessionResult.data) {
        setSession(sessionResult.data)
        checkStatus(sessionResult.data.start_time, sessionResult.data.end_time)
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  const checkStatus = (startTime: string, endTime: string) => {
    const now = new Date().getTime()
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()

    const timer = setInterval(() => {
      const current = new Date().getTime()
      const distanceToStart = start - current
      const distanceToEnd = end - current

      if (current < start) {
        setStatus("upcoming")
        setTimeLeft(Math.max(0, distanceToStart))
      } else if (current >= start && current <= end) {
        setStatus("active")
        setTimeLeft(Math.max(0, distanceToEnd))
      } else {
        setStatus("finished")
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }

  // ✅ ฟังก์ชันสร้าง Exam Record และเข้าหน้าสอบ
  const handleStartExam = async () => {
    if (!session || !userInfo) {
      alert("ไม่พบข้อมูลการสอบ")
      return
    }

    setIsEnteringExam(true)

    try {
      const userId = userInfo.id
      const sessionId = session.id

      console.log("🚀 Creating exam record from Lobby...")

      // 1. ตรวจสอบว่ามี record เก่าหรือไม่
      const recordsResult = await supabase
        .from("exam_records")
        .select("id, status")
        .eq("session_id", sessionId)
        .eq("user_id", userId)

      const existingRecords = recordsResult.data

      if (existingRecords && existingRecords.length > 0) {
        const record = existingRecords[0]
        
        // ถ้าเคยส่งแล้ว ห้ามเข้า
        if (record.status === 'submitted') {
          alert("⚠️ คุณได้ส่งข้อสอบของ Session นี้เรียบร้อยแล้ว")
          setIsEnteringExam(false)
          return
        }
        
        // ถ้ามี record แล้ว (ongoing) -> เข้าสอบได้เลย
        console.log("✅ Found existing record, proceeding to exam...")
      } else {
        // 2. ถ้าไม่มี record -> สร้างใหม่
        const insertResult = await supabase
          .from("exam_records")
          .insert({
            session_id: sessionId,
            user_id: userId,
            start_time: new Date().toISOString(),
            status: "ongoing"
          })
        
        if (insertResult.error) {
          throw insertResult.error
        }
        console.log("✅ Exam record created successfully")
      }

      // 3. เปลี่ยนหน้าไปทำข้อสอบ
      router.push(`/student/exam?session_id=${sessionId}`)

    } catch (error: any) {
      console.error("Error starting exam:", error)
      alert("เกิดข้อผิดพลาดในการเตรียมเข้าสอบ: " + error.message)
      setIsEnteringExam(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/student/login")
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60)
    const minutes = Math.floor((ms / (1000 * 60)) % 60)
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24)
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-200 via-teal-100 to-cyan-200">
        <div className="text-xl text-teal-700 font-semibold">กำลังโหลดข้อมูล...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-200 via-teal-100 to-cyan-200 p-4">
        <div className="text-xl text-gray-600">ไม่พบตารางสอบในขณะนี้</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-200 via-teal-100 to-cyan-200 p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full border border-teal-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-8 py-6 text-center relative">
          {/* ✅ ปุ่มเมนูขวาบน: โปรไฟล์ และ ออกจากระบบ */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button 
              onClick={() => router.push("/student/profile")}
              className="text-white/90 hover:text-white text-sm px-3 py-1 rounded-full border border-white/30 hover:bg-white/10 transition-all flex items-center gap-1"
              title="แก้ไขโปรไฟล์"
            >
              👤 โปรไฟล์
            </button>
            <button 
              onClick={handleLogout}
              className="text-white/80 hover:text-white text-sm px-3 py-1 rounded-full border border-white/30 hover:bg-white/10 transition-all"
              title="ออกจากระบบ"
            >
              ออกจากระบบ
            </button>
          </div>

          <h1 className="text-3xl font-bold text-white">ห้องรอสอบ</h1>
          <p className="text-teal-100 mt-2">{session.session_name}</p>
        </div>

        <div className="p-8 space-y-6">
          {/* ข้อมูลผู้ใช้ */}
          {userInfo && (
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* แสดงรูปโปรไฟล์ถ้ามี */}
                  {userInfo.avatar_url ? (
                    <img 
                      src={userInfo.avatar_url} 
                      alt="avatar" 
                      className="w-12 h-12 rounded-full object-cover border-2 border-teal-400"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-teal-200 flex items-center justify-center text-teal-700 font-bold text-lg">
                      {userInfo.fullname?.charAt(0) || "?"}
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-gray-600">👤 <span className="font-semibold text-teal-700">{userInfo.fullname}</span></p>
                    {userInfo.nickname && (
                      <p className="text-xs text-gray-500">ชื่อเล่น: {userInfo.nickname}</p>
                    )}
                    <p className="text-sm text-gray-600">🎓 <span className="font-semibold text-teal-700">รหัส: {userInfo.student_id}</span></p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-xs text-gray-500">อีเมล</p>
                  <p className="text-sm text-gray-700 truncate max-w-[150px]">{userInfo.email || "N/A"}</p>
                </div>
              </div>
            </div>
          )}

          {/* นับถอยหลัง */}
          <div className="text-center bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              {status === "upcoming" && "⏳ รอเวลาเริ่มสอบ"}
              {status === "active" && "✅ สามารถเริ่มทำข้อสอบได้"}
              {status === "finished" && "🏁 สิ้นสุดเวลาสอบแล้ว"}
            </h2>
            
            <div className="text-4xl font-mono font-bold text-teal-600 my-4">
              {formatTime(timeLeft)}
            </div>

            <div className="text-sm text-gray-500">
              เวลาเริ่ม: {new Date(session.start_time).toLocaleString("th-TH")} <br/>
              ระยะเวลาสอบ: {session.duration_minutes} นาที
            </div>
          </div>

          {/* ข้อควรปฏิบัติ */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
              📜 ข้อควรปฏิบัติ
            </h3>
            <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
              <li>ข้อสอบมีทั้งหมด 35 ข้อ (ทฤษฎี 70%, โค้ด 30%)</li>
              <li>ระบบจะสุ่มตัวเลือกและเรียงลำดับไม่เหมือนกันในแต่ละคน</li>
              <li>ห้ามสลับหน้าจอ หรือออกจากหน้าเว็บ (ระบบอาจบันทึกการออก)</li>
              <li>เวลาหมด ระบบจะส่งคำตอบอัตโนมัติ</li>
            </ul>
          </div>

          {/* ปุ่มเริ่มสอบ */}
          <div className="pt-4">
            {status === "active" ? (
              <button
                onClick={handleStartExam}
                disabled={isEnteringExam}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold py-4 rounded-xl hover:from-teal-600 hover:to-cyan-700 shadow-lg transform hover:scale-[1.02] transition-all duration-200 text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isEnteringExam ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังเตรียมข้อมูล...
                  </span>
                ) : (
                  "🚀 เริ่มทำข้อสอบทันที"
                )}
              </button>
            ) : (
              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 font-bold py-4 rounded-xl cursor-not-allowed"
              >
                {status === "upcoming" ? "🔒 รอเวลาเริ่มสอบ..." : "⛔ การสอบสิ้นสุดแล้ว"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}