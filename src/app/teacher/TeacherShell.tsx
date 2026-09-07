'use client'

import { useState } from 'react'
import Link from 'next/link'
import { logout } from '@/lib/actions'

type Comp = { id: number; name: string }
type NestedComp = { id: number; name: string; status: string }
type Programme = {
  id: number
  name: string
  mine: boolean
  unclaimed: number
  competitions: NestedComp[]
}

export default function TeacherShell({
  teacher,
  isAdmin,
  programmes,
  upcoming,
  active,
  past,
  children,
}: {
  teacher: { name: string; email: string } | undefined
  isAdmin: boolean
  programmes: Programme[]
  upcoming: Comp[]
  active: Comp[]
  past: Comp[]
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  // Class hackathons share names across programmes, so a flat list reads as
  // duplicates. Nest them, and open the programmes this teacher is part of.
  const [expanded, setExpanded] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(programmes.map(p => [p.id, p.mine || programmes.length === 1]))
  )
  const toggle = (id: number) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  const statusDot = (status: string) =>
    status === 'active' ? 'bg-green-400' : status === 'upcoming' ? 'bg-teal' : 'bg-gray-300'

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
          {/* Programmes — the way in to class hackathons */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Programmes</p>
            {programmes.length === 0 ? (
              <p className="px-3 text-sm text-gray-400">None yet</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {programmes.map(p => {
                  const isOpen = !!expanded[p.id]
                  return (
                    <div key={p.id}>
                      <div className="flex items-center rounded-lg hover:bg-paper-2 transition group">
                        {p.competitions.length > 0 ? (
                          <button
                            onClick={() => toggle(p.id)}
                            aria-label={isOpen ? `Collapse ${p.name}` : `Expand ${p.name}`}
                            aria-expanded={isOpen}
                            className="shrink-0 w-6 h-8 grid place-items-center text-gray-400 hover:text-orange transition"
                          >
                            <span className={`text-[10px] transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                          </button>
                        ) : (
                          <span className="shrink-0 w-6" />
                        )}
                        <Link
                          href={`/teacher/programmes/${p.id}`}
                          onClick={close}
                          className="flex-1 min-w-0 flex items-center gap-2 pr-3 py-2 text-sm text-gray-700 group-hover:text-orange-dark transition"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.mine ? 'bg-teal' : 'bg-gray-300'}`} />
                          <span className="truncate font-medium">{p.name}</span>
                          {!p.mine && p.unclaimed > 0 && (
                            <span className="ml-auto shrink-0 text-[10px] font-semibold text-orange-dark bg-orange/15 px-1.5 py-0.5 rounded-full">
                              {p.unclaimed}
                            </span>
                          )}
                        </Link>
                      </div>

                      {isOpen && p.competitions.length > 0 && (
                        <div className="ml-6 pl-3 border-l border-ink/10 flex flex-col gap-0.5 mb-1">
                          {p.competitions.map(c => (
                            <Link
                              key={c.id}
                              href={`/teacher/competitions/${c.id}`}
                              onClick={close}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] text-gray-600 hover:bg-paper-2 hover:text-orange-dark transition truncate"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(c.status)}`} />
                              <span className="truncate">{c.name}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Upcoming competitions */}
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Standalone · upcoming</p>
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

          {/* Active competitions — hidden entirely when nothing is standalone,
              since programme competitions are nested above. */}
          {active.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Standalone · active</p>
            {(
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
          )}

          {/* Past competitions */}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">Standalone · past</p>
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

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Profile + Logout */}
          <div className="flex flex-col gap-1">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-gray-700">{teacher?.name}</p>
              <p className="text-xs text-gray-400 truncate">{teacher?.email}</p>
            </div>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={close}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-paper-2 hover:text-orange-dark transition"
              >
                <span>⚙</span> Admin &amp; invites
              </Link>
            )}
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
