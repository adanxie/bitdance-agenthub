// 确保 better-sqlite3 是「当前 Node」的 ABI —— `pnpm dev` 跑在纯 Node 下。
//
// 为什么 dev 不再走 run-electron-node:在 ELECTRON_RUN_AS_NODE 下,Next dev server
// 的请求/渲染 worker 起不来,所有 HTTP 请求挂死(0 字节)。纯 Node 下 Next dev 正常。
// 但仓库为 Electron 打包把 better-sqlite3 钉在 Electron ABI;故 dev 启动时检测 ABI,
// 不符就为当前 Node 重新编译。切回 Electron(electron:dev / electron:build)用
// `pnpm electron:rebuild` 钉回 Electron ABI。一份 .node 只能是一种 ABI,两模式切换各 rebuild 一次。
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

try {
  // 仅加载 binding(不开库),命中 ABI 不符会抛 ERR_DLOPEN_FAILED
  require('better-sqlite3')
} catch (err) {
  if (err && err.code === 'ERR_DLOPEN_FAILED') {
    console.log('[dev] better-sqlite3 为其它 ABI(疑似 Electron),正在为当前 Node 重新编译…')
    execSync('pnpm rebuild better-sqlite3', { stdio: 'inherit' })
  } else {
    throw err
  }
}
