'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { buyListing } from '@/lib/student-actions'

type Listing = {
  id: number
  name: string
  description: string | null
  price: number
  quantity: number
  groupName: string
}

export default function MarketplaceTab({
  listings: initialListings,
  balance: initialBalance,
}: {
  listings: Listing[]
  balance: number
}) {
  const router = useRouter()
  const [listings, setListings] = useState(initialListings)
  const [balance, setBalance] = useState(initialBalance)
  const [confirming, setConfirming] = useState<number | null>(null)
  const [buying, setBuying] = useState<number | null>(null)
  const [purchased, setPurchased] = useState<Set<number>>(new Set())
  const [error, setError] = useState<{ id: number; msg: string } | null>(null)

  async function handleBuy(listing: Listing) {
    setBuying(listing.id)
    setError(null)
    const result = await buyListing(listing.id)
    setBuying(null)
    setConfirming(null)

    if (result?.error) {
      setError({ id: listing.id, msg: result.error })
    } else {
      // Optimistic update — instant UI feedback
      setBalance(b => b - listing.price)
      setPurchased(s => new Set(s).add(listing.id))
      setListings(ls =>
        ls.map(l => l.id === listing.id ? { ...l, quantity: l.quantity - 1 } : l)
          .filter(l => l.quantity > 0)
      )
      // Background sync — don't await
      router.refresh()
    }
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">🏪</p>
        <p className="font-medium">No listings available yet</p>
        <p className="text-sm mt-1">Check back once other groups post their items!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {listings.map(l => (
        <div key={l.id} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition">
          <div>
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-bold text-gray-800 text-base">{l.name}</h3>
              <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full shrink-0">
                {l.groupName}
              </span>
            </div>
            {l.description && (
              <p className="text-sm text-gray-500 mt-1">{l.description}</p>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
            <div>
              <p className="text-xl font-extrabold text-amber-600">{l.price.toLocaleString()}</p>
              <p className="text-xs text-gray-400">WizCoins · {l.quantity} left</p>
            </div>

            {purchased.has(l.id) ? (
              <span className="text-sm font-semibold text-green-500">✓ Bought!</span>
            ) : confirming === l.id ? (
              <div className="flex flex-col items-end gap-1">
                <p className="text-xs text-gray-500 font-medium">Confirm purchase?</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setConfirming(null); setError(null) }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleBuy(l)}
                    disabled={buying === l.id}
                    className="text-xs px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold transition disabled:opacity-50"
                  >
                    {buying === l.id ? '…' : 'Buy!'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setConfirming(l.id); setError(null) }}
                disabled={balance < l.price}
                className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                title={balance < l.price ? 'Not enough WizCoins' : ''}
              >
                Buy
              </button>
            )}
          </div>
          {error?.id === l.id && (
            <p className="text-xs text-red-500">{error.msg}</p>
          )}
        </div>
      ))}
    </div>
  )
}
