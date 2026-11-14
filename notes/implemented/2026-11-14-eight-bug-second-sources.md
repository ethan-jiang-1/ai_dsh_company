# 2026-11-14 · 八张缺陷卡的四个「第二套事实源」

状态：implemented（2026-11-14 落地）

上游 = 用户 2026-11-14「_backlog/bugs 现有大量刚才经过 exploratory test 发现的 bug，你全部扫描完之后，系统地思考思考如何修复它们，按照我们的研发流程」；
来源 = [深面持续探索 Round 86](../../_backlog/issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C8/C9/C10）；
逐卡判定与证据 = [BUG-152..159 归档索引](../../_backlog/_archive/fixed_bugs/README.md)。

## 决定

八张卡（BUG-152..159）不是八个独立补丁，而是四处**同一功能的两个载体各有一套解释**。每处先把事实源
收成一处，再让所有载体消费它；不按症状各打一个补丁。

1. **headings PRD 的文本形状层**（152/153/157）：解析器此前把原始字节当文档结构。现在扫描层住在
   `packages/company-pack/src/lib/markdown-shape.ts`（2026-11-14 后续抽出并与 `/req check` 共享；
   见 [形状层 Note](2026-11-14-shape-layer-and-structure-semantics.md)）：入口 `normalizeDocument()`（去 BOM、
   CRLF/lone-CR → LF）、`scanDocument()` 维护围栏状态（三反引号 / 三波浪号，开合行本身也算围栏内），
   AC 与 slice 各自维护 `seen` 集合。Slices 表、`### REQ-###` 定义块、REQ 字段行都只读这个层。
   为什么在入口归一化而不是给每个正则加 `\r?$`：一行 `(.*)$` 的 `.` 不匹配行终止符，标题行尾的 `\r`
   会让整条标题不命中；三个解析器各容错一次就是三处假设，入口归一只有一处。
2. **present 闸门的判据与 present / `/req check` 同源**（154/155/156）：`prd-gate.ts` 删掉自带的三套
   第二判据——numbering 改读 `lib/requirements-check.ts` 的 `numberingMarker()` 三态
   （declared / value / valid）；cwd 改读 `ctx.workingDirectory.ensure(agent, signal)`（与 `present` 同一个
   projection，header.cwd 是会话创建时的快照，`cd` 后过期）；读文件改读
   `host/run-bundle/company-root.ts` 的 `readCompanyFileAt()` 三态（text / missing / unsafe）。
   语义由此固定：**missing 才是旧动议豁免，unsafe（symlink / 越界 / 非普通文件 / 根坏）一律 deny**。
3. **push 范围按 zero-SHA 语义分派**（158）：`checks/pre-push-surfaces.mjs` 的 `pathsOfRef()` 三支——
   remote 非零 = `git diff <remote> <local>`；remote 全零（新分支）= `git rev-list <local> --not --remotes`
   取整条出站提交集再逐个 `diff-tree --root`（只 diff tip 会漏分支里更早的提交 = 假绿）；
   local 全零（删除 ref）= 跳过、不调 diff（对 `000…` 做 diff 是 `bad object` 假红）。
4. **错误环先读字段、再退 JSON**（159）：`packages/company-pack/src/client/wiring/error-ring.ts` 的
   `textOf()` 对普通对象先取 `message` / `reason` / `name`，取不到才 JSON 化，`'{}'` 视为无信息。
   `JSON.stringify({})` 是 truthy 的 `'{}'`，会短路 `event.message`；跨 realm 的 `Error`
   （`instanceof Error` 为 false）经 JSON 化同样是 `{}`，但字段可读。

这条纪律与本仓既有的「一处事实一个家」同轴：**解析器没有第二套行假设，闸门没有第二套判据，
hook 没有第二套范围语义，错误环没有第二套取文顺序**。

## 输掉的方案

- **152**：给标题/字段/表格三个正则各加 `\r?$` 与 BOM 判断——三处假设、三处漂移；入口归一化更便宜。
- **152**：把 BOM 当成「坏文档」判红——平台差异不是内容错误，判红只会把合法交付卡死。
- **153**：只在定义小节范围内匹配标题——围栏里的 `## Slices` 仍会提前结束小节，症状原样。
- **153**：引入完整 Markdown 解析依赖——为两个状态位（围栏/标题）付一份外部依赖与版本纪律，不值。
- **157**：让下游 `find()` 去重——错误进任务板才暴露；只查跨 REQ 重号——同 REQ 内重号正是最常写错的形状。
- **154**：闸门保留自己的正则、只补空值分支——两个 parser 继续漂移，下一个值形状还会分叉。
- **155**：只接受绝对路径——破坏 `present` 既有体验，且没解决「闸门与工具看不同的当前目录」。
- **155**：cwd 解析不到时放行——这正是本卡要杀的静默跳过；改成明确 deny 并给两条出路。
- **156**：unsafe 与 missing 一起 deny——旧动议（没 meta 或没草稿）会被误杀；missing 豁免必须保留。
- **156**：只在闸门里做 realpath——新读载体继续各自实现形状判据，矩阵的读面登记缺口不收口。
- **158**：新分支一律 diff 全树——每次 push 都触发所有面级检查，成本与噪声不可接受。
- **158**：新分支对 tip 做 `diff-tree --root`（加 `--root` 但仍是单提交）——根提交之外的多提交分支仍漏。
- **159**：只把 `'{}'` 特判成空串——跨 realm Error 的真实 message 仍丢。
- **159**：让 `event.message` 永远优先——会丢掉 `Error` 的 `name: message` 形状，环里少一层可读信息。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | headings PRD 的结构只由「归一化后的非围栏行」决定；present 闸门与命令/工具同源；push 范围三形状；错误文本先字段后 JSON |
| 唯一入口 | `lib/markdown-shape.ts`（扫描层）、`lib/prd-check.ts`（PRD 判据）/ `lib/requirements-check.ts` 的 `numberingMarker` / `host/commands/prd-gate.ts` / `checks/pre-push-surfaces.mjs` / `client/wiring/error-ring.ts` |
| 读载体 | `/prd check`、present 闸门、`/req check`；push hook；错误环与 cdp-probe |
| 写载体 | 新增 PRD 解析、闸门判据、push 范围或错误取文时先改上述唯一入口，再改 spec |
| 契约测试 | `tests/lib/prd-check.spec.ts`、`tests/lib/requirements-check.spec.ts`、`tests/host/commands/prd-gate.spec.ts`、`tests/host/contract/file-shape-agreement.spec.ts`、`tests/client/wiring/error-ring.spec.ts`、`tests/checks/pre-push-surfaces.test.mjs` |

## 验证

| 层 | 失败类 | 负控（见过红） |
|---|---|---|
| keyless unit `tests/lib/prd-check.spec.ts`（21 passed） | 1 / 6 | 拆 `normalizeDocument` → CRLF/BOM 用例红；拆 fence 状态 → 围栏 3 条红；拆 AC/slice `seen` → 重号 2 条红 |
| keyless unit `tests/host/commands/prd-gate.spec.ts`（9 passed） | 2 / 6 | 闸门改回 `header.cwd` → 「cd 后」红；改回 `/^numbering:\s*\S/m` → 空值形状红；`unsafe` 改 `continue` → 三种 symlink 形状红 |
| keyless unit `tests/lib/requirements-check.spec.ts`（22 passed） | 2 | `numberingMarker` 四形状同源断言（missing/empty/invalid/identity） |
| contract 矩阵 `tests/host/contract/file-shape-agreement.spec.ts` + `company-root-safety`（147 passed） | 6 / 8 | 新读载体 `company.readFileAt` 入 READERS；`carrier-registry` 登记后 `company-root-carriers` 绿 |
| keyless unit `tests/client/wiring/error-ring.spec.ts`（8 passed） | 9 | 拆 `textOf` 对象字段分支 → `{}` 用例的 message 变 `"{}"` |
| checks 自测 `tests/checks/pre-push-surfaces.test.mjs`（3 passed） | 8 / 12 | 还原旧范围分支 → 新分支与删除 ref 两条红（`not ok 1/2`） |
| 全量 | — | `pnpm test` 247 files / 2046 tests；`pnpm typecheck`、`pnpm lint`、`pnpm dup`、`pnpm verify` 全绿 |

## 未覆盖轴

- **真浏览器/真页面错误环**（`cdp-probe`）本轮未跑：`textOf` 是纯逻辑，五种形状由 keyless 覆盖；跨 realm 的
  真实来源（iframe / worker 抛错）本仓没有现成页面可复现，等有场景时按面跑 `ui-scene-smoke`。
- **真实 pre-push**（真 push 一条新分支到远端）本轮未跑：三条形状由临时 git 仓库 + 真脚本子进程覆盖；
  下一次真实新分支 push 时观察 banner 是否按预期点名面级检查。
- **`/prd check` 真命令面**的 CRLF/BOM 只经由同一 `validateProductDocs` 覆盖，未单独起 CLI；命令与闸门共用
  实现，故不重复造证据。
- **flush 位置**：`parsePrdSlices` 在首个 `## ` 标题处结束，围栏外的 `## ` 之后若还有 slice 行会被忽略——
  现行模板形状之外没有消费者，未展开。
