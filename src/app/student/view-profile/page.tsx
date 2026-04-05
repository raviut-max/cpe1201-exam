// src/app/student/view-profile/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function ViewProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [fullname, setFullname] = useState("")
  const [nickname, setNickname] = useState("")
  const [studentId, setStudentId] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const result = await supabase.auth.getUser()
      const user = result.data?.user

      if (!user) {
        router.push("/student/login")
        return
      }

      setEmail(user.email || "")

      const profileResult = await supabase
        .from("profiles")
        .select("fullname, nickname, student_id, avatar_url")
        .eq("id", user.id)
        .single()

      if (profileResult.data) {
        setFullname(profileResult.data.fullname || "")
        setNickname(profileResult.data.nickname || "")
        setStudentId(profileResult.data.student_id || "")
        setAvatarUrl(profileResult.data.avatar_url)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-200 via-teal-100 to-cyan-200">
        <div className="text-xl text-gray-700">กำลังโหลด...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-teal-100 to-cyan-200 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-center text-teal-600 mb-8">
          👤 ข้อมูลโปรไฟล์
        </h1>

        {/* รูปโปรไฟล์ */}
        <div className="flex justify-center mb-8">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-40 h-40 rounded-full object-cover border-4 border-teal-500 shadow-xl"
            />
          ) : (
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-6xl font-bold border-4 border-teal-500 shadow-xl">
              {fullname.charAt(0).toUpperCase() || "?"}
            </div>
          )}
        </div>

        {/* ข้อมูลส่วนตัว */}
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              รหัสนักศึกษา
            </label>
            <p className="text-lg font-semibold text-gray-800">{studentId}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              อีเมล
            </label>
            <p className="text-lg font-semibold text-gray-800">{email}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              ชื่อ-นามสกุล
            </label>
            <p className="text-lg font-semibold text-gray-800">{fullname}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              ชื่อเล่น
            </label>
            <p className="text-lg font-semibold text-gray-800">
              {nickname || "-"}
            </p>
          </div>
        </div>

        {/* ปุ่มนำทาง */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => router.push("/student/profile")}
            className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold py-3 rounded-lg hover:from-teal-600 hover:to-cyan-700 shadow-lg transform hover:scale-[1.02] transition-all"
          >
            ✏️ แก้ไขโปรไฟล์
          </button>
          
          <button
            onClick={() => router.push("/student/lobby")}
            className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-300 transition-all"
          >
            🏠 กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  )
}