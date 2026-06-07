# AgentHub

> 把多 Agent 协作做成 IM 群聊体验。Agent 是「联系人」，对话是「工作空间」，Orchestrator 是「群里的项目经理」。

AgentHub 是一个多 Agent 协作平台，通过对话式交互让用户与不同 AI Agent（Claude Code、自建 Agent 等）协同工作 —— 创建网页、写文档、改代码、跑命令。所有交互以 IM 群聊为核心范式：会话即工作空间，消息即指令，产物即落地。

```
┌─ 侧栏 ───────┬─ 当前会话 ────────────────────────┬─ 右侧面板 ────────┐
│ 📁 对话      │ Header: Agent 头像  Token Σ      │ Artifact 预览     │
│ 🎨 产物库     │ ───────────────────────────────  │ Web/Doc/Image     │
│ 🤖 Agents    │ User: 给我做个 todo 网页          │ + 版本切换 v1/v2  │
│ 📊 分析      │ Agent: 已生成 [产物卡片]          │                   │
│              │ ☆ 收藏 + ☑ 重新生成 + 引用片段     │ 文件浏览器 (alt) │
└──────────────┴───────────────────────────────────┴───────────────────┘
              ↑ MessageInput: 附件 / 审批模式 / 选区改写 quote chip
```

---

## ✨ 功能矩阵

### IM 聊天式交互
- 多会话并行 + 搜索 + 置顶 + 归档 + 未读红点
- 单聊 / 群聊（@ mention）+ Orchestrator 自动协调
- 消息：text / code / thinking / 图片 / 文件 / 产物卡片 / Diff 审批卡 / 调度可视化
- 操作：引用回复、撤回、编辑重发、重新生成、收藏 ☆ / Pin（注入 LLM 上下文）+ 跳转高亮辉光

### 多 Agent 接入
| Adapter | 状态 | 用法 |
|---|---|---|
| **ClaudeCodeAdapter** | ✅ | `@anthropic-ai/claude-agent-sdk` + 全套工具（Bash/Edit/Read/Write/Grep/Glob/WebFetch/Task subagent）+ Session 续接 |
| **CustomAgentAdapter** | ✅ | OpenAI Chat Completions 兼容协议，接 DeepSeek / OpenAI / 火山方舟 / 自定义 OpenAI-compatible Base URL |
| **CodexAdapter** | ✅ | `@openai/codex-sdk` + Codex 本地命令/文件变更事件 + Thread 续接；使用 AgentHub 隔离 CODEX_HOME；自定义 Base URL 必须支持 Codex/Responses |
| **MockAdapter** | ✅ | 开发期不烧 token |
| **自建 Agent** | ✅ | 对话式创建，System Prompt + 工具集 |

支持第三方 API 网关（per-agent `apiBaseUrl` + token），但按 adapter 分协议：Claude Code 需要 Anthropic 兼容 endpoint，Custom 的 `openai-compatible` provider 需要 OpenAI Chat Completions 兼容 endpoint（如通义千问 compatible-mode、智谱、MiniMax、OpenRouter、SiliconFlow），Codex 需要 Codex/Responses 兼容 endpoint。DeepSeek 没有 `/responses`，应走 CustomAgentAdapter。

### 工具系统（统一适配层）
| 工具 | 说明 |
|---|---|
| `write_artifact` / `read_artifact` | 创建 / 读取可预览产物（含版本链） |
| `read_attachment` | 读用户上传附件 |
| `fs_read` / `fs_write` / `bash` | Workspace 文件操作 + Shell 命令（沙箱化 + 黑名单） |
| `plan_tasks` | Orchestrator 三阶段 DAG 调度 |
| `ask_user` | 结构化弹窗问答（2-4 选项 / 多选 / 自由输入） |

Claude Code Agent 通过 SDK MCP server 同样可以用这套工具。

### 产物预览与编辑
- 内联卡片 + 全屏预览面板
- web_app：iframe sandbox + 源码切换；document：Markdown 渲染；image / 版本对比 diff（历史 diff 只读）/ code_file（workspace 文件）
- **ppt：幻灯片分页预览（背景/主色/字体按设计 theme token 渲染）+ 一键导出真 .pptx**（pptxgenjs，Office 可打开）
- 版本历史链（parentArtifactId）+ 一键 v1↔v2 切换
- 选中文字 → 浮动「让 Agent 改这段」按钮 → 引用块自动注入

### Workspace 沙箱
- 每个会话独立工作目录（sandbox 模式：`.agenthub-data/workspaces/<convId>`；local 模式：绑用户真实项目目录）
- Agent fs_write 审批：Review 模式（默认，diff viewer 确认）/ Auto 模式（直写）
- Bash 黑名单（`rm -rf /` / `sudo` / fork bomb / curl pipe shell 等，详见 `CLAUDE.md` §5.2）

### Token 计量
- 每个 run 落 `agent_runs.usage` 列（input / output / cache 命中 / 模型）
- 单会话 Token 徽章（hover 看拆分 + cache 命中率）
- 全局分析 Tab：今日 / 本周 / 全部 + 按模型 / agent / 会话 排行

### 移动端
- 现有响应式 Web 端仅做小屏适配：≤ md 自动转抽屉 sidebar + 全宽 panels
- 手机 App 规划：Capacitor 伴随客户端，通过 Tailscale / LAN 连接桌面 AgentHub host，用于观察状态、审批修改和对话反馈，详见 Spec 14

---

## 🚀 快速开始

### 环境要求
- Node.js ≥ 20
- pnpm（lockfile 唯一来源）

### 安装运行

```bash
pnpm install

# better-sqlite3 ABI 会由 dev/test/build/db 命令自动检查并按需 rebuild

# 配置 API key（任一）
cp .env.example .env.local
# .env.local 填入 ANTHROPIC_API_KEY / DEEPSEEK_API_KEY / OPENAI_API_KEY / ARK_API_KEY
# 或留空，启动后在 UI 右上齿轮「设置」面板里填（见下方「设置面板」）

# 起服务（dev 模式 / web 端）
pnpm dev
# → http://localhost:3000
```

**首次启动会自动建表 + 自动 seed 5 个内置 Agent**（Orchestrator / PM 小灰 / UI 设计师 / 前端工程师 / Reviewer）—— 不再需要 `pnpm db:push` / `pnpm db:seed`。详见 Spec 12 §5.4。

### 桌面版（Electron）

```bash
pnpm electron:dev          # 并发跑 Next dev + tsc watch + Electron 窗口
pnpm electron:build        # 出 release/AgentHub-<ver>-arm64.dmg + AgentHub-<ver>.dmg（x64） + AgentHub-<ver>-setup.exe
```

详见 Spec 12（含 ABI 选型、打包流程、验证清单）。

### 设置面板（推荐）
Sidebar 顶部齿轮 → 「API 设置」，填 Anthropic / OpenAI / DeepSeek / 火山方舟 key 与 Anthropic base URL。优先级高于 `.env.local`、低于 agent 自配 key；明文存 SQLite 单行表 `app_settings`（本地单用户场景，不引入 keychain）。通用 OpenAI-compatible endpoint 在 Agent 配置里单独填 key + Base URL，不走全局设置。详见 Spec 08 §8 与 CLAUDE.md §5.4。

### Claude Code 零配置
本机装过 Claude Code CLI 并登录过的话，SDK 会自动读 `~/.claude/.credentials.json` OAuth token，**不需要单独配 `ANTHROPIC_API_KEY`**。

---

## 🏗 架构概览

五层分层：**L5 UI（React / shadcn）· L4 State+Transport（Zustand + 单条 SSE）· L3 服务（AgentRunner / ConversationService / EventBus）· L2 适配器（ClaudeCode / Codex / Custom / Mock）· L1 持久化（Drizzle + SQLite + workspace 文件系统）**。所有 Adapter / 工具产生的事件都走统一的 `StreamEvent` 联合类型粘合（→ 持久化 → SSE → 前端 reducer）。

> 分层原则见 `CLAUDE.md §3`，逐层代码地图见 `OVERVIEW.md`，事件协议见 `specs/02-stream-events.md`。

---

## 📐 技术栈

Next.js 16 App Router + React 19 + TypeScript(strict) · Tailwind v4 + shadcn/ui · Zustand + Immer · Drizzle + SQLite(`better-sqlite3`) · SSE 单连接 · LLM SDK(`@anthropic-ai/claude-agent-sdk` / `@anthropic-ai/sdk` / `openai` / `@openai/codex-sdk`) · pnpm。

> 完整、已锁定的选型（含「不选什么 / 为什么」）见 `CLAUDE.md §2`。

---

## 📚 项目规格

- **OpenSpec 能力契约**：`openspec/`（`project.md` + 按 capability 拆分的 `specs/*/spec.md`，SHALL/MUST + Scenario 可校验）。
- **编号版详细规格**：`specs/`（核心实体 / StreamEvent / MessagePart / Artifact / Adapter / Orchestrator / 工具 / DB schema / 前端 / Electron / 移动端 …）—— 完整索引见 `CLAUDE.md §8`。
- **AI 协作约定**：`CLAUDE.md`。

---

## 🛠 常用命令

```bash
pnpm dev            # 启动 dev server（纯 Node；自动确保 better-sqlite3 为 Node ABI）
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint
pnpm test           # Vitest 测试（自动确保 better-sqlite3 为 Node ABI）
pnpm e2e            # Playwright E2E（自动确保 Node ABI；核心 IM 流，mock agent）
pnpm build          # 生产构建（自动确保 better-sqlite3 为 Electron ABI）
pnpm db:push        # 同步 schema 到 SQLite（自动确保 Electron ABI）
pnpm db:seed        # 重灌 builtin agents（自动确保 Electron ABI）
pnpm electron:rebuild  # 手动强制 better-sqlite3 → Electron ABI（通常不需要）
pnpm electron:dev   # 启动 Electron 桌面壳 + 加载 dev server
pnpm electron:build # 出 DMG / EXE
```

DB 文件位于 `.agenthub-data/agenthub.db`。Workspace 默认在 `.agenthub-data/workspaces/<conv_xxx>/`。

---

## 🎯 已知限制

- CodexAdapter 只接 Codex/Responses 兼容 endpoint；DeepSeek 等 Chat Completions-only（没有 `/responses`）请走 CustomAgentAdapter。
- sandbox 模式的目录配额对 Claude Code SDK 不生效（SDK 自行写盘绕过配额）。
- Orchestrator 冲突检测盲区：bash / SDK adapter 不经 `fs_write` 的写盘不被追踪。

> 完整开发待办见 `OVERVIEW.md`「📋 待办」。

---

## License

教学项目，仅作学习用途。
