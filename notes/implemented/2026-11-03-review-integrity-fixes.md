# 2026-11-03 · 发布/A- 收口的两轴 review 修补

状态：implemented（2026-11-03；review 后修补）

> 范围 = `51e87dd..HEAD`（D1/D2/D5/D7 A- 批次 + 0.8.0/0.8.1）
> 方法 = code-review 两轴：Standards（AGENTS/docs/testing/release/notes + 气味基线）与 Spec（第五轮卡 + A- 收口 Note）

## 决定

- 按两轴 review 的硬发现逐条修补；清单见下。用户可见变化归 CHANGELOG，过程证据归本条。
- 未关闭项（D7 文档化边界、D2 长函数、tests 类型面等）另列「仍未做」，不冒充已修。

## 硬发现与修补

1. **CHANGELOG 混入维护者过程证据**（CHANGELOG 自述“只记用户/收件人可见变化”）：0.8.0 的
   “D1 checks 库存/D2 spec 拆族/D5 覆盖”与 0.8.1 的覆盖数字已删；过程证据留在 Notes。
2. **0.8.0 Breaking 的迁移提示不可执行**：包没有 `./lib/*` 子路径导出；改为“包未提供子路径，
   需自行复制或从源码取”，不再教一个不存在的 import。
3. **根 lock 的 company-pack importer 仍列已删 peer**：只删本包段的
   `session-persistence-jsonl` / `tool-workflow` / `workflow-ptc`（后两者根 devDeps 仍在用），
   `pnpm install --frozen-lockfile` 通过。
4. **0.8.1 slug 修复重复实现**：`catalog.ts` 改用 `lib/deliverables-catalog.ts` 的
   `slugFromDirName`，删掉内联日期正则。
5. **`missingIndexedScripts` 死代码**：生成物门禁上线后无生产调用，删除函数与其测试。
6. **presets 缺 keyless YAML schema**：新增 `presets.spec` 用例，用 vendor `js-yaml` + 自定义
   `!!js` 标量 schema（不求值），断言顶层数组 → insert → dsh-agent-preset → config.plugins、
   id 唯一、行有 id/name。
7. **skip 无预算守卫**：新增 `tests/harness/skip-budget.spec.ts`；只允许 `ledger.spec` 的
   dev-only live 档，且登记“预期 3 例（dev home）/0 例（fresh clone）”。新 skip 未登记即红。
8. **when-to-read 的 blockquote 后缺空行**：6 份插入式文档补空行，避免 lazy continuation 把正文吞进引用块。
9. **release-smoke ④c 假红**：in-app install 的 fetch 15s 在负载下 abort；改为 60s（inspect 仍 15s）。
10. **D7 inject 偏离未进 README**：已知限制补“8 条边 = client 模块 factory 依赖，删除需上游合同/证据”。

## 输掉的方案

- **保留 CHANGELOG 过程行。** 违反 CHANGELOG 的单一职责；过程证据已有 Notes，双写必漂。
- **加 `./lib/presence`/`./lib/doors` 子路径。** 会重新扩大公开面，与 0.8.0 的收窄相反。
- **把 skip 守卫做成“允许所有”。** 那不是守卫；必须列文件 + 预期。
- **把 preset YAML 的 `!!js` 求值。** 测试只做 schema，不执行表达式；求值会把测试变成代码执行面。

## 验证（实跑）

```text
pnpm install --frozen-lockfile --ignore-scripts   # exit 0（lock 与 package 一致）
npx vitest run tests/presets/presets.spec.ts      # 27 passed（含 YAML schema）
npx vitest run tests/harness/skip-budget.spec.ts  # 1 passed（登记守卫）
pnpm verify                                       # ALL PASS
pnpm test                                         # 135 files / 1077 tests（0 skipped on dev home）
release --check                                   # READY 0.8.2（收盘提交重新 stamp）
```

## 仍未做（review 明确点名的字面项）

- D7：`manifestVersion` 未加（vendor 可选、无行为合同）；8 条 `dsh.client.inject` 未删（无上游证据）；
  品牌仍只占 `sidebar.brand.name`；`workspaceRegistry` 仍硬 inject（产品面 = web）。这些是**文档化产品边界**，
  不是已实现的修复。
- D2：6 个源码断言 spec（CSS/装配/parser 面）与 15 个 >100 行函数仍在；A- 按本仓质量尺判定，
  不等于“逐项清单全部关闭”。
- D1：5 份预算零头寸仍在（棘轮信号）；dev-loop 旧锚点保留，§0 表已加一句显式指向。
- D5：catalog 76.29% 仍有未覆盖分支；presets 真挂载仍在 `preset-smoke`（认证档）。
- D7 “0.8.2 发布”指**发布字节 READY**，不是 npm publish；市场索引仍 staged。
