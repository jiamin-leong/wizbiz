'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createListing, restockListing } from '@/lib/student-actions'

type Listing = {
  id: number
  name: string
  description: string | null
  price: number
  quantity: number
  status: 'pending' | 'approved' | 'rejected'
}

const statusStyle: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

export default function MyListingsTab({ listings }: { listings: Listing[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [restocking, setRestocking] = useState<number | null>(null)
  const [restockQty, setRestockQty] = useState<Record<number, string>>({})

  async function handleCreate(formData: FormData) {
    setSubmitting(true)
    setFormError('')
    const result = await createListing(formData)
    setSubmitting(false)
    if (result?.error) {
      setFormError(result.error)
    } else {
      setShowForm(false)
      router.refresh()
    }
  }

  async function handleRestock(listingId: number) {
    const qty = parseInt(restockQty[listingId] || '0')
    if (!qty || qty < 1) return
    setRestocking(listingId)
    await restockListing(listingId, qty)
    setRestocking(null)
    setRestockQty(r => ({ ...r, [listingId]: '' }))
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold text-gray-700">Your Group's Listings</h2>
        <button
          onClick={() => setShowForm(s => !s)}
          className="bg-orange hover:bg-orange-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
        >
          {showForm ? 'Cancel' : '+ New Listing'}
        </button>
      </div>

      {showForm && (
        <form action={handleCreate} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-gray-700">Create a new listing</h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Item Name</label>
              <input name="name" required placeholder="e.g. Handmade bookmark" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-gray-500 mb-1">Price (WC)</label>
              <input name="price" type="number" min="1" required placeholder="500" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
              <input name="quantity" type="number" min="1" required placeholder="5" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
            <input name="description" placeholder="What are you selling?" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal" />
          </div>
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <button type="submit" disabled={submitting} className="bg-orange hover:bg-orange-dark text-white text-sm font-semibold py-2 rounded-xl transition disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit for Approval'}
          </button>
          <p className="text-xs text-gray-400">Your teacher will review this before it goes live.</p>
        </form>
      )}

      {listings.length === 0 && !showForm ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-medium">No listings yet</p>
          <p className="text-sm mt-1">Create your first listing to start selling!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {listings.map(l => (
            <div key={l.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-800">{l.name}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle[l.status]}`}>
                    {l.status}
                  </span>
                </div>
                {l.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{l.description}</p>}
                <p className="text-sm mt-1">
                  <span className="font-bold text-orange">{l.price.toLocaleString()} WC</span>
                  <span className="text-gray-400 ml-2">{l.quantity} remaining</span>
                </p>
              </div>
              {l.status === 'approved' && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min="1"
                    placeholder="0"
                    value={restockQty[l.id] || ''}
                    onChange={e => setRestockQty(r => ({ ...r, [l.id]: e.target.value }))}
                    className="w-16 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal text-center"
                  />
                  <button
                    onClick={() => handleRestock(l.id)}
                    disabled={restocking === l.id || !restockQty[l.id]}
                    className="text-sm bg-paper-2 hover:bg-paper-2 text-orange-dark font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    {restocking === l.id ? '…' : '+ Add stock'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
