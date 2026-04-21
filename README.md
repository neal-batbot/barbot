# barbot

面向企业场景的智能客户支持系统：前端为 **Next.js** 全栈应用，对话能力主要对接 **Dify**（流式 SSE、工作流、多应用/Bot），并支持通过 **Vercel AI SDK** 接入其他模型提供商。内置用户认证、积分/支付等能力，可按业务裁剪。

---

## 目录

- [功能概览](#功能概览)
- [系统架构](#系统架构)
- [技术栈](#技术栈)
- [本地开发](#本地开发)
- [环境变量](#环境变量)
- [数据库](#数据库)
- [Docker 部署](#docker-部署)
- [Dify 集成说明](#dify-集成说明)
- [API 路由概览](#api-路由概览)
- [RBAC 与权限](#rbac-与权限)
- [脚本与诊断](#脚本与诊断)
- [目录结构](#目录结构)
- [故障排查](#故障排查)
- [相关文档](#相关文档)
- [许可证](#许可证)

---

## 功能概览

| 模块 | 说明 |
|------|------|
| **Dify 对话** | 调用 Dify `/v1/chat-messages`，流式返回；支持 `conversation_id` 续聊 |
| **多 Bot** | 在后台配置 `dify_bots`（JSON），按会话 `model` 字段选择不同 Bot 的 API Key |
| **工作流 UI** | 解析 SSE 中的工作流/节点事件，便于展示执行进度 |
| **统一聊天 API** | `/api/chat` 可按模型切换 Dify、OpenRouter、OpenAI 等（见代码实现） |
| **鉴权** | Better Auth（邮箱/社交等，以实际配置为准） |
| **国际化** | `next-intl`，默认英文/中文 |
| **管理后台** | 配置项、用户、RBAC 等（需相应权限） |

---

## 系统架构

```mermaid
flowchart LR
  subgraph client [浏览器]
    UI[聊天 UI]
  end
  subgraph next [Next.js 应用]
    API_DIFY["/api/dify/*"]
    API_CHAT["/api/chat"]
  end
  subgraph Dify [Dify 服务]
    API_V1["/v1/chat-messages"]
  end
  subgraph data [数据层]
    PG[(PostgreSQL)]
  end
  UI --> API_DIFY
  UI --> API_CHAT
  API_DIFY --> API_V1
  API_DIFY --> PG
  API_CHAT --> PG
```

要点：

- **配置优先级**：多数业务配置（含 Dify URL、Key、多 Bot）可从**数据库 `config` 表**读取，并可用环境变量兜底（见 `getAllConfigs` 等逻辑）。
- **Dify 根 URL**：须指向 API 前缀，一般为 `https://<host>/v1`；代码会拼成 `{base}/chat-messages`，**不要**再出现 `/v1/v1/...`。

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 运行时 | Node.js 20+ |
| 包管理 | pnpm 10.24+ |
| 框架 | Next.js 16（App Router、Turbopack 开发） |
| 前端 | React 19、Tailwind CSS 4、Radix UI |
| AI | Dify HTTP API、Vercel AI SDK（`ai` 包） |
| ORM | Drizzle ORM |
| 数据库 | PostgreSQL（生产推荐）；亦支持模板内其他 Provider，以实际配置为准 |
| 认证 | Better Auth |
| i18n | next-intl（`en` / `zh`） |

---

## 本地开发

### 1. 克隆与安装

```bash
git clone https://github.com/crazyboyonline/barbot.git
cd barbot
pnpm install
```

### 2. 环境文件

```bash
cp .env.example .env
# 编辑 .env，填入 DATABASE_URL、AUTH_SECRET 等
```

### 3. 数据库

```bash
pnpm db:generate   # 如有 schema 变更时生成迁移
pnpm db:migrate    # 执行迁移（需 PostgreSQL 可连）
```

开发阶段也可用 `pnpm db:push`（按项目文档说明使用，**生产**请用迁移）。

### 4. RBAC（可选，首次部署建议执行）

```bash
pnpm rbac:init
```

### 5. 启动

```bash
pnpm dev
```

默认开发地址：<http://localhost:3000>（以终端输出为准）。

### 6. 原生 Pi Web-UI（独立窗口）

`Workspace` 入口默认会新标签打开原生 `pi-web-ui`，地址默认为 `http://localhost:5173`。

先在本项目启动主站：

```bash
pnpm dev
```

再启动原生 `pi-web-ui`（在本项目目录直接执行）：

```bash
pnpm dev:native-ui:full
```

如果希望分别启动前端/服务端：

```bash
pnpm dev:native-ui
pnpm dev:native-ui:server
```

可通过环境变量覆盖原生入口地址：

```bash
NEXT_PUBLIC_PI_WEB_UI_URL=http://localhost:5173
```

### 常用命令速查

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发（Turbopack） |
| `pnpm dev:native-ui` | 启动原生 Pi Web-UI 前端（Vite，默认 5173） |
| `pnpm dev:native-ui:server` | 启动原生 Pi Web-UI 服务端（默认 8787） |
| `pnpm dev:native-ui:full` | 同时启动原生 Pi Web-UI 前后端 |
| `pnpm build` | 生产构建 |
| `pnpm build:fast` | 提高 Node 内存上限的构建 |
| `pnpm start` | 生产启动 |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier 格式化 |
| `pnpm db:studio` | Drizzle Studio（需数据库） |

---

## 环境变量

以下与 `.env.example` 及运行方式对齐；**敏感项勿提交仓库**。

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接串，如 `postgresql://user:pass@host:5432/dbname` |
| `DATABASE_PROVIDER` | 如 `postgresql` |
| `DB_SINGLETON_ENABLED` | 是否单例连接（见项目配置） |
| `AUTH_SECRET` | Better Auth 密钥，可用 `openssl rand -base64 32` 生成 |
| `NEXT_PUBLIC_APP_URL` | 站点对外 URL，用于回调、链接等 |
| `NEXT_PUBLIC_APP_NAME` | 应用名称 |
| `NEXT_PUBLIC_THEME` / `NEXT_PUBLIC_APPEARANCE` | 主题与外观 |

**Dify 相关**（也可只在管理后台「系统配置」中维护，代码侧常有 `env` 兜底）：

| 变量 | 说明 |
|------|------|
| `DIFY_API_URL` | Dify API 根地址，**建议含 `/v1`**，例如 `https://dify.example.com/v1` |
| `DIFY_API_KEY` | 全局默认的 App API Key（`app-...`） |

其他业务相关变量（支付、邮件、OAuth 等）以 `.env.example` 与后台配置为准。

---

## 数据库

- Schema 与迁移位于 `src/` 与 Drizzle 配置目录（见 `pnpm db:*` 脚本）。
- 首次部署后建议执行迁移与 `pnpm rbac:init`（若使用 RBAC）。

---

## Docker 部署

仓库根目录提供 `docker-compose.yml`，用于在**宿主机已安装 Docker** 的前提下构建并运行应用镜像。

典型约定：

- 使用 `network_mode: host` 时，容器内访问宿主机 PostgreSQL 常用 `localhost:5432`。
- 通过 `environment` 注入 `DATABASE_URL`、`NEXT_PUBLIC_APP_URL`、`DIFY_API_URL`、`DIFY_API_KEY`、`AUTH_SECRET` 等。

示例（请按你的环境修改**密码/域名/密钥**）：

```bash
docker compose build
docker compose up -d
```

生产环境务必：

- 使用强随机 `AUTH_SECRET`；
- 不要复用示例中的数据库密码与 API Key；
- 配合 HTTPS 与反向代理（Nginx/Caddy 等）。

---

## Dify 集成说明

### 1. API 地址

- 正确示例：`https://your-dify-host/v1`  
- 后端请求路径为：`{DIFY_API_URL 规范化后}/chat-messages`（若已以 `/v1` 结尾则不再重复拼接）。  
- 若出现 **HTML 404**，请检查是否误配成 `/v1/v1/chat-messages` 或 Dify 反代未转发 `/v1`。

### 2. 多 Bot（`dify_bots`）

在后台配置中维护 JSON 数组，每个 Bot 含 `id`、`title`、`api_key` 等；会话 `model` 形如 `dify/<botId>` 时选用对应 Key。  
若未匹配到 Bot，则回退到全局 `dify_api_key`。

### 3. 会话与 `conversation_id`

- 首次对话可不带 `conversation_id`；Dify 返回后由应用写入会话 metadata（如 `dify_conversation_id`）。  
- 若 Dify 返回会话不存在（404），业务侧应清除无效 ID 并允许用户重试（见 `TUTORIAL_DIFY_INTEGRATION.md` 与 `CLAUDE.md`）。

### 4. 其他

- 文件代理、反馈等见 `/api/dify/file`、`/api/dify/feedback`。  
- 详细字段与调试步骤见 **TUTORIAL_DIFY_INTEGRATION.md**。

---

## API 路由概览

| 路径 | 用途 |
|------|------|
| `POST /api/dify/chat` | Dify 专用流式对话（body：`chatId`、`query` 等） |
| `POST /api/chat` | 统一聊天入口（多 Provider，见路由实现） |
| `POST /api/dify/feedback` | Dify 消息点赞/点踩等 |
| `GET /api/dify/file` | 代理 Dify 文件 URL（安全与跨域） |
| `POST /api/auth/*` | Better Auth 认证 |

完整列表以 `src/app/api/` 下的路由为准。

---

## RBAC 与权限

- 初始化：`pnpm rbac:init`  
- 分配角色：`pnpm rbac:assign --email=user@example.com --role=admin`  

若项目启用「聊天模型」相关权限，权限码可能为 **`chat.model.use`**（以 `src/core/rbac/permission.ts` 为准）。  
升级后若新增权限，可再次执行 `pnpm rbac:init` 以写入数据库。

---

## 脚本与诊断

| 脚本 | 说明 |
|------|------|
| `pnpm rbac:init` | 初始化角色与权限 |
| `pnpm rbac:assign` | 为用户分配角色 |
| `npx tsx scripts/verify-dify-config.ts` | 校验 Dify URL 与 Key（需数据库与配置） |
| `npx tsx scripts/create-test-users.ts` | 可选：批量创建测试账号（开发环境，慎用） |

更多脚本见 `scripts/` 目录。

---

## 目录结构

```
src/
├── app/
│   ├── [locale]/           # 国际化页面（聊天、设置等）
│   └── api/                # Route Handlers
│       ├── chat/           # 统一聊天 API
│       ├── dify/           # Dify：chat / file / feedback
│       └── ...
├── core/                   # 认证、数据库、i18n 等
├── config/                 # 文案、主题等
├── shared/
│   ├── blocks/chat/        # 聊天 UI 块
│   ├── hooks/              # 如 use-dify-chat
│   ├── models/             # 数据模型与业务
│   └── services/           # RBAC、邮件等
└── extensions/ai/          # Dify 流式封装等
```

---

## 故障排查

| 现象 | 可能原因 | 处理方向 |
|------|----------|----------|
| Dify 返回 HTML 404 | API 路径错误、或 `/v1` 重复 | 检查 `DIFY_API_URL` 与反向代理 |
| 401 Unauthorized | 未登录或 Session 失效 | 检查登录态与 Cookie 域名 |
| 403 Forbidden | RBAC 限制 | 检查用户角色与权限码 |
| 数据库连接失败 | `DATABASE_URL` 或网络 | 检查容器与宿主机网络、防火墙 |

---

## 相关文档

- [TUTORIAL_DIFY_INTEGRATION.md](./TUTORIAL_DIFY_INTEGRATION.md) — Dify 对接与调试  
- [CLAUDE.md](./CLAUDE.md) — 项目约定与 Dify 规则摘要（面向 AI/开发者）

---

## 许可证

MIT License

---

## 仓库与贡献

- 仓库：<https://github.com/crazyboyonline/barbot>  
- 欢迎提交 Issue 与 Pull Request；重大变更建议先开 Issue 说明动机与方案。
