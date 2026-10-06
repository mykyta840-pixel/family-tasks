// Встроенная библиотека иконок заданий. В базе (tasks.icon) хранится только ключ.
// Чтобы добавить иконку: 1) ключ сюда, 2) компонент в components/taskIconMap.ts, 3) подпись icon.<ключ> во всех locales.
export type IconGroup = 'home' | 'school' | 'sport' | 'pets' | 'care' | 'help' | 'general'

export const ICON_GROUPS: IconGroup[] = ['home', 'school', 'sport', 'pets', 'care', 'help', 'general']

// Неоновый оттенок группы, каналы "R G B" (читаются на светлых и тёмных темах)
export const GROUP_RGB: Record<IconGroup, string> = {
  home: '34 190 230',
  school: '150 120 250',
  sport: '40 200 140',
  pets: '245 170 40',
  care: '240 100 170',
  help: '250 120 70',
  general: '130 140 250',
}

export const TASK_ICON_KEYS = [
  'clean', 'dishes', 'trash', 'laundry', 'clothes', 'bed', 'room', 'air', 'wipe', 'cook', 'recycle',
  'school', 'homework', 'reading', 'bag', 'math', 'language', 'art', 'music',
  'sport', 'bike', 'walk',
  'pets', 'dog', 'cat', 'plants', 'garden',
  'hygiene', 'shower', 'wash',
  'shopping', 'help', 'car', 'food',
  'general',
] as const

export type TaskIconKey = (typeof TASK_ICON_KEYS)[number]

export const DEFAULT_ICON: TaskIconKey = 'general'

export const ICON_GROUP_OF: Record<TaskIconKey, IconGroup> = {
  clean: 'home', dishes: 'home', trash: 'home', laundry: 'home', clothes: 'home', bed: 'home', room: 'home', air: 'home', wipe: 'home', cook: 'home', recycle: 'home',
  school: 'school', homework: 'school', reading: 'school', bag: 'school', math: 'school', language: 'school', art: 'school', music: 'school',
  sport: 'sport', bike: 'sport', walk: 'sport',
  pets: 'pets', dog: 'pets', cat: 'pets', plants: 'pets', garden: 'pets',
  hygiene: 'care', shower: 'care', wash: 'care',
  shopping: 'help', help: 'help', car: 'help', food: 'help',
  general: 'general',
}

export function isTaskIconKey(v: unknown): v is TaskIconKey {
  return typeof v === 'string' && (TASK_ICON_KEYS as readonly string[]).includes(v)
}

/** Неизвестный или пустой ключ даёт иконку по умолчанию (на случай, если иконку позже уберут из библиотеки). */
export function resolveIconKey(v: string | null | undefined): TaskIconKey {
  return isTaskIconKey(v) ? v : DEFAULT_ICON
}

export function iconsOfGroup(g: IconGroup): TaskIconKey[] {
  return TASK_ICON_KEYS.filter((k) => ICON_GROUP_OF[k] === g)
}
