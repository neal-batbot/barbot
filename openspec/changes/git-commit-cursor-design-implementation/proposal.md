## Why

完成了Cursor设计系统的全面实施，包括品牌资产更新（Harvey logo）、全宽布局改造、Cursor风格的排版系统、间距规范、阴影效果和组件样式优化。需要将这些变更提交到Git仓库，并撰写清晰的功能描述，以便团队成员和未来维护者理解此次重大视觉改版的内容和目的。

## What Changes

- 实施完整的Cursor设计系统，包括颜色令牌、间距、阴影、圆角等CSS变量
- 更新Harvey品牌logo资产到public/logo/目录，并替换favicon
- 改造页面布局为全宽沉浸式设计，移除max-w约束
- 应用Cursor排版系统（CursorGothic、Lato字体及完整字号层级）
- 更新Button、Card、Input等核心UI组件样式
- 优化Hero、Features、CTA等着陆页区块的视觉呈现
- 移除`.terminal-skin`强制深色背景，改用CSS变量主题系统
- 创建清晰的Git提交信息，包含详细的功能描述和变更说明

## Capabilities

### New Capabilities
- `git-commit-message`: 生成符合规范的Git提交信息，包含类型、范围、描述和详细正文
- `change-documentation`: 记录Cursor设计系统实施的完整变更内容，便于代码审查和历史追溯

### Modified Capabilities
<!-- 无现有能力的需求变更 -->

## Impact

**受影响的代码区域：**
- `src/config/style/theme.css` - 新增Cursor设计令牌
- `src/config/style/global.css` - 更新全局样式
- `src/app/layout.tsx` - 字体加载和favicon更新
- `src/app/[locale]/(landing)/layout.tsx` - 布局容器调整
- `src/themes/default/blocks/` - 所有着陆页组件（hero, features, cta等）
- `src/shared/components/ui/` - Button、Card、Input组件
- `public/logo/` - Harvey品牌资产

**Git提交影响：**
- 需要暂存所有相关文件变更
- 需要撰写详细的提交信息，说明设计系统实施的完整内容
- 提交信息应遵循Conventional Commits规范（feat/refactor类型）
