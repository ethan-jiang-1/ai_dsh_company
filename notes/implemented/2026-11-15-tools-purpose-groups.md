# 2026-11-15 · 工具面按用途分四组：dev / observe / repo / release

状态：implemented（2026-11-15 落地；任务源 = 用户点名「工具也应当有目录结构」）

> **被 [2026-11-16-maintenance-surface-declaration-and-migration](./2026-11-16-maintenance-surface-declaration-and-migration.md) 部分取代（2026-11-16）：** `observe/` 组解散（7 件迁 `probes/analyze/`），工具面四组 → 三组；其余决定（保留 `tools/` 名、按用途分组、lib/drivers/archive 实现层、默认 dry-run）仍现行。

> 上游 = 用户 2026-11-15：`tools/` 平铺 27 个入口，fresh agent 看见一屏文件无法判断「该跑哪个、跑了会动什么」。上一轮 `tests/repo` 与 `src/lib` 的分组论证沿用：**目录回答「什么时候进这个门」，文件名回答「具体干什么」**。

## 决定

1. **保留 `tools/` 这个名字，按用途分四组。** `dev/`（6：把仓库跑起来——装、首启、dev 会话、排练场）· `observe/`（7：看运行态、收证据，只读或只写报告）· `repo/`（11：维护仓库自身，会改 tracked / gitignored 的仓库文件；含升 pin 簿记 `sync-dsh`）· `release/`（3：产出仓库外的字节）。`lib/`（纯逻辑）、`drivers/`（真进程）、`archive/`（已耗仪器）不动——它们已经是按角色分的实现层。
2. **为什么不叫 `scripts/`。** 本仓「脚本」这个词已被验证面占用（`checks/` 的 smoke/lane/audit/probe 与四道 `script-*` 门禁）；`packages/company-pack/scripts/` 又是 npm prepack 生命周期钩子；而 `tools/lib` 读起来才是「工具的共享逻辑」。名字要描述用途，不是文件后缀。这条写进 [tools/README](../../tools/README.md)，省得再被重提。
3. **新增 [tools/README.md](../../tools/README.md)（owner 页）**：四组各一句话 + 实现层说明 + 新增工具四问（入口还是纯逻辑 / 属于哪一步 / 默认是否安全 / 头注齐不齐）；文件清单不抄，指向 [检查索引](../../checks/INDEX.generated.md)。
4. **生成索引按组渲染。** [checks-index](../../tools/lib/checks-index.mjs) 的扫描面从「`tools` 顶层」改成递归走四组（`TOOL_GROUPS`），渲染成 `### dev/`… 四小节；`script-index` 继续查新鲜度。**顶层散件不变式只写一份**：`tools/lib/checks-index.mjs` 的 `strayToolEntries`（顶层只许四组 + `lib` / `drivers` / `archive` / `README.md`），由 **`script-index` 门禁**（每次 verify）与 keyless spec 双调用——挡在门禁上，才不是只靠一条单测。另：`.agents/` 的 skill 也是 live 指令，纳入 [command-refs](../../checks/gates/command-refs.mjs) 扫描面（本轮盲审抓到的唯一活死指令就在 skill 里）。
5. **迁移机械面一次改齐**：27 次 `git mv`（含复核后把 `sync-dsh` 从 dev 移到 repo）；64 条相对 import 下沉一层（`./lib/`→`../lib/`、`../checks/`→`../../checks/`）；4 处 `resolve(dirname(fileURLToPath(import.meta.url)), '..')` → `'../..'`；1 处动态 `await import('../vendor/...')` → `'../../vendor/...'`；1 处分段拼路径（`join(root,'tools','deliverables-index.mjs')` → 插入 `'repo'`）；全仓约 44 个文件的路径引用；冻结层只修 Markdown 链接目标。
6. **一处有意保留的旧路径**：`packages/company-pack/src/lib/deliverables/deliverables-address.ts` 的注释仍写旧的扁平路径（生成器迁到 `tools/repo/`）。该文件属于**发布源指纹**（`PACKAGE_SOURCE_DIRS` 含 `src`），改一个字节就会让 `release --check` 变红、要求 0.11.8 重打或 bump 0.11.9——为一条注释不值得。留到下一次版本 bump 同 diff 修。

## 输掉的方案

- **只做索引、不搬目录**（上一轮我的方案）：fresh agent 的第一个动作是 `ls`，不是读 `checks/INDEX.generated.md`；索引解决「知道名字后去哪查」，目录解决「不知道名字时先看哪」。
- **改名 `scripts/`**：见决定 2，会把「验证面脚本」与「维护工具」混成一个词。
- **按「谁跑它」分组**（人 / pnpm / CI）：真正的调用面在 `package.json` 与文档里，目录名反而要维护第二份判据；且大部分工具三种场景都会跑。
- **只搬 generator 类**：9 个生成器搬走、其余 18 个留根，根仍然是一屏，还是没解决 fresh agent 的问题。
- **删掉 `tools/archive/` 并入四组**：已耗仪器与常驻工具的退役状态不同，混在一起会让「还能不能跑」这个判据消失。

## 状态事实与载体

- **事实**：工具面四组 = 你处在哪一步；`dev/` 与 `release/` 会留东西、`observe/` 安全、`repo/` 会改仓库；实现层 = `lib/` / `drivers/` / `archive/`。
- **唯一入口**：[tools/README.md](../../tools/README.md)（目录规则 + 四问）；逐工具链接 = [checks/INDEX.generated.md](../../checks/INDEX.generated.md) 的「维护工具」一节（生成物）。
- **读载体 / 写载体**：读 = fresh agent 的 `ls tools/` 与 README；写 = 新工具落组、生成器扫描面、`script-status`/`script-triggers` 头注（递归扫描自动覆盖新组）。
- **环境坏法**：来源（顶层散件会逃出库存——已由 spec 封）、内容（README 抄清单会漂——不抄）、生命周期（组变空）。

## 未覆盖轴

- [covered] 路径、import、生成物、入口行为都验过（见 §验证）；目录规则与四问 → [tools/README.md](../../tools/README.md)
- [policy] 顶层散件由门禁守（新增工具必须进四组） → [script-index.mjs](../../checks/gates/script-index.mjs)
- [policy] pack 源码注释里一处旧路径留到下次 bump（改它会动发布指纹） → [deliverables-address.ts](../../packages/company-pack/src/lib/deliverables/deliverables-address.ts)
- [environment-gap] 本轮没重跑 clean clone：改动全是仓库内路径/文档，无新增依赖或构建面 → [.github/workflows/fresh-clone.yml](../../.github/workflows/fresh-clone.yml)
- [unprovable] 仓库外的书签/引用仍可能指旧扁平路径，本仓观测不到 → [AGENTS.md](../../AGENTS.md)

## 验证

| 判据 | 命令 | 原话 |
|---|---|---|
| 结构门禁 | `pnpm verify` | ALL PASS（2 门无对象） |
| 全量 keyless | `pnpm test` | 249 files / 2120 tests passed |
| 类型面 | `pnpm typecheck` | 四面 tsc 全绿 |
| lint / dup | `pnpm lint` | 干净 |
| 快车道 | `pnpm smoke:fast` | ALL PASS（4 条） |
| 门禁自测 | `pnpm test:checks` | 10 PASS / 0 FAIL |
| 生成物 | `node tools/repo/checks-index.mjs --check`；test-census / bug-coverage | 三处与盘一致 |
| 真入口（client） | `node checks/lanes/snapshot-motion.e2e.mjs` | PASS（重放夹具 + 真 CLI） |
| 发布面 | `node tools/release/release.mjs --check --allow-pre-publish-index` | READY 0.11.8（源码指纹未变） |
| 行为抽查 | `setup --check` / `company --help` / `orient` / `notes-audit` / `market-index --check` / `ask-latency` / `propose-sampler` / `explore-evidence` / `methods-init` / `rehearsal-init` / `bundle:init` / `hooks-install` / `prune-runtime`（dry-run）/ `converge`（计划模式）/ `snapshot-path foundation-workspace` / `run-check-tests` | 全部按设计返回（用法/检查/计划/幂等），无路径异常 |
| 独立盲审 | 只读子代理复核 commit 5c2c0796 | **blocker 1**：`.agents/skills/close-out-definition` 仍教旧扁平路径的发布检查命令（verify 不扫 skills）→ 已修并把 `.agents` 纳入 `command-refs`；**建议 6 条全收**：顶层散件移进门禁、spec 去组名字面量（census 消费者 7→6）、`sync-dsh` 归 repo、README 的 lib「不读盘」措辞、checks-index 自述、refactor-drift 用法 |
| 迁移中抓到并修掉的真回归 | ① `market-index` 的动态 `import('../vendor/...')` 未被静态扫描覆盖 → 修成 `../../`；② `converge-rules` 分段拼的 `join(root,'tools','deliverables-index.mjs')` → 插入 `'repo'`（被 `converge-rules.spec` 当场抓红）；③ `pack-source.spec` 的 import 字面量；④ `runtime/README.md` 的 tracked 链接（`link-debt` 抓红） | 修完各自复跑绿 |
