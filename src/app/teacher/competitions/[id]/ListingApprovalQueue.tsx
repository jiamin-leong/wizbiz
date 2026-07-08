'use client'

import { useState } from 'react'
import { updateListingStatus } from '@/lib/teacher-actions'
import { useRouter } from 'next/navigation'

type Listing = {
  id: number
  name: string
  description: string | null
  price: number
  quantity: number
  groupId: number
}

export default function ListingApprovalQueue({
  listings,
  groupNameMap,
}: {
  listings: Listing[]
  groupNameMap: Record<number, string>
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Record<number, { name: string; description: string; price: string }>>({})

  function startEdit(l: Listing) {
    setEditing(l.id)
    setEditValues(prev => ({
      ...prev,
      [l.id]: { name: l.name, description: l.description ?? '', price: String(l.price) },
    }))
  }

  async function handleApprove(l: Listing) {
    const ev = editValues[l.id]
    await updateListingStatus(
      l.id,
      'approved',
      ev?.name,
      ev?.description,
      ev?.price ? parseInt(ev.price) : undefined
    )
    setEditing(null)
    router.refresh()
  }

  async function handleReject(id: number) {
    await updateListingStatus(id, 'rejected')
    router.refresh()
  }

  if (listings.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 text-center text-gray-400 shadow-sm">
        No pending listings.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {listings.map(l => (
        <div key={l.id} className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <span className="text-xs text-orange font-medium">{groupNameMap[l.groupId]}</span>
              {editing === l.id ? (
                <div className="flex flex-col gap-2 mt-1">
                  <input
                    className="border rounded px-2 py-1 text-sm w-full"
                    value={editValues[l.id]?.name ?? ''}
                    onChange={e => setEditValues(prev => ({ ...prev, [l.id]: { ...prev[l.id], name: e.target.value } }))}
                  />
                  <input
                    className="border rounded px-2 py-1 text-sm w-full"
                    value={editValues[l.id]?.description ?? ''}
                    placeholder="Description"
                    onChange={e => setEditValues(prev => ({ ...prev, [l.id]: { ...prev[l.id], description: e.target.value } }))}
                  />
                  <input
                    className="border rounded px-2 py-1 text-sm w-24"
                    type="number"
                    value={editValues[l.id]?.price ?? ''}
                    onChange={e => setEditValues(prev => ({ ...prev, [l.id]: { ...prev[l.id], price: e.target.value } }))}
                  />
                </div>
              ) : (
                <>
                  <p className="font-semibold text-gray-800">{l.name}</p>
                  {l.description && <p className="text-sm text-gray-500">{l.description}</p>}
                  <p className="text-sm text-orange font-medium mt-1">{l.price} WizCoins · Qty: {l.quantity}</p>
                </>
              )}
            </div>
            <div className="flex gap-2 ml-4 shrink-0">
              {editing === l.id ? (
                <>
                  <button
                    onClick={() => handleApprove(l)}
                    className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition"
                  >
                    Save & Approve
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startEdit(l)}
                    className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-200 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleApprove(l)}
                    className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(l.id)}
                    className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-lg hover:bg-red-200 transition"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
