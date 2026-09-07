// Passwords are single short words and login codes are single short names,
// because they are typed by 12-year-olds. That puts the whole burden of
// uniqueness on the pools below: a programme of 48 teams needs 48 distinct
// passwords, and its 272 students need 272 distinct login codes.

const PASSWORD_WORDS = [
  'BLAZE', 'STORM', 'FROST', 'EMBER', 'SPARK', 'FLARE', 'DRIFT', 'CREST',
  'SURGE', 'NOVA', 'COMET', 'ORBIT', 'PULSE', 'PRISM', 'RIDGE', 'FORGE',
  'VALE', 'PEAK', 'TIDE', 'REEF', 'GUST', 'MIST', 'BOLT', 'FLASH',
  'IRON', 'GOLD', 'JADE', 'RUBY', 'ONYX', 'OPAL', 'FLINT', 'SLATE',
  'ARROW', 'ANCHOR', 'BEACON', 'BRAVE', 'BRIGHT', 'CANDLE', 'CASTLE', 'CHASE',
  'CLOUD', 'CORAL', 'DAWN', 'DELTA', 'DREAM', 'ECHO', 'FABLE', 'FALCON',
  'FEATHER', 'FLAME', 'GLIDE', 'GLOW', 'GROVE', 'HARBOR', 'HAVEN', 'HONEY',
  'ISLAND', 'IVORY', 'KITE', 'LANTERN', 'LEAF', 'LUNAR', 'MAPLE', 'MARBLE',
  'MEADOW', 'MERIT', 'NORTH', 'OASIS', 'ORCHID', 'PEARL', 'PEBBLE', 'PILOT',
  'PIONEER', 'QUARTZ', 'QUEST', 'RAPID', 'RIVER', 'ROCKET', 'SAIL', 'SHELL',
  'SILVER', 'SPIRE', 'SPROUT', 'STONE', 'SUMMIT', 'THUNDER', 'TIMBER', 'TORCH',
  'TRAIL', 'VOYAGE', 'WILLOW', 'WINTER', 'ZENITH', 'ZEPHYR',
]

export function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

/**
 * `count` distinct passwords. Throws rather than silently repeating: two teams
 * sharing a password means one team can log into the other's account given a
 * login code, and login codes are printed on a handout.
 */
export function generateGroupPasswords(count: number): string[] {
  if (count > PASSWORD_WORDS.length) {
    throw new Error(
      `Need ${count} distinct passwords but only ${PASSWORD_WORDS.length} words are available.`
    )
  }
  return shuffle(PASSWORD_WORDS).slice(0, count)
}

/** A single password, avoiding any already in use. */
export function generateGroupPassword(taken: Iterable<string> = []): string {
  const used = new Set(taken)
  const free = PASSWORD_WORDS.filter(w => !used.has(w))
  if (free.length === 0) throw new Error('No unused password words remain.')
  return free[Math.floor(Math.random() * free.length)]
}

// Judges are modelled as a group so they inherit wallets, logins and purchasing
// with no new plumbing — but the panel never trades and never ranks.
export const JUDGE_PANEL_NAME = 'JUDGES'
export const JUDGE_CODES = [
  'ALPHA', 'BRAVO', 'CHARLIE', 'DELTA',
  'ECHO', 'FOXTROT', 'GOLF', 'HOTEL',
]
export const DEFAULT_JUDGE_COUNT = 4
export const DEFAULT_JUDGE_BALANCE = 1000

/**
 * Picks `size` login names for one team from its theme, skipping any already
 * used elsewhere in the programme. Codes drop the theme prefix (BEAR, not
 * ANIMALS-BEAR), so a name used by one team is unavailable to every other —
 * and themes do share names (CORAL is both a colour and an ocean word).
 *
 * `used` is mutated so successive calls stay collision-free.
 */
export function allocateLoginCodes(
  themeItems: string[],
  size: number,
  used: Set<string>,
  spares: string[] = []
): string[] {
  const picked: string[] = []
  for (const item of shuffle(themeItems)) {
    if (picked.length === size) break
    if (used.has(item)) continue
    picked.push(item)
    used.add(item)
  }
  // A theme can run dry once its names are taken by earlier teams.
  for (const item of spares) {
    if (picked.length === size) break
    if (used.has(item)) continue
    picked.push(item)
    used.add(item)
  }
  if (picked.length < size) {
    throw new Error(`Ran out of distinct login codes (needed ${size}, got ${picked.length}).`)
  }
  return picked
}
