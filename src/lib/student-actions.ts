'use server'

import { db } from '@/db'
import { listings, groups, transactions, students, transfers } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function sendWizCoins(target: number | 'store', amount: number, message: string, wallet: 'personal' | 'business' = 'business') {
  const session = await getSession()
  if (!session || session.role !== 'student') redirect('/')
  if (!amount || amount < 1) return { error: 'Amount must be at least 1' }

  // Payment to the central MAIN STORE (business expense) — leaves the group wallet,
  // not credited to any group. Inventory of purchasable items is a phase-2 feature.
  if (target === 'store') {
    if (wallet !== 'business') return { error: 'MAIN STORE can only be paid from the Team Business wallet.' }

    const [senderGroup] = await db.select({ balance: groups.balance }).from(groups).where(eq(groups.id, session.groupId))
    if (senderGroup.balance < amount) return { error: 'Insufficient WizCoins' }

    await db.batch([
      db.update(groups).set({ balance: sql`${groups.balance} - ${amount}` }).where(eq(groups.id, session.groupId)),
      db.insert(transfers).values({
        fromGroupId: session.groupId,
        toGroupId: null,
        toStore: true,
        sentByStudentId: session.id,
        amount,
        message: message.trim() || null,
      }),
    ])

    return { success: true }
  }

  const toGroupId = target
  // The two wallets have disjoint reach: business pays the store and nothing
  // else; personal buys from businesses and never the store.
  if (wallet !== 'personal') {
    return { error: 'The Team Business wallet can only pay MAIN STORE. Use your personal wallet to buy from a business.' }
  }
  if (toGroupId === session.groupId) return { error: 'You cannot send WizCoins to your own group' }

  const [recipient] = await db.select({ kind: groups.kind }).from(groups).where(eq(groups.id, toGroupId))
  if (!recipient) return { error: 'Group not found' }
  if (recipient.kind === 'judges') return { error: 'You cannot send WizCoins to the judging panel.' }
  if (recipient.kind === 'spectators') return { error: 'That team is not in the final and cannot be paid.' }

  if (wallet === 'personal') {
    const [me] = await db.select({ personalBalance: students.personalBalance }).from(students).where(eq(students.id, session.id))
    if (me.personalBalance < amount) return { error: 'Insufficient WizCoins' }

    await db.batch([
      db.update(students).set({ personalBalance: sql`${students.personalBalance} - ${amount}` }).where(eq(students.id, session.id)),
      db.update(groups).set({ balance: sql`${groups.balance} + ${amount}` }).where(eq(groups.id, toGroupId)),
      db.insert(transfers).values({
        fromGroupId: session.groupId,
        toGroupId,
        fromPersonal: true,
        sentByStudentId: session.id,
        amount,
        message: message.trim() || null,
      }),
    ])

    return { success: true }
  }

  const [senderGroup] = await db.select({ balance: groups.balance }).from(groups).where(eq(groups.id, session.groupId))
  if (senderGroup.balance < amount) return { error: 'Insufficient WizCoins' }

  await db.batch([
    db.update(groups).set({ balance: sql`${groups.balance} - ${amount}` }).where(eq(groups.id, session.groupId)),
    db.update(groups).set({ balance: sql`${groups.balance} + ${amount}` }).where(eq(groups.id, toGroupId)),
    db.insert(transfers).values({
      fromGroupId: session.groupId,
      toGroupId,
      sentByStudentId: session.id,
      amount,
      message: message.trim() || null,
    }),
  ])

  return { success: true }
}

export async function createListing(formData: FormData) {
  const session = await getSession()
  if (!session || session.role !== 'student') redirect('/')

  const [ownGroup] = await db.select({ kind: groups.kind }).from(groups).where(eq(groups.id, session.groupId))
  if (ownGroup?.kind === 'judges') return { error: 'Judges do not sell — you are here to buy and score.' }
  if (ownGroup?.kind === 'spectators') {
    return { error: 'Your team is not in the final — you can buy from the finalists, but not sell.' }
  }

  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string).trim()
  const price = parseInt(formData.get('price') as string)
  const quantity = parseInt(formData.get('quantity') as string)

  if (!name || isNaN(price) || isNaN(quantity) || price < 1 || quantity < 1) {
    return { error: 'Please fill in all fields correctly' }
  }

  await db.insert(listings).values({
    groupId: session.groupId,
    createdBy: session.id,
    name,
    description: description || null,
    price,
    quantity,
    status: 'pending',
  })
}

export async function buyListing(listingId: number, wallet: 'personal' | 'business' = 'personal') {
  const session = await getSession()
  if (!session || session.role !== 'student') redirect('/')

  // Buying from another business is personal spending; the business wallet is
  // reserved for MAIN STORE.
  if (wallet !== 'personal') {
    return { error: 'Buy from other businesses with your personal wallet. The Team Business wallet is for MAIN STORE only.' }
  }

  const [[listing], [buyerGroup], [me]] = await Promise.all([
    db.select().from(listings).where(eq(listings.id, listingId)),
    db.select({ balance: groups.balance }).from(groups).where(eq(groups.id, session.groupId)),
    db.select({ personalBalance: students.personalBalance }).from(students).where(eq(students.id, session.id)),
  ])
  if (!listing) return { error: 'Listing not found' }
  if (listing.status !== 'approved') return { error: 'Listing is no longer available' }
  if (listing.quantity < 1) return { error: 'This item is sold out' }
  if (listing.groupId === session.groupId) return { error: 'You cannot buy your own group\'s listings' }

  const available = wallet === 'personal' ? me.personalBalance : buyerGroup.balance
  if (available < listing.price) return { error: 'Insufficient WizCoins' }

  const debitBuyer =
    wallet === 'personal'
      ? db.update(students).set({ personalBalance: sql`${students.personalBalance} - ${listing.price}` }).where(eq(students.id, session.id))
      : db.update(groups).set({ balance: sql`${groups.balance} - ${listing.price}` }).where(eq(groups.id, session.groupId))

  await db.batch([
    debitBuyer,
    db.update(groups).set({ balance: sql`${groups.balance} + ${listing.price}` }).where(eq(groups.id, listing.groupId)),
    db.update(listings).set({ quantity: sql`${listings.quantity} - 1` }).where(eq(listings.id, listingId)),
    db.insert(transactions).values({
      listingId,
      buyerStudentId: session.id,
      buyerGroupId: session.groupId,
      sellerGroupId: listing.groupId,
      amount: listing.price,
    }),
  ])

  return { success: true }
}

export async function restockListing(listingId: number, quantity: number) {
  const session = await getSession()
  if (!session || session.role !== 'student') redirect('/')
  if (quantity < 1) return { error: 'Quantity must be at least 1' }

  const [listing] = await db.select({ groupId: listings.groupId }).from(listings).where(eq(listings.id, listingId))
  if (!listing || listing.groupId !== session.groupId) return { error: 'Not your listing' }

  await db.update(listings)
    .set({ quantity: sql`${listings.quantity} + ${quantity}` })
    .where(eq(listings.id, listingId))
}
