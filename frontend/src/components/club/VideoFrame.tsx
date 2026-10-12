import { AlertCircle, Loader2, Play } from 'lucide-react'
import { youtubeThumb } from '../../lib/club'
import type { useYouTubePlayer } from '../../lib/useYouTubePlayer'

/**
 * 16:9 frame for a YouTube player. Until the learner presses play it only shows the
 * thumbnail: the video (and YouTube's cookies) load on demand.
 */
export default function VideoFrame({ player, videoId, label }: { player: ReturnType<typeof useYouTubePlayer>; videoId: string; label: string }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-900 shadow-lg [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full">
      <div ref={player.mountRef} className="absolute inset-0" />
      {!player.requested && (
        <button type="button" onClick={player.load} className="group absolute inset-0 grid place-items-center" aria-label={`Reproducir ${label}`}>
          <img src={youtubeThumb(videoId)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:opacity-100" />
          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-red-600 text-white shadow-xl transition group-hover:scale-110">
            <Play className="ml-1 h-8 w-8 fill-current" />
          </span>
          <span className="absolute right-3 bottom-3 left-3 text-center text-xs text-white/80 drop-shadow">
            El vídeo se carga desde YouTube al pulsar
          </span>
        </button>
      )}
      {player.requested && !player.ready && !player.error && (
        <div className="absolute inset-0 grid place-items-center text-white/70">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
      {player.error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900 p-4 text-center text-sm text-red-200">
          <AlertCircle className="h-6 w-6" />
          <p>{player.error}.</p>
          <a
            href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white underline"
          >
            Ver en YouTube
          </a>
        </div>
      )}
    </div>
  )
}
