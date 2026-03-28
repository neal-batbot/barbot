# SaaS Dashboard MVP — 最小功能拆解

> 目标：快速上线，复用现有架构，客户两位数

## Phase 1: Dashboard 壳子

### Task 1.1: Dashboard Layout 组件
**交付物**: `src/app/[locale]/(dashboard)/layout.tsx`
**前端**:
- 左侧固定侧边栏（240px），包含导航项
- 顶部用户头像 + 订阅等级 badge
- 导航项: Overview, Settings, Usage, Billing

**验收函数**:
```
✅ 访问 /en/dashboard 显示侧边栏 + 空白主内容区
✅ 导航项可点击，URL 正确跳转
✅ 响应式：移动端侧边栏可折叠
✅ 当前页面导航项高亮
✅ pnpm build 无错误
```

---

### Task 1.2: Overview 页面
**交付物**: `src/app/[locale]/(dashboard)/dashboard/page.tsx`
**后端 API**:
- `GET /api/dashboard/overview` → `{ subscription: {...}, credits: {balance, used, total}, recentUsage: [...] }`

**前端**:
- 3 张数字卡片：订阅计划、Credits 余额、本月使用量
- 近期使用记录列表（最近 10 条）

**验收函数**:
```
✅ GET /api/dashboard/overview 返回正确 JSON 结构
✅ 未登录返回 401
✅ 页面渲染 3 张卡片，数据来自 API
✅ 无订阅用户显示 "Free" 状态
✅ 无使用记录时显示空状态
```

---

### Task 1.3: Settings 路由映射
**交付物**: `src/app/[locale]/(dashboard)/dashboard/settings/page.tsx`
**前端**:
- Tab 式布局: Profile | Security | API Keys
- 复用现有 settings 组件，不重写逻辑

**后端 API**（复用现有）:
- `GET /api/user/get-user-info` — 用户信息
- `POST /api/auth/[...all]` — 密码修改等
- `GET/POST /api/user/apikeys` — API Key CRUD

**验收函数**:
```
✅ /dashboard/settings 显示 Profile tab
✅ 可切换 Security、API Keys tab
✅ Profile 编辑保存成功
✅ API Key 创建/删除正常工作
✅ 现有 /settings/* 页面功能未受影响
```

---

## Phase 2: Usage 系统

### Task 2.1: usage_log 数据模型
**交付物**: `src/shared/models/usage-log.ts`
**数据库 Schema**:
```sql
CREATE TABLE usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id),
  product VARCHAR(50) NOT NULL,      -- 'ti-chatbot', 'novosns', 'image-gen'
  model VARCHAR(100),                 -- 'gpt-4', 'claude-3.5'
  type VARCHAR(20) NOT NULL,          -- 'chat', 'image', 'music', 'video'
  tokens INTEGER DEFAULT 0,
  cost DECIMAL(10,4) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'success', -- 'success', 'error'
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_usage_user_date ON usage_log(user_id, created_at DESC);
CREATE INDEX idx_usage_product ON usage_log(product, created_at DESC);
```

**验收函数**:
```
✅ pnpm db:generate 成功
✅ pnpm db:migrate 成功
✅ Drizzle Studio 可查看 usage_log 表
✅ 可手动插入测试数据
```

---

### Task 2.2: Usage Reporting API（产品端调用）
**交付物**: `src/app/api/v1/usage/report/route.ts`

**API 定义**:
```
POST /api/v1/usage/report
Headers: { Authorization: "Bearer {api_key}" }
Body: {
  product: string,        // 必填
  model?: string,
  type: string,           // 必填: chat|image|music|video
  tokens?: number,
  cost?: number,
  metadata?: object
}
Response 200: { success: true, id: string }
Response 401: { error: "unauthorized" }
Response 400: { error: "validation_error", details: [...] }
```

**鉴权**: 用现有 apikey 表验证，通过 key 找到 userId

**验收函数**:
```
✅ curl -X POST /api/v1/usage/report -H "Authorization: Bearer test-key" -d '{"product":"ti-chatbot","type":"chat","tokens":1500}' → 200
✅ 无 Authorization header → 401
✅ 无效 api_key → 401
✅ 缺少必填字段 → 400
✅ 数据库 usage_log 表有新记录
✅ userId 从 api_key 正确关联
```

---

### Task 2.3: Usage 批量上报 API
**交付物**: `src/app/api/v1/usage/report/batch/route.ts`

**API 定义**:
```
POST /api/v1/usage/report/batch
Headers: { Authorization: "Bearer {api_key}" }
Body: {
  records: [
    { product, model, type, tokens, cost, metadata, timestamp }
  ]
}
Response 200: { success: true, count: number }
```

**验收函数**:
```
✅ 发送 5 条记录 → count: 5
✅ 单条验证失败不影响其他记录
✅ 最大 100 条/次，超出 → 400
```

---

### Task 2.4: Usage 查询 API
**交付物**: `src/app/api/v1/usage/summary/route.ts`

**API 定义**:
```
GET /api/v1/usage/summary?period=7d&group_by=product
Headers: { Authorization: "Bearer {session_token}" }  // 用户登录态
Query Params:
  period: "1d" | "7d" | "30d" | "custom"
  start_date?: ISO date (period=custom 时)
  end_date?: ISO date
  group_by?: "product" | "model" | "type" | "day"
  product?: string (筛选)

Response 200: {
  summary: { totalTokens, totalCost, totalRequests },
  breakdown: [
    { key: "ti-chatbot", tokens: 50000, cost: 2.50, requests: 120 }
  ],
  daily: [
    { date: "2026-03-27", tokens: 5000, cost: 0.25, requests: 15 }
  ]
}
```

**验收函数**:
```
✅ GET /api/v1/usage/summary?period=7d → 返回聚合数据
✅ group_by=product 返回按产品分组
✅ group_by=model 返回按模型分组
✅ 无数据时返回空数组，不报错
✅ 未登录 → 401
```

---

### Task 2.5: Usage 明细查询 API
**交付物**: `src/app/api/v1/usage/logs/route.ts`

**API 定义**:
```
GET /api/v1/usage/logs?page=1&limit=20&product=ti-chatbot
Headers: { Authorization: "Bearer {session_token}" }
Query Params:
  page: number (default 1)
  limit: number (default 20, max 100)
  product?: string
  model?: string
  type?: string
  start_date?: ISO date
  end_date?: ISO date

Response 200: {
  data: [{ id, product, model, type, tokens, cost, status, createdAt }],
  meta: { total, page, limit, totalPages }
}
```

**验收函数**:
```
✅ 分页正确：page=1,limit=10 返回前 10 条
✅ 筛选生效：product=ti-chatbot 只返回该产品
✅ 按 createdAt DESC 排序
✅ meta.total 反映筛选后总数
```

---

### Task 2.6: Usage 页面（前端）
**交付物**: `src/app/[locale]/(dashboard)/dashboard/usage/page.tsx`
**组件拆分**:
- `UsageSummaryCards` — 顶部摘要（总请求数、总 tokens、总费用）
- `UsageChart` — 折线/面积图，按日展示 tokens 或费用
- `UsageTable` — 使用记录表格，带筛选和分页
- `UsageExportButton` — CSV 导出按钮

**调用 API**:
- `GET /api/v1/usage/summary?period=30d&group_by=day` → 图表数据
- `GET /api/v1/usage/logs?page=1&limit=20` → 表格数据

**验收函数**:
```
✅ 页面加载显示摘要卡片，数据正确
✅ 图表渲染，可切换 "By Product" / "By Model"
✅ 表格显示记录，翻页正常
✅ 切换日期范围（7d/30d）图表和数据刷新
✅ 导出 CSV 包含所有筛选后的记录
✅ 无数据时显示空状态提示
✅ 加载中显示 skeleton
```

---

## Phase 3: Billing 增强

### Task 3.1: Billing 页面增强
**交付物**: 增强 `src/app/[locale]/(dashboard)/dashboard/billing/page.tsx`

**后端 API**:
```
GET /api/dashboard/billing
Response 200: {
  plan: { name, price, interval, status, renewAt },
  payment: { provider: "stripe", manageUrl: string },
  includedUsage: {
    period: { start, end },
    items: [
      { name: "API", tokens: 510000000, usage: 83.3 },
      { name: "claude-4.6-opus", tokens: 220000000, usage: 45.2 }
    ]
  },
  invoices: [{ id, date, amount, status, pdfUrl }]
}
```

**前端**:
- 当前计划卡片（计划名、价格、续费日期、"Adjust plan" 按钮）
- Payment 卡片（"Manage in Stripe" 按钮）
- Included Usage 表格（Item / Tokens / Usage%）
- 最近 Invoices 列表

**验收函数**:
```
✅ GET /api/dashboard/billing 返回正确结构
✅ "Manage in Stripe" 跳转到 Stripe Customer Portal
✅ Included Usage 百分比计算正确
✅ 无订阅用户显示 "Free Plan" 和升级入口
✅ Invoice PDF 链接可下载
```

---

## API 接口汇总

### 产品端 API（API Key 鉴权）

| Method | Path | 用途 |
|--------|------|------|
| POST | `/api/v1/usage/report` | 单条 usage 上报 |
| POST | `/api/v1/usage/report/batch` | 批量 usage 上报 |

### Dashboard 前端 API（Session 鉴权）

| Method | Path | 用途 |
|--------|------|------|
| GET | `/api/dashboard/overview` | Dashboard 首页数据 |
| GET | `/api/dashboard/billing` | Billing 页面数据 |
| GET | `/api/v1/usage/summary` | Usage 聚合查询 |
| GET | `/api/v1/usage/logs` | Usage 明细+分页 |
| GET | `/api/user/get-user-info` | 用户信息（已有） |
| GET/POST | `/api/user/apikeys` | API Key 管理（已有） |

---

## 执行顺序

```
1.1 Layout → 1.2 Overview → 1.3 Settings（Phase 1 完成）
      ↓
2.1 DB Model → 2.2 Report API → 2.3 Batch API → 2.4 Summary API → 2.5 Logs API → 2.6 Usage 页面（Phase 2 完成）
      ↓
3.1 Billing 增强（Phase 3 完成）
```

每个 Task 独立可验收，完成一个提交一个。
