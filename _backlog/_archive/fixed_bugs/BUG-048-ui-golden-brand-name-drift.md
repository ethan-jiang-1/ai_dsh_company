---
status: 已修
severity: P2
opened: 2026-11-09
---

# BUG-048：`ui-scene-smoke --isolated --golden` 红——金样仍写“梦之队 CEO”，页面已收窄为“CEO”

> 严重级别：P2（次要）｜发现：2026-11-09｜状态：已修（2026-11-09：修复就绪 → 修复已落地 → 已修）
> 来源：2026-11-09 委派面重构后第四轮探索（U1 图/UI 透镜）。
> 审查：agent — 先确认 diff 只含预期显示名收窄，再刷新并复核；不再升门禁（理由见「修复落地」）。

## 症状

`node checks/lanes/ui-scene.entry.mjs --isolated --golden` 失败：

```
GOLDEN FAIL 页签「在场」第 14 字符起不同：
金样「成员 团队内状态 当前任务 梦之队 CEO Lead 待命 — …」
现在「成员 团队内状态 当前任务 CEO Lead 待命 — …」
```

页面其余九页签结构正常；委派流程区显示“委派流程 1 个节点 · 最深 0 层 … company-workspace ceo d0”，
说明新面板在场。唯一差异是“在场”页签里的显示名：金样仍是 `梦之队 CEO`，实际页面已收窄为 `CEO`。

## 根因（假设）

2026-11-09 的内容三层分离提交（`763abc29`，Note =
[generic-specific-separation](../../../notes/implemented/2026-11-09-generic-specific-separation.md)）按 D14
把品牌显示名收窄为角色名，但没有同 diff 刷新
`snapshots/visual/company-shell/ui.expected.json`。`pnpm verify` 的 `ui-expected-freshness` 只检查
九页签注册面与金样存在，不检查文本内容；真正的内容守卫是 `ui-scene-smoke --isolated --golden`，
所以提交时“verify 绿”不等于“金样绿”。

这是测试资产/验收面不同步，不是运行时页面崩溃；但金样红会让后续 UI 改动失去可信基线，也会掩盖
真正的文本回归。

## 暴露的失败类

**“UI 验收面未同 diff 刷新”**：产品文案/显示名变化（D14 收窄）与金样刷新脱节；`verify` 的
freshness 门只查形状，不查 golden 内容。横切范围：所有改页面文案/显示名/九页签内容的提交；
需要把 `ui-scene-smoke --isolated --golden` 纳入同 diff 验收（或让 `verify` 感知 golden 文本）。

## 复现

```sh
source run/env.sh
node checks/lanes/ui-scene.entry.mjs --isolated --golden
```

输出会给出页签「在场」的逐字 diff；金样文件 =
`snapshots/visual/company-shell/ui.expected.json`；诊断目录在回执里（`runtime/harness-home/diagnosis/ui-scene-smoke-…`）。

## 修复关联

- 如果“显示名收窄为角色名”是已批准的有意行为（提交信息与 D14 说明是），修复 = 确认 diff 只有这一处
  预期变化后刷新金样：
  `node checks/lanes/ui-scene.entry.mjs --isolated --refresh-golden`，再跑 `--golden` 复核。
- 如果显示名收窄不是有意行为，则修页面/内容面，不刷新金样。
- 测试/门禁：考虑把 `ui-scene-smoke --isolated --golden`（或等价的文本金样比对）纳入改 `content/`
  显示名/品牌文案时的同 diff 检查；当前 `pnpm verify` 的 `ui-expected-freshness` 只查注册面。
- 不要把“金样红”静默改成“测试坏了”；先确认产品文案意图，再刷新或回滚。

## 已修判定

- `ui-scene-smoke --isolated --golden` 绿；金样 diff 只包含已批准的显示名收窄，没有其他页面文本漂移。
- `--refresh-golden` 后 `--golden` 复核绿；`pnpm verify` 仍 ALL PASS。
- 若决定加门禁：改 `content/` 品牌/显示名文案时有一条可执行的同 diff 提示或检查；不靠人记忆。

## 修复落地（2026-11-09）

- **意图确认**：显示名收窄为角色名是 D14 的有意行为（`763abc29` +
  [generic-specific-separation Note](../../../notes/implemented/2026-11-09-generic-specific-separation.md)），不是页面回归。
- **红→绿**：`node checks/lanes/ui-scene.entry.mjs --isolated --golden` 红（「在场」第 14 字符起
  `梦之队 CEO` vs `CEO`）；`--refresh-golden` 后 `git diff` 只有「在场」这一行、`梦之队 CEO` → `CEO`；
  `--golden` 复核 **9 个页签一致 / ALL PASS**。
- **同 diff 映射**：[`tests/README.md`](../../../tests/README.md) 的 `src/lib` 读模型行补“显示名变化 ⇒
  同 diff 刷 UI 金样（`--refresh-golden` 后 `--golden` 复核）”——这是这次漏掉的那条连线。
- **不升门禁**：按 [policy P2](../../../docs/policy.md)（复发 + 可机械判定 + 负例已证会失败），这是首犯，
  且真浏览器金样不适合秒级 verify；先补映射与程序，复发再按 P2 立门。
- **全量**：`pnpm verify` ALL PASS（`ui-expected-freshness` 仍绿）；`ui-scene-smoke --isolated --golden` 绿。
