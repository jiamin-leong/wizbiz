'use client'

import { createCompetition } from '@/lib/teacher-actions'
import { useState } from 'react'
import Link from 'next/link'

export default function NewCompetitionPage() {
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setSubmitting(true)
    await createCompetition(formData)
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/teacher" className="text-sm text-gray-400 hover:underline">← Back</Link>
      </div>
        <div className="bg-white rounded-2xl shadow-md p-8">
          <h1 className="text-2xl font-bold text-orange mb-6">New Competition</h1>
          <form action={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Competition Name</label>
              <input
                name="name"
                type="text"
                placeholder="e.g. Term 2 Market Day"
                required
                className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 mb-1">Start Date</label>
                <input
                  name="startDate"
                  type="date"
                  required
                  className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 mb-1">End Date</label>
                <input
                  name="endDate"
                  type="date"
                  required
                  className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Starting Balance per Group (WizCoins)</label>
              <input
                name="initialBalance"
                type="number"
                placeholder="e.g. 1000"
                min="1"
                required
                className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 mb-1">Number of Groups</label>
                <input
                  name="numGroups"
                  type="number"
                  placeholder="e.g. 4"
                  min="2"
                  max="20"
                  required
                  className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 mb-1">Students per Group</label>
                <input
                  name="studentsPerGroup"
                  type="number"
                  placeholder="e.g. 5"
                  min="1"
                  max="20"
                  required
                  className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </div>
            </div>
            <div className="bg-paper-2 border border-ink/15 rounded-lg px-4 py-3 text-sm text-orange-dark">
              Each group will be automatically assigned a unique password (e.g. <span className="font-pixel text-xs">BLAZE-492</span>). You can find all group passwords on the competition page after creation.
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-metal btn-orange py-2.5 text-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Competition'}
            </button>
          </form>
      </div>
    </div>
  )
}
