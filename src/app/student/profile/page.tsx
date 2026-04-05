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
    console.log("🔍 [DEBUG] Fetching profile...")
    try {
      const result = await supabase.auth.getUser()
      console.log("📥 [DEBUG] getUser result:", result)
      
      const user = result.data?.user
      console.log("👤 [DEBUG] User:", user)

      if (!user) {
        console.log("⚠️ [DEBUG] No user found, redirecting to login")
        router.push("/student/login")
        return
      }

      setUserId(user.id)
      setEmail(user.email || "")

      console.log("📊 [DEBUG] Fetching profile from database...")
      const profileResult = await supabase
        .from("profiles")
        .select("fullname, nickname, student_id, avatar_url")
        .eq("id", user.id)
        .single()

      console.log("📤 [DEBUG] Profile result:", profileResult)

      if (profileResult.data) {
        setFullname(profileResult.data.fullname || "")
        setNickname(profileResult.data.nickname || "")
        setStudentId(profileResult.data.student_id || "")
        
        const avatarPath = profileResult.data.avatar_url
        console.log("🖼️ [DEBUG] Avatar path from DB:", avatarPath)
        
        if (avatarPath) {
          setAvatarUrl(avatarPath)
          
          // สร้าง Public URL
          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(avatarPath)
          
          console.log("🔗 [DEBUG] Public URL data:", urlData)
          console.log("🌐 [DEBUG] Public URL:", urlData?.publicUrl)
        }
      }
    } catch (error) {
      console.error("❌ [DEBUG] Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("📸 [DEBUG] handleImageUpload triggered")
    
    try {
      setUploading(true)
      console.log("⏳ [DEBUG] Set uploading to true")
      
      const file = e.target.files?.[0]
      console.log("📁 [DEBUG] Selected file:", file)
      console.log("📁 [DEBUG] File name:", file?.name)
      console.log("📁 [DEBUG] File size:", file?.size)
      console.log("📁 [DEBUG] File type:", file?.type)
      
      if (!file) {
        console.log("❌ [DEBUG] No file selected")
        alert("ไม่พบไฟล์ที่เลือก")
        return
      }
      
      if (!userId) {
        console.log("❌ [DEBUG] No user ID")
        alert("ไม่พบข้อมูลผู้ใช้")
        return
      }

      // ตรวจสอบขนาดไฟล์
      if (file.size > 2 * 1024 * 1024) {
        console.log("❌ [DEBUG] File too large:", file.size)
        alert("ไฟล์รูปภาพต้องมีขนาดไม่เกิน 2MB")
        return
      }
      console.log("✅ [DEBUG] File size OK")

      // ตรวจสอบประเภทไฟล์
      if (!file.type.startsWith("image/")) {
        console.log("❌ [DEBUG] Invalid file type:", file.type)
        alert("กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น")
        return
      }
      console.log("✅ [DEBUG] File type OK")

      // ลบไฟล์เก่าออก (ถ้ามี)
      if (avatarUrl) {
        console.log("🗑️ [DEBUG] Removing old file:", avatarUrl)
        const { error: removeError } = await supabase.storage
          .from("avatars")
          .remove([avatarUrl])
        
        if (removeError) {
          console.log("⚠️ [DEBUG] Error removing old file:", removeError)
        } else {
          console.log("✅ [DEBUG] Old file removed successfully")
        }
      }

      // สร้างชื่อไฟล์ใหม่
      const fileExt = file.name.split(".").pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      console.log("📝 [DEBUG] Generated file name:", fileName)

      // อัปโหลดไฟล์
      console.log("📤 [DEBUG] Starting upload to bucket 'avatars'...")
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        })

      console.log("📥 [DEBUG] Upload response:", { uploadData, uploadError })

      if (uploadError) {
        console.error("❌ [DEBUG] Upload error:", uploadError)
        throw uploadError
      }

      console.log("✅ [DEBUG] Upload successful!")

      // สร้าง Public URL
      console.log("🔗 [DEBUG] Getting public URL...")
      const { data: urlData, error: urlError } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName)

      console.log("📥 [DEBUG] Public URL response:", { urlData, urlError })

      if (urlError) {
        console.error("❌ [DEBUG] URL error:", urlError)
        throw urlError
      }

      const publicUrl = urlData?.publicUrl
      console.log("🌐 [DEBUG] Public URL:", publicUrl)

      if (!publicUrl) {
        console.error("❌ [DEBUG] No public URL returned")
        throw new Error("Failed to get public URL")
      }

      // บันทึก path ลงฐานข้อมูล
      console.log("💾 [DEBUG] Saving to database...")
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: fileName })
        .eq("id", userId)

      console.log("📥 [DEBUG] Database update response:", { updateError })

      if (updateError) {
        console.error("❌ [DEBUG] Database update error:", updateError)
        throw updateError
      }

      console.log("✅ [DEBUG] Database updated successfully")

      setAvatarUrl(fileName)
      console.log("✅ [DEBUG] Avatar URL state updated")

      alert("อัปโหลดรูปโปรไฟล์สำเร็จ!")
      console.log("🎉 [DEBUG] Upload process completed successfully")
    } catch (error) {
      console.error("❌ [DEBUG] Error in handleImageUpload:", error)
      alert("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: " + error)
    } finally {
      setUploading(false)
      console.log("⏹️ [DEBUG] Set uploading to false")
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
          {/* รูปโปรไฟล์ */}
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              {avatarUrl ? (
                <img
                  src={supabase.storage.from("avatars").getPublicUrl(avatarUrl).data?.publicUrl}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-teal-500 shadow-lg"
                  onError={(e) => {
                    console.error("❌ [DEBUG] Failed to load image")
                    e.currentTarget.src = ""
                  }}
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

          {/* ข้อมูลที่ไม่สามารถแก้ไขได้ */}
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

          {/* ข้อมูลที่แก้ไขได้ */}
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

          {/* ปุ่มบันทึก */}
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