// src/app/student/register/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function RegisterPage() {
  const [studentId, setStudentId] = useState("")
  const [fullname, setFullname] = useState("")
  const [nickname, setNickname] = useState("") // ✅ เพิ่ม state สำหรับชื่อเล่น
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage({ type: "", text: "" })

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "รหัสผ่านไม่ตรงกัน" })
      return
    }

    if (password.length < 6) {
      setMessage({ type: "error", text: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" })
      return
    }

    setLoading(true)

    // 1. สมัครสมาชิกใน Supabase Auth
    const { error: authError, data } = await supabase.auth.signUp({ 
      email, 
      password,
    })

    if (authError) {
      setMessage({ type: "error", text: "เกิดข้อผิดพลาด: " + authError.message })
      setLoading(false)
      return
    }

    if (data.user) {
      // 2. บันทึกรหัสนักศึกษา + ชื่อ + ชื่อเล่น + Email ลงตาราง profiles
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        student_id: studentId,
        fullname,
        nickname, // ✅ เพิ่มชื่อเล่น
        email,
        role: "student"
      })

      if (profileError) {
        setMessage({ type: "error", text: "บันทึกข้อมูลไม่สำเร็จ: " + profileError.message })
        setLoading(false)
      } else {
        setMessage({ type: "success", text: "ลงทะเบียนสำเร็จ! กำลังไปยังหน้าเข้าสู่ระบบ..." })
        setTimeout(() => {
          router.push("/student/login")
        }, 800)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-200 via-teal-100 to-cyan-200 p-4">
      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-8 py-6 text-center">
            <div className="mb-3">
              <svg className="w-16 h-16 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">ลงทะเบียนนักศึกษา</h1>
            <p className="text-teal-100 text-sm mt-1">วิชา CPE1201 การโปรแกรมเชิงวัตถุ</p>
          </div>

          <form onSubmit={handleRegister} className="p-8 space-y-5">
            {message.text && (
              <div className={`p-3 rounded-lg text-sm text-center font-medium ${
                message.type === "error" ? "bg-red-50 text-red-600 border border-red-200" : "bg-green-50 text-green-600 border border-green-200"
              }`}>
                {message.text}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">รหัสนักศึกษา</label>
              <input 
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-gray-50 focus:bg-white"
                placeholder="ตัวอย่าง: 6412345"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อ-นามสกุล</label>
              <input 
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-gray-50 focus:bg-white"
                placeholder="ตัวอย่าง: สมชาย ใจดี"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                required 
              />
            </div>

            {/* ✅ เพิ่มช่องชื่อเล่น */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อเล่น</label>
              <input 
                type="text"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-gray-50 focus:bg-white"
                placeholder="ตัวอย่าง: ชาย (ถ้ามี)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input 
                type="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-gray-50 focus:bg-white"
                placeholder="student@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">รหัสผ่าน</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-gray-50 focus:bg-white pr-12"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ยืนยันรหัสผ่าน</label>
              <input 
                type={showPassword ? "text" : "password"}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-gray-50 focus:bg-white"
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-teal-600 hover:to-cyan-700 shadow-lg transform hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {loading ? "กำลังลงทะเบียน..." : "สมัครสมาชิก"}
            </button>

            <p className="text-center text-sm text-gray-600">
              มีบัญชีอยู่แล้ว?{" "}
              <a href="/student/login" className="text-teal-600 hover:underline">เข้าสู่ระบบที่นี่</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}