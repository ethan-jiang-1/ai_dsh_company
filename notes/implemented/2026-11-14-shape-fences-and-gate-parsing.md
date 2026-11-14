# 2026-11-14 · 形状层第三次闭集：围栏块、跨行代码与门禁的命令语法

状态：implemented（2026-11-14 落地）

上游 = 用户 2026-11-14「你看，又发现了一些bug，你系统性地思考完了之后，看看怎么处理吧」；
来源 = 探索卡 Round 91；逐卡判定与证据 = [BUG-176..183 归档索引](../../_backlog/_archive/fixed_bugs/README.md)。

## 决定

八张卡仍然是「同一批层再推一层」，修法都是把该层的状态/语义补成闭集：

1. **形状层的容器视图**（176/181）：`scanDocumentDetailed` 现在额外产出**顶层围栏块**
   （`info` / `content` / `startLine`），`extractJsonBlock` 与 `/req check` 的 json 账本都只认这个视图——
   示例围栏（外层 markdown 块里嵌 json 块）不再抢先，注释里的围栏天然不算围栏。
   行内代码状态改为**跨行**：同长度反引号 run 在后续行闭合时，中间行 `structural: false`；
   全文没有闭合的 run 按字面文本处理（CommonMark 语义），开行本身仍可解析字段行。
   `maskHtmlComments()` 随之退役（没有消费者）。
2. **路径段语义**（179/180）：`walkCompanyDirs` 用平台无关分隔符（`/[\\/]+/`）切段，`..` 用栈式消解——
   内部 `..`（`a/../b`）规范化后照常走，栈空再遇 `..` 才 `unsafe`。`relToCompany` 与各 `*At` 入口
   也统一把 `\` 归一到 `/`，避免 `dirname` 在 POSIX 上把 `..\outside` 当成单段。
   先消解、再走目录：存在性检查不能先于越界判定（否则不存在的中间段会把越界折成可豁免的 `missing`）。
3. **门禁的读卡与命令语法**（177/178/182）：
   - `fix-evidence` 的节标题只在**非围栏行**匹配（卡面代码块里引用节名不算节），并保留行首锚定；
   - 命令按各自语法解析：`pnpm [run] <script>` / `pnpm --filter <pkg> [run] <script>` / `pnpm exec <bin>`，
     `node [--import <mod> …] <path>`，`npx [--yes] <bin> …`，`vitest …`，`sh <path>`——选项的值不参与
     script/entry 选择；
   - 拒绝空操作形态：`sh -c`（内联脚本）、`git <sub>`（不产生红→绿）、`node` 任意非脚本文件；
     `node`/`sh` 目标限定在 `tests/`、`checks/`、`tools/`、`run/` 面。

## 输掉的方案

- **176 用正则跳过嵌套围栏**：无法区分「示例围栏」与「真账本」；规范写法是外层用更长的围栏，按 `scanDocument`
  的围栏状态切块才是唯一判据。
- **176 取最后一个 json 块**：多个真账本并存时同样错，且与「第一个顶层块」的合同相反。
- **181 把跨行未闭合反引号一律当普通字符继续扫**：这正是本卡症状（后文 `###` 被当定义）；必须维护跨行状态。
- **181 只按「下一行找闭合」的近似**：三行以上 span 仍会漏；实现按同长度 run 在全文后续行找闭合。
- **181 对闭合行之后的残余内容也按结构解析**：保守置为非结构——残余可能是正文，但把它当标题的风险更大。
- **179 先 `path.posix.normalize` 再判**：与栈式消解等价，但 Windows 分隔符仍要单独归一，stack 一处更小。
- **180 只在 `readCompanyFileAt` 里判 `\`**：写面（`ensureCompanyDir`/`writeCompanyAtomic`）仍会漏；
  归一化落在 `relToCompany` + 各 `*At` 入口。
- **177 只认 `pnpm <script>` 白名单**：合法的 `pnpm run` / `--filter` 被拒，白名单还会漂。
- **178 要求节标题唯一、重复直接红**：把正常写作形态（模板/示例引用）当错误；围栏状态才是判据。
- **182 只按命令前缀过滤**：`sh -c true` / `git status` 仍是空证据；真跑命令则让 `verify` 从秒级变分钟级。
- **183 跟随根 symlink 再判目标**：目标可以在仓外、且 Notes 是仓内冻结记忆；直接拒链接形状更简单。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | 文档结构 = 归一化后「围栏/注释/跨行行内代码」之外的行；顶层围栏块是 JSON 账本的唯一来源；company 路径的段 = 平台无关分隔符 + 栈式消解；门禁证据命令须可解析且非空操作 |
| 唯一入口 | `lib/markdown-shape.ts`（围栏块/跨行 code span）、`host/run-bundle/company-root.ts`（段语义）、`checks/gates/fix-evidence.mjs`（读卡 + 命令语法）、`checks/gates/notes-tree.mjs`（根形状） |
| 读载体 | `/prd check`、`/req check`、present 闸门、`pnpm verify` |
| 契约测试 | `tests/lib/prd-check.spec.ts`、`tests/lib/requirements-check.spec.ts`、`tests/host/contract/file-shape-agreement.spec.ts`、`tests/checks/fix-evidence.test.mjs`、`tests/checks/notes-tree.test.mjs` |

## 验证

| 层 | 失败类 | 负控（见过红） |
|---|---|---|
| keyless unit `prd-check`/`requirements-check`（35 passed / 59 passed） | 1 / 6 | 还原整篇 json 正则 → 示例围栏与注释 JSON 两条红（176）；去掉跨行 span 状态 → 跨行标题用例红（181） |
| contract `file-shape-agreement`（22 passed） | 6 / 8 | 还原「任何 `..` 一律拒绝 + 只按 `/` 切 + 不归一分隔符」→ 内部/Windows 形状红（179/180） |
| checks `fix-evidence.test.mjs`（17 passed） | 12 | 还原旧命令解析 → 合法形态与空操作用例红（177/182，另带一条 npx 路径）；还原无围栏 section → 代码块引用/只有代码块两条红（178） |
| checks `notes-tree.test.mjs`（ALL PASS） | 12 | 去掉根 lstat 判定 → 根 symlink 两条红（183） |
| 全量 | — | `pnpm test` 247 files / 2074 tests；`pnpm typecheck` / `lint` / `dup` / `test:checks` 全绿；归档后 `pnpm verify` ALL PASS |

## 未覆盖轴

- **Windows 实机/CI 未跑**（本机 macOS）：`..\` 形状按路径段语义与单元形状证明；跨平台 runner 仍需一次实跑
  （BUG-180 的 P1 评级因此保留观察）。
- **跨行 code span 闭合行之后的内容**：保守按非结构处理（残余正文里的标题不会被当定义，代价是可能少解析一行）。
- **围栏块嵌套**：同长度同字符的嵌套本身不是合法 Markdown；实现按「外层用更长围栏」的规范形态处理。
- **命令解析只证形态**：证明命令可解析且非空操作，不证明它真跑过或真会红；执行仍归 `pnpm test` / pre-push。
- **notes 根 symlink 一律红**：将来若要支持链接目录，需新增形状与门禁规则，不能直接放开。
