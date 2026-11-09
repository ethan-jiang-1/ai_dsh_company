# 2026-11-03 · notes-liveness 扩：新 Note 必须有决定节

状态：implemented（2026-11-03；七维复评 D3/D4 防复发）

> 上游 = 2026-11-03 `notes:audit` 的 `noDecision`（D6 修复 / review 修补两篇有状态行、无 `## 决定`）。
> 收据/流水应进 `archived/receipts/`，不该以 implemented 身份出现。

## 决定

- `checks/gates/notes-liveness.mjs` 增加：日期 ≥ **2026-11-04** 的 `implemented/` Note 必须有 `## 决定` 节。
- 生效日取明天，存量全部祖父豁免（今天的两篇已就地补节，不靠豁免）。
- `notes/README.md` §三 的 notes-liveness 描述同步；这是规则扩面，不是新门。

## 输掉的方案

- **只保留 notes:audit 的候选。** 候选靠人记得看；0.8.2 A- 收口就是“机械绿、语义没人看”的同类。
- **从今天（2026-11-03）生效。** 会把 A- 收口这类历史收口也拖进来；收口类应进 receipts，而不是补一个假决定节。
- **检查所有 implemented Note。** 存量 100+ 篇会一次性红；与 notes-liveness 既有“祖父豁免”口径冲突。

## 验证（实跑，2026-11-03 12:1x +08）

```text
# 红证：临时写一个 2026-11-04 的 fixture（文件名含 zz-no-decision，有状态行、无 ## 决定）
node checks/run-gates.mjs
# exit 1：FAIL notes-liveness: 日期 ≥ 2026-11-04 但缺 `## 决定` 节 …
# 删除 fixture
node checks/run-gates.mjs
# exit 0：PASS notes-liveness ×121（状态行；决定节生效日 2026-11-04 起 ×0）
```

## 边界

- 只查 `## 决定` 标题；不判内容质量、不判“决定是否被推翻”（后者归 notes-supersession / 人审）。
- 纯收据不得借本门禁留在 implemented：收据进 `archived/receipts/`（notes/README §一）。
