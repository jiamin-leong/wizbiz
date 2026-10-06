'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { renameProgramme, deleteProgramme } from '@/lib/admin-content-actions'
import ConfirmDelete from '../../ConfirmDelete'

export default function ProgrammeAdminControls({ programmeId, name }: { programmeId: number; name: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const res = await renameProgramme(programmeId, value)
      if (res.error) { setError(res.error); return }
      setEditing(false)
      setError(null)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {editing ? (
        <>
          <input
            autoFocus
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setEditing(false)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
          />
          <button
            onClick={save}
            disabled={pending}
            className="text-sm font-semibold bg-orange hover:bg-orange-dark text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => { setEditing(false); setValue(name); setError(null) }}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 transition"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-gray-500 hover:text-orange border border-gray-200 hover:border-ink/15 px-3 py-1.5 rounded-lg transition"
        >
          ✏ Edit
        </button>
      )}
      {!editing && (
        <ConfirmDelete
          name={name}
          what="This removes the programme with all its classes, hackathons, teams, students and transactions."
          onDelete={async () => {
            const res = await deleteProgramme(programmeId)
            if (res.success) router.push('/teacher')
            return res
          }}
        />
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
