'use client'

import { Coins } from 'lucide-react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useAppStore, useConversationUsageTotal } from '@/stores/app-store'

/**
 * UsageBadge —— ChatPanel header 里的 token 用量徽章。
 *
 * 显示「Σ N.Nk tok」（该会话累计），hover/click 展开 popover 看 input/output/cache 拆分 +
 * per-agent / per-model 拆分 + ctx 大小（最近一次 input prompt 长度）。
 *
 * 没用量时不渲染（首次进入会话之前没数据）。
 */
export function UsageBadge({ conversationId }: { conversationId: string }) {
  const total = useConversationUsageTotal(conversationId)
  const agents = useAppStore((s) => s.agents)

  if (total.runCount === 0) return null

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'inline-flex shrink-0 items-center gap-1 rounded-md border bg-muted/30 px-2 py-1 font-mono text-[10px] text-muted-foreground transition hover:border-foreground/30 hover:bg-muted hover:text-foreground',
        )}
        title="点击查看 token 用量明细"
      >
        <Coins className="size-3" />
        <span>{formatTok(total.totalTokens)}</span>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 text-xs" align="end">
        <div className="mb-2 flex items-baseline justify-between border-b pb-2">
          <span className="font-medium">本会话 token 累计</span>
          <span className="text-[10px] text-muted-foreground">{total.runCount} 次响应</span>
        </div>

        <div className="space-y-1">
          <Row label="Input" value={total.inputTokens} highlight />
          <Row label="Output" value={total.outputTokens} highlight />
          {total.cacheCreationTokens > 0 && (
            <Row label="Cache 写入" value={total.cacheCreationTokens} />
          )}
          {total.cacheReadTokens > 0 && (
            <Row label="Cache 命中" value={total.cacheReadTokens} className="text-emerald-600" />
          )}
          <div className="my-1 border-t" />
          <Row label="合计" value={total.totalTokens} bold />
          <Row label="当前 ctx" value={total.lastInputTokens} dim hint="最近一次 prompt 大小" />
          {/* Cache 命中率：cacheRead / (input + cacheRead)，只有有 cache 数据时显示 */}
          {total.cacheReadTokens > 0 && (
            <div className="flex items-baseline justify-between gap-3 text-emerald-600">
              <span className="truncate">Cache 命中率</span>
              <span className="shrink-0 font-mono">
                {Math.round(
                  (total.cacheReadTokens * 100) / (total.inputTokens + total.cacheReadTokens),
                )}
                %
                <span className="ml-1 text-[10px] text-muted-foreground">
                  (省 {formatTok(total.cacheReadTokens)} 输入)
                </span>
              </span>
            </div>
          )}
        </div>

        {Object.keys(total.byAgent).length > 1 && (
          <div className="mt-3 border-t pt-2">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              按 Agent
            </div>
            {Object.entries(total.byAgent)
              .sort((a, b) => b[1] - a[1])
              .map(([agentId, n]) => (
                <Row key={agentId} label={agents[agentId]?.name ?? agentId} value={n} />
              ))}
          </div>
        )}

        {Object.keys(total.byModel).length > 0 && (
          <div className="mt-3 border-t pt-2">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              按 Model
            </div>
            {Object.entries(total.byModel)
              .sort((a, b) => b[1] - a[1])
              .map(([modelId, n]) => (
                <Row key={modelId} label={<code className="font-mono">{modelId}</code>} value={n} />
              ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function Row({
  label,
  value,
  highlight,
  bold,
  dim,
  className,
  hint,
}: {
  label: React.ReactNode
  value: number
  highlight?: boolean
  bold?: boolean
  dim?: boolean
  className?: string
  hint?: string
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-3',
        dim && 'text-muted-foreground',
        className,
      )}
    >
      <span className={cn('truncate', bold && 'font-medium')}>{label}</span>
      <span className={cn('shrink-0 font-mono', bold && 'font-semibold')}>
        {formatTok(value)}
        {hint && <span className="ml-1 text-[10px] text-muted-foreground">({hint})</span>}
        {highlight && value === 0 && <span className="ml-1 text-muted-foreground">—</span>}
      </span>
    </div>
  )
}

/** 1234 → "1.2k"；1234567 → "1.23M"；< 1000 → 原样 */
function formatTok(n: number): string {
  if (n < 1000) return `${n}`
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 1)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}
