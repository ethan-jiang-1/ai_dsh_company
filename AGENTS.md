# AGENTS.md — 本仓库的入口链

虚拟公司（**wochen**）多角色 DSH 插件：一个包（`packages/company-pack`）提供五个角色 preset
（显示名 `wochen CEO` / `wochen VP-Eng` / `wochen VP-Sales` / `wochen COO` / `wochen CFO`）+ host profile 源；
协作用 DSH 现成通道（Agent Teams 主通道）。

## 布局

```
CLAUDE.md -> AGENTS.md    symlink（编辑真文件 AGENTS.md，verify 门禁校验）
ROADMAP.md              根部队列（接下来 + 搁置池；▶ = 当前条目；完成即离队——D24 自 docs/plans 迁入）
packages/company-pack/   唯一自写包：presets/<role>/（persona+skills）、cordis.patch.yml（bundle 行）、src/client/（client 面：品牌皮肤）、src/（host 代码 R3+）
company-workspace/      运行时"公司共享盘"（会话 cwd）：kb/<role>/（CHARTER+journal）、templates/、deliverables/
vendor/dsh/             DSH 源码 submodule（钉 SHA，**只读铁律**：见 §vendor 铁律，`pnpm verify` 强制）
docs/                   当前合同与导航：00-index（地图+台账）→ design/ guides/ + 顶层合同
notes/                  **开发记忆与证据链**：intents.md → proposed/ → implemented/；rejected/ 保留防复犯理由；postmortem/ 记事故；research/ 记仍在用的外部研究
scripts/                verify.mjs（结构门禁）、preset-smoke.mjs（真入口冒烟）……
dev/                    env.sh（双 home+裸 dsh 拦截）、company.overlay.yml（headless 实验 overlay）、harness-home/（开发 DSH_HOME，gitignore 运行残留）
snapshots/              回归资产：r1/r2/r3/r4-motion + scenario-b（录制会话 + workspace.expected 独立 oracle）；replay harness R5a
```

设计全貌与决策台账：`docs/00-index.md`（先读它，再按需进 design/10-40）。接下来开发什么 =
`ROADMAP.md` §队列（▶ 即当前条目；开工 / 收尾程序 = `docs/guides/60-dev-loop.md` §0.5/§12）。
**条目状态不镜像进本文件**（root AGENTS.md 只收常设指令——vendor tier 表 "Status rots"；依据 =
[research §十一](notes/implemented/2026-09-23-dsh-inround-task-surface.md)）。

**`notes/` 是 DSH 开发流程的核心数据，不是可有可无的历史附件。** 开工先按条目/机制检索相关 Note，读决定、输掉的方案、约束与验证证据，再改代码；无需通读全树。
非平凡变更同 diff 写/更新 Note，提案落地后改写为 `implemented/`；仅代码或聊天里的结论不算交接。
`implemented/` 仍是活跃决策记忆：路径/名称/默认值随实现更新，决策逆转另写 Note 并互链；明确归档才冻结，不作当前权威。
生命周期、读取触发与维护细则见 [开发环 §12](docs/guides/60-dev-loop.md)；原生定义见 [DSH Agent Notes](vendor/dsh/.agents/notes/README.md)。

## 命令表

```sh
git submodule update --init            # 拉下 vendor/dsh（已钉 tag）
corepack enable pnpm                   # 一次性：pnpm 走 corepack（packageManager 钉 11.7.0）
pnpm install                           # workspace 解析；引导全配方（含 vendor 构建）见 guides/60 §7
source dev/env.sh                      # 双 home 兜底 + 裸 dsh 拦截（DSH_HOME=dev/harness-home）。⚠ coding 会话里
                                       #   DSH_HOME 继承且带日用值，漏 source 不报错、安静用错 home（guides/60 §6.5）
pnpm verify                            # 结构门禁（UTF-8/链接/doc-budget/symlink/**vendor 铁律**/preset 结构/行依赖/client 两半/proposal 两则）
pnpm test                              # keyless 回归（vitest；数量与耗时以实跑为准；真模型/浏览器不进回归，tests/layering.spec.ts 守卫）
pnpm dsh --profile headless "hi"       # 从 DSH 源码起会话（真 API，需 DEEPSEEK_API_KEY）
node scripts/preset-smoke.mjs          # preset 改动的完成定义：boot 真 web 逐角色建会话——挂载失败只有这里
                                       #   抓得到（dump/roster 看不见；需 DSH_HOME + 已装 pack）
```

其余门禁/冒烟脚本（`node scripts/<名>.mjs`；分层与何时跑 = guides/60 §9.1，发布/升 pin = [release.md](docs/release.md)）：
client-load（客户端装配，keyless）/ probe（连通档默认 ~6s）/ handbook（手册注入）/ delegation（汇报线边界）/
presence-e2e（在场板链，真模型 ~$1）/ deliverables-check（三态审计，缺 DSH_HOME 自拒）/ snapshot-motion
（动议归档，条目收尾）/ replay（无 key 重放）/ rehearsal-init（排练场）。web 观察窗 =
`pnpm dsh web -- --port 3081 --no-open`（3080 是本 GUI 占用；构建三件事见 guides/60 §7）。

**push 走 `ssh.github.com:443`**（22 端口被拦；环境状态见最近收尾 Note 的环境状态节）。

## 密钥

`pnpm dsh` 与真模型冒烟需要 `DEEPSEEK_API_KEY`。凭据按 home 隔离：开发 home
（`dev/harness-home/.credentials.yaml`）配一次即可（guides/60 §6）；永不提交密钥。

## DSH 源码：三个实体，别混

| 实体 | 位置 | 角色 |
|---|---|---|
| ① 开发基线（**唯一权威**） | `vendor/dsh/`（钉 SHA，只读铁律见下节） | 机制核对与验证会话一律用它：`pnpm dsh` |
| ② 日用全局安装 | npm 全局（`which dsh`；跑日常会话的就是它） | 与本 repo 开发无关；版本随全局漂移（当前恰同为 0.1.5-rc.2，巧合不是保证），行为不作机制依据 |
| ③ 外部研究树 | `/Users/bowhead/deepseek-harness/`（`_digested`/FAQ 宿主） | 只读参考，登记见 `docs/00-index.md` §外部研究材料登记 |

裸 `dsh` 已被 `dev/env.sh` 拦截（DSH_HOME 只护数据层护不住代码层；确要日用：`command dsh`）。
DSH 全局不变量（fail-loud / model-visible ⟺ logged / registrations are effects / plugins not loop
changes）= `vendor/dsh/AGENTS.md` Conventions 节；探索路由与概念→源码直达表 = `docs/00-index.md` §术语映射。

## 纪律（沿 DSH 研发纪律；**默认严格照做，偏离必须登记**）

纪律的权威在 vendor 树（钉住的 tag），本表是**落点地图**不是转述来源；逐源枚举的全量清单
（R6 线 B 产出，98 行提炼）与偏离注册表住 `docs/guides/60-dev-loop.md` §12（流程合同）。
**偏离规则：任何偏离 DSH 明文纪律的做法 = 一个 D 号 + 约束证据**（如"本地单人仓无 GitHub
协作面"）；"按规模裁剪"不是缺省自由。

| DSH 纪律 | 权威（vendor 树） | 本 repo 落点 |
|---|---|---|
| **过程反馈面：plan mode 呈批（计划归 exit_plan_mode）+ 实施期 todo_write（开工列全、完成即勾、steer 即重排）** | `packages/plan` + `packages/todo`（工具描述自带使用纪律） | guides/60 §0 条目生命周期（反馈双门）+ 宿主 TodoPanel |
| docs = 当前合同（一处事实一个家，**只写 now**；词数预算 + slop 猎杀） | `docs/AGENTS.md` | `docs/` 按性质分层（D10）+ verify 链接/预算门禁；队列**纯化、完成即离队**（D23；D24 迁根部 `ROADMAP.md`） |
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

**`vendor/` 下受版本控制的内容一个字节都不许改**（submodule HEAD == 簿记 SHA + 工作树零改动，
`pnpm verify` 双门禁强制，均带反证）。允许面一句话：vendor 自己 `.gitignore` 覆盖的树内构建产物
不算改（⚠ 禁 `git clean -x`）；想改 vendor 行为的三条正路（bundle patch / 提上游升 pin / 先证伪
"不可用"再自建）、SHA-not-tag 理由与克隆技巧 = [release.md §vendor 政策](docs/release.md)。

**本仓原生纪律（与 guides/60 §9/§10 同级）**：§11 **工具态与越界写入**（2026-09-23 立）——
repo 内为自由区；工具状态（缓存/store/配置）一律**先重定向进仓库 gitignored 区再首次使用**
（落点清单：双 home、`.pnpm-store`、profile `.npmrc`、排练场）；确需越界先问人，一次说清路径与理由。

- 具体操作手册：`docs/guides/60-dev-loop.md`（六步闭环 / 调试阶梯 / 插拔速查 / 设计四问 /
  发布纪律时点 / 双 home）。demo 现场运维 runbook：`docs/guides/50-budget-and-ops.md`。
- **不发明**：不新增 spec 流程（OpenSpec 留触发条件，guides/60 §5）、不自造调度器/记忆/门禁——
  优先用 DSH 现成载体（D13）。否决依据（规格工具 vs 本仓两次事故的对照）：
  [implemented/2026-09-22-agent-workflow-community-practice](notes/implemented/2026-09-22-agent-workflow-community-practice.md)。

## vendor 簿记

- upstream：`https://github.com/deepseek-ai/deepseek-harness.git`；当前钉住：tag `dsh-v0.1.5-rc.2` = `fb2c4b9e698e30edb738bca4cf0618587db7d203`（= `_digested` 审计基线，机制文档的核对基线与其一致）。
