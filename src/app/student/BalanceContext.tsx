'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type Wallet = 'personal' | 'business'

type Ctx = {
  personal: number
  business: number
  active: Wallet
  setActive: (w: Wallet) => void
  balance: number // active wallet balance — keeps existing spend/rollback callers working
  // `wallet` is explicit where the debited wallet is fixed by the rule rather
  // than by which card is selected (marketplace buying is always personal).
  spend: (n: number, wallet?: Wallet) => void
  rollback: (n: number, wallet?: Wallet) => void
}

const BalanceContext = createContext<Ctx>({
  personal: 0,
  business: 0,
  active: 'personal',
  setActive: () => {},
  balance: 0,
  spend: () => {},
  rollback: () => {},
})

export function BalanceProvider({
  children,
  initialPersonal,
  initialBusiness,
}: {
  children: ReactNode
  initialPersonal: number
  initialBusiness: number
}) {
  const [personal, setPersonal] = useState(initialPersonal)
  const [business, setBusiness] = useState(initialBusiness)
  const [active, setActive] = useState<Wallet>('personal')

  const adjust = (delta: number, wallet: Wallet = active) =>
    wallet === 'personal'
      ? setPersonal(b => b + delta)
      : setBusiness(b => b + delta)

  return (
    <BalanceContext.Provider
      value={{
        personal,
        business,
        active,
        setActive,
        balance: active === 'personal' ? personal : business,
        spend: (n, wallet) => adjust(-n, wallet),
        rollback: (n, wallet) => adjust(n, wallet),
      }}
    >
      {children}
    </BalanceContext.Provider>
  )
}

export function useBalance() { return useContext(BalanceContext) }
