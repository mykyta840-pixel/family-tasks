import { supabase } from './supabase'
import { urlBase64ToUint8Array } from './pushUtil'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

/** false, если в .env/Netlify не задан публичный VAPID-ключ: тогда push-блоки в приложении скрыты. */
export const pushConfigured = Boolean(VAPID)

export type PushState = 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// Включил ли push именно этот человек на этом устройстве (на общем телефоне не подписываем чужой аккаунт)
const flagKey = (uid: string) => `ft.push.${uid}`
const getFlag = (uid: string) => {
  try { return localStorage.getItem(flagKey(uid)) === '1' } catch { return false }
}
const setFlag = (uid: string, on: boolean) => {
  try { on ? localStorage.setItem(flagKey(uid), '1') : localStorage.removeItem(flagKey(uid)) } catch { /* ignore */ }
}

async function registration(timeoutMs = 8000): Promise<ServiceWorkerRegistration> {
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, rej) => window.setTimeout(() => rej(new Error('push_no_sw')), timeoutMs)),
  ])
  return reg
}

async function currentSub(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

async function saveToServer(sub: PushSubscription): Promise<void> {
  const j = sub.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: j.keys?.p256dh ?? '',
    p_auth: j.keys?.auth ?? '',
    p_ua: navigator.userAgent,
  })
  if (error) throw error
}

export async function getPushState(uid: string): Promise<PushState> {
  if (!pushSupported()) return isIos() && !isStandalone() ? 'ios-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted' || !getFlag(uid)) return 'off'
  return (await currentSub()) ? 'on' : 'off'
}

/** Нужно вызывать из нажатия на кнопку (иначе браузер не покажет запрос разрешения). */
export async function enablePush(uid: string): Promise<void> {
  if (!VAPID || !pushSupported()) throw new Error('push_unsupported')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('push_denied')
  const reg = await registration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) })
  }
  try {
    await saveToServer(sub)
  } catch (e) {
    await sub.unsubscribe().catch(() => undefined)
    throw e
  }
  setFlag(uid, true)
}

export async function disablePush(uid: string): Promise<void> {
  setFlag(uid, false)
  const sub = await currentSub()
  if (!sub) return
  await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint })
  await sub.unsubscribe().catch(() => undefined)
}

/** При выходе из аккаунта: устройство больше не получает push этого человека. Подписка в браузере остаётся. */
export async function detachDevice(): Promise<void> {
  if (!pushSupported()) return
  const sub = await currentSub()
  if (sub) await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint })
}

/** Тихо поддерживает подписку: переподписывает, если браузер её сбросил; обновляет владельца. */
export async function syncPush(uid: string): Promise<void> {
  if (!VAPID || !pushSupported() || !getFlag(uid)) return
  if (Notification.permission !== 'granted') {
    if (Notification.permission === 'denied') setFlag(uid, false)
    return
  }
  const reg = await registration(4000)
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID) })
  await saveToServer(sub)
}

/** Тест: создаёт уведомление себе. Возвращает число устройств с push. */
export async function sendTestPush(): Promise<number> {
  const { data, error } = await supabase.rpc('send_test_notification')
  if (error) throw error
  return typeof data === 'number' ? data : 0
}

/** Тест прошёл успешно: сохраняем это в профиле (в базе), чтобы кнопка больше не показывалась ни на одном устройстве. */
export async function markPushTestDone(): Promise<void> {
  const { error } = await supabase.rpc('mark_push_test_done')
  if (error) throw error
}

export { PUSH_TEST_DONE_EVENT, PUSH_TEST_TAG, isPushTestTag } from './pushUtil'
