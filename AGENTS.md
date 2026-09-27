# AGENTS.md — 本仓库的入口链

虚拟公司（**wochen**）多角色 DSH 插件：一个包（`packages/company-pack`）提供五个角色 preset
（显示名 `wochen CEO` / `wochen VP-Eng` / `wochen VP-Sales` / `wochen COO` / `wochen CFO`）+ host profile 源；
协作用 DSH 现成通道（Agent Teams 主通道）。

## 布局

```
CLAUDE.md -> AGENTS.md    symlink（编辑真文件 AGENTS.md，verify 门禁校验）
ROADMAP.md              根部队列（接下来 + 搁置池；▶ = 当前条目；完成即离队——D24 自 docs/plans 迁入）
packages/company-pack/   唯一自写包：presets/<role>/（persona+skills）、cordis.patch.yml（bundle 行）、src/client/（client 面：品牌皮肤）、src/（host 代码 R3+）
company-workspace/      运行时"公司共享盘"（会话 cwd）：**AGENTS.md（公司手册，随成员会话注入）**、kb/<role>/（CHARTER+journal）、templates/、deliverables/
vendor/dsh/             DSH 源码 submodule（钉 SHA，**只读铁律**：见 §vendor 铁律，`pnpm verify` 强制）
docs/                   当前合同与导航：index（地图+台账）→ design/ guides/ + 顶层合同
notes/                  **开发记忆与证据链**：intents.md → proposed/ → implemented/；research/ 只放未完结研究（完结迁 archived/、过时迁 rejected/——2026-09-26 修订）；postmortem/ 记事故
scripts/                verify.mjs（结构门禁）、preset-smoke.mjs（真入口冒烟）……
dev/                    env.sh（双 home+裸 dsh 拦截）、company.overlay.yml（headless 实验 overlay）、harness-home/（开发 DSH_HOME，gitignore 运行残留）
snapshots/              回归资产：历史录制、workspace.actual 副本与部分场景独立编写的 workspace.expected；以各 snapshot.yml / Note 为准
```

设计全貌与当前决策：`docs/index.md`（按主题进入对应 owner）。任务入口与执行规则唯一见 `docs/guides/dev-loop.md` §0.5/§1；只有用户要求“继续下一条”时才从 `ROADMAP.md` §队列取任务。
**条目状态不镜像进本文件**（root AGENTS.md 只收常设指令——vendor tier 表 "Status rots"；依据 =
[research §十一](notes/implemented/2026-09-23-dsh-inround-task-surface.md)）。

**`notes/` 是 DSH 开发流程的核心数据。** 开工按主题检索相关 Note，读取仍适用的决定、约束和验证证据；非平凡变更同 diff 更新对应 Note，提案落地后归入 `implemented/`。`implemented/` 是活跃决策记忆：实现事实变化时同步更新；决定逆转另写 Note 并互链，明确归档后才冻结。细则见[开发环 §12](docs/guides/dev-loop.md)；DSH 原生定义见 [Agent Notes](vendor/dsh/.agents/notes/README.md)。

## 命令表

```sh
git submodule update --init            # 拉下 vendor/dsh（已钉 tag）
corepack enable pnpm                   # 一次性：pnpm 走 corepack（packageManager 钉 11.7.0）
pnpm install                           # workspace 解析；引导全配方（含 vendor 构建）见 guides/dev-loop §7
source dev/env.sh                      # 双 home 兜底 + 裸 dsh 拦截（DSH_HOME=dev/harness-home）。⚠ coding 会话里
                                       #   DSH_HOME 继承且带日用值，漏 source 不报错、安静用错 home（guides/dev-loop §6 第 5 条）
pnpm verify                            # 结构门禁（清单唯一源 = scripts/verify.mjs；跑一次看 PASS 行即得全表，本行不复述；push 侧 pre-push hook 强制）
pnpm test                              # keyless 回归（vitest；数量与耗时以实跑为准；真模型/浏览器不进回归，tests/layering.spec.ts 守卫）
pnpm dsh --profile headless "hi"       # 从 DSH 源码起会话（真 API，需 DEEPSEEK_API_KEY）
node scripts/preset-smoke.mjs          # preset 改动的**完成定义**（触发条件与成本见该脚本头注；挂载失败只有它抓得到）
```

其余门禁/冒烟脚本见 `scripts/`：**每个门禁/探针脚本（`*-{smoke,probe,audit,check}.mjs`）头注写明「何时跑」与成本**（`script-triggers` 门禁强制自述，
清单唯一源 = `scripts/`——**逐个脚本的触发条件与成本别抄回本文件**，复述必漂）。分层原则 = guides/dev-loop §9.1；
发布/升 pin = [release.md](docs/release.md)。web 观察窗 = `pnpm dsh web -- --port 3081 --no-open`（**端口是环境状态不是仓库事实**——被占就换，
或 `--port 0` 让系统分配、从启动横幅读端口与 token；构建三件事见 guides/dev-loop §7）。

**push 走 `ssh.github.com:443`**（22 端口被拦；`origin` 已指向该 URL，`git push` / `git fetch` 直接用即可）。

## 密钥

`pnpm dsh` 与真模型冒烟需要 `DEEPSEEK_API_KEY`。凭据按 home 隔离：开发 home
（`dev/harness-home/.credentials.yaml`）配一次即可（guides/dev-loop §6）；永不提交密钥。

## DSH 源码：三个实体，别混

| 实体 | 位置 | 角色 |
|---|---|---|
| ① 开发基线（**唯一权威**） | `vendor/dsh/`（钉 SHA，只读铁律见下节） | 机制核对与验证会话一律用它：`pnpm dsh` |
| ② 日用全局安装 | npm 全局（`which dsh`；跑日常会话的就是它） | 与本 repo 开发无关；版本可能随全局安装漂移，不作本仓机制依据 |
| ③ 外部研究树 | `/Users/bowhead/deepseek-harness/`（`_digested`/FAQ 宿主） | 只读参考，登记见 `docs/index.md` §外部研究材料登记 |

裸 `dsh` 已被 `dev/env.sh` 拦截（DSH_HOME 只护数据层护不住代码层；确要日用：`command dsh`）。
DSH 全局不变量（fail-loud / model-visible ⟺ logged / registrations are effects / plugins not loop
changes）= `vendor/dsh/AGENTS.md` Conventions 节；探索路由与概念→源码直达表 = `docs/index.md` §术语映射。

## 纪律（沿 DSH 研发纪律；**默认严格照做，偏离必须登记**）

纪律以钉住的 `vendor/dsh/` 为准；本表是仓内落点索引，不替代原文。**「权威（vendor 树）」列的路径
是 vendor 树内相对路径**（如 `docs/testing.md` = `vendor/dsh/docs/testing.md`；本仓 `docs/` 下没有该文件
——2026-09-26 实测 fresh agent 会按本仓相对路径解析而落空）。当前任务分支与执行规则见 [开发环 §0.5/§1/§12](docs/guides/dev-loop.md)。本仓特有适配按 D 号记录约束与证据。

| DSH 纪律 | 权威（vendor 树） | 本 repo 落点 |
|---|---|---|
| 任务反馈面 | `packages/todo` / `packages/plan`（按各自条件使用） | 适用规则唯一见 guides/dev-loop §0.5/§1 |
| docs = 当前合同（一处事实一个家，**只写 now**） | `docs/AGENTS.md` | `docs/` 按性质分层（D10）；物理行预算 = `scripts/verify.mjs` 的 `DOC_LINE_BUDGETS`；队列规则 = `ROADMAP.md` §维护规则 |
| 非平凡变更同 diff 带 Agent Note（决定/输掉的方案/需验证什么） | `.agents/notes/README.md` | `notes/intents.md → implemented/`；收尾 Note 要写什么 = guides/dev-loop §12「记录与收尾」；范式照 [journal-presence-mechanism](notes/implemented/2026-09-26-journal-presence-mechanism.md) |
| 按变更选择相关检查；只报告实际跑过的检查 | `AGENTS.md` Run relevant checks | 本地流程见 guides/dev-loop §1/§9.1/§12 |
| **完成定义 = 该面最小"真检查"通过；发现权在代理一侧** | `docs/testing.md`；`docs/postmortem/0003-web-agent-gui-feedback-loop.md` | guides/dev-loop §1「完成定义」段 + §7 两道防线；preset 类改动完成定义 = `preset-smoke.mjs`（真挂载） |
| 测试分层：真模型 / 真浏览器不进回归；行为变更同 diff 更新录制快照 | `docs/testing.md` | guides/dev-loop §9.1 + 机械门禁 `tests/layering.spec.ts`（已反证）+ 认证档按面选跑 |
| 真实入口路径（发布产物 `lib/` 跑）+ 真实安装形状 | `docs/testing.md` | `release-smoke`（`npm pack`→干净 profile→`plugin add`），合同 `docs/release.md` |
| 源码面/产物面不混（paths 指 src） | `AGENTS.md` Conventions | 根 `tsconfig.json` extends vendor base |
| vendor 钉版本 + manifest/SHA + 同步程序；**升 pin 时流程合同对 vendor 重校** | `vendor/README.md` | AGENTS.md vendor 簿记 + `scripts/sync-dsh.mjs` |
| 日志税：model-visible ⟺ logged | `AGENTS.md` Conventions | guides/dev-loop §3 设计四问② |
| 机械可查的不变量进执行门禁 + **每个新门禁带反证**（红→还原→绿） | `AGENTS.md` Conventions | `scripts/verify.mjs`（**清单唯一源 = 那个文件自己**——跑一次看 PASS 行即得全表；**本表不复述门禁名**，复述必漂） |
| **文档卫生（本仓政策，D26）**：删重复/失效指令、并重复事实家、修活指针；保留仍指导决策的取舍与反例。行数只作观察，不作为删改目标 | [D26](docs/index.md)；适配理由见本轮 Note | guides/dev-loop §12 |

### vendor 铁律（本仓强制边界；受更高层指令与工具权限约束，机械门禁在 `pnpm verify`）

**`vendor/` 下受版本控制的内容一个字节都不许改**（submodule HEAD == 簿记 SHA + 工作树零改动，
`pnpm verify` 双门禁强制，均带反证）。允许面一句话：vendor 自己 `.gitignore` 覆盖的树内构建产物
不算改（⚠ 禁 `git clean -x`）；想改 vendor 行为的三条正路（bundle patch / 提上游升 pin / 先证伪
"不可用"再自建）、SHA-not-tag 理由与克隆技巧 = [release.md §vendor 政策](docs/release.md)。

**本仓原生纪律（与 guides/dev-loop §9/§10 同级）**：§11 **工具态与越界写入**（2026-09-23 立）——
repo 内为自由区；工具状态（缓存/store/配置）一律**先重定向进仓库 gitignored 区再首次使用**
（落点清单：双 home、`.pnpm-store`、profile `.npmrc`、排练场）；确需越界先问人，一次说清路径与理由。
§13 **自主优先协议**（2026-09-26 立，D29）：尽量遵循 DSH 研发流程；自主解决问题——动手发明前先探索、
借鉴**成熟 DSH 插件**（下载量/影响力门槛）思想；REVIEW 分级——能自主审的自主审，阶段收口才人审，
人审形状 = 跑起来的实例 + 单页走查单 + 一次一件事——规则唯一见 [dev-loop §13](docs/guides/dev-loop.md)。

- 开工与执行唯一流程：`docs/guides/dev-loop.md` §0.5/§1；其他操作按需查同文后续章节。demo 现场运维 runbook：`docs/guides/budget-and-ops.md`。
- **不发明**：不新增 spec 流程（OpenSpec 留触发条件，guides/dev-loop §5）、不自造调度器/记忆/门禁——
  优先用 DSH 现成载体（D13）。否决依据（规格工具 vs 本仓两次事故的对照）：
  [implemented/2026-09-22-agent-workflow-community-practice](notes/implemented/2026-09-22-agent-workflow-community-practice.md)。

## vendor 簿记

- upstream：`https://github.com/deepseek-ai/deepseek-harness.git`；当前钉住：tag `dsh-v0.1.7-rc.2` = `477b4f420553e8a52c2fbccc464d7561b239c443`（= `_digested` 审计基线，机制文档的核对基线与其一致）。
