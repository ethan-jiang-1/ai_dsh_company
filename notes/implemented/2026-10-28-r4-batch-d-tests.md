---
状态：implemented（2026-10-28，第四轮批 D：用户可见面与生命周期补测）
---

# 批 D：把“整页空白/永久 loading/卸载后还在写”变成可失败的测试

> 上游 = [第四轮六维打扫卡](../../_backlog/issues/2026-10-28-repo-hygiene-round4.md)；审计 = [第四轮报告（R4-05 / R4-16）](../../_backlog/research/repo-hygiene/2026-10-28-six-dimension-audit-round4.md)。

## 决定

1. **公司整页真挂载测试**：`tests/client/company-view.spec.ts` 用 happy-dom + createRoot 真挂 `createCompanyView`，断四子页签、身份条、加载/错误行、浮出回调。测试先抓到一处真 bug：培养页与“读取团队状态…”同时出现；修 `CompanyView.tsx`，培养页不再显示 team loading/error。
2. **workspace 状态机测试**：`tests/client/workspace-text.spec.ts` 覆盖 loading→ready、null→unreadable、卸载 abort、reload 重读；台账/成品/身份条共用的状态机不再零用例。
3. **Host 生命周期**：`tests/company/apply-lifecycle.spec.ts` 覆盖 apply 后迟到 `workspaceRegistry` 触发 inject 回调、dispose 后 `api-session/added` 不再告警；补上 host-composition 没跑的两格。
4. **测试分区归位**：6 个被测对象是 `tools/lib/*.mjs` 的 spec 从 `tests/company/` 迁 `tests/harness/`（authorship / converge-rules / deliverables-audit / deliverables / candidate-scan-labels / deliverables-catalog）；company 区只剩真公司读模型与 host 行为。
5. **重名消除**：company 区 `deliverables-catalog.spec.ts` 迁 harness 并改名 `deliverables-catalog-tools.spec.ts`；client 区同名 spec 保留，命令不再歧义。
6. **指针同 diff 更新**：迁移后 `tests/fixtures/README.md`、`_backlog`、`notes/implemented` 的旧路径一并改到 harness（`bare-path` 硬查）。

## 输掉的方案

- **只加 CompanyView 静态 `renderToStaticMarkup`**：拒绝。子页签切换、浮出回调、effect 加载都需要真挂载，静态渲染测不到。
- **把 6 个 spec 留在 company 区、只改 tests/README**：拒绝。区语义与文档相反，`pnpm test tests/company` 继续被 tools/lib 污染；迁区成本只是 `git mv` + 指针。
- **为 observer 生产接线加源码文本断言**：拒绝。源码文本守卫改格式就红、行为不变也红；宁可留“生产接线未证”的诚实缺口，也不造假守卫。

## 后果

- `CompanyView` 行覆盖从 16.1% 提升（新增交互档）；培养页不再被 team loading 噪声污染。
- 测试总数 959 → **973**（+14：CompanyView 4、workspace-text 4、apply-lifecycle 2，迁区不增；另 probe-steps/probe-web 增量已计入前批）。
- `tests/company` 不再承载 tools/lib 纯逻辑；重名 spec 消除。
- 仍未做：observer 生产接线（`registerAttentionObservers` 在真 apply 里的触发）与 5 份 mkdtemp/env 样板收进拟建的 tests/support 共享夹具；留待下一轮结构批。

## 验证

- `tests/client/company-view.spec.ts` → 4 passed；其中「培养页不应再出现读取团队状态」在修 `CompanyView.tsx` 前红、修后绿（红证即该断言）。
- `tests/client/workspace-text.spec.ts` → 4 passed。
- `tests/company/apply-lifecycle.spec.ts` → 2 passed（迟到 inject 的警告落 stderr；dispose 后事件不再告警）。
- `pnpm test` → **110 files / 973 tests passed**；`pnpm verify` → ALL PASS；`pnpm typecheck` → exit 0。
- 迁区后 `git grep` 旧 `tests/company/{deliverables,converge-rules,authorship,candidate-scan-labels}*.spec.ts` 零命中；`bare-path` 全绿。

## 未验

- observer 生产接线与 5 份测试样板收家未做（见上）。
- 真浏览器/真模型档未跑；本批是 keyless 层。
