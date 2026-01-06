# IC-AI-Intelligent-Customer-Support

智能客户支持 AI 系统 - 集成 Dify AI 提供实时对话服务

## 功能特性

### 核心功能
- **AI 智能对话** - 集成 Dify AI 提供智能客户支持
- **实时流式输出** - 使用原生 SSE 实现真正的实时逐字显示
- **工作流进度追踪** - 实时显示 AI 处理节点和进度
- **对话持久化** - 支持多轮对话记忆和上下文管理

### 技术亮点
- **原生 SSE 流** - 直接解析 Dify 的 SSE 事件流，无需 AI SDK 转换
- **优化的 UI 渲染** - 使用 `requestAnimationFrame` 批量更新，无 UI 跳动
- **双模式支持** - Dify 原生实现 + OpenRouter 等其他 provider
- **智能参数配置** - 支持行业等级选择（Catalog 工业/Automotive 汽车）

## 快速开始

### 环境要求
- Node.js 20+
- pnpm 10.24.0+

### 安装
```bash
# 克隆项目
git clone https://github.com/crazyboyonline/IC-AI-Intelligent-Customer-Support.git

# 安装依赖
pnpm install
```

### 环境配置
创建 `.env` 文件并配置以下变量：
```bash
# Dify API 配置
DIFY_API_KEY=your_dify_api_key
DIFY_API_URL=https://api.dify.ai

# 其他配置...
```

### 运行
```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 生产环境
pnpm start
```

## 技术栈

- **框架**: Next.js 16.0.7
- **UI**: React 19.2.1, Tailwind CSS 4
- **AI SDK**: Vercel AI SDK 5.0.39
- **数据库**: Drizzle ORM + Turso LibSQL
- **认证**: Better Auth
- **国际化**: next-intl
- **组件库**: Radix UI

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── chat/           # AI SDK 聊天 API
│   │   └── dify/chat/      # Dify 原生 API
│   └── ...
├── shared/
│   ├── blocks/chat/        # 聊天组件
│   │   ├── dify-messages.tsx    # Dify 消息显示
│   │   ├── input.tsx            # 聊天输入
│   │   └── box.tsx              # 聊天容器
│   └── hooks/
│       └── use-dify-chat.ts     # Dify 自定义 hook
└── config/                 # 配置文件
```

## 核心功能实现

### Dify 聊天流程
```
用户输入 → DifyFollowUp → /api/dify/chat → Dify API
                                    ↓
                           原生 SSE 流
                                    ↓
                            useDifyChat Hook
                                    ↓
                            requestAnimationFrame
                                    ↓
                            DifyMessages (实时显示)
```

### 关键优化
- **批量更新**: 使用 `requestAnimationFrame` 合并多次渲染
- **状态管理**: 使用 `useRef` 缓存内容，避免频繁 state 更新
- **事件解析**: 正确解析 Dify 的 SSE 格式（`data: {...}\n\n`）

## 更新日志

### v1.6.0 (最新)
- ✨ 集成 Dify AI 聊天功能
- ✨ 优化流式输出体验
- ✨ 添加工作流进度显示
- ✨ 支持行业等级选择
- 🐛 修复 UI 跳动问题

## 许可证

MIT License

## 作者

ShipAny.ai - https://shipany.ai

## 贡献

欢迎提交 Issue 和 Pull Request！
