# 成品目录：盘上 meta/final 的生成索引 + 只读页签（2026-10-19）

状态：implemented（2026-10-19；成品台账卡；`present` 状态已接入 deliverables-check 审计；converge 自动重建）

> **2026-10-25/28 部分取代（所有权）**：host 侧 catalog + domain `presented` 账本成为权威；
> 本文只保留“派生索引 + 只读页签 + 不建第二份手写事实”的决定与当时证据。writer/presented 权威、
> tracked 状态与筛选档数按现行合同（[data-model](../../docs/data-model.md) §二/§三）为准。

## 决定

公司级「成品台账」按**派生视图**落地，不新建第二份手写事实、不新增 Remote/store：

1. **数据面 = 盘上 `deliverables/` + `deliverables-archive/` 的 `final.md` + `meta.md`**。`tools/lib/deliverables-catalog.mjs` 是纯形状（只收 final、按 kickoff 倒序、计数活跃/归档/台账外），`tools/deliverables-index.mjs` 扫描并生成 `company-workspace/kb/deliverables-index.json`。当时 47 份（**活跃 0 / 归档 47 / 台账外 1** / present 46 / 未 present 1 / present 未核 0；现行数字以生成器输出为准）；2026-10-20 已收敛 v2 / v3 / lingang / role-kit / private-deploy / token-account-pool / hefeng / kid-ai 八件；private-deploy 先由真 CEO 会话补 present 再收敛；hefeng 判不了、kid-ai 已采纳；light 已废弃/无 final（不入目录）。`present` 状态**不另写判据**：生成器跑 `checks/audit/deliverables-check.mjs --json`，取最后一行 `JSON.presented`；审计不可得时 `presented=null`（面板显示「present 未核」，不冒充）。
2. **页签 = 右栏「成品」**（第 9 个公司页签，guide entry 同步）。只读：统计（当时 共 47 / 活跃 0 / 归档 47 / 台账外 1 / present 46 / 未 present 1）→ 全部/活跃/归档/台账外/未 present 五档筛选 → 按月分组 → 每行 `结果 tag + slug + 归档/台账外 + 日期·类型`，一句话结论复用 `LedgerSummary`（2 行 + 全文入口），右上「打开」用 `dsh-resource://file/session/...` 在右栏预览 `final.md`。
3. **静态索引说真话**：页签头显示「静态索引 · 生成于 …」；「重读」只重读文件，不轮询。缺索引/坏 schema 明确提示跑生成器，不静默空表。
4. **并列不替代**：动议台账答「决定了什么」，成品目录答「交出了哪些 final」；`present` 状态由 domain 账本提供、经审计档透出（2026-10-28 M2 起；当时 = `deliverables-check`），目录只显示，不另写审计。

## 输掉的方案

- **Host Remote / 实时读模型**：要新增 pack 的 Remote 命名空间与 generated `/remote` 装配，当前包没有自有 Remote 先例；成本高于本轮价值。生成索引 + `workspaceFiles.read` 一次读取已够；日后要实时再升。
- **客户端自己扫盘**：`workspaceFiles.list` 逐目录 + 逐 meta 读 = 90+ 次 RPC，开页签会明显慢；不取。
- **生成第二份手写清单**：D28/D34 的「第二清单必漂」；本索引是**生成物**（生成器 + 页签只读），不是手写事实。
- **把成品目录塞进动议台账**：两者粒度不同（40 行动议 vs 44 份 final），塞一起会让台账既不是决策账也不是产出账。
- **首版不带 `present` 状态**：先落 final + meta；本轮已补，用 `deliverables-check --json` 的单一判据，不重写。
- **新建数据存储**：盘上 meta/final 已是权威，目录只是投影；不建。

## 后果

- `company-workspace/kb/deliverables-index.json` 是 **gitignored 生成物**（workspace 整树 gitignored；当时 44 条）；重新生成即可重建，不手改。产生/归档成品后跑 `node tools/deliverables-index.mjs`；已接进 `converge`：正常收敛/`--resume` 后自动重建；也可 `node tools/converge.mjs --rebuild-index` 单独跑。
- 第 9 个公司页签「成品」；`company-tab-registration`/`tab-icons`/组合测试同步到 9。
- 顺手修：`BoardTabTitle`/`BoardGuideEntry` 的旧「5 秒自动刷新」→「投影更新」；`wk-pane-head` 标题/按钮 `nowrap` + 新鲜度文案省略号（窄栏不再把「重读/浮出」挤成竖排）。
- 页签名/工具地址：`sessionFileAddress` 段级编码（空格/# 不丢）。

## 验证

真跑过的命令与红/绿形态：

- **生成器红**：把 `buildDeliverablesCatalog` 的 `if (!entry.final) continue` 去掉（非 final 也进目录）⇒ `npx vitest run tests/harness/deliverables-catalog-tools.spec.ts` **3 failed / 2 passed**；还原 ⇒ **5 passed**。
- `node tools/deliverables-index.mjs` ⇒ `{ total: 44, active: 5, archive: 39, unledgered: 5, presented: 42, notPresented: 2, presentUnknown: 0 }`。
- `source run/env.sh && node tools/converge.mjs --rebuild-index` ⇒ 收敛末尾同一路径重建成功（index 计数同上）。
- `source run/env.sh && node checks/audit/deliverables-check.mjs --json` ⇒ 末尾 `JSON:` 行含 `finals:47 / presented:46`；清理前 2 条真违规（final-not-presented / meta-shape-bad），清理后 **0 违规**（private-deploy 已真 present；recon-pack 仅 legacy 观察项），不因目录而绿。
- 无 `DSH_HOME` 跑生成器 ⇒ 警告「present 未核」+ `presented:null`（44 unknown），不冒充；`source run/env.sh` 后重建恢复 42/2/0。
- 2026-10-20 清理收敛：v2 / v3 / lingang / role-kit / private-deploy / token-account-pool / hefeng / kid-ai 八件真收敛，每次自动重建索引（活跃 5→4→3→2→1→0）；台账 47 行/46 ✅；`deliverables-check --json` 违规从 2 降到 **0**。
- private-deploy 的 present：真 CEO 会话 `session-a87b177b…` 用 `present` 呈现已有 final（未改文件）；同时修 `parseSessionLog` 把 present 工具返回的**绝对路径**按会话 cwd 归一到工作区相对路径——不修则新 present 永远审计不到。
- 收敛计划误判修复：`isPlaceholderConclusion` 只认整值占位；v2 的真结论里提到「未回填」不再被判「未备」（修前计划 `未备`，修后 `可收敛`）。
- `pnpm test` ⇒ **70 files / 695 tests passed**（新增 pure catalog 5 + client catalog 8 + client-face 1 + converge-rules 3 + audit 绝对路径 1）。
- `pnpm verify` ⇒ **ALL PASS**。
- pack 双面构建：`node ./node_modules/typescript/bin/tsc -b packages/company-pack && (cd packages/company-pack && ../../node_modules/.bin/tsdown)` ⇒ 成功；之后 `client-load-smoke` **ALL PASS**。
- `source run/env.sh && node probes/browser-visual/deliverables-catalog-probe.mjs --fixture` ⇒ **ALL PASS**：成品目录行数 44 = 索引 entries；统计/四档筛选/44 个「打开」按钮；点第一行「打开」后真 app 正文出现 final 标题「私有化部署 · 大众硬件 · 一线模型：我方技术储备盘点」（用正文片段，不用 footer 字样）；窄栏 390 列表仍可见；图落 `snapshots/visual/deliverables-catalog/{desktop,narrow}.png`。

## 未做 / 边界

- **recon-pack 归档 legacy 未 present**：唯一 `未 present`（1/47）；历史件，审计只作 legacy 观察项，不补。
- **light 已废弃/无 final**：按用户轻量纪律，四稿收齐即停；目录不列，文件留 active；
- **hefeng / kid-ai 已收口并归档**。
- **实时性**：页签是静态快照 + 重读，不订阅盘变化；需求变强时再考虑 host read model/Remote。`converge` 自动重建覆盖盘变更的主路径。
- **已跑**：`replay-smoke --ui` r3-delegation **ALL PASS**（33s；委派卡/aria/金样；workspace 未认证）；成品目录打开链路仍由真 app 探针覆盖。

批次句号与清理清单见 [2026-10-20-company-panel-batch-close](../archived/receipts/2026-10-20-company-panel-batch-close.md)。
