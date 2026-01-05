# feat: 集成 Dify AI 聊天功能，优化流式输出体验

## 🎯 功能概述

重写 Dify 聊天实现，使用原生 SSE 流式输出，提升用户体验。完全绕过 AI SDK，实现真正的实时流式输出。

## ✨ 主要变更

### 新增文件
- ✅ `src/shared/hooks/use-dify-chat.ts` - 自定义 hook，原生处理 SSE 流
- ✅ `src/app/api/dify/chat/route.ts` - 专用 Dify API 路由，直接透传 SSE
- ✅ `src/shared/blocks/chat/dify-messages.tsx` - Dify 消息显示组件
- ✅ `src/shared/blocks/chat/dify-follow-up.tsx` - Dify 输入组件

### 修改文件
- ✅ `src/shared/blocks/chat/box.tsx` - 支持 Dify 和 AI SDK 双模式切换
- ✅ `src/shared/blocks/chat/input.tsx` - 添加 Dify 模型选择和行业等级选择

## 🚀 核心特性

1. **原生 SSE 流式输出**
   - 直接解析 Dify 的 SSE 事件流
   - 不使用 AI SDK 的复杂格式转换
   - 真正的实时逐字显示

2. **工作流进度显示**
   - 显示 `workflow_started` 事件
   - 显示 `node_started` 和 `node_finished` 事件
   - 实时显示当前处理节点和耗时

3. **优化的 UI 渲染**
   - 使用 `requestAnimationFrame` 批量更新
   - 使用 `memo` 减少不必要的重渲染
   - 平滑滚动，无 UI 跳动

4. **双模式支持**
   - Dify 使用原生实现
   - OpenRouter 等其他 provider 仍使用 AI SDK
   - 根据 provider 自动切换

## 🧪 测试清单

- [x] Dify 流式输出正常
- [x] 工作流进度显示正常
- [x] 无 UI 跳动问题
- [x] 行业等级选择功能正常（Catalog工业/Automotive汽车）
- [x] 对话持久化正常（conversation_id 管理）
- [x] 错误处理正常

## 📝 相关提交

- `41d3444` - feat: 重写 Dify 聊天实现，优化流式输出体验
- `70b64c0` - feat: integrate Dify API as chat provider

## 🔧 技术细节

### 架构设计
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
- **批量更新**：使用 `requestAnimationFrame` 将多个字符更新合并为一次渲染
- **状态管理**：使用 `useRef` 缓存内容，避免频繁 state 更新
- **事件解析**：正确解析 Dify 的 SSE 格式（`data: {...}\n\n`）

## 📸 截图/演示

（可选：添加功能演示截图）

## ⚠️ 注意事项

- 需要配置 `DIFY_API_KEY` 和 `DIFY_API_URL` 环境变量
- 确保 Dify 工作流支持 `rating` 输入参数
- 建议在生产环境测试流式输出的性能


