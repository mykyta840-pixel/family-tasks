import { describe, expect, it } from 'vitest'
import { humanError } from '../errors'

describe('humanError', () => {
  it('известные коды из базы', () => {
    expect(humanError(new Error('not_enough_points'))).toBe('Не хватает баллов.')
    expect(humanError({ message: 'invalid_code' })).toContain('Код не подошёл')
    expect(humanError({ message: 'already_in_family' })).toBe('Вы уже состоите в семье.')
  })

  it('ошибки входа', () => {
    expect(humanError(new Error('Invalid login credentials'))).toBe('Неверная почта или пароль.')
    expect(humanError(new Error('User already registered'))).toContain('уже зарегистрирована')
  })

  it('короткий пароль', () => {
    expect(humanError(new Error('Password should be at least 6 characters'))).toContain('не короче 6')
  })

  it('нет интернета', () => {
    expect(humanError(new TypeError('Failed to fetch'))).toContain('Нет связи')
  })

  it('неизвестное и странные значения не ломают функцию', () => {
    const fallback = 'Что-то пошло не так. Попробуйте ещё раз.'
    expect(humanError(new Error('xyz'))).toBe(fallback)
    expect(humanError(null)).toBe(fallback)
    expect(humanError(undefined)).toBe(fallback)
    expect(humanError(42)).toBe(fallback)
  })

  it('код внутри длинного сообщения тоже находится', () => {
    expect(humanError({ message: 'P0001: not_allowed (context)' })).toBe('Нет прав на это действие.')
  })
})
