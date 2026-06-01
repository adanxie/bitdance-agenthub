import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { DEFAULT_COMPANION_PORT } from '@/server/companion-config'
import { getConnectionHints } from '@/server/network-hints'
import { getAppSettings } from '@/server/settings-service'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const settings = await getAppSettings()
  const port =
    settings.companionMode === 'off'
      ? url.port || process.env.PORT || '3000'
      : String(DEFAULT_COMPANION_PORT)
  return NextResponse.json({
    hints: getConnectionHints({
      protocol: url.protocol,
      port,
    }),
    companionMode: settings.companionMode,
    mobileDeviceTokenConfigured: !!settings.mobileDeviceToken,
  })
}
