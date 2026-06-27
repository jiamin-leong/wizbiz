'use client'

import { useBalance } from './BalanceContext'

export default function BalanceDisplay({ competitionInitialBalance }: { competitionInitialBalance: number }) {
  const { balance } = useBalance()
  const balanceChange = balance - competitionInitialBalance
  return (
    <div className="sm:text-right">
      <p className="text-amber-100 text-sm font-medium mb-1">Your balance</p>
      <p className="text-white text-5xl font-extrabold">{balance.toLocaleString()}</p>
      <p className="text-amber-100 text-base font-semibold mt-1">WizCoins</p>
      <p className={`text-sm font-semibold mt-1 ${balanceChange >= 0 ? 'text-green-200' : 'text-red-200'}`}>
        {balanceChange >= 0 ? `▲ ${balanceChange.toLocaleString()}` : `▼ ${Math.abs(balanceChange).toLocaleString()}`} from start
      </p>
    </div>
  )
}
