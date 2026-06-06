import type { PptTheme } from './types'

/** resolvePptTheme 填充后的完整视觉 token；颜色为不带 # 的 hex。 */
export interface ResolvedPptTheme {
  primary: string
  background: string
  surface: string
  textBody: string
  textMuted: string
  accentPositive: string
  accentNegative: string
  divider: string
  fontHeading: string
  fontBody: string
}

/** 中性专业默认（参考商务汇报视觉规范），LLM 只给部分 token 时其余仍有像样的值。 */
export const DEFAULT_PPT_THEME: ResolvedPptTheme = {
  primary: '1A3C6E',
  background: 'F8F9FA',
  surface: 'FFFFFF',
  textBody: '2C3E50',
  textMuted: '95A5A6',
  accentPositive: '2B7A4B',
  accentNegative: 'C0392B',
  divider: 'E0E4E8',
  fontHeading: 'Inter',
  fontBody: 'Inter',
}

const hex = (v: string | undefined): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().replace(/^#/, '') : undefined

/** 把可选 + 可能含旧字段名（primaryColor/fontFace）的 PptTheme 解析成完整 token；缺失项用默认补。 */
export function resolvePptTheme(theme?: PptTheme): ResolvedPptTheme {
  const t = theme ?? {}
  const d = DEFAULT_PPT_THEME
  return {
    primary: hex(t.primary) ?? hex(t.primaryColor) ?? d.primary,
    background: hex(t.background) ?? d.background,
    surface: hex(t.surface) ?? d.surface,
    textBody: hex(t.textBody) ?? d.textBody,
    textMuted: hex(t.textMuted) ?? d.textMuted,
    accentPositive: hex(t.accentPositive) ?? d.accentPositive,
    accentNegative: hex(t.accentNegative) ?? d.accentNegative,
    divider: hex(t.divider) ?? d.divider,
    fontHeading: t.fontHeading?.trim() || t.fontFace?.trim() || d.fontHeading,
    fontBody: t.fontBody?.trim() || t.fontFace?.trim() || d.fontBody,
  }
}
