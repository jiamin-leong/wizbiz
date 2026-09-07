const PASSWORD_WORDS = [
  'BLAZE', 'STORM', 'FROST', 'EMBER', 'SPARK', 'FLARE', 'DRIFT', 'CREST',
  'SURGE', 'NOVA', 'COMET', 'ORBIT', 'PULSE', 'PRISM', 'RIDGE', 'FORGE',
  'VALE', 'PEAK', 'TIDE', 'REEF', 'GUST', 'MIST', 'BOLT', 'FLASH',
  'IRON', 'GOLD', 'JADE', 'RUBY', 'ONYX', 'OPAL', 'FLINT', 'SLATE',
]

export function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function generateGroupPassword(): string {
  const word = PASSWORD_WORDS[Math.floor(Math.random() * PASSWORD_WORDS.length)]
  const digits = String(Math.floor(Math.random() * 900) + 100)
  return `${word}-${digits}`
}

// Judges are modelled as a group so they inherit wallets, logins and purchasing
// with no new plumbing — but the panel never trades and never ranks.
export const JUDGE_PANEL_NAME = 'JUDGES'
export const JUDGE_CODES = [
  'JUDGE-ALPHA', 'JUDGE-BRAVO', 'JUDGE-CHARLIE', 'JUDGE-DELTA',
  'JUDGE-ECHO', 'JUDGE-FOXTROT', 'JUDGE-GOLF', 'JUDGE-HOTEL',
]
export const DEFAULT_JUDGE_COUNT = 4
export const DEFAULT_JUDGE_BALANCE = 1000
