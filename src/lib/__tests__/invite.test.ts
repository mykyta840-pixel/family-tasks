import { describe, expect, it } from 'vitest'
import { assertOkReply, formatCodeInput, looksLikeCode, normalizeCode, parseCheckReply } from '../invite'
import { humanError } from '../errors'

describe('normalizeCode', () => {
  it('убирает дефисы, пробелы и приводит к заглавным', () => {
    expect(normalizeCode(' fam-7k29x ')).toBe('FAM7K29X')
    expect(normalizeCode('ret 7k29x8')).toBe('RET7K29X8')
    expect(normalizeCode('')).toBe('')
  })
})

describe('formatCodeInput', () => {
  it('сам ставит дефис после FAM и RET', () => {
    expect(formatCodeInput('fam7k29x')).toBe('FAM-7K29X')
    expect(formatCodeInput('RET7K29X8')).toBe('RET-7K29X8')
    expect(formatCodeInput('fam-7k29x')).toBe('FAM-7K29X')
  })
  it('пока набрано только начало, дефис не нужен', () => {
    expect(formatCodeInput('fa')).toBe('FA')
    expect(formatCodeInput('FAM')).toBe('FAM')
  })
  it('старый код из 10 символов остаётся без дефиса', () => {
    expect(formatCodeInput('a1b2c3d4e5')).toBe('A1B2C3D4E5')
  })
  it('слишком длинный ввод обрезается', () => {
    expect(formatCodeInput('FAM-7K29XABCDEFGHIJ').replace('-', '').length).toBeLessThanOrEqual(12)
  })
})

describe('looksLikeCode', () => {
  it('короткое не отправляем', () => {
    expect(looksLikeCode('FAM')).toBe(false)
    expect(looksLikeCode('FAM-7K29X')).toBe(true)
  })
})

describe('parseCheckReply', () => {
  it('код ребёнка', () => {
    expect(parseCheckReply({ ok: true, kind: 'invite', role: 'child', family: 'Ивановы' })).toEqual({ kind: 'invite', role: 'child', family: 'Ивановы' })
  })
  it('код родителя', () => {
    expect(parseCheckReply({ ok: true, kind: 'invite', role: 'parent', family: 'Ивановы' }).kind).toBe('invite')
  })
  it('код возврата', () => {
    expect(parseCheckReply({ ok: true, kind: 'return', child: 'Маша' })).toEqual({ kind: 'return', child: 'Маша' })
  })
  it('неверный код и лимит попыток', () => {
    expect(() => parseCheckReply({ ok: false, reason: 'invalid' })).toThrow('invalid_code')
    expect(() => parseCheckReply({ ok: false, reason: 'too_many' })).toThrow('too_many_attempts')
  })
  it('странный ответ не ломает и считается неверным кодом', () => {
    expect(() => parseCheckReply(null)).toThrow('invalid_code')
    expect(() => parseCheckReply('x')).toThrow('invalid_code')
    expect(() => parseCheckReply({ ok: true, kind: 'invite', role: 'admin' })).toThrow('invalid_code')
  })
})

describe('assertOkReply', () => {
  it('ok проходит, остальное бросает ошибку', () => {
    expect(() => assertOkReply({ ok: true, role: 'child' })).not.toThrow()
    expect(() => assertOkReply({ ok: false, reason: 'invalid' })).toThrow('invalid_code')
    expect(() => assertOkReply({ ok: false, reason: 'too_many' })).toThrow('too_many_attempts')
    expect(() => assertOkReply(undefined)).toThrow('invalid_code')
  })
})

describe('тексты ошибок входа по коду', () => {
  it('понятные сообщения по-русски', () => {
    expect(humanError(new Error('too_many_attempts'))).toContain('Слишком много')
    expect(humanError(new Error('invalid_code'))).toContain('Код не подошёл')
    expect(humanError({ message: 'Anonymous sign-ins are disabled' })).toContain('Allow anonymous sign-ins')
    expect(humanError({ message: 'parent_needs_account' })).toContain('родител')
  })
})
