'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-metal btn-orange px-4 py-2 text-sm"
    >
      🖨 Print / Save as PDF
    </button>
  )
}
