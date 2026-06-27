'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type Ctx = { balance: number; spend: (n: number) => void; rollback: (n: number) => void }
const BalanceContext = createContext<Ctx>({ balance: 0, spend: () => {}, rollback: () => {} })

export function BalanceProvider({ children, initialBalance }: { children: ReactNode; initialBalance: number }) {
  const [balance, setBalance] = useState(initialBalance)
  return (
    <BalanceContext.Provider value={{
      balance,
      spend: (n) => setBalance(b => b - n),
      rollback: (n) => setBalance(b => b + n),
    }}>
      {children}
    </BalanceContext.Provider>
  )
}

export function useBalance() { return useContext(BalanceContext) }
