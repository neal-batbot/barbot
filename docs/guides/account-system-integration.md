# Account System Integration Guide

> 版本：v1
> 
> 最后更新：2026-04-22
> 
> 适用范围：将 Barbot 的账户、登录、权益、设备绑定和用量体系接入到外部 Web 应用、浏览器扩展、桌面应用或其他 AI 产品。

---

## 概览

Barbot 当前提供 3 种接入账户系统的方式。接入前，建议先确认你的产品属于哪一类：

| 场景 | 推荐方案 | 认证材料 |
|------|----------|----------|
| 同域 Web 应用、文档站、浏览器扩展 WebView，希望复用 Barbot 已登录用户 | 登录态桥接（Auth Bridge） | Barbot Cookie Session 或 Bridge JWT |
| 原生桌面端，希望直接用邮箱密码换取桌面会话 | Desktop Auth | email/password 或 desktop refresh token |
| 独立产品、CLI、插件，只想接入账户权益、订阅、设备数和用量上报 | Platform API | API Key |

如果你不确定该选哪一种，可以按下面原则判断：

- 想“复用 Barbot 网站登录态”，选 `Auth Bridge`
- 想“自己做桌面登录页”，选 `Desktop Auth`
- 想“只校验会员和计费，不接管登录页”，选 `Platform API`

---

## Base URL

```txt
Production: https://your-domain.com
Staging:    https://staging.your-domain.com
Local:      http://localhost:3000
```

以下文档统一用 `{BASE_URL}` 表示服务地址。

---

## 方案一：Auth Bridge（复用网页登录态）

适用场景：

- 你的产品和 Barbot 在同域或可信域下运行
- 用户已经在 Barbot Web 端登录
- 你只需要把登录身份和权益桥接给另一个前端产品

### 1. 获取当前网页登录态

```http
GET /api/auth/session
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "authenticated": true,
    "user": {
      "id": "usr_xxx",
      "email": "user@example.com",
      "name": "Neal",
      "image": "https://..."
    }
  }
}
```

未登录时：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "authenticated": false,
    "user": null
  }
}
```

### 2. 交换前端可用 Token

```http
GET /api/extension/token?aud={audience}
```

支持的 `audience` 见当前代码：

- `vector-web-ui`
- `vector-vscode`
- `fumadocs-web`
- `supabase-ssh-web`
- `supabase-ssh-ssh`

响应示例：

```json
{
  "token": "eyJhbGciOi...",
  "audience": "vector-web-ui",
  "product": "pi-web-ui",
  "expiresAt": "2026-04-22T12:00:00.000Z",
  "sourceAudience": null,
  "user": {
    "id": "usr_xxx",
    "email": "user@example.com",
    "name": "Neal",
    "image": null
  }
}
```

说明：

- 当请求带 Cookie Session 时，会直接基于当前登录用户签发 Bridge JWT。
- 当请求本身带 `Authorization: Bearer <bridge-jwt>` 时，可在同产品内做 audience 交换，但不允许跨产品交换。
- 若目标产品缺少所需 feature，会返回 `403 feature_not_enabled`。

### 3. 读取用户信息

```http
GET /api/extension/user-info
Authorization: Bearer {BRIDGE_TOKEN}
```

响应示例：

```json
{
  "code": 0,
  "data": {
    "user": {
      "id": "usr_xxx",
      "name": "Neal",
      "email": "user@example.com",
      "image": null,
      "createdAt": "2026-04-01T08:00:00.000Z"
    },
    "credits": {
      "remainingCredits": 12345
    }
  }
}
```

### 4. 读取用户权益

```http
GET /api/extension/entitlement?product={product}
Authorization: Bearer {BRIDGE_TOKEN}
```

`product` 可选；不传时服务端会按 token audience 推断默认产品。

响应示例：

```json
{
  "code": 0,
  "data": {
    "user": {
      "id": "usr_xxx",
      "name": "Neal",
      "email": "user@example.com",
      "image": null
    },
    "entitlement": {
      "product": "pi-web-ui",
      "plan": "pro",
      "features": {
        "advanced_model": true,
        "history_sync": true
      },
      "allowedModels": ["gpt-4o", "claude-3-5-sonnet"],
      "remainingTokens": 120000,
      "remainingCredits": 3210,
      "overageEnabled": false,
      "periodStart": "2026-04-01T00:00:00.000Z",
      "periodEnd": "2026-05-01T00:00:00.000Z"
    }
  }
}
```

### 推荐接入时序

```txt
1. 页面加载 -> GET /api/auth/session
2. authenticated=true -> GET /api/extension/token?aud=vector-web-ui
3. 用 token 请求 /api/extension/user-info 或 /api/extension/entitlement
4. token 过期 -> 重新调用 /api/extension/token
```

---

## 方案二：Desktop Auth（桌面端直接登录）

适用场景：

- Electron / Tauri / 原生桌面应用
- 不依赖浏览器 Cookie
- 希望用邮箱密码直接换桌面会话

### 1. 邮箱密码登录

```http
POST /api/auth/desktop/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password",
  "deviceInfo": "macOS 15 / MacBook Pro / app 1.2.0"
}
```

响应示例：

```json
{
  "token": "dt_xxx",
  "refreshToken": "dr_xxx",
  "expiresAt": "2026-04-29T11:30:00.000Z",
  "user": {
    "id": "usr_xxx",
    "email": "user@example.com",
    "name": "Neal",
    "imageUrl": null
  }
}
```

返回规则：

- `400`：请求体错误
- `401`：邮箱或密码错误
- `500`：服务端签发桌面会话失败

### 2. 用一次性 code 交换桌面会话

```http
POST /api/auth/desktop/exchange
Content-Type: application/json

{
  "code": "one-shot-code",
  "deviceInfo": "Windows 11 / Surface / app 1.2.0"
}
```

这个接口通常用于“网页登录后跳回桌面端”的场景。

### 3. 刷新桌面会话

```http
POST /api/auth/desktop/refresh
Content-Type: application/json

{
  "refreshToken": "dr_xxx"
}
```

响应结构与登录相同，会返回新的 `token`、`refreshToken` 和 `expiresAt`。

### 4. 校验桌面 Token

```http
GET /api/auth/verify
Authorization: Bearer {DESKTOP_TOKEN}
```

响应示例：

```json
{
  "valid": true,
  "user": {
    "id": "usr_xxx",
    "email": "user@example.com",
    "name": "Neal",
    "imageUrl": null,
    "createdAt": "2026-04-01T08:00:00.000Z"
  }
}
```

### 5. 读取桌面端产品权益

```http
GET /api/entitlements
Authorization: Bearer {DESKTOP_TOKEN}
```

响应示例：

```json
{
  "userId": "usr_xxx",
  "plan": "pro",
  "products": ["desktop_code", "editor_agent"],
  "quota": {
    "tokens": 2000000,
    "used": 800000,
    "remaining": 1200000,
    "credits": 30000
  },
  "periodStart": "2026-04-01T00:00:00.000Z",
  "periodEnd": "2026-05-01T00:00:00.000Z"
}
```

### 推荐接入时序

```txt
1. 打开桌面登录页 -> POST /api/auth/desktop/login
2. 保存 token / refreshToken 到系统安全存储
3. 应用启动时 -> GET /api/auth/verify
4. 401 或即将过期 -> POST /api/auth/desktop/refresh
5. 需要展示会员权益 -> GET /api/entitlements
```

安全建议：

- `token` 和 `refreshToken` 应存放在系统安全存储中，不要明文写入普通配置文件。
- 桌面 token 当前有效期约 7 天；刷新时会轮换 access token 与 refresh token。
- `code` 为一次性短期票据，只能兑换一次。

---

## 方案三：Platform API（API Key 接入权益与计费）

适用场景：

- CLI、IDE 插件、桌面应用、第三方前后端服务
- 你不想直接处理 Barbot 用户登录，只想复用用户订阅、权限和用量计费
- 用户在 Barbot Dashboard 创建 API Key 后粘贴到你的产品里

### 如何获取 API Key

当前项目存在两类令牌：

1. `apikey`：用于 `/api/v1/*` 的权益、设备和用量接口
2. `app token`（前缀 `icat_`）：用于 `/api/v2/ingest/usage` 的应用级上报

对外产品接入账户体系时，优先使用 `apikey`。

认证方式：

```http
Authorization: Bearer {PLATFORM_API_KEY}
```

### 1. 权益检查

```http
GET /api/v1/entitlement?product={product_code}
Authorization: Bearer {PLATFORM_API_KEY}
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "allowed": true,
    "product": "desktop_code",
    "plan": "pro",
    "subscription_status": "active",
    "quota": {
      "tokens": 2000000,
      "requests": null,
      "remaining_credits": 850000
    },
    "features": {
      "device_limit": 3,
      "advanced_model": true
    }
  }
}
```

### 2. 拉取产品 Provider 配置

```http
GET /api/v1/provider-config?product={product_code}
Authorization: Bearer {PLATFORM_API_KEY}
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "available": true,
    "product": "desktop_code",
    "plan": "pro",
    "provider": "openai",
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-...",
    "modelName": "gpt-4o-mini"
  }
}
```

说明：

- 当服务端想把“当前订阅下该产品默认该走哪个 provider”下发给客户端时，这个接口很有用。
- 如果没有配置，会返回 `available: false`，不是错误。

### 3. 设备注册

```http
POST /api/v1/device/register
Authorization: Bearer {PLATFORM_API_KEY}
Content-Type: application/json

{
  "device_id": "persistent-device-uuid",
  "platform": "macos",
  "product_code": "desktop_code"
}
```

响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "activated": true,
    "device_id": "persistent-device-uuid",
    "limit": 3
  }
}
```

超限示例：

```json
{
  "code": -1,
  "message": "device_limit_exceeded",
  "activated": false,
  "limit": 3,
  "current": 3
}
```

### 4. 心跳更新

```http
POST /api/v1/device/heartbeat
Authorization: Bearer {PLATFORM_API_KEY}
Content-Type: application/json

{
  "device_id": "persistent-device-uuid",
  "product_code": "desktop_code"
}
```

成功响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "ok": true
  }
}
```

### 5. 单条用量上报

```http
POST /api/v1/usage/report
Authorization: Bearer {PLATFORM_API_KEY}
Content-Type: application/json

{
  "product": "desktop_code",
  "model": "claude-3-5-sonnet",
  "provider": "anthropic",
  "type": "chat",
  "tokens": 1500,
  "cost": 0.0045,
  "request_id": "req_123",
  "metadata": {
    "conversation_id": "conv_001"
  }
}
```

成功响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "success": true,
    "id": "usage_log_id"
  }
}
```

### 6. 批量用量上报

```http
POST /api/v1/usage/report/batch
Authorization: Bearer {PLATFORM_API_KEY}
Content-Type: application/json

{
  "records": [
    {
      "product": "desktop_code",
      "model": "gpt-4o",
      "provider": "openai",
      "type": "chat",
      "tokens": 1200,
      "cost": 0.0032,
      "request_id": "req_001",
      "timestamp": "2026-04-22T10:00:00.000Z"
    },
    {
      "product": "desktop_code",
      "type": "chat",
      "tokens": 800,
      "cost": 0.0018
    }
  ]
}
```

限制：

- 每次最多 `100` 条
- 建议客户端本地缓存失败记录并后台重试
- 用量上报应异步处理，不阻塞主流程

### 推荐接入时序

```txt
1. 用户粘贴 API Key
2. 启动时 -> GET /api/v1/entitlement?product=...
3. 若是桌面或插件 -> 首次运行 POST /api/v1/device/register
4. 运行中 -> 每小时 POST /api/v1/device/heartbeat
5. AI 调用结束 -> POST /api/v1/usage/report
6. 离线补偿 -> POST /api/v1/usage/report/batch
```

---

## 高级模式：App Token / Ingest API

如果你希望由自己的服务端统一上报埋点，可以使用：

```http
POST /api/v2/ingest/usage
```

支持两种鉴权方式：

1. `Authorization: Bearer {INTEGRATION_INGEST_API_KEY}`
2. `Authorization: Bearer icat_xxx`（App Token）

最小请求体：

```json
{
  "app_id": "harvey",
  "user_id": "usr_xxx",
  "type": "chat",
  "tokens": 1024,
  "cost": 0.0312
}
```

说明：

- 使用 `icat_` App Token 时，`user_id` 可以省略，服务端会按 token 归属用户落账。
- 使用集成密钥时，`user_id` 必填。
- 该接口带幂等语义，建议稳定传 `request_id`。

---

## 通用错误语义

| HTTP 状态 | 典型错误 | 含义 |
|-----------|----------|------|
| `400` | `validation_error` / `Invalid request body` | 参数格式错误 |
| `401` | `unauthorized` / `invalid_token` / `token_expired` | 未认证或令牌失效 |
| `403` | `feature_not_enabled` / `device_limit_exceeded` | 有账号但无权限 |
| `404` | `user_not_found` | 用户不存在 |
| `500` | `internal_error` / `Failed to ...` | 服务端异常 |

客户端建议：

- `400`：不要重试，提示开发配置错误
- `401`：重新登录或重新获取 token
- `403`：提示升级套餐或减少设备绑定
- `500`：指数退避重试

---

## 最小 TypeScript SDK

项目内附了一个最小 SDK 示例，可直接复制到外部项目：

- [examples/barbot-account-sdk.ts](../../examples/barbot-account-sdk.ts)

它覆盖：

- Auth Bridge：`getSession` `getBridgeToken` `getExtensionUserInfo` `getExtensionEntitlement`
- Desktop Auth：`desktopLogin` `desktopRefresh` `verifyDesktopToken` `getDesktopEntitlements`
- Platform API：`checkEntitlement` `getProviderConfig` `registerDevice` `heartbeat` `reportUsage` `reportUsageBatch`

---

## 接入建议

### Web / WebView

- 优先使用 Cookie Session + `/api/extension/token`
- 不建议在前端长期持久化 Bridge Token
- token 过期后重新交换，不要自行伪造刷新逻辑

### Desktop / Electron / Tauri

- 使用 `/api/auth/desktop/login` + `/api/auth/desktop/refresh`
- `device_id` 首次生成后本地持久化，后续不要变化
- 令牌存系统钥匙串或安全存储

### CLI / IDE 插件

- 使用用户粘贴的 `apikey`
- 启动阶段先做 `checkEntitlement`
- 每次请求结束异步上报 usage

---

## 参考实现

现有代码位置：

- Auth 配置：`src/core/auth/config.ts`
- Auth 实例：`src/core/auth/index.ts`
- 桌面登录：`src/app/api/auth/desktop/*`
- 登录态桥接：`src/app/api/extension/*`
- 平台 API：`src/app/api/v1/*`
- 桌面会话模型：`src/shared/models/desktop-auth.ts`

## See Also

- [platform-integration.md](platform-integration.md)
- [pi-web-ui-auth-bridge.md](pi-web-ui-auth-bridge.md)
- [app-integration-template.md](app-integration-template.md)
- [../design-docs/DD-002-auth-rbac-model.md](../design-docs/DD-002-auth-rbac-model.md)
