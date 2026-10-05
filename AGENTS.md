# AGENTS.md — 本仓库的入口链

wochen 虚拟公司 DSH 插件：一个 company pack 提供五个角色 preset 与 host/client 面。
**初入仓库**：读 [项目地图](docs/project-map.md)（空间）+ [运行态地图](docs/runtime-map.md)（时序与四状态轴）；**开始变更**：读 [开发环 §0.5/§1](docs/guides/dev-loop.md)；**选验证**：读 [测试宪法](docs/testing.md)、[tests/README](tests/README.md)（改动面→最窄检查表）和 [脚本索引](scripts/README.md)；**新 Agent 首跑验收**（推荐、非强制）= [tests/README](tests/README.md) 首跑节。

**你（读者）= 维护本 repo 的开发 agent**；五个 wochen 角色是你**维护的产物**（它们跑在 DSH 会话里，
由 `pnpm dsh` / web 观察窗驱动）——别把自己混进公司角色，也别替角色执行公司手册。

## 布局

```
CLAUDE.md -> AGENTS.md    symlink（编辑真文件 AGENTS.md，verify 门禁校验）
packages/company-pack/   唯一自写包：presets/<role>/（persona+skills）、cordis.patch.yml（bundle 行）、src/client/（client 面：品牌皮肤）、src/（host 代码 R3+）
company-workspace/      运行时"公司共享盘"（会话 cwd）：**AGENTS.md（公司手册，随成员会话注入）**、kb/<role>/（CHARTER+journal）、templates/、deliverables/
vendor/dsh/             DSH 源码 submodule（钉 SHA，**只读铁律**：见 §vendor 铁律，`pnpm verify` 强制）
docs/                   当前合同与导航：index（地图+台账）→ design/ guides/ + 顶层合同
notes/                  **开发记忆与证据链**：proposed/（RFC）→ implemented/（活跃决策记忆）；archived/（完结研究 + intents 冻结档案）/ rejected/（负知识）；postmortem/ 记事故
_backlog/               推敲层：plans/ 推敲卡（含待触发等待卡）、bugs/ 缺陷卡、reference/ 研究材料、_done/ 归档（_closed/_suspended/_fixed/_reference + _misc/ 退役池）；章程/账本二分，规矩与制度沿革（D31/D33）= 其 README
scripts/                run-gates.mjs（稳定门禁）；smoke/ probes/ audit/ tools/ archive/ 按职责；lib/ 隔离逻辑、drivers/ 真实驱动
dev/                    env.sh（双 home+裸 dsh 拦截）、company.overlay.yml（headless 实验 overlay）、harness-home/（开发 DSH_HOME，gitignore 运行残留）；README = 分类 owner
snapshots/              回归资产：历史录制、workspace.actual 副本与部分场景独立编写的 workspace.expected；以各 snapshot.yml / Note 为准
```

设计全貌与当前决策：`docs/index.md`（按主题进入对应 owner）。任务入口与执行规则唯一见 `docs/guides/dev-loop.md` §0.5/§1；任务源 = 已批 RFC 与用户点名（D32；推敲卡不是任务——退役机制（中心队列/磨清单/搁置池）的历史与边界唯一见 dev-loop §0.5 分支②）。
**条目状态不镜像进本文件**（root AGENTS.md 只收常设指令——vendor tier 表 "Status rots"；依据 =
[research §十一](notes/implemented/2026-09-23-dsh-inround-task-surface.md)）。

**`notes/` 是 DSH 开发流程的核心数据。** 开工按主题检索相关 Note，读取仍适用的决定、约束和验证证据；非平凡变更同 diff 更新对应 Note，提案落地后归入 `implemented/`。`implemented/` 是活跃决策记忆：实现事实变化时同步更新；决定逆转另写 Note 并互链，明确归档后才冻结。分类与规则唯一家 = [notes/README.md](notes/README.md)（D35）；收尾动作 = [开发环 §12](docs/guides/dev-loop.md)；DSH 原生定义见 [Agent Notes](vendor/dsh/.agents/notes/README.md)。

## 命令表

```sh
git submodule update --init            # 拉下 vendor/dsh（已钉 tag）
corepack enable pnpm                   # 一次性：pnpm 走 corepack（packageManager 钉 11.7.0）
pnpm install                           # workspace 解析；引导全配方（含 vendor 构建）见 guides/bootstrap
source dev/env.sh                      # 双 home 兜底 + 裸 dsh 拦截 + pre-push 门禁接线（⚠ coding 会话里 DSH_HOME 继承带日用值——guides/dev-loop §6 第 5 条）
pnpm verify                            # 结构门禁（清单唯一源 = scripts/run-gates.mjs；跑一次看 PASS 行即得全表，本行不复述；push 侧 pre-push hook 强制）
pnpm test                              # keyless 回归（vitest；数量与耗时以实跑为准；真模型/浏览器不进回归，tests/harness/layering.spec.ts 守卫）
pnpm dsh --profile headless "hi"       # 从 DSH 源码起会话（真 API，需 DEEPSEEK_API_KEY）
node scripts/smoke/preset-smoke.mjs          # preset 改动的**完成定义**（触发条件与成本见该脚本头注；挂载失败只有它抓得到）
```

其余门禁/冒烟脚本见 `scripts/`：**每个脚本头注写明「何时跑」与成本、并自述「状态：常驻|已耗」**（`script-triggers` / `script-status` 门禁强制自述，
清单唯一源 = `scripts/`——**逐个脚本的触发条件与成本别抄回本文件**，复述必漂）。分层原则 = guides/dev-loop §9.1；
发布/升 pin = [release.md](docs/release.md)。web 观察窗的起法与开门步骤（连工作区 / token / 选 preset）唯一见 [demo.md §前置](docs/demo.md)：
**先 `source dev/env.sh`**——未 source 时 `DSH_HOME` 是日用 `~/.dsh`，那里**另有同名 `web` profile**（起得来、不报错、五角色一个不出现）；
端口是环境状态不是仓库事实（`--port 0` 或挑空闲端口，token URL 从启动横幅读），构建三件事见 guides/bootstrap。

**push 走 `ssh.github.com:443`**（22 端口被拦；`origin` 已指向该 URL，`git push` / `git fetch` 直接用即可）。

## 密钥

`pnpm dsh` 与真模型冒烟需 `DEEPSEEK_API_KEY`；凭据按 home 隔离（开发 home `dev/harness-home/.credentials.yaml` 配一次，guides/dev-loop §6）；永不提交密钥。

## DSH 源码：三个实体，别混

**① 唯一权威 = `vendor/dsh/`**（钉 SHA，只读铁律见下节）：机制核对与验证会话一律 `pnpm dsh`。
**② 裸 `dsh` = 日用全局安装**（与本 repo 开发无关，版本随全局漂移，不作本仓机制依据），已被 `dev/env.sh`
拦截（DSH_HOME 只护数据层护不住代码层；确要日用：`command dsh`）。**③ 外部研究树**
`/Users/bowhead/deepseek-harness/`（`_digested`/FAQ 宿主）只读参考，登记见 `docs/index.md` §外部研究材料登记。
DSH 全局不变量（fail-loud / model-visible ⟺ logged / registrations are effects）= `vendor/dsh/AGENTS.md` Conventions 节；概念→源码直达表 = `docs/index.md` §术语映射。

## 纪律（沿 DSH 研发纪律；**默认严格照做，偏离必须登记**）

纪律以钉住的 `vendor/dsh/` 为准；本表是仓内落点索引，不替代原文。**「权威（vendor 树）」列的路径
是 vendor 树内相对路径**（如 `docs/testing.md` = `vendor/dsh/docs/testing.md`；本仓 `docs/testing.md`
是**本仓测试宪法**（2026-10-04 立）——两者同名不同物，权威列永远指 vendor 树内那份）。当前任务分支与执行规则见 [开发环 §0.5/§1](docs/guides/dev-loop.md)。本仓特有适配按 D 号记录约束与证据。

| DSH 纪律 | 权威（vendor 树） | 本 repo 落点 |
|---|---|---|
| 任务反馈面；按变更选择相关检查、只报告实际跑过的检查 | `packages/todo` / `packages/plan`（按各自条件使用）；`AGENTS.md` Run relevant checks | 适用规则唯一见 guides/dev-loop §0.5/§1；本地流程 §1/§9.1/§12 |
| docs = 当前合同（一处事实一个家，**只写 now**）；**文档卫生（D26）**：删重复/失效指令、并重复事实家、修活指针，行数只作观察 | `docs/AGENTS.md` | `docs/` 按性质分层（D10）；物理行预算 = `scripts/run-gates.mjs` 的 `DOC_LINE_BUDGETS`；队列层已退役（D32），_backlog 规矩 = 其 README；卫生细则 = dev-loop §12 |
| 非平凡变更同 diff 带 Agent Note（决定/输掉的方案/需验证什么；授权链线索记在 Note 状态行——intents.md 已退役 D34）；日志税：model-visible ⟺ logged | `.agents/notes/README.md`；`AGENTS.md` Conventions | `notes/proposed/ RFC → implemented/`；收尾 Note 要写什么 = [notes/README.md](notes/README.md)（分类 owner，D35；范式照 [journal-presence-mechanism](notes/implemented/2026-09-26-journal-presence-mechanism.md)）；日志税落点 = dev-loop §3② |
| **完成定义 = 该面最小"真检查"通过，发现权在代理一侧**；测试分层（真模型/真浏览器不进回归；行为变更同 diff 更新录制快照）；真实入口路径（发布产物 `lib/` 跑）与真实安装形状 | `docs/testing.md`；`docs/postmortem/0003-web-agent-gui-feedback-loop.md` | **测试宪法 `docs/testing.md`**（证据政策唯一家）+ dev-loop §1/§9.1 + 机械门禁 `tests/harness/layering.spec.ts`（已反证）+ bootstrap 两道防线；preset 改动完成定义 = `preset-smoke.mjs`（真挂载）；安装形状 = `release-smoke`（合同 [release.md](docs/release.md)） |
| 源码面/产物面不混（paths 指 src）；vendor 钉版本 + manifest/SHA + 同步程序，**升 pin 时流程合同对 vendor 重校** | `AGENTS.md` Conventions；`vendor/README.md` | 根 `tsconfig.json` extends vendor base；AGENTS §vendor 簿记 + `scripts/tools/sync-dsh.mjs` |
| 机械可查的不变量进执行门禁 + **每个新门禁带反证**（红→还原→绿） | `AGENTS.md` Conventions | `scripts/run-gates.mjs`（**清单唯一源 = 那个文件自己**——跑一次看 PASS 行即得全表；**本表不复述门禁名**，复述必漂） |

### vendor 铁律（本仓强制边界；受更高层指令与工具权限约束，机械门禁在 `pnpm verify`）

**`vendor/` 下受版本控制的内容一个字节都不许改**（submodule HEAD == 簿记 SHA + 工作树零改动，
`pnpm verify` 双门禁强制，均带反证）。允许面一句话：vendor 自己 `.gitignore` 覆盖的树内构建产物
不算改（⚠ 禁 `git clean -x`）；想改 vendor 行为的三条正路（bundle patch / 提上游升 pin / 先证伪
"不可用"再自建）、SHA-not-tag 理由与克隆技巧 = [release.md §vendor 政策](docs/release.md)。

**本仓原生纪律**：§11 **工具态与越界写入**——repo 内自由区；工具状态先重定向进仓库 gitignored 区再首次用
（落点：双 home、`.pnpm-store`、profile `.npmrc`、排练场），确需越界先问人、一次说清路径与理由；§13
**自主优先协议**（D29）——先探索后发明、借鉴成熟插件、REVIEW 分级、人审四件套——规则唯一见 [dev-loop §11/§13](docs/guides/dev-loop.md)。

- 开工与执行唯一流程：`docs/guides/dev-loop.md` §0.5/§1；其他操作按需查同文后续章节。demo 现场运维 runbook：`docs/guides/budget-and-ops.md`。
- **不发明**：不新增 spec 流程（OpenSpec 留触发条件，guides/dev-loop §5）、不自造调度器/记忆/门禁——优先用 DSH 现成载体（D13）；否决依据 = [community-practice](notes/implemented/2026-09-22-agent-workflow-community-practice.md)。

## vendor 簿记

- upstream：`https://github.com/deepseek-ai/deepseek-harness.git`；当前钉住：tag `dsh-v0.2.0-rc.2` = `639ed015397290b3745d163aafe02ffee4aa3f84`（`_digested` 审计基线自其 0009 轮起同 pin，2026-10-02 核对其 00-index 声明；此前"落后一代"的注记见升 pin Note）。
