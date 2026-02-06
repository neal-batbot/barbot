# 本地 Docker 启动说明

## 前置条件

- 宿主机已安装并运行 **PostgreSQL**（端口 5432，账号 `postgres`，密码 `123456`）
- 数据库名使用默认 `postgres`（若你创建了其他库，请修改 `docker-compose.yml` 中的 `DATABASE_URL`）

## 首次启动

1. **（可选）初始化数据库表结构**  
   若数据库为空，需在宿主机项目目录执行一次 Drizzle 推送（需本地装好 Node/pnpm 和 `.env`）：
   ```bash
   pnpm install
   # 确保 .env 中 DATABASE_URL=postgresql://postgres:123456@localhost:5432/postgres
   pnpm db:push
   ```

2. **构建并启动容器**
   ```bash
   docker compose up -d --build
   ```

3. 浏览器访问：**http://localhost:3000**

## 自定义配置

- **更换数据库名**：在 `docker-compose.yml` 里把 `DATABASE_URL` 中的 `/postgres` 改成你的数据库名。
- **自定义 AUTH_SECRET**：在项目根目录创建 `.env`，写 `AUTH_SECRET=你的base64密钥`，或执行 `docker compose` 时传入：  
  `AUTH_SECRET=xxx docker compose up -d`

## 常用命令

```bash
docker compose up -d --build   # 后台构建并启动
docker compose logs -f app     # 查看应用日志
docker compose down            # 停止并删除容器
```
