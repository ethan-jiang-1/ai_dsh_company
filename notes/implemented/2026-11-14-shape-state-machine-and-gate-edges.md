# 2026-11-14 · 形状状态机的边界与两道门禁的自查（focus v4）

状态：implemented（2026-11-14 落地）

上游 = 用户 2026-11-14「_backlog/bugs 现有大量刚才经过exploratory test发现的bug……系统地思考如何修复它们」；
来源 = 探索卡 Round 90（[C8/C9/C10 延续](../../_backlog/issues/2026-11-12-deep-surface-continuous-bug-hunt.md)）；
逐卡判定与证据 = [BUG-168..175 归档索引](../../_backlog/_archive/fixed_bugs/README.md)。

## 决定

八张卡全落在**上一轮自己新建的层**上：共享形状状态机、三态读契约、两道新门禁。修法不是补症状，是把每层的
「状态机不完整」补成闭集：

1. **形状状态机的三种容器**（168/169/172/173）：`scanDocument` 只做了块级围栏与注释，漏了行内代码、
   未闭合注释与 JSON 提取器。现在：
   - 行内代码 span（成对反引号，支持多反引号）里的 `<!--` / `-->` 是字面文本，不参与注释状态；
   - 未闭合注释在 EOF 报起始行号（`scanDocumentDetailed().unclosedCommentLine`），`/prd check` 与
     `/req check` 各报「注释未闭合」根因，不再级联成「没有需求」；
   - `splitTableRow` 按 CommonMark 顺序吃转义：先 `\\`（字面反斜杠）再 `\|`（字面竖线），行尾竖线按
     反斜杠奇偶判是否分隔符；
   - `extractJsonBlock` 先经 `maskHtmlComments()`（与结构扫描同一个状态机），注释里的账本不生效。
2. **三态读契约的越界子类**（170）：`walkCompanyDirs` 在走目录之前**全量**拒绝 `..` 段。
   为什么不在循环里判：不存在的中间段会让 `create=false` 的循环提前返回，`a/../..` 形状会把「越界」
   折成 `missing`（可豁免语义）。越界一律 `unsafe`，`missing` 只表示「根内真没有」。
3. **两道新门禁的自查**（171/174/175）：
   - `fix-evidence` 的改动面不再要求「此刻在盘上」：删除/重命名由证据提交的 changed files 对账
     （`- 改动面：` 写被删路径是合法的）；路径既不在盘上也不在提交里 → 仍然红（对账失败）。
   - 红/绿命令必须**可解析**：`pnpm <script>` 在根 `package.json` scripts、`node`/`sh` 目标存在、
     `npx`/`vitest` 在本地 `node_modules/.bin`、命令参数里的仓库路径存在——同一条假命令不再算证据。
   - `notes-tree` 对 depth 1–3 的任何 symlink 直接红：链接内容绕不过形状与状态门。

## 输掉的方案

- **168 只特判「成对/带空格」的注释记号**：任意代码 span 都可能有单边 `<!--`；覆盖不了。
- **168 引入 Markdown 解析器**：为两个状态位（代码 span / 注释）付一份外部依赖与版本纪律，不值。
- **169 未闭合注释按普通注释静默吞到 EOF**：正是本卡症状；用户会去补需求而不是补 `-->`。
- **169 让扫描器抛异常**：扫描器是纯函数、两个消费者共用；抛异常会绕开「错误文本给操作员」的设计。
- **172 先 `replace('\\\\\\\\', '\\\\')` 再切分**：与 `\|` 的先后关系仍然是隐式的，行尾反斜杠也会被误处理。
- **173 在 `extractJsonBlock` 里再写一遍注释扫描**：第二套状态机 = 160 的病复发；改为复用 `scanDocument`。
- **170 只在 `readCompanyFileAt` 里判 `..`**：写面（`writeCompanyAtomic` / `ensureCompanyDir`）仍会越界；
  `startsWith('..')` 也漏 `a/../..`。判据落在共享 walker 的段列表上。
- **171 新增 `deleted:` 标记**：多一种语法、仍可填假路径；直接让「存在性」退位给「提交 changed 对账」。
- **171 只放宽存在性**：等于回到「卡面自说自话」，与 fix-evidence 的立门理由冲突。
- **175 只要求命令含 `tests/`/`checks/`**：假脚本名仍能过；真解析脚本/bin/路径才挡得住。
- **175 让门禁真跑命令**：`verify` 会从秒级变分钟级，且有副作用；执行归 `pnpm test` / pre-push。
- **174 跟随 symlink 再判内容**：链接目标仍可能在仓外、且 Notes 是冻结决策记忆；直接禁链接形状更简单。

## 状态事实与载体

| 项 | 内容 |
|---|---|
| 事实 | 结构 = 归一化后「围栏/注释/行内代码」之外的行；未闭合注释是根因错误；company 路径的 `..` 一律 unsafe；门禁证据要能被提交/命令真实解析 |
| 唯一入口 | `lib/markdown-shape.ts`（三种容器）、`host/run-bundle/company-root.ts`（段校验）、`checks/gates/fix-evidence.mjs`、`checks/gates/notes-tree.mjs` |
| 读载体 | `/prd check`、`/req check`、present 闸门、`pnpm verify` |
| 契约测试 | `tests/lib/prd-check.spec.ts`、`tests/lib/requirements-check.spec.ts`、`tests/host/contract/file-shape-agreement.spec.ts`、`tests/checks/fix-evidence.test.mjs`、`tests/checks/notes-tree.test.mjs` |

## 验证

| 层 | 失败类 | 负控（见过红） |
|---|---|---|
| keyless unit `prd-check` / `requirements-check`（59 passed） | 1 / 6 | 去 code span → 行内注释用例红（BUG-168）；去 EOF 检测 → 两条「注释未闭合」红（BUG-169）；还原转义顺序 → 双反斜杠红（BUG-172）；去注释掩码 → 注释 JSON 生效红（BUG-173） |
| contract `file-shape-agreement`（22 passed） | 6 / 8 | 去 `..` 预扫描 → `../ / ../../ / a/../../` 用例红（BUG-170） |
| checks `fix-evidence.test.mjs`（13 passed） | 12 | 还原存在性硬判 → 删除型修复红（BUG-171）；去命令解析 → 假 pnpm 脚本与假 spec 路径两条红（BUG-175） |
| checks `notes-tree.test.mjs`（ALL PASS） | 12 | 去 symlink 分支 → 文件/目录两条 symlink 红（BUG-174） |
| 全量 | — | `pnpm test` 247 files / 2072 tests；`pnpm typecheck` / `lint` / `dup` / `test:checks` 全绿；归档后 `pnpm verify` ALL PASS |

## 未覆盖轴

- **行内代码 span 的跨行/嵌套**：CommonMark 代码 span 不跨行；扫描器按行处理，嵌套反引号按最长 run 匹配，
  极端嵌套未单列。
- **未闭合注释在围栏内**：围栏优先，围栏里的 `<!--` 是字面文本；不报未闭合（符合围栏语义）。
- **`..` 只拦路径段**：符号链接目录由 `ensureCompanyDir` 的 symlink 检查拦；Windows 分隔符不在本仓路径约定内。
- **notes symlink 一律红**：若将来需要「archived 指向活 Note」之类形状，要新形状 + 对应门禁规则，不能直接放开。
- **命令解析只证存在**：不证明命令真跑过、也不证明它真会红；红绿执行证据仍归 `pnpm test` / pre-push 与 Note 验证表。
