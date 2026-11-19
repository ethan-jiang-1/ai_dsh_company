# 守卫的残余面：判据的输入集从「手写清单」改成「派生量 / 单一实现」（C17 批次，BUG-263..282）

状态：implemented（2026-11-19；七组决定已随 A–G 落地，红→绿证据见 §验证）
类别：决定（不是收据）｜取代：无（C12/C13/C16 的批次 Note 各自管自己的机制，未推翻）
留痕消费者：`_backlog/bugs/` 20 张卡（[_backlog/bugs/README.md](../../_backlog/bugs/README.md) 的「2026-11-19 修复交接」节）

## 背景：20 张卡是七个「输入集靠人写」的根因

C16 把发布面/content 合同/降级路径收成了一批评据，每一条都是**手写枚举**：5 个 pipeline 文件、
4 个必需目录、一份最小 schema、一条命令正则、一张 docs-only 路径表。C17 的探索（[C17 卡](../../_backlog/issues/2026-11-19-guard-residuals-and-runtime-edges.md)）证明：
**残余面不是漏了两个分支，而是没人负责「输入集随树增长」**。于是本轮 20 张卡按根因收成七组，
修法一律是「让输入集成为派生量」或「让同一判据只有一份实现」——不再往清单里补条目。

## 决定

### A 发布输入集 = 目录派生（BUG-263/264）

`RELEASE_PIPELINE_FILES` 从手写 5 条改成 `releasePipelineFiles(root)`：`tools/release/*.mjs` 与
`tools/lib/release/*.mjs` 目录派生 ∪ 跨目录显式项（`pack-source.mjs` 定义源指纹本身、`pin.mjs` 的
expectedTag 写进手册表头）。判据的唯一形状 = 「发布面目录里每个 .mjs 都是指纹输入」，
新增管线文件不需要改清单。

### B content 合同只有一份实现（BUG-265/266/267/268/269/270/273/274）

新建 `tools/lib/company/content-contract.mjs`：路径安全（两个分隔符都判：`..\evil` 在 Windows 上是越界、
在 posix 上只是怪文件名，判据不能只在一种平台成立）、manifest `version` 必须等于本模块认识的版本、
inventory 与盘面**双向**对账（含未登记文件）、symlink 单列拒绝、tiers 引用闭包与重复、
**必需目录由关键件派生**（`REQUIRED_CONTENT_FILES` 的目录集合，不再手写 4 个目录名）、
JSON 跨引用（seed 的 target 在 `.dsh-company/` 内且 source 在 inventory、delivery 的 `template` 在场、
check-rules 的 `files` 形状覆盖 `layers`）。

两个消费者同调一份：`checks/gates/content-manifest.mjs`（源树，`pnpm verify`）与
`tools/lib/release/shipped-shape.mjs`（tarball，`release:shape`）。`REQUIRED_SHIPPED` 的 content 部分
改为派生自 `REQUIRED_CONTENT_FILES`，顺带把 `content/AGENTS.md` 指向的 `generic/` 六件纳入关键件
（此前它们只活在 tarball 的 `files: content/**` 里，源树门禁删掉整个目录也能绿）。

### C dev 命令判据理解命令的形状（BUG-271/272）

`DEV_COMMAND` 正则白名单换成 `tools/lib/core/dev-command.mjs`：首词 + 包管理器子命令解析
（`pnpm|npm|yarn|npx|bunx` × 旗标 × `run|exec|dlx|<package.json scripts 名>`；`npx/bunx` 默认 exec），
`node|tsx|ts-node` 认 `tools|checks|tests|probes/`，`run/env.sh` 三种写法。脚本名从仓库根
`package.json` 派生——新增脚本不改判据；散文里的 `pnpm must be…` 不误伤（判据理解形状，不是关键词）。

### G release docs-only 边界与就绪判据（BUG-280/281/282）

`tools/lib/release/docs-only.mjs`：`git diff --name-status -z --find-renames` 解析，rename/copy
**两侧路径都参与判断**（`--name-only` 只给新路径，code→docs 改名因此被判 docs-only）；
`_dist/安装手册.md` 移出 docs-only 集合（生成物不属于文档）。
`tools/lib/release/readiness.mjs`：`--stamp` 与 `--check` 共用一份就绪判据（版本/源指纹/管线指纹/
artifact sha/dirty/checks），两入口唯一的合法差别只剩「stamp 要把 gitSha 挪到 HEAD」；
同一模块的 `manualProductProblem` 判「手册逐字节等于当前模板用自身表头字段重渲染的结果」，
dist-manual 门禁与发布入口同调一份——手改手册在两条路径上都红，生成手册也不必再当 docs。

### D catalog 降级到 trim 与留痕（BUG-275/276）

`final` 的判据从 `size === 0` 到 `readFileSync(...).trim() === ''`（纯空白不是可展示成品）；
`readCatalogState` 为 `corrupt`/`unsupported` 时 warning + 把旧字节备份成 `kb/deliverables-index.json.bak`
再重建（备份目标同样过 `plainFileProblem`，symlink/越界只 warn 不跟写）。

### F bundle 升级留旧字节（BUG-279）

v3 的 `pack.version` 变化（`action:'upgrade'`）也带 `previousVersionPath`
（`bundle.json.v3-<oldVersion>.bak`；旧版本号来自盘上 manifest，按 `[0-9A-Za-z._-]` 清洗、折叠 `..`、
空则落 `bundle.json.v3-prev.bak`，永不出同一目录）。writer 在写前 rename——v2 的 `legacyPath` 语义不变。

### E 降级事实到 UI（BUG-277/278）

`TaskRow`/`BoardCard` 带 `revisionGap`/`statusGap`（读模型只给事实，中文归 client 的 `t`）；
任务表状态格与看板卡各出一条 zh/en 成对文案（`tasks.gap.status` / `tasks.gap.revision`）。
未知 status 仍折成待办列（不崩），但「折出来的」与「真的」在页面上不再同一副脸。

## 输掉的方案

- **逐条补清单**（pipeline 加两行、REQUIRED_DIRS 加四个目录、DEV_COMMAND 正则再加三个分支）：
  下一轮还会漏同样多——C16 就是这么长出来的；而且 20 张卡会变成 20 个补丁，无法回答「谁负责输入集」。
- **把 `_dist/安装手册.md` 直接从 docs-only 拿掉、只要求重打**：正确但会把发布尾巴推向
  「每次提交手册后都要重跑 `--verify`」（BUG-212 正在治的摩擦）。改成「生成手册必须在发布路径上
  逐字节复核」——同样的安全，不付重打成本。
- **symlink 跟随并登记**：会把包外内容抄进 content 清单，等于把「清单即契约」变成「清单即跟随」；
  拒绝并 warning 更小、更可判。
- **`check-rules.files` 从 schema 里删掉**（因为 `/req check` 目前只读 layers/defaultLayers/retiredPrefixes）：
  会丢一条真实合同（`content/product-types/*/document-map.md` 与 research 台账都把 files 当层表文件名）。
  取最小一致判据（值必须是 `<slug>.md`、layers 必须被 files 覆盖），运行时暂不读 files 的事实记进 §未覆盖轴。
- **给 stamp/check 各留一份就绪判据、只对齐其中几项**：BUG-282 的形态就是「共享名字、不同判据」；
  只要还留两份，下次加字段又会漂。

## 状态事实与载体

事实的唯一入口：`tools/lib/company/content-contract.mjs`（content 合同）、`tools/lib/core/pack-source.mjs`
（发布输入集与指纹）、`tools/lib/core/dev-command.mjs`（dev 命令）、`tools/lib/release/docs-only.mjs` + `readiness.mjs`
（docs-only 与就绪）。消费者 = `checks/gates/content-manifest.mjs`、`checks/gates/dist-manual.mjs`、
`tools/release/release.mjs`、`tools/lib/release/shipped-shape.mjs`；每份事实的下一跳在各自文件头注里。

## 后果

- 发布面的输入集随目录增长：新增 `tools/lib/release/*.mjs` 自动进指纹，**改它必须重打**
  （本轮一次重打覆盖 A/B/C/G 的指纹变化）。
- content 合同改一处、两处消费者同时变：源树红 = tarball 红。`pnpm verify` 现在还会因
  「必需目录缺内容」「symlink」「version 不符」「未登记文件」而红，不只是 budget。
- `release --check` 会拒绝手改的安装手册；docs-only 窗口只接受真正的文档面。
- 客户端多两种可见标记（看板 tag / 任务表状态后缀），zh+en 成对；未知状态不再静默。
- 一处历史断言被重写而不是补丁：`shipped-shape.spec.ts` 的 244..247 覆盖用例从「循环模板里拼 BUG 号」
  改成四条字面 `it`（`bug-coverage` 账只认标题里的字面 `BUG-nnn`）。
- 盲审后补的三处收口（本批同轮，非新卡）：`readSeeds` 的 target/source 越界判据与合同**同义**（反斜杠/盘符/NUL，
  等价矩阵钉住）；`delivery-mode-sources` 不再自带第三份 delivery-rules 判据；`release --verify` 的入口前置
  改调 `artifactAlignmentProblems`（第三份手写比较退场）。

## 验证

| 层 | 失败类 | 负控（见过红） |
|---|---|---|
| keyless unit（发布指纹） | 12 文档·生成物·指针 | `pnpm test tests/repo/release/shipped-shape.spec.ts`：还原 `tools/lib/release/shipped-shape.mjs` 到 HEAD → 红（`install-manual.mjs 改动没进指纹`、`content 合同：版本/反斜杠/…`、`source shape 扫 dev 命令`）；接回 → 61 绿 |
| keyless unit（合同纯逻辑） | 1 纯逻辑 | `pnpm test tests/tools/content-contract.spec.ts`：10 条判据各自钉一个洞（反斜杠/version/重复/symlink/必需目录/seed/delivery/check-rules） |
| gate 负例（真门禁） | 12 文档·生成物 | `pnpm test:checks`：还原 `checks/gates/content-manifest.mjs` → 2 红（symlink、必需目录）；接回 → ALL PASS（含 inventory 重复项） |
| keyless unit（dev 命令） | 5 模型可见文本 | `pnpm test tests/tools/dev-command.spec.ts` + `shipped-shape.spec.ts -t BUG-271/272`：还原 `shipped-shape.mjs` → `pnpm -s test: expected false to be true`；接回 → 绿 |
| keyless unit（docs-only/就绪） | 12 文档·生成物 | `pnpm test tests/repo/release/docs-only.spec.ts`：实测抓的 git 输出夹具（`--name-only` 只有新路径 / `--name-status` 两侧都在）+ 判据行为；入口侧断言 stamp/check 共用 `readinessProblems`、verify 用同一模块的 `artifactAlignmentProblems`（去注释后数调用点） |
| keyless unit（host 降级） | 6 会话·持久化 | `pnpm test tests/host/ledger/catalog.spec.ts`（还原 → `expected true to be false`：空白 final 仍 present）+ `pnpm test tests/host/run-bundle/bundle-manifest.spec.ts`（还原 → `expected undefined to be '<path>.v3-0.11.8.bak'`） |
| client 组件（静态渲染） | 9 client UI | `pnpm test tests/client/tabs`：还原 `company-panels.tsx`/`TasksPanel.tsx` → 2 红（卡片/行上找不到「未知状态」）；接回 → 绿；`ui-scene-smoke --isolated --expected` 金样一致（10 页签） |
| 真入口（发布面） | 12 文档·生成物·指针 | `pnpm release --verify`：7 项全绿（verify / test / release-smoke / company-entry / client-load / preset / present-catalog）；`pnpm release --check --allow-pre-publish-index` = READY 0.11.9 @ 52d89629（137 条目、7 项 pass）。`--allow-pre-publish-index` 是仓库既有 `market-index.staged.json` 的显式确认，不是本批引入的降级 |

## 未覆盖轴

- [covered] 20 张卡的逐卡判据与证据 → 账 = `tests/BUG-COVERAGE.generated.md`（本轮归档后 263..282 逐行在场；批次记录 = `_backlog/bugs/README.md`）
- [covered] seed 路径判据的两份渲染（pack 内 `readSeeds` 不能 import `tools/lib`）→ 等价矩阵 = `tests/tools/kb-seeds.spec.ts`（同一批越界样本两边同拒）
- [covered] delivery-rules 的第三条判据（`delivery-mode-sources`）→ 已改为同调 `contentJsonProblems`：`checks/gates/delivery-mode-sources.mjs`
- [covered] tarball 形状真入口 → `checks/lanes/release.entry.mjs`（`pnpm release --verify` 的第 3 项）
- [covered] client 真挂载 → `checks/lanes/client-load.entry.mjs`
- [policy] `check-rules.json` 的 `files` 目前是合同面而非运行时读面（`/req check` 只读 layers/defaultLayers/retiredPrefixes）→ `packages/company-pack/src/host/commands/req-command.ts`；若将来 runtime 开始读 files，判据已在 `tools/lib/company/content-contract.mjs` 里
- [policy] 未知 status 仍折成 pending 列（只加标记，不改列归属）→ `packages/company-pack/src/lib/presence/board.ts`；是否新增「未知」列属于产品决定，不在本轮
- [environment-gap] `release --verify` 的 7 项真入口在本机跑过（见 `_backlog/bugs/README.md` 收口行），CI 侧未在本轮触发 → `checks/lanes/release.entry.mjs`
- [unprovable] 「docs-only 旧判据会**接受**手改手册」的端到端反证需要旧 manifest + 旧产物共存；本轮用「旧入口缺这条判据」的代码事实 + 新入口的拒绝行为作证 → `tools/release/release.mjs`
