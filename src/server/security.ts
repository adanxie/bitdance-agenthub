/**
 * 跨 adapter / 工具共享的安全策略。
 *
 * BANNED_PATTERNS 来自 CLAUDE.md §5.2，禁止执行的命令模式。
 * Bash 工具 (`src/server/tools/bash.ts`) 与 Claude Code adapter (`src/server/adapters/claude-code-adapter.ts`)
 * 在执行 / 放行 shell 命令前都要走一遍。
 *
 * 新增 / 调整规则时同步 CLAUDE.md §5.2。
 */
export const BANNED_PATTERNS: RegExp[] = [
  /\brm\s+-rf\s+\//,
  /\bsudo\b/,
  /\bchmod\s+\d{3,4}\s+\//,
  /:\(\)\{\s*:\|:&\s*\}/, // fork bomb
  /curl\s+[^|]*\|\s*(bash|sh)/,
  /wget\s+[^|]*\|\s*(bash|sh)/,
  /\beval\b/,
  /\bexec\b\s+/,
]

/** 命中黑名单的返回值；调用方据此 deny。null 表示未命中。 */
export function findBannedPattern(command: string): RegExp | null {
  for (const pat of BANNED_PATTERNS) {
    if (pat.test(command)) return pat
  }
  return null
}
