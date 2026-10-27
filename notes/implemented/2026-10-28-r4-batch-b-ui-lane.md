---
状态：implemented（2026-10-28，第四轮批 B：UI 反馈车道）
---

# 批 B：让 UI 金样真隔离、真稳定、真能复现交互

> 上游 = [第四轮六维打扫卡](../../_backlog/issues/2026-10-28-repo-hygiene-round4.md)；审计 = [第四轮报告（R4-01 / R4-07 / R4-18）](../../_backlog/research/repo-hygiene/2026-10-28-six-dimension-audit-round4.md)。

## 决定

1. **隔离场景不再继承 dev 的 bootstrap=off**：`ui-scene-smoke --isolated` 显式设 `DSH_COMPANY_BOOTSTRAP=if-missing`，并把公司盘切到 `<isolated home>/company-workspace`。
2. **UI 金样场景预置“已就绪的空公司盘”**：落 pack 骨架 + 空 `kb/deliverables-index.json` + 空 `cultivation/records/`；否则面板把“目录缺失”渲染成“不可读/读取中”，金样会把未完成态钉成期望。
3. **真隔离默认 workspace**：预置 `<home>/storages/workspace.json`，`defaultWorkspaceId` 指向隔离公司盘。此前 app 会读用户 OS `Documents/deepseek-harness/default-workspace`，既可能泄漏真盘数据，也让金样随人而漂。
4. **等文本稳定再录金样**：`cdp-probe --texts` 对每个页签连续采样（归一化相同、且不含“读取中…/读取团队状态…”）才写入 `tabTexts`；8 次仍不收敛 → `tabFailures` 记 `not-settled`，不静默录半成品。
5. **启动失败可诊断**：`startWeb` 的错误消息带输出尾部（2k）；新增 `onOutput` 注入，调用方自己落盘。`ui-scene-smoke` 把 web stdout/stderr 写 `web.log`（token 脱敏），并在 `scene.json` 里给出 `webLog`。
6. **回执在比对之后写**：`scene.json` 改 `goldenMode` + `goldenResult`（pass/fail/refresh/off/not-run）；fail 时带 `goldenProblems`（expected/actual）；不再出现“probeExit=0 但金样失败”却无机器可读证据。
7. **`--keep` 打 URL**：保留实例时打印带 token 的 URL，写进回执（gitignored 诊断区）。
8. **最小交互复现**：`cdp-probe --steps <file>` + `ui-scene-smoke --steps <file>`，受控动作 `clickText` / `waitText` / `expectText` / `typeText`；解析在 `tools/lib/probe-steps.mjs`（keyless spec），执行仍在 cdp-probe（不开任意 JS 执行面）。
9. **onboarding 模态收口**：隔离 home 无凭据时 “Get started” 可能晚于首屏 1–2s 出现；页签扫完再关一次，避免挡截图/点击。

## 输掉的方案

- **继续读 OS 默认 workspace**：拒绝。会读真人 Documents 下的盘，既可能把客户数据带进金样，也让文本随机器漂。
- **只落公司盘、不写 registry**：拒绝。app 仍会去 OS Documents 建/用默认 workspace，面板读不到公司盘。
- **金样跳过 成品/台账/培养**：拒绝。等于放弃空态回归；正确做法是给一个可读的空公司盘。
- **在 cdp-probe 里跑任意 JS/任意 selector 脚本**：拒绝。`--steps` 只做受控动作，避免把探针变成脚本执行器。
- **把“读取中…”当稳定文本**：拒绝。金样钉的是完成态，不是加载态。

## 后果

- 同一棵干净树连续 3 次 `ui-scene-smoke --isolated --golden` 全绿；改一个页签文本立刻红，且 `scene.json` 有 `goldenProblems`。
- 用户报“点按钮/面板白”时，可用 `--steps` 复现点击、等文本、断言、输入；失败落 `cdp-probe-*/`（截图/body/verdict/console/client-errors）。
- 启动崩溃不再只给“web 提前退出 N”：错误带 tail，`web.log` 落诊断区。
- 金样不再依赖用户 OS 默认 workspace；`snapshots/README` 已登记该隔离边界。

## 验证

- `node checks/smoke/ui-scene-smoke.mjs --isolated --golden` ×3 → 每次都 `金样一致（9 个页签）` / `ALL PASS`，exit 0。
- 红证：把金样「待办」改成 `ZZ-RED-PROOF` → exit 1；`scene.json` `goldenResult: fail`，`goldenProblems.tabs[0]` 带 expected/actual；还原 → 绿。
- `--steps` 正例：`[{"clickText":"培养"},{"expectText":"培养"}]` → exit 0，verdict `steps` 两条 `ok:true`；反例 `NO-SUCH-TEXT-R4` → exit 1，证据 = `cdp-probe-*`。
- `tests/harness/probe-web.spec.ts` 新增“boot 失败带输出尾部 + onOutput”例；`tests/harness/probe-steps.spec.ts` 覆盖解析/拒绝。
- `pnpm verify` → ALL PASS；`pnpm test` → **107 files / 959 tests passed**；`pnpm typecheck` → exit 0。

## 未验

- 真模型 `--ask` 轮次未跑（成本授权）；`--steps` 不依赖模型，已用隔离页签点击验证。
- 全量 17 个 browser probe 未逐个迁移到 `--steps`；本批只给车道加能力，不改各探针。
