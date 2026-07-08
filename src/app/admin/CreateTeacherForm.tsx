'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTeacher } from '@/lib/admin-actions'

export default function CreateTeacherForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    setSuccess('')
    const result = await createTeacher(formData)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(`Account created for ${formData.get('name')}`)
      ;(document.getElementById('create-teacher-form') as HTMLFormElement)?.reset()
      router.refresh()
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Create Teacher Account</h2>
      <form id="create-teacher-form" action={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
            <input
              name="name"
              type="text"
              placeholder="e.g. Ms Sarah Tan"
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              name="email"
              type="email"
              placeholder="sarah@school.edu"
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Temporary Password</label>
          <input
            name="password"
            type="text"
            placeholder="They can change this later"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600 font-medium">{success}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-orange text-white rounded-lg py-2 font-semibold hover:bg-orange-dark transition disabled:opacity-50 mt-1"
        >
          {loading ? 'Creating…' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}
