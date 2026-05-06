## 1. 提交前验证

- [ ] 1.1 运行git status检查所有变更文件
- [ ] 1.2 运行git diff确认变更内容与预期一致
- [ ] 1.3 运行pnpm build验证构建成功
- [ ] 1.4 运行pnpm dev验证开发服务器正常启动
- [ ] 1.5 在浏览器中验证Cursor设计系统视觉效果

## 2. 暂存样式文件

- [ ] 2.1 暂存src/config/style/theme.css（Cursor设计令牌定义）
- [ ] 2.2 暂存src/config/style/global.css（全局样式更新）

## 3. 暂存布局文件

- [ ] 3.1 暂存src/app/layout.tsx（字体加载和favicon更新）
- [ ] 3.2 暂存src/app/[locale]/(landing)/layout.tsx（全宽布局实现）

## 4. 暂存着陆页组件

- [ ] 4.1 暂存src/themes/default/blocks/hero.tsx（Hero区块排版和布局）
- [ ] 4.2 暂存src/themes/default/blocks/features.tsx（Features区块样式）
- [ ] 4.3 暂存src/themes/default/blocks/features-list.tsx（FeaturesList区块样式）
- [ ] 4.4 暂存src/themes/default/blocks/cta.tsx（CTA区块样式）
- [ ] 4.5 暂存src/themes/default/blocks/subscribe.tsx（Subscribe区块样式）

## 5. 暂存UI组件

- [ ] 5.1 暂存src/shared/components/ui/button.tsx（Button组件Cursor样式）
- [ ] 5.2 暂存src/shared/components/ui/card.tsx（Card组件Cursor样式）
- [ ] 5.3 暂存src/shared/components/ui/input.tsx（Input组件Cursor样式）

## 6. 暂存品牌资产

- [ ] 6.1 暂存public/logo/目录（Harvey logo资产）
- [ ] 6.2 暂存src/shared/blocks/common/brand-logo.tsx（品牌logo组件更新）

## 7. 创建Git提交

- [ ] 7.1 使用feat类型创建提交信息
- [ ] 7.2 提交标题：feat(design): 实施Cursor设计系统 - 品牌、布局、排版全面升级
- [ ] 7.3 提交正文包含变更概述
- [ ] 7.4 提交正文按功能区域分类说明（品牌资产、布局系统、排版系统、组件样式、主题系统）
- [ ] 7.5 提交正文列出所有受影响的文件
- [ ] 7.6 提交正文包含验证检查清单

## 8. 提交后验证

- [ ] 8.1 运行git log -1 --stat查看提交统计
- [ ] 8.2 运行git show HEAD确认提交内容完整
- [ ] 8.3 验证提交信息格式符合Conventional Commits规范
- [ ] 8.4 验证提交信息包含所有关键变更说明

## 9. 文档记录

- [ ] 9.1 记录提交SHA和提交时间
- [ ] 9.2 记录受影响文件的完整清单
- [ ] 9.3 记录Cursor设计令牌映射关系
- [ ] 9.4 记录视觉验证检查清单结果

## 10. 后续步骤（可选）

- [ ] 10.1 推送到远程仓库（如果需要）
- [ ] 10.2 创建Pull Request（如果使用功能分支工作流）
- [ ] 10.3 通知团队成员设计系统变更
- [ ] 10.4 更新CHANGELOG.md（如果需要）
