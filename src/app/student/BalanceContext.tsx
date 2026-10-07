'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type Wallet = 'personal' | 'business'

type Ctx = {
  personal: number
  business: number
  startingCapital: number
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
  startingCapital: 0,
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
  startingCapital,
}: {
  children: ReactNode
  initialPersonal: number
  initialBusiness: number
  startingCapital: number
}) {
  const [personal, setPersonal] = useState(initialPersonal)
  const [business, setBusiness] = useState(initialBusiness)

  // A refresh hands down fresh server balances; take them over the local copy.
  const [seen, setSeen] = useState({ personal: initialPersonal, business: initialBusiness })
  if (seen.personal !== initialPersonal || seen.business !== initialBusiness) {
    setSeen({ personal: initialPersonal, business: initialBusiness })
    setPersonal(initialPersonal)
    setBusiness(initialBusiness)
  }
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
        startingCapital,
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
