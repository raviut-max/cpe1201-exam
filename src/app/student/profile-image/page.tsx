// src/app/student/profile-image/page.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function ProfileImagePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    initPage()
  }, [])

  const addDebug = (msg: string) => {
    console.log(msg)
    setDebugInfo((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  const initPage = async () => {
    addDebug("🔍 Initializing page...")
    
    try {
      const {  authData } = await supabase.auth.getUser()
      const user = authData?.user

      if (!user) {
        addDebug("⚠️ No user found, redirecting to login")
        router.push("/student/login")
        return
      }

      setUserId(user.id)
      addDebug(`✅ User authenticated: ${user.id}`)

      // ดึงข้อมูลโปรไฟล์
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single()

      if (profileError) {
        addDebug(`❌ Profile fetch error: ${profileError.message}`)
      } else {
        addDebug(`✅ Profile fetched: ${JSON.stringify(profile)}`)
        const path = profile?.avatar_url
        setAvatarPath(path || null)
        
        if (path) {
          // ✅ ใช้ createSignedUrl แทน getPublicUrl
          addDebug("🔗 Creating signed URL...")
          const {  signedUrl, error: urlError } = await supabase.storage
            .from("avatars")
            .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 year

          if (urlError) {
            addDebug(`❌ Signed URL error: ${urlError.message}`)
          } else {
            addDebug(`🌐 Signed URL: ${signedUrl}`)
            setAvatarUrl(signedUrl)
          }
        }
      }
    } catch (error) {
      addDebug(`❌ Init error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    addDebug("📸 Upload triggered")
    
    try {
      setUploading(true)
      const file = e.target.files?.[0]
      
      if (!file || !userId) {
        addDebug("❌ No file or user ID")
        return
      }

      addDebug(`📁 File: ${file.name} (${file.size} bytes, ${file.type})`)

      // ตรวจสอบขนาดไฟล์
      if (file.size > 2 * 1024 * 1024) {
        alert("ไฟล์ต้องมีขนาดไม่เกิน 2MB")
        return
      }

      // ตรวจสอบประเภทไฟล์
      if (!file.type.startsWith("image/")) {
        alert("กรุณาเลือกไฟล์รูปภาพ")
        return
      }

      // ลบไฟล์เก่า (ถ้ามี)
      if (avatarPath) {
        addDebug(`🗑️ Removing old file: ${avatarPath}`)
        const { error: removeError } = await supabase.storage
          .from("avatars")
          .remove([avatarPath])
        
        if (removeError) {
          addDebug(`⚠️ Remove error: ${removeError.message}`)
        } else {
          addDebug("✅ Old file removed")
        }
      }

      // สร้างชื่อไฟล์ใหม่
      const fileExt = file.name.split(".").pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      addDebug(`📝 New filename: ${fileName}`)

      // อัปโหลดไฟล์
      addDebug("📤 Uploading to Supabase Storage...")
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        })

      if (uploadError) {
        addDebug(`❌ Upload error: ${uploadError.message}`)
        throw uploadError
      }

      addDebug(`✅ Upload successful: ${JSON.stringify(uploadData)}`)

      // ✅ สร้าง Signed URL (แทน Public URL)
      addDebug("🔗 Creating signed URL...")
      const {  signedUrl, error: signedUrlError } = await supabase.storage
        .from("avatars")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365) // 1 year

      if (signedUrlError) {
        addDebug(`❌ Signed URL error: ${signedUrlError.message}`)
        throw signedUrlError
      }

      addDebug(`🌐 Signed URL: ${signedUrl}`)

      // บันทึก path ลงฐานข้อมูล
      addDebug("💾 Updating database...")
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: fileName })
        .eq("id", userId)

      if (updateError) {
        addDebug(`❌ Database update error: ${updateError.message}`)
        throw updateError
      }

      addDebug("✅ Database updated")

      // อัปเดต state
      setAvatarPath(fileName)
      setAvatarUrl(signedUrl)
      
      alert("อัปโหลดสำเร็จ!")
      addDebug("🎉 Process completed")
    } catch (error) {
      addDebug(`❌ Upload failed: ${error}`)
      alert("เกิดข้อผิดพลาด: " + error)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl p-6">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          🖼️ จัดการรูปภาพโปรไฟล์
        </h1>

        {/* แสดงรูปภาพ */}
        <div className="flex justify-center mb-6">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-40 h-40 rounded-lg object-cover border-4 border-teal-500 shadow-lg"
              onError={() => addDebug("❌ Image failed to load")}
              onLoad={() => addDebug("✅ Image loaded successfully")}
            />
          ) : (
            <div className="w-40 h-40 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-5xl font-bold border-4 border-teal-500 shadow-lg">
              ?
            </div>
          )}
        </div>

        {/* ปุ่มอัปโหลด */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 font-semibold"
          >
            {uploading ? "⏳ กำลังอัปโหลด..." : "📷 เลือกรูปภาพ"}
          </button>
          <p className="text-xs text-gray-500">รองรับไฟล์รูปภาพ ขนาดไม่เกิน 2MB</p>
        </div>

        {/* Debug Panel */}
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono max-h-64 overflow-y-auto">
          <p className="font-bold mb-2 text-white">🔧 Debug Log:</p>
          {debugInfo.map((log, i) => (
            <p key={i} className="mb-1">{log}</p>
          ))}
        </div>

        {/* ปุ่มนำทาง */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => router.push("/student/lobby")}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            🏠 กลับหน้าหลัก
          </button>
          <button
            onClick={() => {
              setDebugInfo([])
              addDebug("🔄 Debug log cleared")
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            🗑️ ล้างล็อก
          </button>
        </div>
      </div>
    </div>
  )
}