'use client'

import { useBalance } from './BalanceContext'

export default function BalanceDisplay({ competitionInitialBalance }: { competitionInitialBalance: number }) {
  const { balance } = useBalance()
  const balanceChange = balance - competitionInitialBalance
  return (
    <div className="sm:text-right">
      <p className="text-paper/60 text-[10px] font-pixel tracking-[0.2em] mb-1">YOUR BALANCE</p>
      <p
        className="font-display text-6xl font-bold leading-none text-white tabular-nums"
        style={{ textShadow: '0 1px 0 rgba(255,255,255,0.35), 0 3px 6px rgba(0,0,0,0.45)' }}
      >
        {balance.toLocaleString()}
      </p>
      <p className="text-paper/80 text-[10px] font-pixel tracking-[0.2em] mt-2">WIZCOINS</p>
      <p className={`text-sm font-semibold mt-1 ${balanceChange >= 0 ? 'text-green-300' : 'text-red-300'}`}>
        {balanceChange >= 0 ? `▲ ${balanceChange.toLocaleString()}` : `▼ ${Math.abs(balanceChange).toLocaleString()}`} from start
      </p>
    </div>
  )
}
