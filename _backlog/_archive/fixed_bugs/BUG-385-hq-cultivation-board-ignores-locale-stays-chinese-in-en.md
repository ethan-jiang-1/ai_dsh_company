---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-385：英文界面下直开 HQ「培养工坊」整块 CultivationBoard 仍显示简体中文

> 严重级别：P1（双语契约破口：`locale.preference = en` 下从左侧「Dream Team HQ」直接进入「Cultivation Workshop」，HQ 顶栏与右侧启动卡全部为英文，而左侧整块 `CultivationBoard` 仍显示中文——因为 HQ 容器未调用 `setCultivationLanguage()`）｜发现：2026-11-27｜状态：已修｜审查：agent — 待批次独立只读盲审收口
>
> **留痕**：Note [2026-11-27-ux-ui-audit-batch-fixes](../../../notes/implemented/2026-11-27-ux-ui-audit-batch-fixes.md)（批次 384..391：培养板语言 prop 显式同步）

## 症状

1. 在 `locale: en` 配置下直接点左侧栏 `Dream Team HQ` → 切到 `Cultivation Workshop`（此前未打开过右栏 `Archive -> Cultivation`）；
2. 页面顶栏（`Dream Team HQ / Overview / Ledger & Deliverables / Strategy / Cultivation Workshop / Back to Chat`）与右侧栏（`Role cultivation chat now runs natively... / Start Cultivation Thread`）均为英文；
3. 左侧整块 `CultivationBoard` 却渲染为简体中文：`我的分身：CEO`、`让角色今后的工作更好`、`开始记录一项工作`、`需要我处理`、`已采纳的方法`、`journal 素材（不用你操作）`、`人的赞/踩（本会话）`、`怎么养`。

## 运行面

- **面 = client**：[company-hq.tsx](../../../packages/company-pack/src/client/ux/company-hq.tsx)、[CultivationBoard.tsx](../../../packages/company-pack/src/client/cultivation/CultivationBoard.tsx)、[CultivationTab.tsx](../../../packages/company-pack/src/client/tabs/CultivationTab.tsx) 与 [CultivationView.tsx](../../../packages/company-pack/src/client/cultivation/CultivationView.tsx)。

## 复现

```sh
pnpm test tests/client/ux/company-hq.spec.ts
```

真浏览器原发现命令：`source run/env.sh && node runtime/tmp/ux-audit/phase2-audit.mjs --en-only`（实测 `[FAIL] E1_en_hq_cultivation_no_cjk`）。

## 根因与证据

`cultivation-copy.ts` 使用模块级语言状态，由 `setCultivationLanguage` 切换。`CultivationTab` 与 `CultivationView` 都有调用 `setCultivationLanguage(props.t('meta.language') === 'en' ? 'en' : 'zh')`，而 Wave S3 新增的 `HqCultivationWorkshop` 直接透传了 `CultivationBoard`，遗漏了该同步调用。

## 失败类与同类排查

- **失败类**：多宿主复用带隐式全局语言状态的子组件时，新增宿主遗漏语言同步。
- **同类排查**：全面检索 `CultivationBoard` 全仓全部三个挂载点（`HqCultivationWorkshop`、`CultivationTab`、`CultivationView`），为 `CultivationBoardProps` 增加 `language` prop 并在三处全部显式传入，避免后续新宿主再次遗漏。

## 已修判定

- 英文界面下不经 `Archive -> Cultivation` 直开 `Dream Team HQ -> Cultivation Workshop` 时，`CultivationBoard` 渲染英文且零中文字符残留；切回 `zh` 时即时恢复中文。

## 修复证据

- 改动面：`packages/company-pack/src/client/ux/company-hq.tsx`、`packages/company-pack/src/client/cultivation/CultivationBoard.tsx`、`packages/company-pack/src/client/tabs/CultivationTab.tsx`、`packages/company-pack/src/client/cultivation/CultivationView.tsx`、`tests/client/ux/company-hq.spec.ts`
- 红：`pnpm test tests/client/ux/company-hq.spec.ts` —— 修复前 1 failed（`BUG-385` 用例在 `en` 下仍输出「我的分身」）
- 绿：`pnpm test tests/client/ux/company-hq.spec.ts` —— 7/7 passed（`en` 零 CJK 且含 `My double` / `Needs me`，切回 `zh` 恢复中文）
- 提交：commit 4711f9d3
