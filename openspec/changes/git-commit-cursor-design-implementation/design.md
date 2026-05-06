## Context

本项目已完成Cursor设计系统的全面实施，涉及品牌资产、布局架构、排版系统、组件样式等多个层面的重大变更。现在需要将这些变更提交到Git仓库，并撰写符合团队规范的提交信息。

**当前状态：**
- 所有代码变更已完成，包括CSS令牌定义、组件更新、布局调整
- Harvey品牌logo已复制到public/logo/目录
- 页面已从约束布局改为全宽沉浸式设计
- Cursor排版系统（字体、字号、间距）已应用到所有关键组件
- `.terminal-skin`深色背景已移除，改用CSS变量主题系统

**约束条件：**
- 必须遵循Conventional Commits规范（项目已在git-workflow.md中定义）
- 提交信息需要中英文双语或纯中文（根据团队习惯）
- 需要包含详细的变更说明，便于代码审查和历史追溯
- 提交前需要确保所有相关文件已暂存

**利益相关者：**
- 开发团队：需要理解设计系统变更的技术细节
- 设计团队：需要确认Cursor设计规范的正确实施
- 产品团队：需要了解视觉改版对用户体验的影响

## Goals / Non-Goals

**Goals:**
- 生成符合Conventional Commits规范的Git提交信息
- 清晰描述Cursor设计系统实施的所有关键变更
- 提供足够的上下文，支持代码审查和历史追溯
- 按功能区域组织变更说明（品牌、布局、排版、组件等）
- 列出所有受影响的文件和目录

**Non-Goals:**
- 不需要创建Pull Request（这是后续步骤）
- 不需要运行测试或构建验证（假设已在实施阶段完成）
- 不需要更新CHANGELOG.md（可以作为后续任务）
- 不需要生成设计系统文档（已有design.md作为参考）

## Decisions

### Decision 1: 提交类型选择

**选择：** 使用 `feat` 类型而非 `refactor`

**理由：**
- 虽然涉及大量代码重构，但本质上是引入新的设计系统（新功能）
- Cursor设计系统为用户带来全新的视觉体验，属于功能增强
- `feat` 类型更能体现这次变更的重要性和影响范围

**备选方案：**
- `refactor`: 更侧重于代码结构调整，不强调用户可见的变化
- `style`: 通常用于代码格式调整，不适合设计系统级别的变更

### Decision 2: 提交信息结构

**选择：** 采用分层结构：简短标题 + 详细正文 + 文件清单

**理由：**
- 标题（<72字符）：快速传达核心变更
- 详细正文：按功能区域分类说明（品牌、布局、排版、组件）
- 文件清单：列出所有受影响的文件，便于代码审查

**备选方案：**
- 简短提交信息：不足以描述如此复杂的变更
- 超长单段正文：难以阅读和理解

### Decision 3: 变更说明的组织方式

**选择：** 按功能区域分类（品牌资产、布局系统、排版系统、组件样式、主题系统）

**理由：**
- 符合设计系统的自然分层结构
- 便于不同角色的团队成员快速定位关注的内容
- 与proposal.md和specs中的结构保持一致

**备选方案：**
- 按文件路径组织：技术性强但缺乏业务语义
- 按时间顺序组织：不利于理解变更的逻辑关系

### Decision 4: 文件暂存策略

**选择：** 使用 `git add` 逐个暂存关键文件，而非 `git add .`

**理由：**
- 避免意外提交无关文件（如临时文件、IDE配置）
- 符合项目git-workflow.md中的最佳实践
- 提供更精确的变更控制

**备选方案：**
- `git add .`: 简单但风险高，可能包含不应提交的文件
- 交互式暂存 `git add -p`: 对于如此多的文件变更过于繁琐

## Risks / Trade-offs

### Risk 1: 提交信息过长导致可读性下降
**影响：** 团队成员可能跳过详细正文，错过重要信息

**缓解措施：**
- 使用清晰的标题和分段结构
- 在标题中突出最关键的变更
- 使用列表和分类提高可读性

### Risk 2: 遗漏部分文件导致提交不完整
**影响：** 可能导致构建失败或视觉不一致

**缓解措施：**
- 在提交前运行 `git status` 检查所有变更
- 对照proposal.md中的"受影响的代码区域"清单
- 提交后立即运行 `pnpm build` 验证

### Risk 3: 提交信息与实际变更不一致
**影响：** 误导代码审查者和未来维护者

**缓解措施：**
- 在撰写提交信息前，先运行 `git diff` 确认所有变更
- 对照tasks.md中的完成清单，确保描述准确
- 提交前进行自我审查

### Trade-off 1: 详细性 vs 简洁性
**选择：** 优先详细性

**理由：** 这是一次重大的设计系统变更，详细的提交信息对未来的维护和理解至关重要。虽然提交信息较长，但通过良好的结构组织可以保持可读性。

### Trade-off 2: 单次大提交 vs 多次小提交
**选择：** 单次大提交

**理由：** Cursor设计系统的各个部分高度耦合（颜色、排版、组件等），拆分成多个提交会导致中间状态不可用。单次提交确保设计系统的完整性和原子性。

## Migration Plan

### 提交前检查清单

1. **验证所有变更已完成：**
   ```bash
   # 检查未暂存的变更
   git status
   
   # 查看所有变更的详细内容
   git diff
   ```

2. **确认构建成功：**
   ```bash
   pnpm build
   ```

3. **确认开发服务器正常运行：**
   ```bash
   pnpm dev
   # 在浏览器中验证视觉效果
   ```

### 提交步骤

1. **暂存所有相关文件：**
   ```bash
   # 样式文件
   git add src/config/style/theme.css
   git add src/config/style/global.css
   
   # 布局文件
   git add src/app/layout.tsx
   git add src/app/[locale]/(landing)/layout.tsx
   
   # 组件文件
   git add src/themes/default/blocks/hero.tsx
   git add src/themes/default/blocks/features.tsx
   git add src/themes/default/blocks/features-list.tsx
   git add src/themes/default/blocks/cta.tsx
   git add src/themes/default/blocks/subscribe.tsx
   git add src/shared/components/ui/button.tsx
   git add src/shared/components/ui/card.tsx
   git add src/shared/components/ui/input.tsx
   
   # 品牌资产
   git add public/logo/
   git add src/shared/blocks/common/brand-logo.tsx
   ```

2. **创建提交：**
   ```bash
   git commit -m "feat(design): 实施Cursor设计系统 - 品牌、布局、排版全面升级

   ## 变更概述
   完成Cursor设计系统的全面实施，包括品牌资产更新、全宽布局改造、
   Cursor风格排版系统、间距规范、阴影效果和组件样式优化。

   ## 主要变更

   ### 1. 品牌资产更新
   - 复制Harvey logo到public/logo/目录
   - 更新favicon为Harvey图标
   - 更新Open Graph元数据使用Harvey logo
   - 更新header和footer的品牌logo引用

   ### 2. 布局系统改造
   - 移除landing layout的max-w-6xl约束，实现全宽布局
   - 添加响应式padding (px-4 sm:px-8 lg:px-16)
   - Hero区块使用全视口宽度
   - 文本密集内容使用嵌套max-w-4xl容器保持可读性

   ### 3. 排版系统应用
   - 添加Lato字体加载（通过next/font/google）
   - 应用Cursor字号层级：
     * text-cursor-display: Hero标题
     * text-cursor-heading: 区块标题(h2)
     * text-cursor-heading-sm: 子标题(h3)
   - 正文文本使用Lato字体，字间距0.06px

   ### 4. 组件样式更新
   - Button: 移除内联className覆盖，使用Inkwell背景和Onyx Outline边框
   - Card: 使用variant=\"elevated\"实现Pebble Gray背景和多层阴影
   - Input: 透明背景、Muted Stone边框、0px圆角

   ### 5. 主题系统优化
   - 在theme.css中定义完整的Cursor设计令牌
   - 映射Cursor颜色到shadcn语义令牌
   - 添加Cursor间距令牌 (8px元素间距, 43px区块间距)
   - 添加Cursor阴影令牌 (shadow-xl多层阴影)
   - 移除.terminal-skin强制深色背景，改用CSS变量

   ## 受影响的文件

   ### 样式文件
   - src/config/style/theme.css
   - src/config/style/global.css

   ### 布局文件
   - src/app/layout.tsx
   - src/app/[locale]/(landing)/layout.tsx

   ### 组件文件
   - src/themes/default/blocks/hero.tsx
   - src/themes/default/blocks/features.tsx
   - src/themes/default/blocks/features-list.tsx
   - src/themes/default/blocks/cta.tsx
   - src/themes/default/blocks/subscribe.tsx
   - src/shared/components/ui/button.tsx
   - src/shared/components/ui/card.tsx
   - src/shared/components/ui/input.tsx
   - src/shared/blocks/common/brand-logo.tsx

   ### 资产文件
   - public/logo/ (Harvey品牌资产)

   ## 验证清单
   - [x] 背景色为Canvas Parchment (#f7f7f4)
   - [x] 文本色为Inkwell (#262510)
   - [x] 按钮使用Onyx Outline (#f54e00)
   - [x] 卡片使用Pebble Gray (#e6e5e0)和多层阴影
   - [x] 全宽布局在所有视口尺寸正常显示
   - [x] Harvey logo在header、footer和favicon正确显示
   - [x] 排版层级清晰，字体加载正常
   - [x] 响应式设计在移动端、平板、桌面端均正常

   ## 参考文档
   - openspec/changes/cursor-design-full-upgrade/design.md
   - openspec/changes/cursor-design-full-upgrade/tasks.md"
   ```

3. **验证提交：**
   ```bash
   # 查看提交历史
   git log -1 --stat
   
   # 确认提交内容
   git show HEAD
   ```

### Rollback策略

如果提交后发现问题：

1. **撤销最后一次提交（保留变更）：**
   ```bash
   git reset --soft HEAD~1
   ```

2. **撤销最后一次提交（丢弃变更）：**
   ```bash
   git reset --hard HEAD~1
   ```

3. **创建回滚提交：**
   ```bash
   git revert HEAD
   ```

## Open Questions

1. **是否需要同时更新CHANGELOG.md？**
   - 建议：作为后续任务，在准备发布时统一更新

2. **是否需要创建Pull Request？**
   - 建议：根据团队工作流决定，如果是主分支开发则直接推送，如果是功能分支则创建PR

3. **是否需要添加Git标签标记这次重大变更？**
   - 建议：如果这是一个里程碑版本，可以添加标签如 `v2.0.0-cursor-design`

4. **是否需要通知团队成员这次设计系统变更？**
   - 建议：在团队沟通渠道（Slack/钉钉）发送通知，附上提交链接和视觉对比截图
