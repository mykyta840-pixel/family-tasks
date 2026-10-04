// Превращает технические ошибки в понятный русский текст
const MAP: Record<string, string> = {
  'Invalid login credentials': 'Неверная почта или пароль.',
  'User already registered': 'Эта почта уже зарегистрирована. Войдите.',
  'Email not confirmed': 'Почта не подтверждена. Проверьте письмо.',
  invalid_code: 'Код не подошёл. Проверьте его или попросите новый.',
  already_in_family: 'Вы уже состоите в семье.',
  not_allowed: 'Нет прав на это действие.',
  not_pending: 'Это уже обработано.',
  already_submitted: 'Задание уже отправлено на проверку.',
  already_requested: 'Заявка на эту награду уже отправлена.',
  not_enough_points: 'Не хватает баллов.',
}

export function humanError(err: unknown): string {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err)
  for (const key of Object.keys(MAP)) if (msg.includes(key)) return MAP[key]
  if (/password/i.test(msg) && /(6|short|weak)/i.test(msg)) return 'Пароль должен быть не короче 6 символов.'
  if (/fetch|network|failed to/i.test(msg)) return 'Нет связи с интернетом. Попробуйте ещё раз.'
  return 'Что-то пошло не так. Попробуйте ещё раз.'
}
