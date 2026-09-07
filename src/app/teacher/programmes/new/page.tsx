'use client'

import { createProgramme } from '@/lib/programme-actions'
import { allocateGroups, allocationError, MAX_GROUP_SIZE, MIN_GROUP_SIZE } from '@/lib/allocation'
import { useState } from 'react'
import Link from 'next/link'

type Row = { name: string; headcount: string }

const STARTER_ROWS: Row[] = [
  { name: '', headcount: '' },
  { name: '', headcount: '' },
  { name: '', headcount: '' },
]

export default function NewProgrammePage() {
  const [rows, setRows] = useState<Row[]>(STARTER_ROWS)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function update(i: number, patch: Partial<Row>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  const filled = rows.filter(r => r.name.trim() && r.headcount)
  const totalStudents = filled.reduce((s, r) => s + (parseInt(r.headcount) || 0), 0)
  const totalGroups = filled.reduce((s, r) => {
    const n = parseInt(r.headcount) || 0
    return s + (allocationError(n) ? 0 : allocateGroups(n).length)
  }, 0)

  async function handleSubmit(formData: FormData) {
    setError('')
    setSubmitting(true)
    const result = await createProgramme(formData)
    if (result?.error) {
      setError(result.error)
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/teacher" className="text-sm text-gray-400 hover:underline">← Back</Link>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-orange mb-1">New Programme</h1>
        <p className="text-sm text-gray-500 mb-6">
          A programme runs several classes through round 1 in parallel, then the top {3} teams
          from each class meet in one final.
        </p>

        <form action={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Programme name</label>
            <input
              name="name"
              type="text"
              placeholder="e.g. Primary 6 WizBiz"
              required
              className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Classes</p>
              <p className="text-xs text-gray-400">
                {MIN_GROUP_SIZE}–{MAX_GROUP_SIZE} students per group, groups sized automatically
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {rows.map((row, i) => {
                const n = parseInt(row.headcount)
                const err = row.headcount ? allocationError(n) : null
                const preview = !err && n ? allocateGroups(n) : null
                return (
                  <div key={i}>
                    <div className="flex gap-2">
                      <input
                        name="className"
                        value={row.name}
                        onChange={e => update(i, { name: e.target.value })}
                        placeholder={`Class ${i + 1} name`}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                      />
                      <input
                        name="headcount"
                        value={row.headcount}
                        onChange={e => update(i, { headcount: e.target.value.replace(/\D/g, '') })}
                        placeholder="Students"
                        inputMode="numeric"
                        className="w-28 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                      />
                      <button
                        type="button"
                        onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                        disabled={rows.length === 1}
                        className="px-3 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition disabled:opacity-30"
                        aria-label="Remove class"
                      >
                        ×
                      </button>
                    </div>
                    {err && <p className="text-xs text-red-500 mt-1 ml-1">{err}</p>}
                    {preview && (
                      <p className="text-xs text-teal-dark mt-1 ml-1">
                        {preview.length} group{preview.length === 1 ? '' : 's'} · {preview.join(', ')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => setRows([...rows, { name: '', headcount: '' }])}
              className="mt-2 text-sm text-orange hover:underline font-medium"
            >
              + Add class
            </button>
          </div>

          {filled.length > 0 && (
            <div className="bg-paper-2 border border-ink/15 rounded-lg px-4 py-3 text-sm text-gray-700">
              <b>{filled.length}</b> classes · <b>{totalStudents}</b> students ·{' '}
              <b>{totalGroups}</b> teams in round 1 · <b>{filled.length * 3}</b> teams in the final
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting || filled.length === 0}
            className="btn-metal btn-orange py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating…' : 'Create programme'}
          </button>
        </form>
      </div>
    </div>
  )
}
