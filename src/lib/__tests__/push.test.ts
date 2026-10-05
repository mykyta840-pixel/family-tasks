import { describe, expect, it } from 'vitest'
import { pathFromUrl, urlBase64ToUint8Array } from '../pushUtil'

describe('urlBase64ToUint8Array', () => {
  it('декодирует base64url без паддинга', () => {
    // "hello" = aGVsbG8
    expect(Array.from(urlBase64ToUint8Array('aGVsbG8'))).toEqual([104, 101, 108, 108, 111])
  })
  it('понимает - и _ как + и /', () => {
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255])
  })
})

describe('pathFromUrl', () => {
  const origin = 'https://app.example.com'
  it('возвращает путь и параметры своего сайта', () => {
    expect(pathFromUrl('https://app.example.com/?task=42', origin)).toBe('/?task=42')
    expect(pathFromUrl('/rewards', origin)).toBe('/rewards')
  })
  it('чужие сайты не пропускает', () => {
    expect(pathFromUrl('https://evil.example.org/x', origin)).toBeNull()
  })
})
