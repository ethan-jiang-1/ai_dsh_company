---
status: 推敲中
opened: 2026-10-27
---

# 推敲：六维提分——把 D1 / D4 / D5 从 B+ 推到 A-

> 立卡：2026-10-27 ｜ 状态：推敲中 ｜ 类型：任务 ｜ 毕业：做 ｜ 可关闭：否
>
> 用户口径：A- 以下（D1/D4/D5 = B+）全部想办法提高；已批"按顺序全做（含版本 bump；真模型档待授权）"。

## 问题与期望结果

上一轮收口评分：D2/D3/D6 = A-，D1/D4/D5 = B+。本卡把三个 B+ 推到 A-，判据 = 该维无已知结构债，
或剩余项不再增加 agent 的日常判断成本。**完成 = 三批落地 + 实跑证据 + 评分复评**。

**进展（2026-10-27/28 深夜）：** 批一 D1 已落（[Note](../../notes/implemented/2026-10-27-d1-start-path.md)：
AGENTS 顶部三样开工、锚点、三件套分工；走查页签任务文档读入 570→206 行）；批二 D4 已落
（[Note](../../notes/implemented/2026-10-27-d4-release-and-dist-guard.md)：0.3.15 就位、release 8 项全绿、
dist-freshness 第 49 门、canonicalPath/isRecord 收家）。批三 D5 UI 金样已落（[Note](../../notes/implemented/2026-10-28-d5-ui-golden.md)：隔离场景 3.8s、9 页签金样、`ui-golden-freshness` 第 50 门、cdp-probe `--texts/--json-out`）。剩余 = 批四认证档（需授权）+ fixtures 出处 + 拆巨测；
probe-source 切片 spec 未动（明确留待下一轮）。

## 当前情况（本轮实测，2026-10-27 深夜）

**D1 入口成本**
- 入口链六件 = AGENTS 80 + project-map 94 + dev-loop 155 + testing 72 + tests/README 93 + checks/README 78
  = **570 行 / 66KB**；AGENTS 第 4 行把六份全列成"初入仓库"，认真读就要读 570 行。
- `md-links` **已校验锚点**（slug 规则 = 小写、去非字母数字/空格/连字符、空格→`-`），可安全用
  `dev-loop.md#05-任务入口与交接` 这类直达；目前三处热链都没带锚点。
- 任务 owner 本身很薄：`packages/company-pack/src/README.md` 32 行、`presets.md` 195 行。

**D4 版本/产物**
- `node tools/release.mjs --check` 实跑 **失败**：`manifest 版本 0.3.10 ≠ package 0.3.14`。
- `_dist/` 现状三处不一致：tarball `0.3.14`（20:30 生成）、`release-manifest.json` 记 `0.3.10`、
  `package.json` `0.3.14`；manifest 的 `gitSha` 停在 `630fe82`。
- `--prepare` 拒绝同版本重打（"同版本重打会让字节漂移"）⇒ 要交付当前代码**必须 bump 0.3.15**。
- `_dist` tracked 面只有 `安装手册.md`；tgz/sha/manifest 均 gitignored ⇒ 新鲜度门禁在 CI 上应 `SKIP`。

**D5 UI 金样可行性（本轮做了隔离场景原型）**
- `node tools/standalone.mjs --provision-only --no-build` 建隔离 home+profile **3.8s**；
  以它起 web、跑 cdp-probe：**9/9 页签、零 console/客户端错误、error ring 已装**。
- 隔离盘无会话时，逐页签可见文本**稳定可复现**（实测长度）：待办 55 / 看板 45 / 依赖图 13 /
  在场 77 / 用量 87 / 任务板 20 / 培养 624 / 台账 79 / 成品 79。
- 发现一处产品面噪声（候选缺陷，未修）：无会话时「台账/成品/培养」显示"不可读/目录不可达"，
  而盘上 `kb/deliverables-index.json` 实际存在——面板是会话作用域，空会话应说"先打开一个会话"，
  不是"目录不可达"。
- `snapshots/` 总量预算 2MB（现 100KB），放一份 ~4KB 金样无压力。

## 计划

### 批一 · D1 开工最小路径（先做，零风险）
1. **AGENTS 顶部改成"开工最小路径"**（不新增路由器）：本文件 → 任务 owner（改角色 = presets.md /
   host·Web = src/README / 文档 = docs/AGENTS.md）→ `tests/README.md` 的改动面行；常设边界 = policy；
   流程 = dev-loop §0.5/§1；空间/运行态 = project-map / runtime-map（按需）。命令 = verify/test/typecheck。
2. **热链带锚点**：AGENTS→dev-loop `#05-任务入口与交接` / `#1-执行链从授权到有证据交接`；policy 的 P1。
3. **验证三件套各加一句分工**（testing = 政策 / tests/README = 映射与命令 / checks/README = 索引）。
4. 验收：读入行数 ≤250（现状 570）；fresh-agent 走查（只读子代理）报"从零到能开工"读了几份、能否跳过 dev-loop 全文。

### 批二 · D4 版本/产物收口（最急）
1. `pnpm release --bump patch` → 0.3.15；填 CHANGELOG（本日用户可见变化：真页面车道、错误环、
   分层门禁、SKIP 语义、政策层/入口瘦身、UI 场景）。
2. `--prepare`（构建 + tarball + 手册 + manifest）→ `--verify`（verify/test/release-smoke/lifecycle/
   standalone/client-load/preset/present-catalog）→ 提交后 `--check`。
3. 清掉旧 `0.3.14` tgz/sha（gitignored，防同目录混两份字节）。
4. **新门禁 `dist-freshness`**：`_dist/release-manifest.json` 在场时校验
   `manifest.version == package.version`、`artifact.sha256` 与 tgz 一致、`manualSha256` 一致、`dirty=false`；
   `_dist` 不在 → `skip`。红证 = 把 manifest 版本改回 0.3.10 → 红；删 `_dist` → SKIP。
5. **清两个便宜 no-go**：`canonicalPath` → `host/paths.ts`（4 份收 1）、`isRecord` → `lib/guards.ts`（3 份收 1）；
   `collaboration-probe-verdict.spec` 去掉"切片源码 + vm 求值"，改为 import 探针导出的纯函数。
6. 验收：`release --check` 绿；`dist-freshness` 红→绿；no-go 清单 3 → 1；verify/test/typecheck 全绿。

### 批三 · D5 UI 金样档
1. `cdp-probe --texts --json-out <file>`：每页签捕获归一化可见文本（trim + 折叠空白）进 verdict，
   verdict 可落指定文件（通用能力，不只给金样）。
2. `ui-scene-smoke --isolated [--golden|--refresh-golden]`：standalone 建隔离 home/workspace（`runtime/` 下，
   gitignored）→ 起 web → cdp-probe → 与 `snapshots/ui/company-shell.golden.json` 比对；失败落证据目录；
   `--refresh-golden` 更新金样（必须打印每个页签的首行差异）。
3. 新门禁 `ui-golden-freshness`：金样的 `catalog` 必须等于注册源解析结果、每个页签有非空文本；
   无金样 → `skip`。红证 = 改一个页签标题（或注册源）→ 红。
4. `snapshots/README.md` 登记 company-shell 场景与来源性质（合成、无部署数据）。
5. 若时间允许：修"无会话时台账/成品/培养显示不可读"的文案（先立 BUG 卡，改文案 + 重刷金样）。
6. 验收：改一个面板空态文案 → 金样档红；`--refresh-golden` 后绿；`snapshots-budget`/新门禁全绿。

### 批四 · D5 认证档与测试卫生（需用户授权真模型）
1. 跑 `entry-probe-smoke`（真模型，一次 13 题）+ `delegation-smoke`（一次 prompt），把结果摘要与日期记进 Note。
2. 新增 fixtures 出处登记（tests/fixtures/README.md，本轮创建）逐件 provenance + 一条 spec 校验"每个夹具都有登记"。
3. 拆 4 个单 `it` 巨测（tab-registration / composition / role-mark-fixture / session-adapters）按 describe 分组。
4. 验收：认证档有实跑记录；fixtures 100% 有出处；947+ 全绿。

## 风险与边界

- **版本 bump 会改 `docs/release.md` 的版本字面量与 CHANGELOG**；`release --verify` 跑全套约 10–20 分钟。
- **UI 金样只覆盖外壳与空态**（无会话数据面），不冒充"会话内渲染"回归；数据面仍由 keyless spec 覆盖。
- **隔离场景依赖 pnpm + built lib**（与 dev 车道同前置）；缺构建时 exit 2，不假绿。
- 真模型档只有在用户明确授权后才跑，成本极低但需要点头。

## 关闭条件

- 三批（+ 授权后的认证档）全部落地，`verify` / `test` / `typecheck` / `release --check` 全绿；
- 评分复评：D1/D4/D5 达到 A- 或给出"为何仍不能"的证据；
- 实施 Note 与合同同步，本卡归档并写去向。
