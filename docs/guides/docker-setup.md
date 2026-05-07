# Docker 部署说明（安全版）

## 前置条件

- 已准备 PostgreSQL 实例（连接信息通过环境变量注入）
- 已配置 `.env.production`（可从 `.env.production.example` 复制）

## 首次启动

1. **初始化数据库表结构（首次）**
   ```bash
   pnpm install
   pnpm db:push
   ```

2. **构建并启动容器**
   ```bash
   docker compose up -d --build
   ```

3. 浏览器访问：**http://localhost:3000**

## 生产发布步骤（推荐）

```bash
cp .env.production.example .env.production
# 编辑真实密钥（不要提交）
docker compose --env-file .env.production up -d --build
./scripts/release-prod.sh
```

发布完成后，使用 `GET /api/health` 做门禁检查。

## 常用命令

```bash
docker compose up -d --build   # 后台构建并启动
docker compose logs -f app     # 查看应用日志
docker compose down            # 停止并删除容器
```
