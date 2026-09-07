'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { assignClassTeacher } from '@/lib/programme-actions'

type Option = { id: number; name: string; email: string }

export default function ClassTeacherField({
  classId,
  currentTeacherId,
  teachers,
}: {
  classId: number
  currentTeacherId: number | null
  teachers: Option[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<string>(currentTeacherId ? String(currentTeacherId) : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setError('')
    setSaving(true)
    const result = await assignClassTeacher(classId, selected ? Number(selected) : null)
    setSaving(false)
    if (result?.error) { setError(result.error); return }
    setEditing(false)
    router.refresh()
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-gray-500 hover:text-orange border border-gray-200 hover:border-ink/15 px-3 py-1.5 rounded-lg transition"
      >
        {currentTeacherId ? 'Change teacher' : 'Assign teacher'}
      </button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <select
          autoFocus
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="border border-ink/15 rounded px-2 py-1.5 text-sm w-56 bg-white focus:outline-none focus:ring-1 focus:ring-teal"
        >
          <option value="">— No teacher assigned —</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.email}
            </option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={saving}
          className="text-sm font-semibold bg-orange hover:bg-orange-dark text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
        >
          {saving ? '…' : 'Save'}
        </button>
        <button
          onClick={() => { setEditing(false); setSelected(currentTeacherId ? String(currentTeacherId) : ''); setError('') }}
          className="text-sm text-gray-400 hover:text-gray-600 px-2 py-1.5"
        >
          ✕
        </button>
      </div>
      {teachers.length === 0 && (
        <p className="text-xs text-gray-400">
          No approved teachers yet — send an invite code and approve them first.
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
