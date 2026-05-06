## ADDED Requirements

### Requirement: Git提交信息必须遵循Conventional Commits规范
系统生成的Git提交信息必须遵循Conventional Commits规范，包含类型、可选范围、描述和详细正文。

#### Scenario: 生成feat类型提交信息
- **WHEN** 提交包含新功能实现
- **THEN** 提交信息类型为"feat"，描述清晰说明新增功能

#### Scenario: 生成refactor类型提交信息
- **WHEN** 提交包含代码重构但不改变功能
- **THEN** 提交信息类型为"refactor"，描述说明重构内容

#### Scenario: 包含详细正文
- **WHEN** 提交涉及多个文件或复杂变更
- **THEN** 提交信息包含详细正文，列出所有主要变更点

### Requirement: 提交信息必须包含Cursor设计系统实施的完整描述
Git提交信息必须清晰描述Cursor设计系统实施的所有关键变更，包括品牌、布局、排版、组件等方面。

#### Scenario: 描述品牌资产更新
- **WHEN** 提交包含Harvey logo和favicon更新
- **THEN** 提交信息明确说明品牌资产的更新内容和位置

#### Scenario: 描述布局改造
- **WHEN** 提交包含全宽布局实施
- **THEN** 提交信息说明移除了哪些约束，实现了什么样的布局效果

#### Scenario: 描述排版系统应用
- **WHEN** 提交包含Cursor字体和字号层级应用
- **THEN** 提交信息列出应用的字体、字号规范和受影响的组件

#### Scenario: 描述组件样式更新
- **WHEN** 提交包含Button、Card、Input等组件更新
- **THEN** 提交信息说明各组件的样式变更和设计令牌应用

### Requirement: 提交信息必须便于代码审查和历史追溯
Git提交信息的结构和内容必须支持团队成员进行代码审查，并便于未来查看变更历史时快速理解变更目的。

#### Scenario: 支持代码审查
- **WHEN** 团队成员查看提交信息
- **THEN** 能够快速理解变更的目的、范围和影响

#### Scenario: 支持历史追溯
- **WHEN** 未来需要查看为什么进行了某项变更
- **THEN** 提交信息提供足够的上下文和理由说明
