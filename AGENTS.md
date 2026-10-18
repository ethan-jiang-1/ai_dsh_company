# AGENTS.md — 本仓库的入口链

梦之队（Dream Team）虚拟公司 DSH 插件（DSH = DeepSeek Harness，唯一权威 = `vendor/dsh` 钉 SHA 子模块，见下「DSH 源码」节）：一个 company pack 提供五个角色 preset 与 host/client 面。
**初入仓库**：[项目地图](docs/project-map.md)（空间）+ [运行态地图](docs/runtime-map.md)（时序与四状态轴）——驾驭者白话速读 = [orient 七问](docs/orient.md)；**开始变更**：[开发环 §0.5/§1](docs/guides/dev-loop.md)；**选验证**：[测试宪法](docs/testing.md) + [tests/README](tests/README.md)（改动面→最窄检查）+ [脚本索引](checks/README.md)；**新 Agent 首跑验收** = [tests/README](tests/README.md) 首跑节。

**你（读者）= 维护本 repo 的开发 agent**；五个梦之队角色是你**维护的产物**（跑在 DSH 会话里，由 `pnpm dsh` / web 观察窗驱动）——别把自己混进公司角色，也别替角色执行公司手册。

## 布局

```
CLAUDE.md -> AGENTS.md    symlink（编辑真文件 AGENTS.md，verify 校验）
.agents/skills/          完成定义 skill 与 web-window-ops 的宿主（清单 = 目录本身，DSH 会话 catalog 自动发现）；DSH 会话技能从这里装载（D39）
packages/company-pack/   唯一自写包：presets/<role>/（persona+skills）、cordis.patch.yml、src/（host R3+）+ src/client/（client 面）
company-workspace/      运行时公司共享盘（会话 cwd）：AGENTS.md（公司手册，随会话注入）、kb/、templates/、deliverables/ + deliverables-archive/（已收敛产物，只读归档）
vendor/dsh/             DSH 源码 submodule（钉 SHA，只读铁律见下节）
docs/                   当前合同与导航：index（地图+台账）→ design/ guides/ + 顶层合同
notes/                  开发记忆：proposed/（RFC）→ implemented/（活跃决策记忆）；离场目录不复述于此——分类规则唯一家 = notes/README.md
_backlog/               推敲层：issues/bugs/research/methods/_archive；章程与账本 = 其 README；agent 门牌 = AGENTS.md
checks/                 验证面：run-gates 门禁；smoke/（真实入口冒烟）+ audit/（盘面日志判据）
tests/                  keyless 回归（company/client/presets/harness 四区 spec）；真模型/浏览器不进本树——分区导航 = tests/README.md
probes/                 调试面：窄机制与视觉探针，按机制域四子目录（team/fs-taskboard/browser-visual/session-context）
tools/                  工具面：维护工具；lib/ 纯逻辑、drivers/ 真实驱动、archive/ 已耗仪器
_dist/                  导出目的地：tarball（gitignored）+ 生成式《安装手册》（唯一 tracked 例外）；owner = docs/release.md
run/                    运行面（tracked 启动配置）：env.sh（双 home+裸 dsh 拦截）+ 实验 overlay
runtime/                运行残留家（mostly gitignored，少数 tracked：两份 README + cold-storage r6 基线 + probe-*.mjs）：harness-home（开发 DSH_HOME）、第二 home、pw-browsers、排练盘；owner = runtime/README.md
snapshots/              回归证据资产；规则与分类 = snapshots/README.md
```

设计全貌与决策台账：`docs/index.md`。任务入口与执行规则唯一见 [开发环 §0.5/§1](docs/guides/dev-loop.md)；任务源 = 已批 RFC（notes/proposed/ 状态行带「批准：」）与用户点名；唯一例外 = 缺陷卡「修复就绪」自授权（规则唯一家 = [开发环 §0.5](docs/guides/dev-loop.md)、[_backlog 章程](_backlog/README.md)）。**条目状态不镜像进本文件**（只收常设指令）。

**notes/ 是开发流程核心数据**：开工按主题检索相关 Note；非平凡变更同 diff 更新对应 Note；分类与收尾规则唯一家 = [notes/README.md](notes/README.md)。

## 命令表

```sh
git submodule update --init            # 拉下 vendor/dsh（已钉 tag）
corepack enable pnpm && pnpm install   # workspace 解析；全配方（含 vendor 构建）见 guides/bootstrap
source run/env.sh                      # 双 home 兜底 + 裸 dsh 拦截 + pre-push 接线（⚠ coding 会话 DSH_HOME 带日用值——dev-loop §6）
pnpm verify                            # 结构门禁（清单唯一源 = checks/gates/ 目录）
pnpm test                              # keyless 回归（真模型/浏览器不进；layering 守卫）
pnpm orient                            # 运行态全景（keyless 只读；--scenario = run bundle 视图）
pnpm dsh --profile headless "hi"       # 从 DSH 源码起会话（真 API，需 DEEPSEEK_API_KEY）
source run/env.sh && node checks/smoke/preset-smoke.mjs    # preset 改动的完成定义（真挂载；前置 = bootstrap 构建完成）
```

逐脚本触发/成本/状态唯一源 = 脚本头注（门禁强制自述）；索引见 [检查索引](checks/README.md)——**别抄回本文件，复述必漂**。web 观察窗开门步骤唯一见 [demo.md §前置](docs/demo.md)：**先 `source run/env.sh`**——日用 `~/.dsh` 另有同名 `web` profile（起得来不报错、五角色不出现）；端口是环境状态，token URL 从启动横幅读；现场运维 = [budget-and-ops](docs/guides/budget-and-ops.md)。**push 走 `ssh.github.com:443`**（origin 已配好）。

## 密钥

`pnpm dsh` 与真模型冒烟需 `DEEPSEEK_API_KEY`；**密钥住凭据库 `<home>/.credentials.yaml`，不是环境变量**——`env | grep DEEPSEEK` 为空**不代表**没配（2026-10-18 实证：真模型探针曾因此被误判搁置）；自检 = `pnpm orient` 的「凭据」行。凭据按 home 隔离（`runtime/harness-home` 配一次，dev-loop §6）；永不提交密钥。

## DSH 源码：三个实体，别混

**① 唯一权威 = `vendor/dsh/`**（钉 SHA 只读；机制核对一律 `pnpm dsh`）。**② 裸 `dsh` = 日用全局安装**（版本随全局漂移，不作本仓依据；已被 env.sh 拦截，确要日用 `command dsh`）。**③ 外部研究树** `/Users/bowhead/deepseek-harness/`（`_digested`/FAQ 宿主，只读；登记见 [index §外部研究材料登记](docs/index.md)）。全局不变量 = `vendor/dsh/AGENTS.md` Conventions 节；概念→源码直达 = [术语映射](docs/terminology.md)。

## 纪律（沿 DSH 研发纪律；默认严格照做，偏离必须登记）

权威 = 钉住的 `vendor/dsh/`（「权威」列 = vendor 树内相对路径；本表只是仓内落点指针，不复述细则）。

| 纪律 | 权威（vendor 树） | 本仓落点 |
|---|---|---|
| 任务反馈面；按变更选检查、只报告实跑过的 | `packages/todo` / `packages/plan` / `AGENTS.md` | dev-loop §0.5/§1/§9.1/§12（收尾含语义审，清单 = §13） |
| docs = 当前合同（一处事实一个家，只写 now）；文档卫生 | `docs/AGENTS.md` | docs/ 分层；行预算 = doc-budget 门禁 `DOC_LINE_BUDGETS`；细则 = dev-loop §12 |
| 非平凡变更同 diff 带 Note（决定/输掉的方案/验证什么）；日志税 | `.agents/notes/README.md` / `AGENTS.md` Conventions | notes/proposed/ → notes/implemented/；写什么 = [notes/README.md](notes/README.md) |
| 完成定义 = 最小真检查；测试分层；真实入口与安装形状 | `docs/testing.md` / `docs/postmortem/0003-web-agent-gui-feedback-loop.md` | 本仓 [测试宪法](docs/testing.md) + layering 守卫；preset = preset-smoke；安装 = release-smoke（[release.md](docs/release.md)） |
| 源码/产物面不混；vendor 钉版本，升 pin 时流程合同重校 | `AGENTS.md` Conventions / [release.md §vendor 政策](docs/release.md) | 根 tsconfig extends vendor base；簿记见下节 + `tools/sync-dsh.mjs` |
| 机械不变量进执行门禁 + 每门带反证（红→还原→绿） | `AGENTS.md` Conventions | `checks/gates/` 目录（清单唯一源；装配 = run-gates.mjs；本表不复述） |

### vendor 铁律（`pnpm verify` 双门禁强制）

**`vendor/` 下受版本控制的内容一个字节都不许改**（submodule HEAD == 簿记 SHA + 工作树零改动）。允许面与三条正路（bundle patch / 提上游升 pin / 先证伪"不可用"再自建）= [release.md §vendor 政策](docs/release.md)；⚠ 禁 `git clean -x`。

**本仓原生纪律**：§11 工具态与越界写入（工具状态先落仓库 gitignored 区）、§13 自主优先协议（先探索后发明、借鉴成熟插件）——规则唯一见 [dev-loop §11/§13](docs/guides/dev-loop.md)。**不发明**：不自造 spec 流程/调度器/记忆/门禁，优先用 DSH 现成载体。

## vendor 簿记

- upstream `https://github.com/deepseek-ai/deepseek-harness.git`；当前钉住：tag `dsh-v0.2.0-rc.2` = `639ed015397290b3745d163aafe02ffee4aa3f84`（`_digested` 审计基线同 pin）。
