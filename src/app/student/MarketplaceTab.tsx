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
  const [selected, setSelected] = useState<Listing | null>(null)
  const [message, setMessage] = useState('')
  const [buying, setBuying] = useState(false)
  const [error, setError] = useState('')
  const [purchased, setPurchased] = useState<Set<number>>(new Set())

  function openBuy(listing: Listing) {
    setSelected(listing)
    setMessage(`Buying ${listing.name}`)
    setError('')
  }

  function closeBuy() {
    setSelected(null)
    setMessage('')
    setError('')
  }

  async function handleBuy() {
    if (!selected) return
    setBuying(true)
    setError('')
    const result = await buyListing(selected.id)
    setBuying(false)

    if (result?.error) {
      setError(result.error)
    } else {
      setBalance(b => b - selected.price)
      setPurchased(s => new Set(s).add(selected.id))
      setListings(ls =>
        ls.map(l => l.id === selected.id ? { ...l, quantity: l.quantity - 1 } : l)
          .filter(l => l.quantity > 0)
      )
      closeBuy()
      router.refresh()
    }
  }

  // Buy panel view
  if (selected) {
    const afterBalance = balance - selected.price
    return (
      <div className="max-w-lg mx-auto flex flex-col gap-5">
        <button onClick={closeBuy} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 w-fit">
          ← Back to marketplace
        </button>

        {/* Item details */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex justify-between items-start gap-2 mb-2">
            <h2 className="text-xl font-extrabold text-gray-800">{selected.name}</h2>
            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full shrink-0">
              {selected.groupName}
            </span>
          </div>
          {selected.description && (
            <p className="text-sm text-gray-500">{selected.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">{selected.quantity} left in stock</p>
        </div>

        {/* Price */}
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-2">Price</p>
          <div className="bg-white rounded-xl border-2 border-amber-200 px-4 py-3 flex justify-between items-center">
            <span className="text-3xl font-extrabold text-amber-600">{selected.price.toLocaleString()}</span>
            <span className="text-sm font-semibold text-gray-400">WizCoins</span>
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-gray-400">Your balance</span>
            <span className="font-semibold text-gray-700">{balance.toLocaleString()} WC</span>
          </div>
          {afterBalance >= 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">After purchase</span>
              <span className={`font-semibold ${afterBalance < 0 ? 'text-red-500' : 'text-gray-700'}`}>
                {afterBalance.toLocaleString()} WC
              </span>
            </div>
          )}
        </div>

        {/* Message */}
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-2">Message (optional)</p>
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={100}
            className="w-full bg-white border-2 border-gray-200 focus:border-amber-400 rounded-xl px-4 py-3 text-sm focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

        <button
          onClick={handleBuy}
          disabled={buying || balance < selected.price}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white text-lg font-extrabold py-4 rounded-2xl transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {buying ? 'Buying…' : `Buy for ${selected.price.toLocaleString()} WC`}
        </button>
        {balance < selected.price && (
          <p className="text-center text-sm text-red-400 font-medium -mt-2">Not enough WizCoins</p>
        )}
      </div>
    )
  }

  // Marketplace grid
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
            ) : (
              <button
                onClick={() => openBuy(l)}
                disabled={balance < l.price}
                className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                title={balance < l.price ? 'Not enough WizCoins' : ''}
              >
                Buy
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
