# RFC：installed-shape-self-sufficient（安装后自足）

状态：已消化（2026-10-25 实施；批准：用户 2026-10-25；goal 授权按 2026-10-25 收尾计划自主推进）

## 问题

安装后的公司盘里，注入手册/技能仍引用维护者仓库的 `../docs`、`checks/`、`tools/`、`runtime/`、`snapshots/`；成品页签读的 `kb/deliverables-index.json` 由仓库工具生成，不在 tarball 里。结果：第三方公司拿到的角色会按不存在的指令行动，成品页签永久报“维护者运行 node tools/...”。对应问题卡：[出厂内容自足](../../_backlog/_archive/settled_issues/2026-10-25-shipped-content-self-contained.md) 与 [成品目录与审计产品化](../../_backlog/_archive/settled_issues/2026-10-25-deliverables-catalog-and-audit.md)。

## 当前事实

- 手册 [AGENTS.md](../../packages/company-pack/workspace/AGENTS.md) 多处引用 `../docs/*`、`checks/audit/*`、`snapshots/README.md`、`runtime/rehearsal-workspace/`；13/14 份 skill 结尾写“归仓库的门禁/审计脚本”；CEO chairing skill 写 `node tools/converge.mjs`。
- 模板 [meta.md](../../packages/company-pack/workspace/templates/meta.md) 把词表指向 `tools/lib/deliverables.mjs`。
- 客户端读 `kb/deliverables-index.json`（[company-data-plane.ts](../../packages/company-pack/src/client/company-data-plane.ts)）；错误文案在 [DeliverablesTab.tsx](../../packages/company-pack/src/client/DeliverablesTab.tsx)。
- 仓库生成器 [tools/deliverables-index.mjs](../../tools/deliverables-index.mjs) 依赖 [checks/audit/deliverables-check.mjs](../../checks/audit/deliverables-check.mjs)，不在 pack `files`。
- 现有 [markdown-links.mjs](../../tools/lib/markdown-links.mjs) 把 pack 骨架排除、只校验 dev 盘，安装形状的死链在结构上不可见。
- `present` 工具会向会话追加 `deliverables/presented` 事件（files 为绝对路径），host 可听 `session/event`。

## 方案

### 1. 出厂内容去仓库化

- 逐个文件盘点 `workspace/**` 与 `presets/**/skills/**` 的 Markdown，把引用分成四类：`keep`（workspace 内可解析，如 `kb/...`、`templates/...`）、`inline`（把规则写进正文）、`move`（移到不注入的 `workspace/README.md` 操作员节）、`remove`（维护者专属）。
- 手册：删除 `../docs`、`checks/`、`runtime/`、`snapshots/` 指针；把“维护者从仓库根跑审计”改成“操作员在本部署的检查点”（与成品 catalog 产品化对齐）或删掉；把“排练场”改成会话外的人工排练说明或删除。
- 13 份 skill 的“归仓库的门禁/审计脚本”尾注：改成“可机械核对的部分由操作员在收口时核对（见 workspace/README 操作员节）”，或删除；chairing skill 的 `node tools/converge.mjs` 改为人工收口步骤。
- 模板 `meta.md`：把 `类型` / `结果` 的枚举值直接写进模板；删除 `tools/lib/deliverables.mjs` 与 `deliverables-check` 的仓库路径引用，改指 `kb/motion-ledger.md` 与操作员节。
- 新增门禁 `shipped-links`：以“安装读者”视角扫描 pack 的 `workspace/**` 与 `presets/**/skills/**` Markdown；相对链接穿出 workspace 即红；`docs/`、`checks/`、`tools/`、`runtime/`、`snapshots/`、`notes/`、`_backlog/`、`vendor/` 等仓库顶目录在注入内容里出现即红（维护者附录文件除外，按路径白名单）。
- 负例：往一份 skill 加 `../docs/release.md` → 红；删除 → 绿。把手册的 `snapshots/README.md` 恢复 → 红。

### 2. 成品目录 + present 投影

- 新增 host 侧 catalog 模块（复用 [deliverables-catalog.mjs](../../tools/lib/deliverables-catalog.mjs) 的 schema 与 [deliverables.mjs](../../tools/lib/deliverables.mjs) 的 `parseMeta` 口径）：
  - 扫描 `<workspace>/deliverables` 与 `deliverables-archive` 的 `final.md` + `meta.md`，生成 `kb/deliverables-index.json`（schema 1）。
  - `presented` 来源：监听 host `session/event` 的 `deliverables/presented` 事件，把绝对路径映射为 workspace 相对路径；读旧 catalog，保留已 `presented: true` 的路径；其余写 `null`（未核，不冒充 false）。
  - 启动时若 workspace 在场则生成；`present` 事件后重生成；失败只记日志，不连累应用。
  - 不依赖 `checks/audit/deliverables-check.mjs`、不 shell out、不要求 Node 工具链。
- 客户端：
  - `DeliverablesTab` 的空态改成“还没有成品”（catalog 在场且 entries 空）；只有文件缺失/解析失败才显示错误，文案不再提 tools/...。
  - “重读”按钮保留；页脚改成“索引由本部署的 host 生成，面板只读”。
- 模板/ skill：`meta.md` 不再指向仓库词表；chairing skill 不再要求跑 `converge`。
- `release-smoke`：首启断言 catalog 在场（空 counts 0）；在 workspace 建一个 final + meta，模拟/触发一次 present 事件后断言 catalog 出现条目（可在 smoke 里直接用 host 事件或写 catalog 验证）。

## 输掉的方案

- 把 `tools/*` 随包发：最快，但把开发工具变成产品依赖，要求 Node/仓库布局，且 `deliverables-check` 依赖会话日志格式。
- 隐藏成品页签：省事，但删掉公司核心的成品/审计面。
- 只改文案不改生成器：新装仍没有 catalog，页签仍不可用。

## 验收

命令（全部实跑，红→绿收据进 Note）：

```sh
pnpm verify
pnpm test
node checks/smoke/release-smoke.mjs
node checks/smoke/handbook-smoke.mjs
node checks/smoke/preset-smoke.mjs
```

断言：

- `shipped-links` 在旧树上因仓库引用红；改写后绿；负例（植入 `../docs/release.md`）红。
- 新装（干净 home）：`kb/deliverables-index.json` 在场且 `counts.total=0`；页签空态是“还没有成品”，不是“维护者运行 node tools/...”。
- 在 workspace 建 `deliverables/<date>-<slug>/final.md` + `meta.md`，触发一次 `deliverables/presented` 事件后：catalog 出现该条目且 `presented=true`；未观测 present 的条目为 `null`。
- `pnpm test` 覆盖 catalog 生成/present 投影/空态解析；`handbook-smoke` / `preset-smoke` 仍绿。
- 手工走查：手册 + 14 份 skill + 模板无 `checks/`、`tools/`、`runtime/`、`snapshots/` 注入引用。

## 范围 / 排除

- 范围：出厂 Markdown、`shipped-links` 门禁、host catalog/present 投影、client 空态、模板、release-smoke 断言。
- 排除：完整 `deliverables-check` 平移（第二阶段）、跨会话审计 UI、公司名/品牌（RFC-3）、角色行为重写。

## 实施顺序

1. `shipped-links` 门禁 + 负例（红）。
2. 内容盘点/改写（绿）；同 diff 更新手册/合同。
3. host catalog + present 投影（单测先行）。
4. client 空态 + release-smoke 断言。
5. 全量证据 + Note。

## 实施与证据（2026-10-25）

已落树：

- 新增门禁 [shipped-links](../../checks/gates/shipped-links.mjs)：以安装读者视角扫描 30 份出厂 Markdown（16 workspace + 14 skills）；链接穿出 workspace、指向仓库顶目录、裸路径出现 `checks/`/`tools/`/`runtime/`/`snapshots/` 即红。已接入 [run-gates](../../checks/run-gates.mjs)。
- 内容：手册去掉 `../docs`、`checks/`、`snapshots/`、`runtime/rehearsal-workspace/` 指针，改成操作员/会话内动作；13 份 skill 的“归仓库的门禁/审计脚本”改成“操作员收口核对”；chairing skill 的 `node tools/converge.mjs` 改成人工收口；`templates/meta.md` 内联 `类型`/`结果` 词表，不再指向 `tools/lib/deliverables.mjs`。
- 成品目录产品化：新增 [src/lib/deliverables-catalog.ts](../../packages/company-pack/src/lib/deliverables-catalog.ts)（纯逻辑）与 [src/host/catalog.ts](../../packages/company-pack/src/host/catalog.ts)（扫描/生成/幂等）；host 首启生成空 catalog，`session/event` 的 `deliverables/presented` 投影为 `presented=true`，未观测 = `null`；条目未变不重写（`generatedAt` 稳定，保二启零变更）。
- 客户端 [DeliverablesTab.tsx](../../packages/company-pack/src/client/DeliverablesTab.tsx)：空态/错误/页脚不再提维护者工具；present 未核与已 present 分开展示。
- 证据：`release-smoke` 首启断言 `counts.total=0` 的 catalog 在场且二启零变更；[tests/company/catalog.spec.ts](../../tests/company/catalog.spec.ts) 覆盖空目录、幂等、present path/slug、归档后保留、台账命中。

红/绿收据（实跑）：

- 红：只加 `shipped-links`、未改内容 → `FAIL shipped-links: …/AGENTS.md:23 链接指向仓库/穿出 workspace：../docs/demo.md；…templates/meta.md:3 裸路径指向仓库：tools/lib/deliverables.mjs；…chairing…:58 裸路径指向仓库：node tools/converge.mjs`。
- 绿：改完内容后 `pnpm verify` → `ALL PASS`（含 `shipped-links`、`handbook-budget`、`gate-wiring ×46`）。
- 绿：`node checks/smoke/release-smoke.mjs` → `ALL PASS`，其中 `首启生成成品目录（空目录，不依赖仓库工具）` 与 `第二次启动零变更` 均 PASS。
- 绿：`pnpm test` → 87 files / 839 tests passed（含新 catalog spec）。
- 绿：`node checks/smoke/client-load-smoke.mjs` → `ALL PASS`（真浏览器加载、品牌槽、零 loader 错误）。

环境前提（不是产品 diff）：本机 vendor client 产物不齐时首启会报 `client bundles not found`；本轮按 bootstrap 补建 vendor host/client，并对 `packages/api/session-controller` 单独补 client bundle。产物在 vendor ignore 面。

未验证面：真实 live 会话里 `present` 事件→catalog 刷新的端到端（当前是单测投影 + release-smoke 空目录；需要一次真模型/工具调用会话才能补）；完整 `deliverables-check` 三态审计仍在产品外（第二阶段）；非空 catalog 的浏览器视觉走查未单独做。
