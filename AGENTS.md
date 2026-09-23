# AGENTS.md — 本仓库的入口链

虚拟公司（**wochen**）多角色 DSH 插件：一个包（`packages/company-pack`）提供五个角色 preset
（显示名 `wochen CEO` / `wochen VP-Eng` / `wochen VP-Sales` / `wochen COO` / `wochen CFO`）+ host profile 源；
协作用 DSH 现成通道（Agent Teams 主通道）。

## 布局

```
CLAUDE.md -> AGENTS.md    symlink（编辑真文件 AGENTS.md，verify 门禁校验）
packages/company-pack/   唯一自写包：presets/<role>/（persona+skills）、cordis.patch.yml（bundle 行）、src/client/（client 面：品牌皮肤）、src/（host 代码 R3+）
company-workspace/      运行时"公司共享盘"（会话 cwd）：kb/<role>/（CHARTER+journal）、templates/、deliverables/
vendor/dsh/             DSH 源码 submodule（钉 SHA，**只读铁律**：见 §vendor 铁律，`pnpm verify` 强制）
docs/                   文档层：00-index（地图+决策台账+外部材料登记）→ design/ plans/ guides/ + 顶层合同
notes/                  决策记录：intents.md → proposed/ → implemented/；事故复盘 postmortem/；外部研究 research/
scripts/                verify.mjs（结构门禁）、preset-smoke.mjs（真入口冒烟）……
dev/                    env.sh（双 home+裸 dsh 拦截）、company.overlay.yml（headless 实验 overlay）、harness-home/（开发 DSH_HOME，gitignore 运行残留）
snapshots/              回归资产：r1/r2/r3/r4-motion + scenario-b（录制会话 + workspace.expected 独立 oracle）；replay harness R5a
```

设计全貌与决策台账：`docs/00-index.md`（先读它，再按需进 design/10-40）。

## 命令表

```sh
git submodule update --init            # 拉下 vendor/dsh（已钉 tag）
corepack enable pnpm                   # 一次性：pnpm 走 Node 自带 corepack（读 packageManager 钉 11.7.0）
pnpm install                           # workspace 解析（vendor/dsh 全树）；引导全配方见 guides/60 §7
source dev/env.sh                      # 双 home 兜底：DSH_HOME=<repo>/dev/harness-home，别碰日用 ~/.dsh；并把裸 dsh（日用全局安装）拦截
                                       # ⚠ 每个新 shell/后台 job 必须先 source 本文件。**别信"不继承"**（R4 更正）：
                                       #   在 DSH 的 coding 会话里跑 bash 时 DSH_HOME 是**继承且带值**的，值 = 日用
                                       #   home `~/.dsh` ⇒ 漏 source 不会报错，会安静地拿日用 home 当输入/输出
                                       #   （guides/60 §6.5）。判据类脚本自己拒绝日用 home。
pnpm dsh --profile headless "hi"       # 从 DSH 源码起会话（R0 已验收）
pnpm dsh web -- --port 3081 --no-open  # web 观察窗（需 client 面+前端构建，guides/60 §7）；3080 是本 GUI 占用
pnpm verify                            # 结构门禁（UTF-8/链接/preset 结构/symlink/**vendor 铁律：SHA+零改动**/pack 形状/行依赖/client 两半）
pnpm test                              # keyless 回归（vitest，53 条 ≈0.3s；覆盖面见 tests/ 目录——描述不在此枚举，防数字漂移）
node scripts/preset-smoke.mjs          # 上线前门禁：boot 真 web，逐个 preset 建会话（唯一能抓"preset 挂载失败"的检查；需 DSH_HOME + 已装 pack）
node scripts/client-load-smoke.mjs     # client 面完成定义：headless 浏览器加载真页面，断言零插件挂载失败 + 品牌槽在场（需 DSH_HOME；postmortem 0003）
node scripts/probe-smoke.mjs           # 角色连通冒烟（默认快速档 ~6s）：真 web + 真 preset + 一句 ping，断言"挂载/轮次跑完/模型回话/人格进 prompt"；`--full` 才跑 15 个内容探针（慢，5–10min，按需）
node scripts/handbook-smoke.mjs        # agent-instructions 注入完成定义：断言会话的指令基线 = company-workspace/AGENTS.md（且未混入开发仓库 AGENTS.md）；默认只跑 ceo 一次小调用
node scripts/delegation-smoke.mjs      # 汇报线边界守卫（R3，1 条 prompt）：vp_eng/vp_sales 在模型可见目录 + 三个控制名仍是**团队版**（shadow 边界变了就红）；`--delegate` 多 1 条 prompt 真委派一次，断言**前台拿到稿子**
node scripts/presence-e2e-smoke.mjs    # 在场板状态链端到端（R5b，真模型 ~$1）：排练场 2 分身微动议，轮询 agentTeams.view 断言「接活转执行中 → 任务 subject → completed」；改轮询/状态文案/在场板数据链时选跑
node scripts/deliverables-check.mjs    # 交付物三态（R4）：成品必须回溯到一次 CEO 的 `present`；审归档快照配 --only <slug>；缺 DSH_HOME 或指到日用 home 时拒绝执行
node scripts/snapshot-motion.mjs       # 动议归档：会话日志（Lead + children）+ workspace.expected 录进 snapshots/（每轮收尾用）
node scripts/rehearsal-init.mjs        # 排练场成型（轮间待办②练习场≠运行场）：smoke 脚本默认 cwd 已指 dev/rehearsal-workspace（自建；--cwd 可覆盖），真盘只收真实动议产物
node scripts/replay-smoke.mjs          # 无 key 会话重放（R5a P1.2/P1.3）：--record 场景组合下重录（认证档）→ 默认重放 + 归一化比对 + sidecar 比对；--ui 加真浏览器委派卡端到端（ariaSnapshot 金样，P1.3；第三档，不进 pnpm test；机制见 notes/research/2026-09-23-replay-harness-feasibility.md）
node scripts/release-smoke.mjs         # 发布冒烟（R5a P4）：构建 → npm pack → 干净 profile → plugin add → boot 冒烟（真实安装形状，dev profile 的 link: 不算数；合同 = docs/release.md）
node scripts/sync-dsh.mjs              # 升 pin 程序（R5a P4）：默认检查四处簿记一致；--pin <tag> 走完整升级环（guides/60 §5 + docs/release.md）
```

## 密钥

`pnpm dsh` 是真实 API 会话，需要 `DEEPSEEK_API_KEY`。凭据按 home 隔离：在开发 home
（`dev/harness-home/.credentials.yaml`）配一次即可（见 guides/60 §6）；永不提交密钥。

## DSH 源码在哪、怎么读

三个 DSH 实体，角色不同，**别混**：

| 实体 | 位置 | 角色 |
|---|---|---|
| ① 开发基线（唯一权威） | `vendor/dsh/`（钉 SHA，**只读铁律**见 §vendor 铁律） | 机制核对与验证会话都用它：一律 `pnpm dsh` |
| ② 日用全局安装 | npm 全局（`which dsh`；跑日常会话与改本 repo 的 coding 会话的就是它） | 与本 repo 开发无关；版本随全局升级漂移（当前恰同为 0.1.5-rc.2，**巧合不是保证**），其行为不作机制依据 |
| ③ 外部研究树 | `/Users/bowhead/deepseek-harness/`（`_digested`/FAQ 宿主） | 只读参考，登记见 `docs/00-index.md` §外部研究材料登记 |

裸 `dsh` 已被 `dev/env.sh` 拦截提醒（`DSH_HOME` 只护数据层，护不住代码版本层；确要日用：
`command dsh` 或另开终端）。

- 探索路由（对 ①）：`vendor/dsh/docs/architecture.md` → `docs/capability-seams.md` →
  具体 package README。机制结论的权威在 ① 这棵树。
- 本项目概念 → DSH 载体 → vendor 源码路径的直达表：`docs/00-index.md` §术语映射。
- DSH 全局不变量（fail-loud、model-visible ⟺ logged、registrations are effects、
  plugins not loop changes）：`vendor/dsh/AGENTS.md` 的 Conventions 节。
- repo 外只读参考：`/Users/bowhead/deepseek-harness/_digested/`（源码消化笔记）与
  `_faq_on_digested/13_expert-plugin-repo-organization/`（本 repo 形态的依据 FAQ）。
  引用时注明是外部研究材料；逐份落点登记见 `docs/00-index.md` §外部研究材料登记。

## 纪律（沿 DSH 研发纪律；**默认严格照做，偏离必须登记**）

纪律的权威在 vendor 树（钉住的 tag），本表是**落点地图**不是转述来源；逐源枚举的全量清单
（R6 线 B 产出，98 行提炼）与偏离注册表住 `docs/guides/60-dev-loop.md` §12（流程合同）。
**偏离规则：任何偏离 DSH 明文纪律的做法 = 一个 D 号 + 约束证据**（如"本地单人仓无 GitHub
协作面"）；"按规模裁剪"不是缺省自由。

| DSH 纪律 | 权威（vendor 树） | 本 repo 落点 |
|---|---|---|
| **过程反馈面：plan mode 呈批（计划归 exit_plan_mode）+ 实施期 todo_write（开工列全、完成即勾、steer 即重排）** | `packages/plan` + `packages/todo`（工具描述自带使用纪律） | guides/60 §0 条目生命周期（反馈双门）+ 宿主 TodoPanel |
| docs = 当前合同（一处事实一个家，**只写 now**；词数预算 + slop 猎杀） | `docs/AGENTS.md` | `docs/` 按性质分层（D10）+ verify 链接/预算门禁；计划层**纯队列、完成即离队**（D23） |
| 非平凡变更同 diff 带 Agent Note（决定/输掉的方案/需验证什么） | `.agents/notes/README.md` | `notes/intents.md → implemented/`；收尾 Note 模板 = guides/60 §12 |
| 窄证据切片；只报告实际跑过的检查；push/commit 前跑迭代环 | `AGENTS.md` Run relevant checks | guides/60 §1 六步闭环 + §12 收尾 |
| **完成定义 = 该面最小"真检查"通过；发现权在代理一侧** | `docs/testing.md`；`docs/postmortem/0003` | guides/60 §1 第⑥步 + §7 两道防线；preset 类改动完成定义 = `preset-smoke.mjs`（真挂载） |
| 测试分层：真模型 / 真浏览器不进回归；行为变更同 diff 更新录制快照 | `docs/testing.md` | guides/60 §9.1 + 机械门禁 `tests/layering.spec.ts`（已反证）+ 认证档按面选跑 |
| 真实入口路径（发布产物 `lib/` 跑）+ 真实安装形状 | `docs/testing.md` | `release-smoke`（`npm pack`→干净 profile→`plugin add`），合同 `docs/release.md` |
| 源码面/产物面不混（paths 指 src） | `AGENTS.md` Conventions | 根 `tsconfig.json` extends vendor base |
| vendor 钉版本 + manifest/SHA + 同步程序；**升 pin 时流程合同对 vendor 重校** | `vendor/README.md` | AGENTS.md vendor 簿记 + `scripts/sync-dsh.mjs` |
| 日志税：model-visible ⟺ logged | `AGENTS.md` Conventions | guides/60 §3 设计四问② |
| 机械可查的不变量进执行门禁 + **每个新门禁带反证**（红→还原→绿） | `AGENTS.md` Conventions | `scripts/verify.mjs`（md-newline / 链接含 notes/ 树 / preset 结构 / vendor 铁律 / pack 形状 / pack-compat / client 两半 / proposal 两则 / **doc-budget**） |
| **卫生铁律：打扫 = 净减少 + 信噪比提高；处置序 = 删 > 并 > 修 > 记** | （本仓原生，D23） | guides/60 §12 流程合同（方向铁律条） |

### vendor 铁律（本仓最高优先级，机械门禁在 `pnpm verify`）

**`vendor/` 下受版本控制的内容（当前只有 `vendor/dsh/`），一个字节都不许改。** 这不是建议，是门禁：`pnpm verify` 检查
submodule HEAD == 簿记 SHA（`vendor-pin`）且工作树零改动（`vendor-clean`，`git status --porcelain`
必须为空）。两条都做过反证（改一个 tracked 文件即 FAIL，报 `M README.md`）。

**允许面**（只有这两类，别的都算违反）：

1. **只读**：探索源码、`extends` 它的 tsconfig、import 它的包、跑它的构建脚本。
2. **在 vendor 内产生被它自己 `.gitignore` 覆盖的构建产物**（`lib/`、`apps/web/dist/`、
   `node_modules/`）——"从源码跑"要求构建，构建必须在树内；这些产物不出现在 `git status` 里，
   所以不违反 `vendor-clean`。⚠ **禁止 `git clean -x`**（会删掉运行所需的产物）。

**需要改 vendor 的行为时，三条正路（都不碰 vendor）**：

| 想要 | 正路 |
|---|---|
| 组合/配置层面的差异 | 本 pack 的 bundle `cordis.patch.yml`（`- id:` 替换 / `- insert:` 新增）或 profile patch |
| 需要上游修的行为 | 改 **DSH upstream** → 升 pin（`scripts/sync-dsh.mjs`，R5a）；期间在本仓记入 `notes/` |
| 上游功能在本形态下不可用 | **先证伪"不可用"再自建**：R1 曾误诊"官方团队 UI 挂不上"→ 自建任务板 + 重复挂 remote → 全 UI 砖（postmortem 0003；实为可用，`dsh.client.inject` 是 informational only）。确属不可用才在本 pack 自己实现等价面 |

**为什么用 SHA 而不是 tag**：tag 可被移动/别名，SHA 才是钉住的合同（`vendor/README.md` 的
pin + manifest/SHA 纪律）。

**本仓原生纪律（与 guides/60 §9/§10 同级）**：§11 **工具态与越界写入**（2026-09-23 立）——
repo 内为自由区；工具状态（缓存/store/配置）一律**先重定向进仓库 gitignored 区再首次使用**
（落点清单：双 home、`.pnpm-store`、profile `.npmrc`、排练场）；确需越界先问人，一次说清路径与理由。

- 具体操作手册：`docs/guides/60-dev-loop.md`（六步闭环 / 调试阶梯 / 插拔速查 / 设计四问 /
  发布纪律时点 / 双 home）。demo 现场运维 runbook：`docs/guides/50-budget-and-ops.md`。
- **不发明**：不新增 spec 流程（OpenSpec 留触发条件，guides/60 §5）、不自造调度器/记忆/门禁——
  优先用 DSH 现成载体（D13）。否决依据（规格工具 vs 本仓两次事故的对照）：
  [research/2026-09-22-agent-workflow-community-practice](notes/research/2026-09-22-agent-workflow-community-practice.md)。

## vendor 簿记

- upstream：`https://github.com/deepseek-ai/deepseek-harness.git`
- 当前钉住：tag `dsh-v0.1.5-rc.2` = `fb2c4b9e698e30edb738bca4cf0618587db7d203`
  （= `_digested` 审计基线；机制文档的核对基线与其一致）
- 本地初始化技巧：submodule 首次克隆走了本地路径 + `-c protocol.file.allow=always`（单命令
  放行，未改全局配置）；`.gitmodules` 的 URL 已指上游，别改回去。

## 当前状态

上一条目 **内容诊治**（2026-09-23 收尾，R6 = 本仓最后轮号；收尾 Note = `notes/implemented/2026-09-23-r6-content-remediation.md`，净减少结算在其中）。当前队列头条目 = **分身成长**（roadmap §队列）。

- 已闭轮的交付、判据与设计决定：唯一事实家 = `docs/00-index.md` 台账（D 号）+ `notes/implemented/` 收尾 Note——本节不复述。
- 门禁分层（迭代环秒级 / 认证档每条目按面选跑）：权威家 = `docs/guides/60-dev-loop.md` §9.1。
- 环境要点（观察窗 / `link:` 安装 / 双 home / 排练场）：guides/60 §6–§7；真实安装形状 = `release-smoke`（合同 `docs/release.md`）；**push 走 `ssh.github.com:443`**（22 被拦，见 R6 Note 环境状态）。
