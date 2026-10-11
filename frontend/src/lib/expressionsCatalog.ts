import { api } from '../api/client'
import type { ExpressionsCatalog } from '../types'

let cached: Promise<ExpressionsCatalog> | null = null

/** The Expresiones catalog, fetched once per page load (it is static content). */
export function loadExpressions(): Promise<ExpressionsCatalog> {
  if (!cached) {
    cached = api.expressions()
    cached.catch(() => {
      cached = null // let the next caller retry
    })
  }
  return cached
}
