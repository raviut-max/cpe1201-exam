// src/app/student/exam/page.tsx
import { Suspense } from "react"
import ExamContent from "./exam-content"

export default function ExamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-teal-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">กำลังเตรียมข้อสอบ...</p>
        </div>
      </div>
    }>
      <ExamContent />
    </Suspense>
  )
}