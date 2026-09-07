'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateTeacher, deleteTeacher, approveTeacher, declineTeacher } from '@/lib/teacher-admin-actions'

type Teacher = {
  id: number
  name: string
  email: string
  isAdmin: boolean
  approvedAt: Date | null
  hasPassword: boolean
  createdAt: Date
  isSelf: boolean
  blockers: { competitions: number; programmes: number; classes: number }
}

export default function TeacherAccounts({ teachers }: { teachers: Teacher[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSave(id: number, formData: FormData) {
    setError('')
    setBusy(true)
    const result = await updateTeacher(id, formData)
    setBusy(false)
    if (result?.error) { setError(result.error); return }
    setEditingId(null)
    router.refresh()
  }

  async function handleApprove(id: number) {
    setError('')
    setBusy(true)
    const result = await approveTeacher(id)
    setBusy(false)
    if (result?.error) { setError(result.error); return }
    router.refresh()
  }

  async function handleDecline(id: number) {
    setError('')
    setBusy(true)
    const result = await declineTeacher(id)
    setBusy(false)
    if (result?.error) { setError(result.error); return }
    setConfirmingId(null)
    router.refresh()
  }

  async function handleDelete(id: number) {
    setError('')
    setBusy(true)
    const result = await deleteTeacher(id)
    setBusy(false)
    if (result?.error) { setError(result.error); setConfirmingId(null); return }
    setConfirmingId(null)
    router.refresh()
  }

  const field =
    'w-full border border-ink/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal'

  const pending = teachers.filter(t => !t.approvedAt)
  const approved = teachers.filter(t => t.approvedAt)

  function ownedSummary(b: Teacher['blockers']) {
    const parts = [
      b.programmes && `${b.programmes} programme${b.programmes === 1 ? '' : 's'}`,
      b.competitions && `${b.competitions} competition${b.competitions === 1 ? '' : 's'}`,
      b.classes && `${b.classes} class${b.classes === 1 ? '' : 'es'}`,
    ].filter(Boolean)
    return parts.length ? parts.join(' · ') : null
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">
        Teacher Accounts
        <span className="ml-2 text-sm font-normal text-gray-400">
          {approved.length} approved{pending.length > 0 && `, ${pending.length} pending`}
        </span>
      </h2>
      <p className="text-sm text-gray-500 mb-3">
        Edit a teacher&apos;s details, grant or remove admin rights, or set a new password for someone
        who is locked out.
      </p>

      {error && (
        <div className="mb-3 rounded-lg border-l-4 border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-5">
          <div className="rounded-t-2xl bg-orange/[0.08] border-2 border-b-0 border-orange/30 px-4 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-orange-dark">
              ⏳ Awaiting your approval · {pending.length}
              <span className="font-normal normal-case tracking-normal opacity-75">
                {' '}— they have signed up and set a password, but can see nothing yet
              </span>
            </p>
          </div>
          <div className="bg-white rounded-b-2xl border-2 border-t-0 border-orange/30 overflow-hidden">
            {pending.map(t => (
              <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-800">{t.name}</p>
                  <p className="text-sm text-gray-500 truncate">{t.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Requested {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(t.id)}
                    disabled={busy}
                    className="btn-metal btn-orange px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    {busy ? '…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleDecline(t.id)}
                    disabled={busy}
                    className="text-xs font-semibold text-red-500 border border-red-200 hover:border-red-400 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {approved.map(t => {
          const owned = ownedSummary(t.blockers)
          const editing = editingId === t.id

          return (
            <div key={t.id} className="border-b border-gray-50 last:border-0">
              {editing ? (
                <form action={fd => handleSave(t.id, fd)} className="p-4 bg-paper-2/40 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Name</label>
                      <input name="name" defaultValue={t.name} required className={field} />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</label>
                      <input name="email" type="email" defaultValue={t.email} required className={field} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      New password <span className="font-normal normal-case tracking-normal text-gray-400">— leave blank to keep the current one</span>
                    </label>
                    <input name="password" type="password" minLength={8} placeholder="••••••••" className={field} />
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isAdmin"
                      defaultChecked={t.isAdmin}
                      className="accent-orange w-4 h-4 mt-0.5"
                    />
                    <span>
                      <span className="text-sm font-semibold text-gray-700">Administrator</span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        Can manage invite codes and every teacher account, from a link in their own portal.
                      </span>
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button type="submit" disabled={busy} className="btn-metal btn-orange px-4 py-2 text-sm disabled:opacity-50">
                      {busy ? 'Saving…' : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingId(null); setError('') }}
                      className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 flex items-center gap-2 flex-wrap">
                      {t.name}
                      {t.isAdmin && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-ink text-white">
                          Admin
                        </span>
                      )}
                      {t.isSelf && <span className="text-xs font-normal text-gray-400">(you)</span>}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{t.email}</p>
                    {(owned || !t.hasPassword) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {owned}
                        {owned && !t.hasPassword && ' · '}
                        {!t.hasPassword && 'no password — signs in by email link'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setEditingId(t.id); setConfirmingId(null); setError('') }}
                      className="text-xs font-semibold text-gray-600 border border-ink/15 hover:border-ink/40 px-2.5 py-1 rounded-lg transition"
                    >
                      Edit
                    </button>
                    {confirmingId === t.id ? (
                      <>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={busy}
                          className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition disabled:opacity-50"
                        >
                          {busy ? 'Deleting…' : 'Really delete'}
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 px-1"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setConfirmingId(t.id); setEditingId(null); setError('') }}
                        disabled={t.isSelf}
                        title={t.isSelf ? 'You cannot delete your own account' : undefined}
                        className="text-xs font-semibold text-red-500 border border-red-200 hover:border-red-400 px-2.5 py-1 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {approved.length === 0 && (
          <p className="px-4 py-6 text-center text-gray-400 text-sm">No approved teachers yet</p>
        )}
      </div>
    </div>
  )
}
