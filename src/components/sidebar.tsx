'use client'

import { PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { NewConversationDialog } from '@/components/new-conversation-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { fetchAgents, fetchConversations } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAppStore, useConversationList } from '@/stores/app-store'

export function Sidebar() {
  const conversations = useConversationList()
  const activeId = useAppStore((s) => s.activeConversationId)
  const setActive = useAppStore((s) => s.setActiveConversation)
  const setConversations = useAppStore((s) => s.setConversations)
  const setAgents = useAppStore((s) => s.setAgents)
  const agents = useAppStore((s) => s.agents)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetchConversations().then(setConversations).catch(console.error)
    fetchAgents().then(setAgents).catch(console.error)
  }, [setConversations, setAgents])

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col overflow-hidden border-r bg-card transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-72',
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex shrink-0 items-center border-b',
          collapsed ? 'justify-center px-1 py-3' : 'justify-between px-4 py-3',
        )}
      >
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">AgentHub</h1>
            <p className="truncate text-xs text-muted-foreground">多 Agent 协作平台</p>
          </div>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          title={collapsed ? '展开' : '收起'}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>

      {/* New conversation button */}
      <div className={cn('shrink-0', collapsed ? 'flex justify-center py-2' : 'px-3 pt-3')}>
        {collapsed ? (
          <Button
            size="icon"
            variant="outline"
            onClick={() => setDialogOpen(true)}
            title="新建对话"
          >
            <Plus className="size-4" />
          </Button>
        ) : (
          <Button
            className="w-full justify-start gap-2"
            variant="outline"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-4" />
            新建对话
          </Button>
        )}
      </div>

      {/* Conversation list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 p-2">
          {conversations.length === 0
            ? !collapsed && (
                <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                  没有会话
                </div>
              )
            : conversations.map((c) => {
                const firstAgent = c.agentIds[0] ? agents[c.agentIds[0]] : null
                const isActive = activeId === c.id

                if (collapsed) {
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActive(c.id)}
                      title={c.title}
                      className={cn(
                        'flex w-full justify-center rounded-md p-1.5 transition hover:bg-accent',
                        isActive && 'bg-accent ring-2 ring-primary/50',
                      )}
                    >
                      <Avatar className="size-8">
                        <AvatarFallback className="text-sm">
                          {firstAgent?.avatar ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  )
                }

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActive(c.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-accent',
                      isActive && 'bg-accent',
                    )}
                  >
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback className="text-sm">
                        {firstAgent?.avatar ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{c.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {c.mode === 'single' ? '单聊' : '群聊'} · {c.agentIds.length} 位 Agent
                      </div>
                    </div>
                  </button>
                )
              })}
        </div>
      </ScrollArea>

      <NewConversationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </aside>
  )
}
