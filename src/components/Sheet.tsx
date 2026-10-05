import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// Окно, выезжающее снизу. Закрывается нажатием на затемнение или клавишей Esc.
export default function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden' // страница под окном не прокручивается
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/55 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="max-h-[90%] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[28px] border-t border-ink/10 bg-paper p-5 shadow-card"
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
