import { useState, type CSSProperties } from 'react'
import { GROUP_RGB, ICON_GROUP_OF, resolveIconKey } from '../lib/taskIconKeys'
import { ICON_COMPONENT } from './taskIconMap'
import type { Task } from '../lib/tasks'

// Неоновая стеклянная плитка со встроенной иконкой. Размер задаёт вызывающий (className).
export function TaskIconTile({ iconKey, className = '', iconSize = 24, selected = false }: { iconKey?: string | null; className?: string; iconSize?: number; selected?: boolean }) {
  const key = resolveIconKey(iconKey)
  const rgb = GROUP_RGB[ICON_GROUP_OF[key]]
  const Icon = ICON_COMPONENT[key]
  const style: CSSProperties = {
    background: `linear-gradient(145deg, rgb(${rgb} / .30), rgb(${rgb} / .08))`,
    boxShadow: `inset 0 0 0 1px rgb(${rgb} / ${selected ? '.9' : '.38'}), 0 0 ${selected ? 26 : 18}px -5px rgb(${rgb} / ${selected ? '.9' : '.6'})`,
    color: `rgb(${rgb})`,
  }
  return (
    <div className={`grid shrink-0 place-items-center ${className}`} style={style} aria-hidden>
      <Icon size={iconSize} strokeWidth={2} style={{ filter: `drop-shadow(0 0 6px rgb(${rgb} / .7))` }} />
    </div>
  )
}

// Старые задания с загруженной картинкой продолжают её показывать
export function TaskImage({ url, className = '', iconSize = 32 }: { url?: string | null; className?: string; iconSize?: number }) {
  const [failed, setFailed] = useState(false)
  if (url && !failed) {
    return (
      <div className={`overflow-hidden bg-brand-soft ${className}`}>
        <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      </div>
    )
  }
  return <TaskIconTile iconKey={null} className={className} iconSize={iconSize} />
}

// Что показать у задания: иконка -> старая картинка -> иконка по умолчанию
export default function TaskVisual({ task, className = '', iconSize = 28 }: { task: Pick<Task, 'icon' | 'image_url'>; className?: string; iconSize?: number }) {
  if (task.icon) return <TaskIconTile iconKey={task.icon} className={className} iconSize={iconSize} />
  if (task.image_url) return <TaskImage url={task.image_url} className={className} iconSize={iconSize} />
  return <TaskIconTile iconKey={null} className={className} iconSize={iconSize} />
}
