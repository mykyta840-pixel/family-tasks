const COLORS = ['#4F46E5', '#1FA971', '#E5484D', '#8B5CF6', '#F5A524', '#0EA5E9']

export default function Avatar({ name, url, size = 48 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return <img src={url} alt={name} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  }
  const color = COLORS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % COLORS.length]
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-display font-semibold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}
    >
      {(name[0] ?? '?').toUpperCase()}
    </div>
  )
}
