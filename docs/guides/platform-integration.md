# Platform Integration Guide

> 版本：v1 (MVP) · 最后更新：2026-03-29
>
> 本文档面向接入平台的产品研发（Harvey、Vector-cline、pi-mono）。

---

## 概览

本平台提供统一的账号、订阅、权益和用量体系。产品通过 **API Key** 与平台通信，无需实现自己的支付和会员逻辑。

```
产品侧                          平台（IC-AI）
───────                         ───────────
1. 启动时 → checkEntitlement    → 权益检查
2. 首次运行 → registerDevice    → 设备注册
3. 每次 AI 调用后 → reportUsage → 用量上报
4. 每小时 → heartbeat           → 在线心跳
```

---

## 认证

所有 API 使用 Bearer Token 认证：

```http
Authorization: Bearer {PLATFORM_API_KEY}
```

**如何获取 API Key：**
1. 用户登录 [平台 Dashboard](http://localhost:3000/en/dashboard)
2. 进入 Settings → API Keys → 创建 Key
3. 复制 Key，粘贴进产品设置页

---

## Base URL

```
Production: https://your-platform-domain.com
Dev:        http://localhost:3000
```

---

## API 端点

### 1. 权益检查

在用户执行任何操作前调用，确认用户有权使用该产品。

```http
GET /api/v1/entitlement?product={product_code}
Authorization: Bearer {API_KEY}
```

**product_code 对应关系：**

| 产品 | product_code |
|------|-------------|
| Harvey Desktop | `desktop_code` |
| Vector-cline | `editor_agent` |
| Pi CLI Agent | `cli_agent` |
| Pi Slack Bot | `slack_bot` |

**响应示例（有权限）：**
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "allowed": true,
    "product": "desktop_code",
    "plan": "Pro Plan",
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

**响应示例（无权限）：**
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "allowed": false,
    "product": "desktop_code",
    "plan": "free",
    "subscription_status": null
  }
}
```

**推荐处理逻辑：**
```typescript
const result = await checkEntitlement('desktop_code');
if (!result.data.allowed) {
  showMessage('请升级订阅以使用此功能');
  openUrl('https://your-platform-domain.com/pricing');
  return;
}
```

---

### 2. 设备注册

桌面端/插件**首次启动时**调用，注册设备并校验设备数上限。

```http
POST /api/v1/device/register
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "device_id": "唯一设备标识（建议用 UUID，本地持久化）",
  "platform": "macos | windows | linux | vscode",
  "product_code": "desktop_code"
}
```

**响应：**
```json
{ "code": 0, "data": { "activated": true, "device_id": "xxx", "limit": 3 } }
```

**超出设备限额：**
```json
{ "code": -1, "message": "device_limit_exceeded", "activated": false, "limit": 3, "current": 3 }
```

**注意：**
- `device_id` 需在本地持久化（第一次生成后不变）
- 同一 `device_id` 重复注册不报错（幂等）
- CLI 工具（pi-mono）**不需要**调用此 API（无设备概念）

---

### 3. 用量上报（单条）

每次 AI 调用完成后异步上报，不要阻塞主流程。

```http
POST /api/v1/usage/report
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "product": "desktop_code",
  "type": "chat",
  "model": "claude-3.5-sonnet",
  "tokens": 1500,
  "cost": 0.0045
}
```

**字段说明：**

| 字段 | 必填 | 说明 |
|------|------|------|
| product | ✅ | 产品代号 |
| type | ✅ | `chat` / `image` / `music` / `video` |
| model | ❌ | 使用的模型名称 |
| tokens | ❌ | 消耗的 token 数 |
| cost | ❌ | 实际成本（美元） |
| metadata | ❌ | 自定义 JSON 对象 |

**响应：**
```json
{ "code": 0, "data": { "success": true, "id": "log-id" } }
```

---

### 4. 用量批量上报

适合离线缓存后批量同步，最多 100 条/次。

```http
POST /api/v1/usage/report/batch
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "records": [
    { "product": "cli_agent", "type": "chat", "model": "claude-3.5-sonnet", "tokens": 800 },
    { "product": "cli_agent", "type": "chat", "model": "gpt-4o", "tokens": 1200 }
  ]
}
```

---

### 5. 设备心跳

每小时调用一次，更新设备在线状态。

```http
POST /api/v1/device/heartbeat
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  "device_id": "本地持久化的设备 ID",
  "product_code": "desktop_code"
}
```

---

## 错误码

| HTTP 状态 | code | 含义 |
|-----------|------|------|
| 401 | -1 | API Key 无效或缺失 |
| 400 | -1 | 请求参数错误，见 `details` |
| 403 | -1 | 设备数超限（`device_limit_exceeded`） |
| 500 | -1 | 服务端错误，可重试 |
| 200 | 0 | 成功 |

---

## 各产品接入 Checklist

### Harvey（Electron 桌面端）

```
[ ] 新增环境变量 MAIN_VITE_PLATFORM_URL
[ ] AuthStore 扩展：savePlatformApiKey / getPlatformApiKey（用 safeStorage）
[ ] 设置页新增 "Platform API Key" 输入框 + 测试连通性按钮
[ ] 启动时：GET /api/v1/entitlement?product=desktop_code
[ ] 首次启动：POST /api/v1/device/register（本地持久化 device_id）
[ ] AI 调用完成后：POST /api/v1/usage/report（异步，不阻塞）
[ ] 每小时：POST /api/v1/device/heartbeat
```

### Vector-cline（VS Code Extension）

```
[ ] state-migrations.ts 新增 "platformApiKey" 到 SECRET_KEYS
[ ] 新建 src/services/platform/PlatformService.ts
[ ] ClineEnv 新增 platformApiBaseUrl 配置
[ ] 设置 UI 新增 "Platform API Key" 输入框
[ ] Extension activate 时：GET /api/v1/entitlement?product=editor_agent
[ ] 首次激活：POST /api/v1/device/register
[ ] AI 调用完成后：POST /api/v1/usage/report（异步）
[ ] 每小时：POST /api/v1/device/heartbeat
```

### pi-mono（CLI + Slack Bot）

```
[ ] packages/ai 新增 PlatformReporter（src/utils/platform-reporter.ts）
[ ] CLI（coding-agent）：~/.pi/config.json 支持 platformApiKey 字段
[ ] Slack Bot（mom）：环境变量 PLATFORM_API_KEY 注入
[ ] CLI 启动时：GET /api/v1/entitlement?product=cli_agent
[ ] Bot 启动时：GET /api/v1/entitlement?product=slack_bot
[ ] packages/ai LLM 调用出口插入：POST /api/v1/usage/report（异步）
[ ] 批量模式可用：POST /api/v1/usage/report/batch
[ ] CLI/Bot 无设备概念，不需要调用 device 相关 API
```

---

## 快速验证

用你的 API Key 快速测试连通性：

```bash
# 替换为你的 API Key
API_KEY="your-api-key-here"
BASE_URL="http://localhost:3000"

# 权益检查
curl -s "$BASE_URL/api/v1/entitlement?product=desktop_code" \
  -H "Authorization: Bearer $API_KEY" | jq .

# 用量上报
curl -s -X POST "$BASE_URL/api/v1/usage/report" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"product":"desktop_code","type":"chat","tokens":100}' | jq .
```

---

## 联系方式

接入问题请联系平台研发。
