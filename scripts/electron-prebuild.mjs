// 把 next build 输出里的静态资源 / public 拷进 .next/standalone 子树；
// 清理 pnpm 在 .next/standalone/node_modules/.pnpm/node_modules/ 留下的 dangling symlinks。
// better-sqlite3 的 ABI 修正不在这里做（见 scripts/electron-after-pack.mjs：electron-builder
// 打完包后再覆盖 standalone 副本，因为只有那个时点顶层 better-sqlite3 已被 rebuild 到 Electron ABI）。
// 详见 Spec 12 §6 / §7。

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const standaloneDir = path.join(root, '.next', 'standalone')

if (!fs.existsSync(standaloneDir)) {
  console.error('✗ No .next/standalone — 先跑 `next build`')
  process.exit(1)
}

function copyIfExists(src, dest, label) {
  if (!fs.existsSync(src)) return
  fs.cpSync(src, dest, { recursive: true, force: true })
  console.log(`✓ ${label}`)
}

// .next/static → .next/standalone/.next/static（前端 chunks / 图标走这个）
copyIfExists(
  path.join(root, '.next', 'static'),
  path.join(standaloneDir, '.next', 'static'),
  'copied .next/static → standalone/.next/',
)

// public → .next/standalone/public（favicon / 静态图等）
copyIfExists(
  path.join(root, 'public'),
  path.join(standaloneDir, 'public'),
  'copied public → standalone/',
)

// 清理两类有害 symlink，electron-builder 打包时都会被 7-zip stat / 解引用，标准化失败 → 整个 build 中断：
//   (a) 链接目标不存在（pnpm hoist 入口指向未被 standalone 拷贝的旧版本，例如
//       .pnpm/node_modules/semver -> ../semver@6.3.1/...，而 standalone 只带了 semver@7.8.1）
//   (b) 链接目标是绝对路径且落在 standalone 树之外（Next.js file tracer 在
//       .next/standalone/.next/node_modules/<pkg>-<hash> 留下指向源仓库 .pnpm 真身的绝对 symlink）。
//       这些链接 fs.statSync 能跑通，但 7-zip 打包时会触发「系统找不到指定的路径」。
const isWin = process.platform === 'win32'
const standaloneKey = isWin ? path.resolve(standaloneDir).toLowerCase() : path.resolve(standaloneDir)
function isOutsideStandalone(absTarget) {
  const key = isWin ? path.resolve(absTarget).toLowerCase() : path.resolve(absTarget)
  return key !== standaloneKey && !key.startsWith(standaloneKey + path.sep)
}

const broken = []
function scan(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const p = path.join(dir, entry.name)
    if (entry.isSymbolicLink()) {
      // (a) dangling
      try {
        fs.statSync(p)
      } catch {
        broken.push(p)
        continue
      }
      // (b) absolute target pointing outside standalone
      try {
        const target = fs.readlinkSync(p)
        const resolved = path.isAbsolute(target) ? target : path.resolve(path.dirname(p), target)
        if (isOutsideStandalone(resolved)) {
          broken.push(p)
        }
      } catch {
        // readlink 失败的当 dangling 处理
        broken.push(p)
      }
    } else if (entry.isDirectory()) {
      scan(p)
    }
  }
}
scan(standaloneDir)
for (const link of broken) {
  try {
    fs.unlinkSync(link)
  } catch {
    // ignore；下一个步骤可能会再处理
  }
}
console.log(`✓ removed ${broken.length} broken / out-of-tree symlink(s)`)



