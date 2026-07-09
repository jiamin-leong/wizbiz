'use client'

import { useState } from 'react'
import Link from 'next/link'
import { logout } from '@/lib/actions'

type Comp = { id: number; name: string }

export default function TeacherShell({
  teacher,
  upcoming,
  active,
  past,
  children,
}: {
  teacher: { name: string; email: string } | undefined
  upcoming: Comp[]
  active: Comp[]
  past: Comp[]
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className="min-h-screen bg-paper-2 md:flex">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 bg-ink px-4 py-3">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/20 text-white text-lg leading-none"
        >
          ☰
        </button>
        <span className="chrome-text-dark text-lg" style={{ fontWeight: 700 }}>WizBiz</span>
      </div>

      {/* Backdrop (mobile only) */}
      {open && (
        <div
          onClick={close}
          aria-hidden
          className="md:hidden fixed inset-0 z-40 bg-ink/50"
        />
      )}

      {/* Sidebar / off-canvas drawer */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 max-w-[80vw] bg-white border-r border-ink/10 flex flex-col shrink-0 transition-transform duration-200 md:transition-none ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="px-6 py-6 border-b border-ink/10 bg-ink flex items-center justify-between">
          <div>
            <span className="chrome-text-dark text-2xl" style={{ fontWeight: 700 }}>WizBiz</span>
            <p className="text-[10px] font-semibold text-paper/70 uppercase tracking-widest mt-1 font-pixel">Teacher Portal</p>
          </div>
          <button
            onClick={close}
            aria-label="Close menu"
            className="md:hidden grid h-8 w-8 place-items-center rounded-lg border border-white/20 text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-4 overflow-y-auto">
          {/* Upcoming competitions */}
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Upcoming</p>
              <div className="flex flex-col gap-0.5">
                {upcoming.map(c => (
                  <Link
                    key={c.id}
                    href={`/teacher/competitions/${c.id}`}
                    onClick={close}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-paper-2 hover:text-teal-dark transition truncate"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Active competitions */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Active</p>
            {active.length === 0 ? (
              <p className="text-xs text-gray-400 px-3 py-1">No active competitions</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {active.map(c => (
                  <Link
                    key={c.id}
                    href={`/teacher/competitions/${c.id}`}
                    onClick={close}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-paper-2 hover:text-orange-dark transition truncate"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Past competitions */}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Past</p>
              <div className="flex flex-col gap-0.5">
                {past.map(c => (
                  <Link
                    key={c.id}
                    href={`/teacher/competitions/${c.id}`}
                    onClick={close}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition truncate"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* New competition */}
          <Link
            href="/teacher/competitions/new"
            onClick={close}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-orange hover:bg-paper-2 transition font-medium border border-dashed border-ink/15 hover:border-orange"
          >
            <span>＋</span> New Competition
          </Link>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Profile + Logout */}
          <div className="flex flex-col gap-1">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-gray-700">{teacher?.name}</p>
              <p className="text-xs text-gray-400 truncate">{teacher?.email}</p>
            </div>
            <form action={logout}>
              <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition text-left">
                <span>🚪</span> Logout
              </button>
            </form>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="grid-bg flex-1 min-w-0 p-5 md:p-8 overflow-auto">
        {children}
      </main>
    </div>
  )
}
