import { useState } from 'react'

const COLORS = ['#4F46E5', '#1FA971', '#E5484D', '#8B5CF6', '#F5A524', '#0EA5E9']

export default function Avatar({ name, url, size = 48 }: { name: string; url?: string | null; size?: number }) {
  // Если файл фото не открылся (удалён, нет сети), вместо «битой картинки» показываем кружок с буквой
  const [badUrl, setBadUrl] = useState<string | null>(null)
  if (url && badUrl !== url) {
    return (
      <img
        src={url} alt={name} onError={() => setBadUrl(url)}
        className="shrink-0 rounded-full object-cover object-center" style={{ width: size, height: size, aspectRatio: '1 / 1' }}
      />
    )
  }
  const color = COLORS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % COLORS.length]
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-display font-semibold text-on-brand"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {(name[0] ?? '?').toUpperCase()}
    </div>
  )
}
