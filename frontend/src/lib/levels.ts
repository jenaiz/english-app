// Each CEFR level keeps its own colour: it identifies the level everywhere on the page.
export const LEVEL_COLOR: Record<string, { solid: string; soft: string; text: string; ring: string; hex: string }> = {
  A1: { solid: 'bg-emerald-500', soft: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', hex: '#10b981' },
  A2: { solid: 'bg-sky-500', soft: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-200', hex: '#0ea5e9' },
  B1: { solid: 'bg-indigo-500', soft: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-200', hex: '#6366f1' },
  B2: { solid: 'bg-fuchsia-500', soft: 'bg-fuchsia-50', text: 'text-fuchsia-700', ring: 'ring-fuchsia-200', hex: '#d946ef' },
  C1: { solid: 'bg-orange-500', soft: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200', hex: '#f97316' },
}
export const colorOf = (levelId: string) => LEVEL_COLOR[levelId] ?? LEVEL_COLOR.B1
