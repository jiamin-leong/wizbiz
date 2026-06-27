'use server'

import { db } from '@/db'
import { listings, groups, transactions, students, transfers } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function sendWizCoins(toGroupId: number, amount: number, message: string) {
  const session = await getSession()
  if (!session || session.role !== 'student') redirect('/')
  if (toGroupId === session.groupId) return { error: 'You cannot send WizCoins to your own group' }
  if (!amount || amount < 1) return { error: 'Amount must be at least 1' }

  const [senderGroup] = await db.select({ balance: groups.balance }).from(groups).where(eq(groups.id, session.groupId))
  if (senderGroup.balance < amount) return { error: 'Insufficient WizCoins' }

  await db.transaction(async (tx) => {
    await tx.update(groups).set({ balance: sql`${groups.balance} - ${amount}` }).where(eq(groups.id, session.groupId))
    await tx.update(groups).set({ balance: sql`${groups.balance} + ${amount}` }).where(eq(groups.id, toGroupId))
    await tx.insert(transfers).values({
      fromGroupId: session.groupId,
      toGroupId,
      sentByStudentId: session.id,
      amount,
      message: message.trim() || null,
    })
  })

  return { success: true }
}

export async function createListing(formData: FormData) {
  const session = await getSession()
  if (!session || session.role !== 'student') redirect('/')

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

export async function buyListing(listingId: number) {
  const session = await getSession()
  if (!session || session.role !== 'student') redirect('/')

  const [[listing], [buyerGroup]] = await Promise.all([
    db.select().from(listings).where(eq(listings.id, listingId)),
    db.select({ balance: groups.balance }).from(groups).where(eq(groups.id, session.groupId)),
  ])
  if (!listing) return { error: 'Listing not found' }
  if (listing.status !== 'approved') return { error: 'Listing is no longer available' }
  if (listing.quantity < 1) return { error: 'This item is sold out' }
  if (listing.groupId === session.groupId) return { error: 'You cannot buy your own group\'s listings' }
  if (buyerGroup.balance < listing.price) return { error: 'Insufficient WizCoins' }

  await db.transaction(async (tx) => {
    await tx.update(groups).set({ balance: sql`${groups.balance} - ${listing.price}` }).where(eq(groups.id, session.groupId))
    await tx.update(groups).set({ balance: sql`${groups.balance} + ${listing.price}` }).where(eq(groups.id, listing.groupId))
    await tx.update(listings).set({ quantity: sql`${listings.quantity} - 1` }).where(eq(listings.id, listingId))
    await tx.insert(transactions).values({
      listingId,
      buyerStudentId: session.id,
      buyerGroupId: session.groupId,
      sellerGroupId: listing.groupId,
      amount: listing.price,
    })
  })

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
