import { describe, expect, it } from 'vitest'

import { DEFAULT_PPT_THEME, resolvePptTheme } from './ppt-theme'

describe('resolvePptTheme', () => {
  it('fills all tokens with defaults when theme is undefined', () => {
    expect(resolvePptTheme(undefined)).toEqual(DEFAULT_PPT_THEME)
  })

  it('keeps provided tokens, defaults the rest', () => {
    const r = resolvePptTheme({ primary: '1A3C6E', background: 'F8F9FA' })
    expect(r.primary).toBe('1A3C6E')
    expect(r.background).toBe('F8F9FA')
    expect(r.textBody).toBe(DEFAULT_PPT_THEME.textBody)
    expect(r.accentPositive).toBe(DEFAULT_PPT_THEME.accentPositive)
  })

  it('strips leading # and maps legacy primaryColor/fontFace', () => {
    const r = resolvePptTheme({ primaryColor: '#123ABC', fontFace: 'Georgia' })
    expect(r.primary).toBe('123ABC')
    expect(r.fontHeading).toBe('Georgia')
    expect(r.fontBody).toBe('Georgia')
  })

  it('prefers new fields over legacy', () => {
    expect(resolvePptTheme({ primary: 'AAAAAA', primaryColor: 'BBBBBB' }).primary).toBe('AAAAAA')
  })
})
