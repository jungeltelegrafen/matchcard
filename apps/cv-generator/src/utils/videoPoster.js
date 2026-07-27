// Poster image for a video card: the recorded thumbnail if present, else a
// derived thumbnail for known link providers (YouTube/Vimeo), else none.
export function videoPoster(v) {
  if (v?.thumbnailUrl) return v.thumbnailUrl
  const url = v?.playbackUrl || ''
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/)
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`
  return ''
}
