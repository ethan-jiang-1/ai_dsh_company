---
status: 调查中
severity: P1
opened: 2026-11-27
---

# BUG-385：英文界面下直开 HQ「培养工坊」整块 CultivationBoard 仍显示简体中文

> 严重级别：P1（双语契约破口：`locale.preference = en` 下从左侧「Dream Team HQ」直接进入「Cultivation Workshop」，HQ 顶栏与右侧启动卡全部为英文，而左侧整块 `CultivationBoard` 仍显示中文——因为 HQ 容器未调用 `setCultivationLanguage()`）｜发现：2026-11-27｜状态：调查中

## 症状

1. 在 `locale: en` 配置下直接点左侧栏 `Dream Team HQ` → 切到 `Cultivation Workshop`（此前未打开过右栏 `Archive -> Cultivation`）；
2. 页面顶栏（`Dream Team HQ / Overview / Ledger & Deliverables / Strategy / Cultivation Workshop / Back to Chat`）与右侧栏（`Role cultivation chat now runs natively... / Start Cultivation Thread`）均为英文；
3. 左侧整块 `CultivationBoard` 却渲染为简体中文：`我的分身：CEO`、`让角色今后的工作更好`、`开始记录一项工作`、`需要我处理`、`已采纳的方法`、`journal 素材（不用你操作）`、`人的赞/踩（本会话）`、`怎么养`。

## 运行面

- **面 = client**：[company-hq.tsx](../../packages/company-pack/src/client/ux/company-hq.tsx#L188-L218) 渲染逻辑（及 [第 288-306 行](../../packages/company-pack/src/client/ux/company-hq.tsx#L288-L306) 的 `<CultivationBoard />` 挂载）均未调用 `setCultivationLanguage`；对照 [CultivationTab.tsx](../../packages/company-pack/src/client/tabs/CultivationTab.tsx#L57) 与 [CultivationView.tsx](../../packages/company-pack/src/client/cultivation/CultivationView.tsx#L103) 两处既有容器均在渲染前调用 `setCultivationLanguage(t('meta.language') === 'en' ? 'en' : 'zh')`。

## 复现

```sh
source run/env.sh && node runtime/tmp/ux-audit/phase2-audit.mjs --en-only
```

实测输出：
- `[FAIL] E1_en_hq_cultivation_no_cjk — HQ CultivationBoard rendered Chinese UI copy in en mode! Snippet: 我的分身：CEO 培养对象 = company-workspace × CEO...`
- 对比截图：`runtime/tmp/ux-audit/out/shots/24-en-hq-cultivation-1440.png`（全中）vs `25-en-archive-1440.png`（挂载 `CultivationTab` 后才被覆写成英文）。

## 根因与证据

`cultivation-copy.ts` 使用模块级语言状态，由 `setCultivationLanguage` 切换。`CultivationTab` 与 `CultivationView` 都有调用 `setCultivationLanguage(props.t('meta.language') === 'en' ? 'en' : 'zh')`，而 Wave S3 新增的 `HqCultivationWorkshop` 直接透传了 `CultivationBoard`，遗漏了该同步调用（从根本上说，更健康的修复应由 `t('meta.language')` 或 prop 驱动而非隐式全局状态）。

## 期望判据

- 用户在英文界面下不经 `Archive -> Cultivation` 直开 `Dream Team HQ -> Cultivation Workshop` 时，`CultivationBoard` 零中文残留（`E1` 英文满态检查全绿）。
