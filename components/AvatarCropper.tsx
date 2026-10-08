import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n } from '../i18n'
import { cropToJpeg, loadImage } from '../lib/avatar'
import { clampCrop, drawnSize, MAX_ZOOM, sourceRect, type Crop } from '../lib/avatarCrop'

const VIEW = 264 // сторона окна в пикселях экрана; круг вписан в него
const START: Crop = { zoom: 1, x: 0, y: 0 }

// Окно «подвинь и приблизь фото»: человек двигает фото пальцем, щипком или ползунком меняет масштаб.
// Готовый квадрат 512x512 отдаётся в onDone, дальше его загружает вызывающий (как и раньше).
export default function AvatarCropper({ file, onCancel, onDone }: { file: File | null; onCancel: () => void; onDone: (blob: Blob) => void }) {
  const { t } = useI18n()
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [failed, setFailed] = useState(false)
  const [crop, setCrop] = useState<Crop>(START)
  const [saving, setSaving] = useState(false)
  const pts = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)

  useEffect(() => {
    setImg(null)
    setFailed(false)
    setCrop(START)
    setSaving(false)
    if (!file) return
    let alive = true
    loadImage(file).then((i) => alive && setImg(i), () => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [file])

  useEffect(() => {
    if (!file) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [file, onCancel])

  const W = img?.naturalWidth ?? 1
  const H = img?.naturalHeight ?? 1
  const fix = (c: Crop) => clampCrop(W, H, VIEW, c)

  function onDown(e: React.PointerEvent) {
    if (!img) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: crop.zoom }
    }
  }
  function onMove(e: React.PointerEvent) {
    const prev = pts.current.get(e.pointerId)
    if (!prev || !img) return
    const cur = { x: e.clientX, y: e.clientY }
    pts.current.set(e.pointerId, cur)
    if (pts.current.size === 2 && pinch.current) {
      const [a, b] = [...pts.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      const base = pinch.current
      setCrop((c) => fix({ ...c, zoom: base.zoom * (d / base.dist) }))
    } else if (pts.current.size === 1) {
      setCrop((c) => fix({ ...c, x: c.x + cur.x - prev.x, y: c.y + cur.y - prev.y }))
    }
  }
  function onUp(e: React.PointerEvent) {
    pts.current.delete(e.pointerId)
    if (pts.current.size < 2) pinch.current = null
  }

  async function save() {
    if (!img || saving) return
    setSaving(true)
    try {
      onDone(await cropToJpeg(img, sourceRect(W, H, VIEW, crop)))
    } catch {
      setFailed(true)
      setSaving(false)
    }
  }

  const size = drawnSize(W, H, VIEW, crop.zoom)

  // Портал в body: лист профиля имеет transform/overflow, внутри него fixed-окно обрезалось бы
  return createPortal(
    <AnimatePresence>
      {file && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-t-[28px] border-t border-ink/10 bg-paper p-5 shadow-card"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
          >
            <h2 className="text-center font-display text-lg font-semibold">{t('photo.adjustTitle')}</h2>
            <p className="mt-1 text-center text-xs text-ink/55">{failed ? t('err.badImage') : t('photo.adjustHint')}</p>

            <div
              className="relative mx-auto mt-4 touch-none select-none overflow-hidden rounded-2xl bg-ink/10"
              style={{ width: VIEW, height: VIEW }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              {img && (
                <img
                  src={img.src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute max-w-none"
                  style={{
                    width: size.w,
                    height: size.h,
                    left: (VIEW - size.w) / 2 + crop.x,
                    top: (VIEW - size.h) / 2 + crop.y,
                  }}
                />
              )}
              {/* затемнение вокруг круга: то, что вне круга, на аватарке не будет видно */}
              <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/80" style={{ boxShadow: '0 0 0 400px rgba(0,0,0,.55)' }} />
            </div>

            <label className="mt-4 flex items-center gap-3 text-xs font-semibold text-ink/60">
              <span>{t('photo.zoom')}</span>
              <input
                type="range"
                className="h-2 flex-1 accent-brand"
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                value={crop.zoom}
                disabled={!img}
                aria-label={t('photo.zoom')}
                onChange={(e) => setCrop((c) => fix({ ...c, zoom: Number(e.target.value) }))}
              />
            </label>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button className="btn-soft" onClick={onCancel} disabled={saving}>{t('common.cancel')}</button>
              <button className="btn-primary" onClick={() => void save()} disabled={!img || saving}>{t('common.save')}</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
