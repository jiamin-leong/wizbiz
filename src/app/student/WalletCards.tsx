'use client'

import { ReactNode } from 'react'
import { useBalance } from './BalanceContext'

type Tone = { strip: string; border: string; text: string; ring: string }

const TEAL: Tone = { strip: 'bg-teal', border: 'border-teal', text: 'text-teal-dark', ring: 'ring-2 ring-teal/40' }
const ORANGE: Tone = { strip: 'bg-orange', border: 'border-orange', text: 'text-orange-dark', ring: 'ring-2 ring-orange/40' }
const GREEN: Tone = { strip: 'bg-teal', border: 'border-teal', text: 'text-teal-dark', ring: '' }
const RED: Tone = { strip: 'bg-red-600', border: 'border-red-600', text: 'text-red-600', ring: '' }
const GREY: Tone = { strip: 'bg-ink-soft', border: 'border-ink-soft', text: 'text-ink-soft', ring: '' }

export default function WalletCards() {
  const { personal, business, startingCapital, active, setActive } = useBalance()
  const net = business - startingCapital
  const netTone = net > 0 ? GREEN : net < 0 ? RED : GREY

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full sm:w-auto sm:min-w-[33rem]">
      <Card
        icon="👤"
        label="MY WALLET"
        sub="personal · just you"
        amount={personal.toLocaleString()}
        tone={TEAL}
        selected={active === 'personal'}
        onClick={() => setActive('personal')}
      />
      <Card
        icon="🏢"
        label="TEAM BUSINESS"
        sub="shared · your team"
        amount={business.toLocaleString()}
        tone={ORANGE}
        selected={active === 'business'}
        onClick={() => setActive('business')}
      />
      <Card
        className="col-span-2 sm:col-span-1"
        icon="📈"
        label={net < 0 ? 'NET LOSS' : 'NET PROFIT'}
        sub="vs. starting capital"
        amount={`${net > 0 ? '+' : ''}${net.toLocaleString()}`}
        tone={netTone}
      />
    </div>
  )
}

// One card shape for all three. Wallets are selectable; the net card is display-only.
function Card({
  icon,
  label,
  sub,
  amount,
  tone,
  selected = false,
  onClick,
  className = '',
}: {
  icon: string
  label: string
  sub: string
  amount: string
  tone: Tone
  selected?: boolean
  onClick?: () => void
  className?: string
}) {
  const classes = `${className} relative flex flex-col text-left rounded-xl overflow-hidden border-2 ${tone.border} ${selected ? tone.ring : ''}`
  const body: ReactNode = (
    <>
      <div className={`${tone.strip} px-3 py-1.5 flex items-center justify-between`}>
        <span className="text-white text-[10px] font-pixel tracking-[0.15em]">
          {icon} {label}
        </span>
        {selected && <span className="text-white/90 text-[8px] font-pixel tracking-wider">ACTIVE</span>}
      </div>
      <div className="px-3 py-2.5 bg-white flex-1">
        <p className={`${tone.text} font-display text-4xl font-bold leading-none tabular-nums`}>{amount}</p>
        <p className="text-ink-soft text-[11px] mt-1.5">{sub}</p>
      </div>
    </>
  )

  return onClick ? (
    <button type="button" onClick={onClick} className={classes}>{body}</button>
  ) : (
    <div className={classes}>{body}</div>
  )
}
