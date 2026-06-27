'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const INTERVAL = 30_000

export default function AutoRefresh() {
  const router = useRouter()
  const [lastUpdated, setLastUpdated] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
      setLastUpdated(new Date())
    }, INTERVAL)
    return () => clearInterval(id)
  }, [router])

  return (
    <p className="text-xs text-gray-400 mt-2 text-right">
      Auto-refreshes every 30s · Last updated: {lastUpdated.toLocaleTimeString()}
    </p>
  )
}
