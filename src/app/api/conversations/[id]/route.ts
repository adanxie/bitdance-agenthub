import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { addAgentsToConversation, deleteConversation } from '@/server/conversation-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  try {
    await deleteConversation(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 404 })
  }
}

const PatchBody = z.object({
  addAgentIds: z.array(z.string()).min(1),
})

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const raw = await req.json().catch(() => null)
  const parsed = PatchBody.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 })
  }

  try {
    const conversation = await addAgentsToConversation({
      conversationId: id,
      agentIds: parsed.data.addAgentIds,
    })
    return NextResponse.json({ conversation })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
