# 2026-11-14 · 文档形状层共享与结构/日期语义（focus v3 八缺陷）

状态：implemented（2026-11-14 落地）

上游 = 用户 2026-11-14「能提交的先提交掉，然后你继续做。现在有新的一轮，又有新的bug上来了」；
上一轮 = [八缺陷 Note](2026-11-14-eight-bug-second-sources.md)（focus v2）；来源 = 探索卡 Round 89；
逐卡判定与证据 = [BUG-160..167 归档索引](../../_backlog/_archive/fixed_bugs/README.md)。

## 决定

1. **文档形状层独立成 `packages/company-pack/src/lib/markdown-shape.ts`**（160/162）：`normalizeDocument`
   （去 BOM、CRLF→LF）+ `scanDocument`（围栏 + HTML 注释两种非定义容器）+ `splitTableRow`（转义竖线）。
   `/prd check` 与 `/req check` 同读这一份，`prd-check.ts` 删掉本地副本。行的可见文本 = 移除 HTML 注释
   片段后的剩余内容（不是整行丢弃），围栏内的行 `structural: false`。
   为什么：两个命令对同一份文档不允许两种结论——BOM 让 `/req check` 报缺头、围栏示例让它多出幽灵 REQ，
   而 `/prd check` 说没问题，操作员不知道该信哪边。
2. **push 范围的 merge 语义**（161）：`commitPaths()` 对有多父的提交取 `git diff <第一父> <sha>`
   （合并结果相对分支上一状态），非 merge 仍是 `diff-tree --root`。
   为什么不改成整段 `git diff merge-base..local`：那需要猜远端参照，正是 BUG-158 避免的「猜 base」；
   逐提交 + 第一父 diff 保持「只看这次带出去的提交」，且覆盖冲突解决/合并编辑引入的改动。
3. **PRD 结构/字段语义**（164/165/166）：REQ 归属映射在 slice 解析时建立（`reqOwner`），一个 REQ 出现在
   第二个 slice 即红；表格按未转义 `|` 切列并把 `\|` 还原为字面竖线；`changeLog` 校验真实日历日期
   （Date 往返）与非空作者/变更。
4. **notes-tree 覆盖全 lifecycle 与日历语义**（163/167）：状态行检查循环包含 `rejected`，其状态词须以
   `rejected` 开头；文件名日期做真实日历往返，状态生效比较用解析后的时间，非法日期不进受查集合。

## 输掉的方案

- **只给 `/req check` 补 normalize/fence，不动 `/prd check`**：两套状态机继续分叉，下一个容器（HTML 注释）
  还得改两遍；共享模块一次收口。
- **注释行整行丢弃**：行内注释（`- userStory: … <!-- 旧版示例 --> …`）会把同行正文一起丢掉；
  改为「只移除注释片段」。
- **merge 用 `diff-tree -m`（逐父）**：会同时列出第二父携带的远端改动，且输出多段难并；第一父 diff 更贴近
  「这次 push 引入的」。
- **merge 用 `--cc`**：只列冲突文件，漏掉合并里手工改的非冲突文件。
- **164 放到 `validateProductDocs()` 的反向映射**：`parsePrdSlices()` 是唯一解析点，放在这里命令与 present
  闸门同时生效；`validateProductDocs` 继续只做跨文档检查。
- **165 只保护 `\|` 不还原**：cell 里留下反斜杠，Goal 的显示值与判据不一致。
- **166/167 只做形状正则**：`2026-13-99`、`2026-00-10`、`2026-02-29` 都能过 `\d{4}-\d{2}-\d{2}`。
- **167 解析失败就静默跳过**：非法日期的 Note 会从受查集合消失，等于门禁自己制造不可见。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | 文档结构 = 归一化后围栏/注释之外的行；push 的 merge 变更 = 合并结果 vs 第一父；一个 REQ 只能属一个 slice；表格 `\|` 是字面竖线；Note 文件名日期必须是真实日历 |
| 唯一入口 | `lib/markdown-shape.ts` / `lib/prd-check.ts` / `lib/requirements-check.ts` / `checks/pre-push-surfaces.mjs` / `checks/gates/notes-tree.mjs` |
| 读载体 | `/prd check`、`/req check`、present 交付闸门、pre-push hook、`pnpm verify` |
| 契约测试 | `tests/lib/prd-check.spec.ts`、`tests/lib/requirements-check.spec.ts`、`tests/checks/pre-push-surfaces.test.mjs`、`tests/checks/notes-tree.test.mjs` |

## 验证

| 层 | 失败类 | 负控（见过红） |
|---|---|---|
| keyless unit `tests/lib/prd-check.spec.ts` + `tests/lib/requirements-check.spec.ts`（54 passed） | 1 / 6 | 拆 `normalizeDocument` → BOM 两条红；注释状态置空 → 注释用例红；`headingDefinitions` 回退 `split('\n')` → 围栏/注释幽灵 REQ 红；去掉 `reqOwner` → 跨 slice 两条红；还原 `split('|')` → 转义竖线红；去掉 changeLog 校验 → 假日期红（合计 8 红） |
| checks 自测 `tests/checks/pre-push-surfaces.test.mjs`（4 passed） | 8 / 12 | 删 `commitPaths` 的 merge 分支 → merge 用例 `not ok 4`（其余 3 条仍绿，证明只打中 merge 形状） |
| checks 自测 `tests/checks/notes-tree.test.mjs`（ALL PASS） | 12 | `rejected` 移出 lifecycle 循环 + 日期回退形状正则 → 5 FAIL（缺状态/计数/错词/越界月/非闰年） |
| 全量 | — | `pnpm test` 247 files / 2057 tests；`pnpm typecheck`、`pnpm lint`、`pnpm dup`、`pnpm test:checks` 全绿；归档后 `pnpm verify` ALL PASS |

## 未覆盖轴

- [environment-gap] **真实远端含 merge 分支的 push 横幅**：merge 路径集合已由临时仓库 + 真脚本子进程覆盖 → `tests/checks/pre-push-surfaces.test.mjs`、`.githooks/pre-push`
- [covered] **4 消费者跨层契约一致性**（`prd-check` / `requirements-check` / `prd-gate` / 读卡原语）→ `tests/host/contract/structure-agreement.spec.ts`
- [covered] **注释与围栏嵌套交错形状**：已由语法生成器与 `mdast` 独立真值差分覆盖 → `tests/support/doc-grammar.ts`、`tests/lib/markdown-shape.property.spec.ts`
- [policy] **GFM 表格行内代码 span 内裸 `|`**：GFM 规范要求转义 `\|`，与 `mdast` 行为一致 → `packages/company-pack/src/lib/markdown-shape-core.js`
