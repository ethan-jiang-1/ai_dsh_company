# AGENTS.md — 本仓库的入口链

梦之队（Dream Team）虚拟公司 DSH 插件（DSH = DeepSeek Harness，唯一权威 = `vendor/dsh` 钉 SHA 子模块）。
`packages/company-pack/` 提供公司角色 preset、support preset（清单 = `packages/company-pack/presets/` 目录）、只读公司手册与 host/client 扩展面。

> **身份边界**：**你（读者）= 维护本 repo 的开发 agent**；公司角色与 support preset 是你**维护的产物**（跑在 DSH 会话里，由 `pnpm dsh` / Web 观察窗驱动）——别把自己混进公司角色，也别替角色执行公司手册。
> **分流**：只想安装使用 → [README.md](README.md) / [安装手册](_dist/安装手册.md)；想接手开发 → 读完下方 3 步即可开工。

## 开工最小路径（feature 任务先 Plan Mode，见 [policy §P1](docs/policy.md)）

1. **读架构与地图（1 跳）**：[架构总纲](docs/architecture.md) · [文档入口 `docs/README.md`](docs/README.md) · 接手源码仓见 [源码 handoff](docs/guides/repo-handoff.md)。
2. **读任务 owner 合同（1 跳）**：改角色内容 = [presets.md](./docs/contracts/presets.md)；改 host/Web 代码 = [src/README](packages/company-pack/src/README.md)；改文档 = [docs/AGENTS.md](docs/AGENTS.md)；新增/搬内容 = [content-charter](./docs/contracts/content-charter.md)；改机制/组合 = [profile.md](./docs/contracts/profile.md)。
3. **按改动面选最窄验证**：[tests/README.md](tests/README.md)「改动面 → 最窄检查」对应行。

- **任务源**：用户点名或已批 RFC（`notes/proposed/` 带「批准：」）；`待落地` 卡不是任务源；唯一例外 = 缺陷卡 `修复就绪` 自授权（边界唯一家 = [policy §P1-B](docs/policy.md#p1-b-缺陷材料性与修复自授权边界唯一定义家)）。
- **“落地”与“修复”同一判据**：系统里出现可验证的变更（代码/文档/门禁/模板/技能）+ 实跑红→绿证据 + 可对账提交；只写 RFC、翻状态、`git mv` 不算落地或修复（机械门 = `fix-evidence`；细则 = [_backlog 章程](_backlog/README.md)）。
- **按需扩展**：[架构与运行态](docs/architecture.md) · [开发环 §1](docs/guides/dev-loop.md#1-任务入口与交接)/[§2](docs/guides/dev-loop.md#2-执行链从授权到有证据交接) · [环境与排障](docs/guides/run-ops.md) · [policy（含维护面）](docs/policy.md) · [测试宪法](docs/testing.md) · [脚本索引](checks/README.md) · [orient 七问](docs/guides/orient.md)。
- **五条高频命令**：`pnpm setup`（[setup.mjs](tools/dev/setup.mjs)）、`source run/env.sh && pnpm company --no-open`（dev-only，`--link` 快速通道；产品入口 = `dsh --profile company`）、`pnpm verify`、`pnpm test`、`pnpm typecheck`。
- **首跑与验收**：fresh clone 首跑顺序唯一家 = [bootstrap](docs/guides/bootstrap.md)，新 Agent 首跑验收 = [tests/README.md](tests/README.md)。

## 布局

| 目录 | 定位与职责 | 入口 |
|---|---|---|
| [`.agents/skills/`](.agents/skills/) | 完成定义 skill 与 `web-window-ops` 宿主（目录即清单，DSH 会话自动发现；`.claude/skills` 软链指向此处） | 目录即清单 |
| [`packages/company-pack/`](packages/company-pack/) | 唯一自写包：`presets/<role>/`、`cordis.patch.yml`、`src/`（host + client）、`content/`（只读手册/模板/章程）；无 bin/启动器 | [pack README](packages/company-pack/README.md) · [src/README](packages/company-pack/src/README.md) |
| `company-workspace/` | dev 公司状态 workspace（会话 cwd；整树 gitignored）：仅 `.dsh-company/`，由 `pnpm bundle:init` 建，不复制插件内容 | [bootstrap](docs/guides/bootstrap.md) |
| `vendor/dsh/` | DSH 源码 submodule（钉 SHA，受版本控制内容只读零改动） | 见下「vendor 铁律」 |
| [`docs/`](docs/) | 唯一长期维护的核心架构、现在时合同、操作指南与参考查表（只写 now，随代码同 diff 更新） | [docs/README.md](docs/README.md) · [docs/AGENTS.md](docs/AGENTS.md) |
| [`notes/`](notes/) | 开发记忆：`proposed/`（RFC）→ `implemented/`（活跃决策记忆）；分类与收尾见其 README | [notes/README.md](notes/README.md) |
| [`_backlog/`](_backlog/) | 上游推敲层：`issues/`、`bugs/`、`research/`、`methods/`、`_archive/` + `triggers.md`（卡流转与五道门） | [_backlog/README.md](_backlog/README.md) · [_backlog/AGENTS.md](_backlog/AGENTS.md) |
| [`checks/`](checks/) | judge：会拦人的判断（`gates/`、`lanes/`、`audit/`；`lib/` = 判据支撑） | [checks/README.md](checks/README.md) |
| [`tests/`](tests/) | keyless 回归（按面分区 spec；真模型/浏览器不进本树） | [tests/README.md](tests/README.md) |
| [`probes/`](probes/) | show：给人看的证据（`team/`、`fs-taskboard/`、`browser-visual/`、`session-context/`、`analyze/`） | [checks/README.md](checks/README.md) |
| [`tools/`](tools/) | operate：改世界的操作（`dev/`、`repo/`、`release/`、`lib/`、`drivers/`） | [checks/README.md](checks/README.md) |
| [`_dist/`](_dist/) | 导出目的地：tarball（gitignored）+ 生成式《安装手册》（唯一 tracked 例外） | [release.md](docs/contracts/release.md) |
| [`run/`](run/) | tracked 启动配置：`env.sh`（双 home + 裸 `dsh` 拦截）+ `company`/`entry-probe` overlay | [run/README.md](run/README.md) |
| [`runtime/`](runtime/) | 运行残留家（默认 gitignored + 极少数白名单）：`harness-home`、第二 home、`pw-browsers`、`web-logs` | [runtime/README.md](runtime/README.md) |
| [`snapshots/`](snapshots/) | 回归证据资产与场景元数据 | [snapshots/README.md](snapshots/README.md) |

- **设计全貌** = [docs/README.md](docs/README.md)；**决策台账** = [docs/decisions.md](docs/decisions.md)。
- **一条流水线**（位置唯一家 = 卡 frontmatter `status`；门与守卫 = [_backlog/AGENTS.md](_backlog/AGENTS.md)）：`研究 → 定性 → 落地 → 审 → 归档`；毕业落 `notes/proposed/` RFC 或 `notes/implemented/` Note，实施见 [dev-loop §2](docs/guides/dev-loop.md#2-执行链从授权到有证据交接)。
- **notes/ 检索纪律**：开工按主题检索，非平凡变更同 diff 更新 [notes/implemented/](notes/implemented/README.md)；条目状态不镜像进本文件。

## 命令表

```sh
git submodule update --init            # 拉下 vendor/dsh（已钉 tag）
corepack enable pnpm && pnpm install   # workspace 解析；全配方（含 vendor 构建）见 docs/guides/bootstrap.md
source run/env.sh                      # 双 home 兜底 + 裸 dsh 拦截 + pre-push 接线（⚠ 见 docs/guides/run-ops.md）
pnpm bundle:init                       # fresh clone：建 dev 的 .dsh-company/ 状态（不复制插件内容；已有盘不动）
source run/env.sh && pnpm company --no-open  # repo dev-only：pack + plugin add file: + exec dsh --profile company（--link 快速通道）
pnpm verify                            # 结构门禁（清单唯一源 = checks/gates/ 目录）
pnpm test                              # keyless 回归（真模型/浏览器不进；layering 守卫）
pnpm typecheck                         # pack 两面 + tests/{client,host,lib,content,repo,tools,session,evidence,ui,presets}（三个 tsconfig.test-*；覆盖 = include 减 exclude，清单以配置为准）
pnpm release --check                   # 发布就绪（dist 与源码指纹；verify 绿 ≠ 可发布）
source run/env.sh && pnpm orient       # 运行态全景（先 source 才看 dev home；keyless 只读）
pnpm diagnose --session <slug>/<id>    # 会话失败摘要（只读；child 也可点名）
pnpm dsh --profile headless "hi"       # 从 DSH 源码起会话（真 API，需 DEEPSEEK_API_KEY）
source run/env.sh && node checks/lanes/preset.entry.mjs  # preset 改动的真挂载检查（完整完成定义 = preset-change-definition skill）
```

- 逐脚本触发/成本/状态唯一源 = 脚本头注（门禁强制自述）；索引见 [检查索引](checks/README.md)——**别抄回本文件，复述必漂**。
- Web 观察窗开门步骤唯一见 [演示 runbook](./docs/guides/demo-scenes.md#前置本机)：**先 `source run/env.sh`**（日用 `~/.dsh` 另有同名 profile）；端口是环境状态，token URL 从启动横幅读；现场运维见 [run-ops](docs/guides/run-ops.md)。**push 走 `ssh.github.com:443`**。

## 密钥

- `pnpm dsh` 与真模型冒烟需 `DEEPSEEK_API_KEY`；**密钥住凭据库 `<home>/.credentials.yaml`，不是环境变量**——`env | grep DEEPSEEK` 为空不代表没配。
- 自检 = `source run/env.sh && pnpm orient` 的「凭据」行；凭据按 home 隔离（`runtime/harness-home` 配一次，见 [run-ops](docs/guides/run-ops.md)）；永不提交密钥。

## DSH 源码：三个实体，别混

- **① 唯一权威 = `vendor/dsh/`**（钉 SHA 只读；机制核对一律 `pnpm dsh`）。
- **② 裸 `dsh` = 日用全局安装**（版本随全局漂移，不作本仓依据；已被 `run/env.sh` 拦截，确要日用执行 `command dsh`）。
- **③ 外部研究树**（维护者本机路径；`_digested`/FAQ 宿主，只读；登记见 [external](./docs/reference/external.md)）。
- 全局不变量 = `vendor/dsh/AGENTS.md` Conventions 节；概念→源码直达 = [术语映射](./docs/reference/glossary.md)。

## 纪律（沿 DSH 研发纪律；默认严格照做，偏离必须登记）

| 纪律 | 权威（`vendor/dsh/` 内） | 本仓落点 |
|---|---|---|
| 任务反馈面；按变更选检查、只报告实跑过的 | `packages/todo` / `packages/plan` / `AGENTS.md` | [dev-loop](docs/guides/dev-loop.md) §1–§5 + [policy §P5](docs/policy.md)（语义审） |
| docs = 当前合同（一处事实一个家，只写 now）；文档卫生 | `docs/AGENTS.md` | docs/ 分层；UTF-8 字节预算 = `DOC_BYTE_BUDGETS`；细则 = [docs/AGENTS.md](docs/AGENTS.md) |
| 非平凡变更同 diff 带 Note（决定/输掉的方案/验证什么） | `.agents/notes/README.md` / `AGENTS.md` | `notes/proposed/` → `notes/implemented/`；写什么 = [notes/README.md](notes/README.md) |
| 完成定义 = 最小真检查；**文件名 = 证据类型**；真实入口与安装形状 | `docs/testing.md` / `docs/postmortem/0003-web-agent-gui-feedback-loop.md` | [测试宪法](docs/testing.md) + layering 守卫；preset = `preset.entry.mjs`；安装 = `release.entry.mjs`（[release.md](./docs/contracts/release.md)） |
| 源码/产物面不混；vendor 钉版本，升 pin 时流程合同重校 | `AGENTS.md` / [release.md §vendor 政策](./docs/contracts/release.md) | 根 tsconfig extends vendor base；簿记见下节 + `tools/repo/sync-dsh.mjs` |
| 机械不变量进执行门禁 + 每门带反证（红→还原→绿） | `AGENTS.md` Conventions | `checks/gates/` 目录（清单唯一源；装配 = `run-gates.mjs`；门禁总数封顶见 [policy §P2](docs/policy.md)） |

### vendor 铁律（`pnpm verify` 双门禁强制）

**`vendor/` 下受版本控制的内容一个字节都不许改**（submodule HEAD == 簿记 SHA + 工作树零改动）。
允许面与三条正路（bundle patch / 提上游升 pin / 先证伪"不可用"再自建）= [release.md §vendor 政策](./docs/contracts/release.md)；⚠ 禁 `git clean -x`。

**本仓原生纪律**：工具态先落仓库 gitignored 区、先探索后发明——规则唯一见 [policy §P4/§P5](docs/policy.md)。**不发明**：不自造 spec 流程/调度器/记忆/门禁，优先用 DSH 现成载体。

## vendor 簿记

- upstream `https://github.com/deepseek-ai/deepseek-harness.git`；当前钉住：tag `dsh-v0.2.1-rc.5` = `b830ec950faba0a46dda564be3e2d854afed94f1`（`_digested` 审计基线同 pin）。
