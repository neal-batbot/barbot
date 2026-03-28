# Sprint Contract 模板

> 使用说明：
> 1. 复制此文件到 `docs/exec-plans/active/EP-XXX.md`
> 2. 由 Planner 填写，STATUS 设为 PROPOSED
> 3. Evaluator 审核后改为 AGREED，Generator 才能开始
> 4. Generator 完成后，Evaluator 更新 STATUS 为 PASS 或 FAIL

---

# Sprint Contract: [功能名称]

**EP ID**: EP-XXX
**Created**: YYYY-MM-DD
**Status**: PROPOSED → AGREED → PASS / FAIL

---

## 用户原始需求

> [原文，1-4 句话，不做修改]

---

## 产品规格

### 目标
[一段话：这个 sprint 解决什么问题，对谁有价值，完成后用户能做什么]

### 交付物（Deliverables）
[用用户可感知的语言描述，不写代码实现细节]

1.
2.
3.

### 范围边界

**IN SCOPE（这次要做的）:**
-

**OUT OF SCOPE（这次不做的）:**
-

---

## 技术约束
[从 docs/design-docs/ 中选取相关规则，只列必须遵守的]

- [ ] 涉及 Dify → 必须遵守 DD-003 全部 5 条 critical rules
- [ ] 涉及数据库 → 遵守 DD-004（Drizzle only）
- [ ] 涉及 Auth → 遵守 DD-002
- [ ] 涉及新 AI 功能 → 遵守 DD-001

---

## 验收标准（Acceptance Criteria）

> 每条必须可测试（Evaluator 能用 yes/no 判断）
> 参考博客：Sprint 3 有 27 条标准。宁多勿少。

### 功能验收
- [ ] AC-001:
- [ ] AC-002:
- [ ] AC-003:

### 规则合规验收（选择相关条目）
- [ ] AC-R01: conversation_id 仅在非空时发送至 Dify API
- [ ] AC-R02: Dify bot API key 从 chat.model 字段查找，非使用全局 key
- [ ] AC-R03: dify_api_url 有 `|| process.env.DIFY_API_URL` fallback
- [ ] AC-R04: rating 字段仅在 botConfig.has_rating === true 时加入 inputs
- [ ] AC-R05: API route handler 入口有 [DEBUG] 格式日志

### 构建健康验收
- [ ] AC-B01: `pnpm build` 通过，无错误
- [ ] AC-B02: `pnpm lint` 通过，无类型错误
- [ ] AC-B03: `pnpm docs:lint` 分数不低于执行前（当前基准：89/100）

---

## 历史风险
[从 docs/lessons-learned/INDEX.md 中找相关教训]

- LL-00X: [相关教训标题及链接]

---

## AI 功能机会
[是否有机会加入 Claude 辅助功能？若无，填"无"]

---

## Evaluator 审核意见
[Evaluator 填写，Planner/Generator 不填]

STATUS 变更为 AGREED 前，Evaluator 需确认：
- [ ] 所有 AC 条目可测试
- [ ] 范围与项目 spec 对齐
- [ ] 技术约束覆盖相关 DD 规则
- [ ] 无明显遗漏的边界条件

**审核结论**:
**STATUS 变更为**: AGREED / 需要修改（见意见）

---

## 执行记录
[Generator 填写]

**开始时间**:
**完成时间**:
**关键决策**:（执行过程中偏离 Contract 的决定）

---

## 评估结果
[Evaluator 填写，来自评估报告]

| 维度 | 得分 | 阈值 | 状态 |
|------|------|------|------|
| 功能完整性 | /10 | 8/10 | |
| 规则合规性 | /10 | 9/10 | |
| 代码质量 | /10 | 7/10 | |
| 文档同步 | /10 | 7/10 | |

**最终 STATUS**: PASS / FAIL
**评估报告链接**: [如有]
