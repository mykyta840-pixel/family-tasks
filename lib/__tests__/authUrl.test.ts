import { describe, expect, it } from 'vitest'
import { parseAuthUrl } from '../authUrl'

describe('parseAuthUrl', () => {
  it('рабочая ссылка восстановления', () => {
    expect(parseAuthUrl('#access_token=abc&expires_in=3600&refresh_token=r&token_type=bearer&type=recovery', '')).toEqual({ recovery: true, error: null })
  })
  it('обычный вход по ссылке (не восстановление) не считается восстановлением', () => {
    expect(parseAuthUrl('#access_token=abc&type=signup', '').recovery).toBe(false)
  })
  it('ссылка устарела', () => {
    const h = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    expect(parseAuthUrl(h, '')).toEqual({ recovery: false, error: 'expired' })
  })
  it('другая ошибка в адресе', () => {
    expect(parseAuthUrl('', '?error=server_error&error_description=boom')).toEqual({ recovery: false, error: 'other' })
  })
  it('пустой адрес и мусор', () => {
    expect(parseAuthUrl('', '')).toEqual({ recovery: false, error: null })
    expect(parseAuthUrl('#/tasks', '?x=1')).toEqual({ recovery: false, error: null })
  })
})
