import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db, schema } from '@/db/client'
import { artifactPreviewPath } from '@/lib/artifact-preview'
import { newDeploymentId } from '@/server/ids'
import type { ArtifactContent, DeployStatusRecord } from '@/shared/types'

import type { ToolDef } from './types'

const ArgsSchema = z.object({
  artifactId: z.string().min(1),
})

export const deployArtifactTool: ToolDef = {
  name: 'deploy_artifact',
  description:
    'Create a ready preview deployment for a web_app artifact and return its preview URL path. Use after write_artifact when the user should be able to open the generated app.',
  parameters: {
    type: 'object',
    required: ['artifactId'],
    properties: {
      artifactId: {
        type: 'string',
        description: 'Id of the web_app artifact to deploy, format art_xxx',
      },
    },
  },
  async handler(args, ctx) {
    const parsed = ArgsSchema.safeParse(args)
    if (!parsed.success) {
      return { ok: false, error: `Invalid args: ${parsed.error.message}` }
    }

    const artifact = await db.query.artifacts.findFirst({
      where: and(
        eq(schema.artifacts.id, parsed.data.artifactId),
        eq(schema.artifacts.conversationId, ctx.conversationId),
      ),
    })
    if (!artifact) {
      return {
        ok: true,
        value: failedDeployment(parsed.data.artifactId, 'Unknown artifact', 'Artifact not found'),
      }
    }

    const content = artifact.content as ArtifactContent
    if (content.type !== 'web_app') {
      return {
        ok: true,
        value: failedDeployment(
          artifact.id,
          artifact.title,
          `Artifact type "${content.type}" cannot be deployed as a web app`,
          artifact.version,
        ),
      }
    }

    return {
      ok: true,
      value: {
        id: newDeploymentId(),
        artifactId: artifact.id,
        title: artifact.title,
        version: artifact.version,
        previewPath: artifactPreviewPath(artifact.id),
        status: 'ready',
        createdAt: Date.now(),
      } satisfies DeployStatusRecord,
    }
  },
}

function failedDeployment(
  artifactId: string,
  title: string,
  error: string,
  version = 0,
): DeployStatusRecord {
  return {
    id: newDeploymentId(),
    artifactId,
    title,
    version,
    previewPath: artifactPreviewPath(artifactId),
    status: 'failed',
    error,
    createdAt: Date.now(),
  }
}
