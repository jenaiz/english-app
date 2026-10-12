/** The credit line every song and video shows: whose work it is, where it comes from, and why it's here. */
export default function Attribution({ kind, title, author, source, href }: { kind: 'Canción' | 'Vídeo'; title: string; author?: string; source: string; href?: string }) {
  return (
    <p className="mt-2 text-xs text-slate-500">
      {kind}: «{title}»{author && <> de {author}</>}.{' '}
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">
          {source}
        </a>
      ) : (
        source
      )}
      . Solo con fines educativos.
    </p>
  )
}
