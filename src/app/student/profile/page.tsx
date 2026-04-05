// src/app/student/profile/page.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [fullname, setFullname] = useState("")
  const [nickname, setNickname] = useState("")
  const [studentId, setStudentId] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

      setUserId(user.id)
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = e.target.files?.[0]
      if (!file || !userId) return

      if (file.size > 2 * 1024 * 1024) {
        alert("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 2MB")
        return
      }

      if (!file.type.startsWith('image/')) {
        alert("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น")
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      //const publicUrlResult = supabase.storage.from('avatars').getPublicUrl(filePath)
      //const publicUrl = publicUrlResult.data?.publicUrl

      //if (!publicUrl) throw new Error("Failed to get public URL")

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: filePath })
        .eq("id", userId)

      if (updateError) throw updateError

      setAvatarUrl(filePath)
      alert("อัปโหลดรูปโปรไฟล์สำเร็จ!")
    } catch (error) {
      console.error("Error uploading image:", error)
      alert("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ")
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          fullname,
          nickname,
        })
        .eq("id", userId)

      if (error) throw error

      alert("บันทึกข้อมูลสำเร็จ!")
    } catch (error) {
      console.error("Error saving profile:", error)
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล")
    } finally {
      setSaving(false)
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
          📝 แก้ไขโปรไฟล์
        </h1>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-teal-500 shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-teal-500 shadow-lg">
                  {fullname.charAt(0) || "?"}
                </div>
              )}
              
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
            >
              {uploading ? "กำลังอัปโหลด..." : "📷 เปลี่ยนรูปโปรไฟล์"}
            </button>
            <p className="text-xs text-gray-500 mt-2">ขนาดไฟล์ไม่เกิน 2MB</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รหัสนักศึกษา
            </label>
            <input
              type="text"
              value={studentId}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              อีเมล
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อ-นามสกุล <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              placeholder="กรอกชื่อ-นามสกุล"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ชื่อเล่น
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              placeholder="กรอกชื่อเล่น (ถ้ามี)"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold py-3 rounded-lg hover:from-teal-600 hover:to-cyan-700 shadow-lg transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "กำลังบันทึก..." : "💾 บันทึกการเปลี่ยนแปลง"}
            </button>
          
            <button
              type="button"
              onClick={() => router.push("/student/lobby")}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}