import { spawn } from 'node:child_process'
import { platform } from 'node:os'

import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db, schema } from '@/db/client'
import { BANNED_PATTERNS } from '@/server/security'
import { getEffectiveCwd } from '@/server/workspace-utils'

import type { ToolDef } from './types'

const ArgsSchema = z.object({
  command: z.string().min(1),
})

const TIMEOUT_MS = 30_000
const MAX_OUTPUT_CHARS = 10_000

/**
 * 跨平台 shell 选择。本轮只在 macOS / Linux 验证，
 * Windows 分支保留接口，后续兼容时还需补 Windows 专属黑名单（如 del /F /Q、format）。
 */
function getShell(): { cmd: string; args: (command: string) => string[] } {
  if (platform() === 'win32') {
    return { cmd: 'cmd.exe', args: (c) => ['/c', c] }
  }
  return { cmd: 'sh', args: (c) => ['-c', c] }
}

/**
 * bash —— 在 workspace 内跑 shell 命令。
 *
 * cwd 强制为 workspace effective cwd（local → boundPath，sandbox → rootPath）；
 * 命令前匹配黑名单；30s 超时；stdout + stderr 合并到一个字符串截断 10000 字符。
 * AbortSignal 触发时立即 SIGTERM 子进程。
 */
export const bashTool: ToolDef = {
  name: 'bash',
  description:
    "Run a shell command inside the workspace (cwd is set automatically). Use this for git/ls/cat/grep/npm/test runs etc. Output is stdout + stderr combined, truncated to 10000 chars. 30s timeout. Destructive commands (rm -rf /, sudo, fork bombs, curl | sh) are blocked. No interactive stdin.",
  parameters: {
    type: 'object',
    required: ['command'],
    properties: {
      command: {
        type: 'string',
        description: 'Shell command to execute. cwd is the workspace; do not cd elsewhere.',
      },
    },
  },
  async handler(args, ctx) {
    const parsed = ArgsSchema.safeParse(args)
    if (!parsed.success) {
      return { ok: false, error: `Invalid args: ${parsed.error.message}` }
    }

    const command = parsed.data.command
    for (const pat of BANNED_PATTERNS) {
      if (pat.test(command)) {
        return { ok: false, error: `Command rejected by safety policy: ${pat.source}` }
      }
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(schema.workspaces.conversationId, ctx.conversationId),
    })
    if (!workspace) return { ok: false, error: 'Workspace not found' }

    const cwd = getEffectiveCwd(workspace)
    const shell = getShell()

    return new Promise((resolve) => {
      const child = spawn(shell.cmd, shell.args(command), {
        cwd,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      let buffer = ''
      let truncated = false
      const append = (chunk: Buffer) => {
        if (truncated) return
        const text = chunk.toString('utf8')
        if (buffer.length + text.length <= MAX_OUTPUT_CHARS) {
          buffer += text
        } else {
          buffer = (buffer + text).slice(0, MAX_OUTPUT_CHARS)
          truncated = true
        }
      }

      child.stdout?.on('data', append)
      child.stderr?.on('data', append)

      let timedOut = false
      const timer = setTimeout(() => {
        timedOut = true
        child.kill('SIGTERM')
      }, TIMEOUT_MS)

      const onAbort = () => child.kill('SIGTERM')
      ctx.abortSignal.addEventListener('abort', onAbort, { once: true })

      child.on('error', (err) => {
        clearTimeout(timer)
        ctx.abortSignal.removeEventListener('abort', onAbort)
        resolve({
          ok: false,
          error: `Spawn failed: ${err instanceof Error ? err.message : String(err)}`,
        })
      })

      child.on('close', (exitCode, signal) => {
        clearTimeout(timer)
        ctx.abortSignal.removeEventListener('abort', onAbort)
        const note = timedOut
          ? `\n\n[KILLED after ${TIMEOUT_MS / 1000}s timeout]`
          : signal
            ? `\n\n[KILLED by signal ${signal}]`
            : ''
        const truncNote = truncated ? `\n\n[TRUNCATED at ${MAX_OUTPUT_CHARS} chars]` : ''
        resolve({
          ok: true,
          value: {
            cwd,
            command,
            exitCode: exitCode ?? null,
            output: buffer + truncNote + note,
            truncated,
            timedOut,
          },
        })
      })
    })
  },
}
