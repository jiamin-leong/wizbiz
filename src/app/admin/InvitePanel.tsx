'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createInvites, revokeInvite } from '@/lib/invite-actions'

type Invite = {
  id: number
  code: string
  label: string
  usedAt: Date | null
  teacherName: string | null
  teacherEmail: string | null
}

export default function InvitePanel({ invites, origin }: { invites: Invite[]; origin: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const unused = invites.filter(i => !i.usedAt)
  const used = invites.filter(i => i.usedAt)

  async function handleCreate(formData: FormData) {
    setBusy(true)
    await createInvites(formData)
    setBusy(false)
    router.refresh()
  }

  // The whole point is pasting this into WhatsApp, so copy the message rather
  // than the bare code.
  async function copyInvite(code: string, label: string) {
    const text = [
      label ? `WizBiz invite — ${label}` : 'WizBiz invite',
      '',
      `Sign up here: ${origin}/signup?code=${code}`,
      `Your invite code: ${code}`,
      '',
      'The code works once.',
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(code)
      setTimeout(() => setCopied(c => (c === code ? null : c)), 2000)
    } catch {
      setCopied(null)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Invite Codes</h2>
      <p className="text-sm text-gray-500 mb-3">
        Generate a code for each teacher and send it to them however you like — WhatsApp, SMS, or read
        it out. Each code works once, and whoever redeems it gets a teacher account.
      </p>

      <form action={handleCreate} className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[10rem]">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Label <span className="font-normal normal-case tracking-normal text-gray-400">(optional)</span>
          </label>
          <input
            name="label"
            type="text"
            placeholder="e.g. 6 CARE"
            className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">How many</label>
          <input
            name="count"
            type="number"
            min="1"
            max="25"
            defaultValue={1}
            className="w-full border border-ink/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
          />
        </div>
        <button type="submit" disabled={busy} className="btn-metal btn-orange px-4 py-2 text-sm disabled:opacity-50">
          {busy ? 'Generating…' : 'Generate'}
        </button>
      </form>

      {unused.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <p className="px-4 py-2 bg-paper-2 border-b border-ink/10 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Unused · {unused.length}
          </p>
          {unused.map(i => (
            <div key={i.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
              <span className="font-pixel text-sm bg-paper-2 text-orange-dark px-2.5 py-1 rounded tracking-wider">
                {i.code}
              </span>
              {i.label && <span className="text-sm text-gray-500 truncate">{i.label}</span>}
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <button
                  onClick={() => copyInvite(i.code, i.label)}
                  className="text-xs font-semibold text-orange border border-ink/15 hover:border-orange px-2.5 py-1 rounded-lg transition"
                >
                  {copied === i.code ? '✓ Copied' : 'Copy invite'}
                </button>
                <button
                  onClick={async () => { await revokeInvite(i.id); router.refresh() }}
                  className="text-xs text-gray-400 hover:text-red-500 transition"
                  title="Delete this code"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {used.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <p className="px-4 py-2 bg-paper-2 border-b border-ink/10 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Redeemed · {used.length}
          </p>
          {used.map(i => (
            <div key={i.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 text-sm">
              <span className="font-pixel text-xs text-gray-400 tracking-wider">{i.code}</span>
              {i.label && <span className="text-gray-400 text-xs">{i.label}</span>}
              <span className="ml-auto text-gray-600 truncate">
                {i.teacherName}
                <span className="text-gray-400"> · {i.teacherEmail}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {invites.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-sm text-gray-400">
          No invite codes yet.
        </div>
      )}
    </div>
  )
}
