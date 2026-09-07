'use client'

import { useBalance } from './BalanceContext'

export default function WalletCards() {
  const { personal, business, active, setActive } = useBalance()
  return (
    <div className="grid grid-cols-2 gap-3 w-full sm:w-auto sm:min-w-[22rem]">
      <WalletCard
        icon="👤"
        label="MY WALLET"
        sub="personal · just you"
        amount={personal}
        tone="teal"
        selected={active === 'personal'}
        onClick={() => setActive('personal')}
      />
      <WalletCard
        icon="🏢"
        label="TEAM BUSINESS"
        sub="shared · your group"
        amount={business}
        tone="orange"
        selected={active === 'business'}
        onClick={() => setActive('business')}
      />
    </div>
  )
}

function WalletCard({
  icon,
  label,
  sub,
  amount,
  tone,
  selected,
  onClick,
}: {
  icon: string
  label: string
  sub: string
  amount: number
  tone: 'teal' | 'orange'
  selected: boolean
  onClick: () => void
}) {
  const strip = tone === 'teal' ? 'bg-teal' : 'bg-orange'
  const amountText = tone === 'teal' ? 'text-teal-dark' : 'text-orange-dark'
  const ring =
    tone === 'teal'
      ? 'border-teal ring-2 ring-teal/40'
      : 'border-orange ring-2 ring-orange/40'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left rounded-xl overflow-hidden bg-white border-2 transition ${
        selected ? ring : 'border-transparent opacity-75 hover:opacity-100'
      }`}
    >
      <div className={`${strip} px-3 py-1.5 flex items-center justify-between`}>
        <span className="text-white text-[10px] font-pixel tracking-[0.15em]">
          {icon} {label}
        </span>
        {selected && (
          <span className="text-white/90 text-[8px] font-pixel tracking-wider">ACTIVE</span>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className={`${amountText} font-display text-4xl font-bold leading-none tabular-nums`}>
          {amount.toLocaleString()}
        </p>
        <p className="text-ink-soft text-[11px] mt-1.5">{sub}</p>
      </div>
    </button>
  )
}
