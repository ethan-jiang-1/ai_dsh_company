# 成品目录：盘上 meta/final 的生成索引 + 只读页签（2026-10-19）

状态：implemented（2026-10-19；成品台账卡；`present` 审计仍归 deliverables-check）

## 决定

公司级「成品台账」按**派生视图**落地，不新建第二份手写事实、不新增 Remote/store：

1. **数据面 = 盘上 `deliverables/` + `deliverables-archive/` 的 `final.md` + `meta.md`**。`tools/lib/deliverables-catalog.mjs` 是纯形状（只收 final、按 kickoff 倒序、计数活跃/归档/台账外），`tools/deliverables-index.mjs` 扫描并生成 `company-workspace/kb/deliverables-index.json`。当前 44 份（活跃 5 / 归档 39 / 台账外 5）。
2. **页签 = 右栏「成品」**（第 9 个公司页签，guide entry 同步）。只读：统计（共 44 / 活跃 5 / 归档 39 / 台账外 5）→ 全部/活跃/归档/台账外四档筛选 → 按月分组 → 每行 `结果 tag + slug + 归档/台账外 + 日期·类型`，一句话结论复用 `LedgerSummary`（2 行 + 全文入口），右上「打开」用 `dsh-resource://file/session/...` 在右栏预览 `final.md`。
3. **静态索引说真话**：页签头显示「静态索引 · 生成于 …」；「重读」只重读文件，不轮询。缺索引/坏 schema 明确提示跑生成器，不静默空表。
4. **并列不替代**：动议台账答「决定了什么」，成品目录答「交出了哪些 final」；`present` 背书/审计仍归 `deliverables-check`，首版目录不冒充它。

## 输掉的方案

- **Host Remote / 实时读模型**：要新增 pack 的 Remote 命名空间与 generated `/remote` 装配，当前包没有自有 Remote 先例；成本高于本轮价值。生成索引 + `workspaceFiles.read` 一次读取已够；日后要实时再升。
- **客户端自己扫盘**：`workspaceFiles.list` 逐目录 + 逐 meta 读 = 90+ 次 RPC，开页签会明显慢；不取。
- **生成第二份手写清单**：D28/D34 的「第二清单必漂」；本索引是**生成物**（生成器 + 页签只读），不是手写事实。
- **把成品目录塞进动议台账**：两者粒度不同（40 行动议 vs 44 份 final），塞一起会让台账既不是决策账也不是产出账。
- **首版带 `present` 状态列**：需要跑会话日志/`deliverables-audit`，重；首版只认 final + meta，present 审计留在 `deliverables-check`。
- **新建数据存储**：盘上 meta/final 已是权威，目录只是投影；不建。

## 后果

- `company-workspace/kb/deliverables-index.json` 是 tracked 生成物（44 条）；重新生成即可重建，不手改。产生/归档成品后跑 `node tools/deliverables-index.mjs`；本轮未把它接进 `converge` 自动步（见「未做」）。
- 第 9 个公司页签「成品」；`company-tab-registration`/`tab-icons`/组合测试同步到 9。
- 顺手修：`BoardTabTitle`/`BoardGuideEntry` 的旧「5 秒自动刷新」→「投影更新」；`wk-pane-head` 标题/按钮 `nowrap` + 新鲜度文案省略号（窄栏不再把「重读/浮出」挤成竖排）。
- 页签名/工具地址：`sessionFileAddress` 段级编码（空格/# 不丢）。

## 验证

真跑过的命令与红/绿形态：

- **生成器红**：把 `buildDeliverablesCatalog` 的 `if (!entry.final) continue` 去掉（非 final 也进目录）⇒ `npx vitest run tests/company/deliverables-catalog.spec.ts` **3 failed / 2 passed**；还原 ⇒ **5 passed**。
- `node tools/deliverables-index.mjs` ⇒ `{ total: 44, active: 5, archive: 39, unledgered: 5 }`。
- `pnpm test` ⇒ **70 files / 691 tests passed**（新增 pure catalog 5 + client catalog 8 + client-face 1）。
- `pnpm verify` ⇒ **ALL PASS**。
- pack 双面构建：`node ./node_modules/typescript/bin/tsc -b packages/company-pack && (cd packages/company-pack && ../../node_modules/.bin/tsdown)` ⇒ 成功；之后 `client-load-smoke` **ALL PASS**。
- `source run/env.sh && node probes/browser-visual/deliverables-catalog-probe.mjs --fixture` ⇒ **ALL PASS**：成品目录行数 44 = 索引 entries；统计/四档筛选/44 个「打开」按钮；点第一行「打开」后真 app 正文出现 final 标题「私有化部署 · 大众硬件 · 一线模型：我方技术储备盘点」（用正文片段，不用 footer 字样）；窄栏 390 列表仍可见；图落 `snapshots/visual/deliverables-catalog/{desktop,narrow}.png`。

## 未做 / 边界

- **生成索引的自动刷新**：本轮靠维护者跑生成器；`converge` 末尾自动重建是下一步（接入时要证明 move 后索引与盘一致）。
- **`present` 状态列**：未做；`deliverables-check` 仍是唯一审计。
- **实时性**：页签是静态快照 + 重读，不订阅盘变化；需求变强时再考虑 host read model/Remote。
- **未跑**：`replay-smoke --ui` 的页签端到端；本轮用真 app 探针覆盖打开链路。
