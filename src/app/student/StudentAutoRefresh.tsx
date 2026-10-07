'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Teammates and other teams change the shared business balance (a sale, a
// store payment), so each student's screen re-reads it every so often.
const INTERVAL = 15_000

export default function StudentAutoRefresh() {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, INTERVAL)
    return () => clearInterval(id)
  }, [router])

  return null
}
