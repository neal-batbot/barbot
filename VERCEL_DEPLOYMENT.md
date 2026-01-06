# Vercel 部署配置指南

## 🔧 必需的环境变量

在 Vercel Dashboard 中设置以下环境变量：

### 数据库配置（重要！）

```bash
# Supabase PostgreSQL 数据库连接
DATABASE_URL=postgresql://postgres.ephbgwqsykcapizrimnd:ebvT8FhFjzVlEnnB@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
DATABASE_PROVIDER=postgresql
DB_SINGLETON_ENABLED=false  # ⚠️ 必须设置为 false
DB_MAX_CONNECTIONS=5        # ⚠️ 设置为 5
```

**注意**：
- `DB_SINGLETON_ENABLED=false` - Vercel serverless 环境必须设为 false
- `DB_MAX_CONNECTIONS=5` - 增加连接数，避免并发限制

### 认证配置

```bash
AUTH_SECRET=OP/gcasfK+wbU866OpxxUnNcdPc09RuLDQuSN2LbT6g=
```

### 应用配置

```bash
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
NEXT_PUBLIC_APP_NAME=Vector
NEXT_PUBLIC_THEME=default
NEXT_PUBLIC_APPEARANCE=system
```

**注意**：将 `your-project.vercel.app` 替换为您的实际 Vercel 域名

### Dify AI 配置（可选）

```bash
DIFY_API_KEY=app-cBHod54lb7bXLu1Pfvje6TLc
DIFY_API_URL=http://156.224.28.114
```

## 📋 配置步骤

### 步骤 1：登录 Vercel

访问 https://vercel.com/dashboard

### 步骤 2：选择项目

点击您的项目 `IC-AI-Intelligent-Customer-Support`

### 步骤 3：添加环境变量

1. 点击 **Settings** 标签
2. 点击 **Environment Variables**
3. 添加上述所有环境变量
4. 每个变量选择适用的环境：
   - ✅ Production
   - ✅ Preview
   - ✅ Development (可选)

### 步骤 4：保存并重新部署

1. 添加完所有变量后，点击页面底部的 **Save**
2. 进入 **Deployments** 标签
3. 点击最新部署右侧的 **...** 菜单
4. 选择 **Redeploy**

## 🐛 常见问题排查

### 问题 1：Failed to fetch

**原因**：环境变量未设置或设置错误

**解决**：
1. 检查 `DATABASE_URL` 是否正确
2. 确保 `DB_SINGLETON_ENABLED=false`
3. 重新部署应用

### 问题 2：数据库连接超时

**原因**：Supabase Pooler 连接不稳定

**解决**：尝试使用 Direct Connection URL
```bash
# 将端口从 6543 改为 5432
DATABASE_URL=postgresql://postgres.xxx:password@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

### 问题 3：注册/登录一直加载

**原因**：API 函数超时

**解决**：
1. 检查 Vercel 日志（在 Deployments → 点击部署 → View Logs）
2. 确认 `vercel.json` 中 `maxDuration` 设置为 60
3. 检查 Supabase 项目是否正常运行

## 🔍 验证部署

部署成功后，检查以下内容：

1. **主页访问**
   ```
   https://your-project.vercel.app
   ```
   应该正常显示

2. **API 测试**
   ```bash
   curl https://your-project.vercel.app/api/chat/bots
   ```
   应该返回机器人列表

3. **日志检查**
   - Vercel Dashboard → Deployments → 最新部署 → View Function Logs
   - 查看是否有错误信息

## 📊 监控和日志

### Vercel 日志位置
1. Deployments → 选择部署 → View Logs
2. 点击具体请求查看详情

### Supabase 日志位置
1. Supabase Dashboard → 你的项目 → Database
2. 查看 Recent queries 和 Event logs

## ✅ 部署成功标志

- ✅ 首页正常加载
- ✅ API 路由返回 200 状态码
- ✅ 可以访问注册/登录页面
- ✅ Vercel 日志无错误

## 🚨 紧急回滚

如果部署出现问题：
1. Vercel Dashboard → Deployments
2. 找到之前的成功部署
3. 点击 **Promote to Production**
