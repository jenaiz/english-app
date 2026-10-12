// Class builders shared by controls that are not worth a component of their own.

/** A filter or sub-section pill (Club rooms, idiom topics, exam parts). */
export const pillClass = (active: boolean) =>
  `inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition focus-visible:ring-4 focus-visible:ring-indigo-200 focus-visible:outline-none ${
    active ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300'
  }`

/** Count inside a pill: lighter than its label. */
export const pillCountClass = (active: boolean) => `text-xs tabular-nums ${active ? 'text-indigo-200' : 'text-slate-500'}`

/** One option of a segmented control (two or three exclusive views). */
export const segmentClass = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:outline-none ${
    active ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
  }`

/** A text field. `danger` for confirmations of destructive actions. */
export const inputClass = ({ error = false, tone = 'default' }: { error?: boolean; tone?: 'default' | 'danger' } = {}) =>
  `w-full rounded-xl border bg-white px-3 py-2.5 outline-none transition focus:ring-2 disabled:bg-slate-50 ${
    error
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
      : tone === 'danger'
        ? 'border-slate-300 focus:border-red-500 focus:ring-red-100'
        : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
  }`
