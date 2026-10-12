import { useEffect } from 'react'
import { DEFAULT_META, type PageMeta } from './expressionPages'

/** Sets the document's title and description while the page is shown, and starts it at the top. */
export function usePageMeta(meta: PageMeta | null) {
  const title = meta?.title
  const content = meta?.description
  useEffect(() => {
    if (!title) return
    const description = document.querySelector('meta[name="description"]')
    document.title = title
    if (content) description?.setAttribute('content', content)
    window.scrollTo(0, 0)
    // Other pages don't set their own, so leave the defaults behind (even when this page was the entry point).
    return () => {
      document.title = DEFAULT_META.title
      description?.setAttribute('content', DEFAULT_META.description)
    }
  }, [title, content])
}
