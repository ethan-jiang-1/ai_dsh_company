# 开发环：一个变更从意图到调整的操作手册

> 什么时候读：开工前定任务与授权（§0.5）、实施中选检查（§1/§9.1）、收尾交证据（§12）——其余章节按改动面查。
> 性质：指南层——"怎么操作"的展开与查表处；纪律压缩版在根 AGENTS.md。来源 = FAQ 13 `dev-loop.md` +
> `dual-home-isolation.md`（外部材料，登记见 [index.md](../index.md) §外部研究材料登记）；机制结论以
> `vendor/dsh/` 工作树为权威，旗标与行为已在**钉住的 vendor 基线**核对——基线版本与 SHA 的唯一事实家 =
> 根 `AGENTS.md` §vendor 簿记（升 pin 重校记录 = [pin-upgrade Note](../../notes/archived/2026-09-30-pin-upgrade-0.2.0-rc.2.md)）。
> 行注记 `R1`–`R5b` = 退役轮次制的历史出处标记（D11），只作 git 考古索引；与 snapshots 场景号
> （`replay/foundation-workspace`…）是两套序号，别互推。

## 0. 开发环导航

| 需要做什么 | 唯一详细位置 |
|---|---|
| 选择任务、判断授权与 Plan Mode | §0.5 |
| 实施、验证、交接 | §1；验证触发条件见 §9.1 |
| 排查运行问题 | §2（组合层→会话层阶梯） |
| 写新代码前的四问 | §3 |
| 插拔与装法速查 | §4 |
| 升级环与发布 | §5；程序唯一家 = release.md |
| 双 home 与双 DSH | §6 |
| 环境引导 | §7（= bootstrap.md 指针） |
| 驱动 Web 面会话（RPC） | §8 = [web-rpc 指南](./web-rpc.md) |
| 门禁分层与测试预算 | §9 / §9.1 |
| 自动化轻任务纪律 | §10 |
| 工具态与越界写入 | §11 |
| 更新 Notes 与收尾队列项 | §12 |
| 自主优先协议与语义审 | §13 |

## 0.5 任务入口与交接

**本仓交接（D23；任务源已由 D32 重接）**：条目默认由新对话上下文接手，这是本仓适配。按入口分支行动：

1. **明确任务**：按用户目标与授权进入对应 owner，不从任务源另取任务。
2. **继续下一条**：此时才读任务源——`notes/proposed/` 中带「批准：」标记的 RFC，以及用户在本轮明确点名的工作。未成熟的问题卡与已归档材料不是任务源；没有已批 RFC 或用户点名时，报告后停止，不从卡片或历史记录推断任务。唯一例外 = 缺陷卡 `修复就绪` 自授权通道——**边界、严重级与排除项唯一家 = [_backlog 章程](../../_backlog/README.md)「缺陷的通道」**；本节不复述（缩写即漏边界）。
3. **恢复未完成项**：读原工作记录，核对相关合同、未提交 diff 与必要现场，从已证实缺口继续。若恢复的是问题推敲，先读 [_backlog/](../../_backlog/README.md) 章程、相关 [问题卡](../../_backlog/issues/README.md) 和按需 [方法](../../_backlog/methods/README.md)；卡片状态或结论不扩大用户授权。

三种分支都只读相关 Notes（`implemented/` 与各 Note 的「输掉的方案」节里仍有效的决定与约束；被推翻/过时的研究稿在 [`notes/rejected/`](../../notes/rejected/README.md)（D30 修订设立——2026-09-25 的「不设目录」裁断已废），需要时一并读），不扫全树。行动前确认结果、owner、范围和验收；用户指令定义目标和授权，合同定义预期，Note 解释取舍，实现与日志证明实际。发生冲突时查关联决定并做区分“实现缺陷/事实过期”的窄检查；关键需求或授权仍不明确时先问人。扩大范围或遇到未授权的关键选择，先确认。

**先澄清问题，再形成 RFC**：问题、用户结果、范围或验收尚未明确时，按 [_backlog/issues/](../../_backlog/issues/README.md) 与其 [按需方法](../../_backlog/methods/README.md) 推敲；把短结论记在问题卡，长依据放 [research](../../_backlog/research/README.md)。简单问题可简写；大问题先列粗粒度判断依赖，只细化本轮分支；能独立决定和关闭且结果/触发不同的事项才拆卡。问题卡收敛后，如需下游处理，按交接方法提交并记录去向；这不自动生成 Note，也不授权实施。申请默认向用户提出；**结论未确认**留 `等人拍板`；结论已确认但下游未受理时记 `去向=用户（日期）`、可关闭；受理后落 `notes/proposed` 的 RFC 或同轮 `notes/implemented` 的 Note。准备实施的 RFC 仍遵循 [proposed 合同](../../notes/proposed/README.md)，其批准、验收与实施规则不变。

**Plan Mode（D23 本仓政策）**：feature 类任务默认先进入 Plan Mode 并用 `exit_plan_mode` 呈批，获批后按批准范围实施；用户已明确批准具体计划时不重复求批。明确授权的机械单步修正可直接做。需 Plan Mode 时用 `/plan` 进入；仅在模式中调用 `exit_plan_mode`。

**长程 goal 的目标写法（两形态 + 三类停止条件，2026-09-25 立）**：**交付型** = 「按用户指定的已批 RFC/条目清单逐条实施」（有界 = 清单空即收口）；**打磨型** = 预算（时间／轮次）+ 输入源（执行期审计发现 + 用户点名继续澄清的 [_backlog/issues/](../../_backlog/issues/README.md) 问题卡——产出 = 有依据的问题结论或具体阻塞，不是开工）+ 枯竭即收口。停止条件三类写进 objective：预算耗尽 → 自评收口；清单／输入源空 → 收口并报告；真卡住（机制证伪／验收无法变绿／需人裁决）→ 停并报阻塞与证据，不硬闯。节奏 = 每条一个 commit + push，每完成一条简报（简报带「资产增量」一行：本轮测试/门禁/场景/夹具涨了什么，没涨如实写——2026-10-06 RFC test-asset-harvest；形状并入 §12 轮次回执（2026-10-08））。objective 引用条目/授权原文（不自拟、不扩围）——扩围即回授权，不改写 objective 了事（2026-09-28 借 FAQ 15：机制存在 ≠ 被使用）。

## 1. 执行链：从授权到有证据交接

§0.5 负责选任务、授权和解决事实冲突；这里从目标、owner 与验收明确后开始：

1. **定切片**：点明本次改动、非目标与验收。多步任务用 `todo_write` 跟踪并随用户反馈调整；机械单步可省。
2. **最窄实施**：只改拥有该事实的合同/实现，不顺手扩范围。`vendor/dsh/` 只读（见根 `AGENTS.md`）。
3. **选证据**：运行能因本次回归失败的最窄检查，再按受影响面补真实入口；触发条件见 §9.1。静态结构检查不证明运行行为。
4. **同步事实**：docs 只写当前合同；仅在出现新决定、约束或关键验证时新增/更新 Note。既有事实变化时更新其 owner，不复制全文到多处。
5. **交接**：逐项报告已完成、未验证、未完成及其证据/下一步。任务只有完成验收后才算收口；`_backlog` 卡的关闭与离场按其**自身条件**（结论 + 交接去向已记录即可，不等实施验收），规则唯一家 = [_backlog/README](../../_backlog/README.md)。只报告实际执行过的命令。

完成定义是该面的最小真实检查通过（D15）；未跑的关键验收明确标缺口。按改动面选择检查与入口验证，细则唯一见 §9.1；结构检查不能替代运行验收。
**证据不许假绿**：命令链一律 `set -o pipefail` + `&&`——`pnpm verify | tail` 的退出码是 `tail` 的，不带 pipefail 必假绿。
**呈现即验证（2026-09-30 立，用户裁定）**：凡「启动给我看 / 呈现给我」类请求——起观察窗、交付 URL、演示一个面——**先自己跑通，红了当场修，全绿才呈现**；用户不当第一次验收员。观察窗的最小真检查与操作程序 = [web-window-ops skill](../../.agents/skills/web-window-ops/SKILL.md)（规则源 = [demo.md §前置](../demo.md)）；真模型面另加一轮真实会话。修不动时如实报告卡点与已排除项，不硬呈现半红的东西。

**交付记录**：feature 或非平凡变更同 diff 更新实现、当前合同、必要验证与 Note；机械单步只改事实 owner 并运行相关检查，不新建意图或 RFC。

**完成判断链（四不等式；2026-10-07 立以收口"门禁全绿即完成"错觉）**：**挂得上 ≠ 行为对 ≠ 装得上 ≠ 已获批**——
四条各需独立观察，前一条绿不豁免后一条：挂载 = `preset-smoke`；行为 = 该面场景/判据（§9.1 选层）；
安装 = `release-smoke`（发布/导出面变更时）；批准 = 语义审（§13 最小清单）+ 用户验收（§12 对照授权原文）。
机器全绿只证断言通过，不证「做的是不是这件事」——每层的证明边界唯一家 = [testing.md §1](../testing.md)。

## 2. 调试阶梯（组合层 → 会话层，不跳层）

行为不符预期时按序排查。demo **现场**的症状→动作表另见
[budget-and-ops.md](./budget-and-ops.md) §3；本阶梯用于开发插件本身时的排查。

| 层 | 手段 | 核对什么 |
|---|---|---|
| 1 组合层 | `pnpm dsh --profile <p> --dump-config` | 打印最终组合树，确认"我以为挂上的行"真的在、config 是我以为的；层级顺序 bundle → profile patch → home patch → `--patch` overlay（`vendor/dsh/apps/cli/src/dump-config.ts`）。⚠ patch 语法两条（`- id:` 替换 / `- insert:` 新增）唯一家 = §4 |
| 2 装载层 | preset 装不上时看 roster 报错 | roster **连原因一起列出**（fail-loud），报错即诊断，不静默跳过 |
| 3 生效层 | 改 patch 行后要不要重启 | 自定义 profile 的 user patch 层**热重载**（长驻面默认开）；headless/sdk 一次性成型，调试它们要重启（`vendor/dsh/packages/boot/app-boot/src/profile.ts`） |
| 3.5 **退出层（R1 实证）** | **症状"任务似已跑完但进程不退 + stdout 零输出"→ 先查 `patchReload`** | **自定义 profile（非 shipped 名字）默认 `'live'`**（源码注释："Custom profiles retain the historical live patch-file behavior"）——live watcher 常驻，一次性 headless 任务跑完进程也不退、stdout 不 flush。修法：profile 的 package.json 改 `"patchReload": "startup"`。shipped 名字（headless/web/sdk…）走模板不受此扰。第一分叉点永远是 **shipped 名字 vs 自定义名字** |
| 3.6 **表面层（R1 实证）** | **症状"角色没入戏 / persona 不生效"→ 先问跑在哪个面** | **preset 只在 Web 面挂载**：只有 `web-app` 组合 `session-controller`（其 `composeAgent` 负责"未指定 preset 时挂 default"），headless / sdk / acp 的一次性驱动直接经 core agent registry 建 agent、**绕过 preset**。所以在 headless 里验角色内容永远失败，换 Web 会话（选 preset）验证 |
| 3.7 **工具面层（R1 实证）** | **症状"角色会话只能协调、不能读写文件 / 加载 skill / 写交付物"→ 查 preset 是否声明了工具行** | preset composition 是**自包含**的：工具行不随 profile/bundle 继承（shipped `standard` 自己声明全部工具行）。查证手段：**会话日志 `request/header.tools`** 列出的工具名（`--dump-config` 看不出来——它只打印 profile 树）。⚠ 会话日志是**多 frame zstd**：Node `zstdDecompressSync` 只解第一 frame（读到 200 字节就停），用 `zstd -d -c`（homebrew）读全量 |
| 3.8 **Web RPC 层（R1 实证）** | **UI 静默失败（"新建会话没反应"）→ 直接打 `session/create` RPC 拿真实错误** | UI 不显示 preset mount 失败；RPC 会返回 `agent-preset/invalid` + 具体行与缺失字段（R1 实证：工具行缺必填 config，如 `tool-fs-search.sampleOverCapGlobResults`、`tool-todo.allowParallelInProgress`——**抄 shipped preset 的行要连 config 一起抄**）。驱动方法见 §8 |
| 3.9 **客户端模块层（R1 误诊 → R2 更正，postmortem 0003）** | **症状"整窗只剩 HARNESS / Failed to load plugins 错误屏"→ 某个 client 入口 apply 抛错，砖的是全 app** | ① client 入口失败**不静默**：BootPage 错误屏 + 浏览器 console 有 `failed to apply loader entry <id> (<name>)`；先跑 `node checks/smoke/client-load-smoke.mjs`（headless 浏览器断言零挂载失败 + 品牌在场）。② `dsh.client.inject` 是 **informational only**（vendor `packages/client/AGENTS.md`）：不排序、不 gate 加载——"inject 引用了不在 entries 里的包" ≠ 挂不上；shell baseline（`platform.ts` 的 `PLATFORM_MODULES`：react/cordis/store/ui-slots/ui-primitives/ui-dockkit）隐式回答这些名字（R1 曾据此误诊"官方 Team UI 挂不上"，实为可用）。③ 真正"挂不上但没报错"的形态是 fiber **PENDING**（声明的服务无人提供，无超时，贡献安静不出现）。④ 复用别人已挂的贡献（如官方 Team remote）：走服务 inject 等它，**别重复 `$mount`**——同一描述符挂两次 = `already mounted` = 全 UI 砖（2026-09-22 实证） |
| 4 会话层 | 读会话 JSONL，不猜；先跑 `pnpm diagnose` 拿失败摘要 | model-visible ⟺ logged：上下文组装问题从日志（`$DSH_HOME` 下 sessions）重建；读不全 = 欠了 §3 第②问的债。⚠ bash 沙箱对会话文件有**间歇视图抖动**（列出得、打开不得），且 headless 会话收尾会删目录——分析要趁进程活着时做（R1 实证） |
| 5 回归层 | snapshot 重放（R5a 起） | `snapshots/`；回答"行为为什么变了"的最快路径 |

诊断方法论补一条（R1 血泪）：**栈采样先于二分**——`sample <pid> 3` 看主线程：kevent 空转 = "等一个不会来的事件"，
CPU 满载 = 死循环；比砍配置二分快得多（R1 三刀二分全白切，问题在 profile 形态默认值而非内容）。

一次性实验不落盘：`pnpm dsh --profile <p> --patch ./run/try-x.patch.yml`——`--patch` 是
"profile 层之后再叠一层"的可重复旗标（`vendor/dsh/apps/cli/src/args.ts`），风险半径一次
进程，连 dev home 都不落。指令层的同款临时叠加 = `AGENTS.local.md` / `CLAUDE.local.md`
（vendor `packages/context/agent-instructions` 支持）——不动 git 的本地叠加，调试/演示现场用；
长期规则必须给它正式的家，不留 local 叠加里。


**进程内查询（rc.2 收割）**：角色会话里 `cordis_inspect_list` 发现 Inspect Provider 与方法、
`cordis_inspect_query` 按 schema 精查挂载与 Config（preset 已挂 `tool-cordis` 行）；组合层另有
`dsh --dump-config-schema` 自描述配置 schema——三者回答"这台进程现在真跑着什么"（对照 §5 升 pin 扫描）。
⚠ inspect 是**可见性工具，不是授权边界**（vm 只防意外全局污染，不替代 sandbox/approval）——「查得到」不等于「被授权」（FAQ 07 四边界；2026-09-27 补）。
## 3. 设计四问（R3+ 写第一行 JS 前必答）

| 问 | 判据 | 本 repo 落点 |
|---|---|---|
| ① 占哪个 ctx 键 / 发哪些事件 | 每个新能力一个自己的键，`inject` 声明依赖，不劫持别人的 | company-pack `src/` 的设计节 |
| ② 模型会看见什么新状态 | **日志税**：每个新的模型可见输入配 `SessionEventMap` 成员（并定 `ignorable`），否则 JSONL 回放不出来 | [architecture.md](../design/architecture.md) §8 已预警；漏了在第 5 阶段以"日志读不全"还债 |
| ③ UI 走哪层 | presenter 纯函数 → `tool.call.toolview` 槽 → `dsh.client.inject`，不一步到顶 | [ui-demo.md](../design/ui-demo.md) 分层（D6） |
| ④ 证据是什么 | **红/场景先行**（2026-10-04 升格）：机制面 = 实现前那个测试已写且红；行为/UX 面 = 场景先立（Given/When/Then + 判据点名）；口头担忧第二次提起 → 立卡或明确否决，不留复发性话题 | 该变更的 Note"需验证什么"；场景规格写在该变更自己的 Note 或探针头注 |

## 4. 插拔速查

装法（按离源码远近）：

| 装法 | 命令 | 用途 |
|---|---|---|
| workspace 直跑 | `source run/env.sh && pnpm dsh --profile headless "…"` | 日常开发，改配置即刻生效 |
| patch overlay | `pnpm dsh --profile <p> --patch ./run/try-x.patch.yml` | 一次性实验某插件行，不落盘 |
| **公司 overlay（headless 动议）** | `pnpm dsh --profile headless --patch ./run/company.overlay.yml "…"` | 无 web-app 行的组合里补公司行（insert 语法）；R1 用它验过全组合 |
| profile 内持久（dev = link:） | `pnpm dsh plugin --profile <p> add link:./packages/company-pack` | **日常开发**：符号链接指仓库源码，内容改动即刻生效；store/cache 由 profile `.npmrc` 钉在 repo 内 |
| profile 内持久（真实形状） | `pnpm dsh plugin --profile <p> add file:./packages/company-pack` | 仅验证真实安装形状——归 R5a release-smoke（干净 profile；`plugin` 子命令把参数转发给 profile 目录里的 pnpm） |
| 正式分发 | `pnpm dsh plugin --profile <p> add <npm-name>` | 用户视角；CI 测兼容矩阵 |

⚠ overlay 语法（R1 实证）：`- id:` **只替换已有行**（not found 会警告丢弃）；**新增行必须
`- insert:` 子列表**（教义源自 shipped dsh-headless/dsh-web-app 的 cordis.patch.yml）。

拔法（从轻到重）：会话不挂 preset → patch 行 `disabled: true`（行还在，Loader 每次 mount
求值）→ 卸载（registrations are effects，无残留）。异常时先 `--dump-config` 对照实际组合
再下结论。

## 5. 升级环与发布纪律

升级环（AGENTS.md 纪律的展开；执行器 `tools/sync-dsh.mjs`，R5a 建——默认检查簿记一致，`--pin <tag>` 走完整程序）：

```text
vendor/dsh 换 tag → 记 SHA 簿记（AGENTS.md）→ typecheck → 合成回放全绿（本仓只有 headless 合成场景，公司行为回放已移私有仓，见 [快照合同](../../snapshots/README.md)；
  政策家 = docs/testing.md §4）→ compatibility 矩阵加列 → 真实安装冒烟
```

升 pin 重校含**旧机制引用扫描**：`grep` 仓内文档对已退役／改名机制（旧工具名、旧包名、旧行形态）的
引用——换基座实证三处漂移（pack README 旧 bundle 行模型／ui-demo 旧 `cordis_inspect` 形／R5 待办过时，
2026-09-25 收割）。**发布程序、人审三项、依赖姿态、兼容矩阵与版本/触发纪律的唯一家 = [release.md](../release.md)**
（本节原载的发布时点表已全部落地为历史，OpenSpec 触发条件随迁 release.md；原文在 git 与各轮 Note）。

## 6. 双 home 与双 DSH 操作细节

机制与崩溃半径见 FAQ 13 `dual-home-isolation.md`（外部材料）；本 repo 已落 `run/env.sh`。操作面四条：

1. **环境兜底优先**：一切会话先 `source run/env.sh`（`DSH_HOME=<repo>/runtime/harness-home`）；
   agent 不会自己想起双 home 的区别，靠环境不靠提醒。
2. **dev home 配一次 key**：凭据按 home 隔离，`runtime/harness-home/.credentials.yaml` 自己配
   一次 `DEEPSEEK_API_KEY`（或接受真实 API 测试 self-skip）。
3. **迁移方向**：成品先在 dev home 验过；迁日用 `~/.dsh` 是"装正式包"，不是拷目录。
4. **双 DSH（代码层）**：`pnpm dsh` 走 `vendor/dsh` 源码（钉住 tag）；PATH 里的裸 `dsh`
   是日用全局安装，版本随全局升级漂移——**三处同版是巧合不是保证**（别在此处写死版本号；
   基线版本唯一见 `AGENTS.md` §vendor 簿记）。验证一律 `pnpm dsh`；`env.sh` 已把裸 `dsh` 设为拦截提醒（bypass：`command dsh`）。
   注意 `DSH_HOME` 只护数据层：source 过 env.sh 后裸 `dsh` 也落在 dev home，但跑的
   仍是全局代码。
5. **新 shell 陷阱（R1 实证 + R4 更正）**：任何 `pnpm dsh` / `node bin.ts` 调用前必须先 `source run/env.sh`，
   否则**静默**落日用 home `~/.dsh`（写 profile、装包都进日用数据；R1 实证一次未 source 的 `plugin add` 被
   沙箱 EPERM 拦下——沙箱是最后防线，不是第一防线）。⚠ **coding 会话里 `DSH_HOME` 是继承且带值的**
   （值 = 日用 home `~/.dsh`，实测不 source 直接 `echo $DSH_HOME` 可证）——后果比"没设"更坏：脚本里
   "未设则报错"的防线**根本不触发**，会安静地拿日用 home 的会话库当输入。所以：**判据/审计类脚本一律接入
   `tools/lib/runtime-home.mjs`**（启动前拒绝日用目录、重叠路径及其符号链接；接入清单 = 各脚本自己的 import，
   `rg -l runtime-home checks tools -g '*.mjs'` 即得——**别在文档里列名单**，实测名单必漂）；
   `deliverables-check` / `release-smoke` / `entry-probe` / `snapshot-motion` 均已调用 `requireDevHome`，
   `sync-dsh --pin` 也要求隔离 home；守卫不涵盖未接入该 helper 的任意脚本，也不防守检查后的并发符号链接替换。
6. **端口与实例隔离（部署事实）**：headless 形态（探针/动议）**无端口**——单次任务
   进程，stdout 出结果，日志落 `$DSH_HOME/sessions/`。web 形态（观察窗）起**本地**
   HTTP 端口（值见启动横幅）；因 `DSH_HOME` 指 dev home，它与日用 DSH 的 web 实例
   （若同时开）是两个完全独立进程：profile、会话、凭据、端口互不可见。
7. **排练场 ≠ 运行场**：排练/探针会话的默认 cwd 是 `runtime/rehearsal-workspace/`（`node tools/rehearsal-init.mjs`
   幂等成型；preset/probe/handbook/delegation 探针已默认指这里并会自建，`--cwd` 可显式覆盖）。
   **真盘 `company-workspace/` 只收真实动议的产物**——排练产物不受三态判据约束（`drafts/` 本就不需要
   `present`），跑在真盘会安静积污（实测删过 15 份）；验收判据 = 新默认跑一次探针后
   `git status --porcelain` **无新增**（bundle 整树 gitignored，不进 git）且
   `find company-workspace -type f | wc -l` 与跑前一致（ignored 的本地过程稿也要看，否则这层会漏成“零改动”）。
   排练场里手册是指向真盘的**符号链接**（注入基线不变），
   CHARTER/org/templates 每次刷新，**journal 不镜像**（排练记忆不混真记忆）；`snapshot-motion` /
   `deliverables-check` 默认仍指真盘——归档与审计本来就属于运行场。
8. **沙箱后端探测**：`env.sh` 实跑一次 `sandbox-exec` 探测，**不可用则自动导出 `DSH_PERMISSION_MODE=danger-full-access`**
   （macOS 26 本机禁了 Seatbelt；不落则每条 bash 都退化成「请求升级」，连 `ls` 也一样）。探测结果**明示**（stderr 一行取舍）；
   逃生阀 = `DSH_SKIP_SANDBOX_PROBE=1` 或自行设 `DSH_PERMISSION_MODE`；后端恢复自动回到 `workspace-write`。
   理由、输掉的方案与红绿证据见 [sandbox-backend-probe](../../notes/implemented/2026-10-10-sandbox-backend-probe.md)。

## 7. 环境引导（配方已迁 [guides/bootstrap.md](./bootstrap.md)）

冷启动引导（clean checkout → 可跑通：submodule / install / 双面构建 / 装包）与全部实证坑的
**唯一家 = [bootstrap.md](./bootstrap.md)**（2026-09-27 自本节整段迁出——常驻层瘦身轮，编号保留防断链）。
何时读 = 新 clone、重建 dev home、vendor 换 tag、任何「跑不起来」的第一站；§11 的工具态重定向
纪律是引导的一部分，配合读。

## 8. 驱动 Web 面会话（RPC）

唯一家 = [web-rpc 指南](./web-rpc.md)（2026-10-12 自本节整段迁出——常驻层瘦身轮，节号保留防断链；
§2 第 3.6/3.8 层的验证入口随它）。

## 9. 门禁分层：连通档（默认，秒级）vs 内容档（按需，分钟级）

**教训（R2）**：会话级门禁最初写成"五角色 × 三探针按 KB 事实断言内容"——串行 30 分钟没跑完，慢轮次
150s+ 会把超时判定拖垮。用户裁定：**"先要它通，对不对没那么重要。"**

**做法**：同一个门禁脚本分两档，默认快档（`checks/smoke/probe-smoke.mjs` 是范例）。

| 档 | 判据 | 成本 |
|---|---|---|
| **连通档（默认）** | 每角色一句 ping（"只回复两个字：在岗，不要调用工具"），断言四件事：① `session/create` 成功（preset 行 config 全过）② 日志出现新 `turn/end` ③ assistant 正文非空 ④ **人格进 prompt**（`system/message` 含角色标记） | 5 角色并发 **≈6s** |
| 内容档（`--full`） | 身份 / 知识 / 产出三探针，按 KB 事实与 veto 语义断言 | 5–10min，按需 |

**要点（可迁移到别的面）**：五条设计要点（"通"不考内容／从权威日志读事实／问句要短／完成信号用持久事件／慢是常态）写在范例脚本头注 = [`checks/smoke/probe-smoke.mjs`](../../checks/smoke/probe-smoke.mjs)（2026-09-26 从本节搬出，一处事实一个家）。

**门禁升格判据（2026-09-28 借 FAQ 15，防门禁膨胀）**：新门禁准入 = 那个具体错误本仓**复发过** + 可机械判定 + 负例已证会失败；语义要求（"每任务都该立卡"一类）不做成 gate——gates 本身是要维护的代码。

### 9.1 测试分层与预算（R3 立，回答"回归不能跑这么慢"）

**教训（R3）**：把"真浏览器 + 真模型 + 真 UI"的委派卡 e2e 当回归门禁——240s 都没等到（CEO persona 的
开工仪式先烧 5–6 步模型往返），且**依赖模型配合**：模型不调那个工具就永远绿不了。**这是层次放错，不是脚本写得不好。**

**分层（按"要不要模型"切，不按"重不重要"切）**：**层定义与证明边界唯一见 [testing.md §1](../../docs/testing.md)**；
本表只给**命令与预算速查**。每个脚本自己的触发条件与成本在它头注里（`// 何时跑：…`，
门禁 `script-triggers` 强制自述）——**别把逐个脚本的触发条件抄回本表**（2026-09-26 实测本表曾漏 6 个已存在脚本，而 AGENTS.md 又把
"何时跑"指回本表，成环）：

| 层 | 时间 | 跑什么（代表脚本；**它自己的触发条件在头注**） |
|---|---|---|
| 文档/结构 keyless | 秒级 | `pnpm verify`（含当前 Markdown 链接、物理行预算、裸路径、分层方向与 pin 一致性门禁） |
| **类型面 keyless** | 秒级（增量） | `pnpm typecheck`（`tsc -b` 包两面；改导出/导入签名时跑——verify 与 test 都不做类型检查） |
| **单元/组件 keyless** | 秒级 | `pnpm test` 或相关 Vitest 文件——含 UI 组件的**纯函数视图模型 + 静态渲染**（`react-dom/server`，不需要浏览器） |
| 装配 keyless | ~25s | `client-load-smoke`（真页面零挂载失败；slot 名写错会在这里炸） |
| 机制/边界（1 条 prompt） | ~30s | `delegation-smoke`（模型可见工具目录 + shadow 边界） |
| **重放 lane（第三档，无 key）** | 现行场景 ~2s | `replay-smoke`（会话日志 + sidecar；已声明 workspace oracle 的场景另比完整工作区）——要起进程，不进 `pnpm test`。真页面车道 = `ui-scene-smoke`（自起实例，~40s） |
| CLI 集成（keyless，需子进程） | 秒级 | `node checks/smoke/snapshot-motion-smoke.mjs`（真实 CLI + 临时 fixture；不进 `pnpm test`） |
| 发布形状（无 key） | 分钟级 | `release-smoke`（构建→npm pack→干净 profile→plugin add→built 入口 boot 冒烟；合同 [release.md](../release.md)） |
| 认证档（真模型） | 分钟级 | 按面选择（**逐个脚本的触发条件与成本见其头注「何时跑」**；`script-triggers` 门禁强制） |
| 行为质量档（认证） | 分钟级 | `probe --full`（内容档三探针）+ `candidate-scan-eval`（语料判据家 = testing.md §4） |

**新 Agent 首跑验收**（推荐、非强制）：有 `DEEPSEEK_API_KEY` = entry-probe-smoke（真模型认证档）；无 key = verify + test + client-load-smoke——路径与定位唯一家 = [tests/README](../../tests/README.md)。

**证明边界（每层只证明自己能观察的性质）的唯一家 = [docs/testing.md](../../docs/testing.md) §1**
（2026-10-04 立测试宪法时自本节迁入——宪法还拥有：改动面→最小证据政策（行级映射表 = [tests/README](../../tests/README.md)）、证据纪律（条数以宪法 §3
实列为准，别在此复述数字）、资产
三分法、自测轮授权、已知未覆盖面、升级地图；本节只留命令与预算）。换档先问"这一层能证明我关心的
性质吗"，不为安心堆档。

**三条硬规矩**：

1. **真模型 / 真浏览器不进迭代环的秒级回归档**：keyless 单测与结构检查保持快速；认证档仅在受影响面或验收要求时运行，不按“轮末/每轮”机械触发。需要真入口 → 写 `checks/smoke/*-smoke.mjs`，别塞进 `tests/`。**这条有机械门禁**：`tests/harness/layering.spec.ts` 扫 `tests/**`，出现 `node:child_process` / `spawn(` / playwright /
   `fetch(` / 密钥即红（已反证：塞一行 `import { spawn } from 'node:child_process'` 立刻变红）。**R5a 起另禁两条**（均双红证）：tests/
   不得 import `tools/` 下的驱动脚本（`tools/lib/` 纯逻辑库除外）；任何 vitest 配置不得把
   `checks|probes|tools` 编进测试发现——重放 lane 是第三档，只由 `checks/smoke/replay-smoke.mjs` 驱动。
2. **能做成纯函数就做成纯函数**：UI 组件把"展示事实"抽成纯函数（范本 `delegationCardModel`），
   keyless 单测直接断言它——组件层就永远不需要模型与浏览器。
3. **认证档要能"重放"而不是"重跑"**：真模型跑一次 → 会话日志归档 → 后续用归档做回放断言
   （R5a replay harness）。**重跑只在升 pin 或行为确实要改时做**；R3 的委派卡端到端（模型→工具→卡片）
   就留给 R5a 的 replay harness（试过的慢 e2e 已否决，原因见 delegation.md §6）。

**回归层预算**：`pnpm test` 的 **tests 阶段秒级**（vitest 输出 Tests 行；进程全程含 transform/imports，视缓存冷温与用例数波动——2026-10-20 实测 Tests 4–14s、全程热 5–24s / 冷 55s，不算超）。tests 阶段自身明显变大才先怀疑"有人把模型/浏览器塞进来了"，拆层而不是加超时。

## 10. 自动化只许是轻任务（硬上限，不许无限跑）

**教训（R2）**：把"跑一场五人动议"当自动化任务启动，没有预算也没有刹车——一路跑了几十步、几十条消息不见底。
用户裁定：**"自动化的任务都一定要变成轻任务，别跑得没完没了。"**

**纪律（写进所有脚本/后台任务）**：

- **先定预算再开跑**：每个自动化任务在启动前写下三个上限——**最长墙钟**、**最多轮次/工具调用**、
  **最多输出量**；到限即停并汇报"跑到哪、还差什么"，不许"再跑一会儿看看"。
- **能 ping 就别跑全套**：门禁默认连通档（§9）；只有明确需要内容结论时才升档，且升档也要带上限。
- **可中断**：长任务必须能被取消（web 会话用 `session/cancel`；teammate 各自的 turn 要逐个取消），
  取消后**用已有产物收口**，不重跑。
- **一次一件事**：多智能体编排（spawn teammate / 多轮互审）只在人工在场、明确要求时启动；
  绝不放进无人值守的自动流程。
- **收口优先**：任务已产出关键证据（文件/事件/日志）后，剩余步骤要么用"只做收口"的受限指令
  （明确禁新调研、给工具调用上限），要么人工接手——不要为了"跑完整"再放开跑。

## 11. 工具态与越界写入（2026-09-23 立）

**教训（R4→R5a 轮间）**：断网弄坏 dev profile 后，离线恢复要写 pnpm 的 registry 元数据缓存（默认在
`~/Library/Caches/pnpm`，workspace 之外）——为它走过"从 store 合成元数据"的弯路与一串越界写入授权。

**原则（三条）**：

1. **repo 内 = 自由区**：仓库及其 gitignored 运行态区（`runtime/harness-home/`、`.pnpm-store/`、
   `runtime/rehearsal-workspace/`、`runtime/harness-home/cache/`）内的读写不需要任何授权。
2. **越界需求优先用"重定向"消灭，而不是申请**：凡工具要把状态写到 HOME（缓存 / store / 配置），
   **先配置重定向进仓库 gitignored 区，再首次使用**。已有落点：
   - DSH 数据层：`DSH_HOME=runtime/harness-home`（env.sh，双 home）
   - pnpm store：仓库根 `.pnpm-store/`；dev profile 的 `.npmrc` 把 `store-dir` / `cache-dir` 钉在 repo 内
   - dev profile 的 pack：`link:` 符号链接（内容改动即刻生效，重装仅在改依赖/bundle 行）
   - 排练/探针 cwd：`runtime/rehearsal-workspace/`
   **新工具进工具链时，重定向配置必须在首次使用前完成**——这是引导配方（[bootstrap](./bootstrap.md)）的一部分。
3. **确需越界（重定向覆盖不了的场景）**：先问人，一次说清"写哪个路径、为什么没有替代"；
   沙箱是最后防线（§6 第 5 条），不拿它当默认方案。

**反例**：`~/Library/Caches/pnpm` 合成元数据（2026-09-22）。清理按 etag `synthetic-from-store` 识别；
缓存与 store 必须先钉进仓库 gitignored 区。

## 12. 记录与收尾

**收尾的次序与判据唯一家 = [close-out-definition skill](../../.agents/skills/close-out-definition/SKILL.md)**
（八步：对照授权 → 四链点名 → 语义审 → 收割三问 → 指针收口 → 整片 revert → verify/test → 六行回执；六行回执的形状也在那里）。
本节只留**指南独有的去向规则**，不复述次序：

- **对照授权原文**（2026-09-28 借 FAQ 15；语义审四输入 = §13）——机器绿灯只证机制面，不证"做的是不是这件事"；结论一句话记进收尾 Note。
- **被证伪的已落地切片整片 revert**（实现+测试+docs+Note 同退），修正另起新条目；不做半 revert 的外科修补——半退留"文档说 A、代码是 B"漂移态，结构门禁查 HEAD 不查语义一致，抓不住（2026-09-28 借 FAQ 11）。
- 完成条目：验收通过后任务收口；`_backlog` 卡按其自身关闭条件离场（不等实施验收，规则唯一家 = [_backlog/README](../../_backlog/README.md)），证据留 Note；未完成项写清阻塞与下一步留在原处。不要把完成标记或过期环境状态堆回任务源。
- **Note 分类、生命周期与证据规则** = [notes/README.md](../../notes/README.md)（D35；本节不复述）。



**流程规则**：

- 任务入口、授权与 Plan Mode 适用条件唯一见 §0.5；多步任务的 todo 规则见 §1。
- 默认遵循钉住的 DSH 纪律；vendor 原文是权威，本仓适配按 D 号记录约束与证据。根 `AGENTS.md` 只提供纪律落点索引，不是逐源清单。升 pin 时按 [release.md](../release.md) 重校流程合同。
- 按改动面选择验证（§9.1）；结构门禁不替代运行验收。入口探针机器通过不等于语义审阅通过。
- 新门禁反证的操作口径 = **只回滚实现、保留新测试**——连测试一起回滚会得全绿假象；红→还原→绿三步留证。
- 收到人审/用户反馈：成立就修复并补证据；不成立用技术事实反驳，**不作表演式同意**。
- 条目收尾后可派**中立体清扫**（独立子代理；输入 = diff + 收尾 Note + 关联卡；扫与修分家），清单不另写 Note。
- 文档卫生按指导价值：移除失效/重复指令与无行动价值的历史噪声；保留仍指导当前决策、解释约束或支持复验的证据。不以净减行数为目标（D26）。
- **授权链与时间轴（intents.md 已退役，D34 2026-10-04）**：授权线索（用户点名/裁定原话）记在**对应 Note 的状态行**；时间轴 = `notes/implemented/` 文件名日期 + git log。月度冻结表已在 2026-10-09 清扫中删除（那是账本身）。退役理由 = 第三本账与 Note 双写、膨胀病史三次、违反上游 no-index 教义（vendor notes README）。
- **push 落点**：`origin` 已指向 `ssh://git@ssh.github.com:443/ethan-jiang-1/ai_dsh_company.git`（22 端口被拦），`git push origin master` 直接用；命令链纪律 = §1（证据不许假绿）。push 由 **pre-push hook 强制跑全量 `pnpm verify` + `pnpm test`**（verify 2026-09-27 立；test 09-28 加，不进 CI 的定界见 [n7-ci-narrowing](../../notes/implemented/2026-10-09-n7-ci-narrowing.md)；接线 = `source run/env.sh` 幂等设 `core.hooksPath`；bypass = `--no-verify`，用后须在收尾 Note 说明原因）。
- **工作区收敛（2026-10-12 入轮末）**：收尾跑 `node tools/converge.mjs`（无参 = 计划模式）——有 ✓ 可收敛 slug 就逐个 `--slug` 收敛（证据副本/归档家/台账自动），再 `--charter-backfill` 补历史纪要；政策家 = snapshots/README §归档动作。
- **复盘一问：本轮有没有 agent 遵守的"未成文规则"**（从代码模式推断出的伪规则，跨会话会扩散）？三选一收口：升格 verify 门禁 / 写进 owner Note / 显式作废——规则不留空气（2026-09-28 借 FAQ 11）。

## 13. 自主优先协议（2026-09-26 立，用户令；D29）

> 依据 = 用户原话归纳：「尽量遵循 DSH 的研发流程」「尽量想办法自主解决问题（探索、借鉴成熟 DSH 插件思想，
> 尤其是下载量大、影响力够的）」「阶段感觉可以了、不得不让人介入 REVIEW 时再 REVIEW——其实有些 REVIEW
> 你是可以自主做的」。适用 = 开发代理对维护者（手册「待办」/问询节流是同精神条款，本节不替代它）。

**三条规矩**：① **遵循 DSH 研发流程**（D13/D23 已立，纪律表 = 落点索引，本节不重复）；② **自主解决问题**——
动手发明前**先探索**，优先借鉴**成熟 DSH 插件**（下载量 / 影响力够 = 门槛）的既有思想与形状（D13
「优先现成载体、提 seam 不自建」的问题面延伸；探索产物按 research 层生命周期落盘）；③ **REVIEW 分级**——
能自主审的**自主审**（独立子代理盲审 / 中立体清扫 / code-review 双轴），**阶段收口、不得不人审时才人审**，
人审形状 = 下述四件套。

**语义审最小清单（自主审的执行形状，2026-10-07 立——此前「机器通过≠语义通过」只有边界声明没有
形状，entry-probe 历次答卷全标「语义审阅：未执行」（截至首例前 24 次，grep 实数）即空转实证）**：审者（独立子代理盲审或收尾自查）
带四样输入**重读当前 diff**（不沿用旧结论）：① 授权/验收原文——做的是不是这件事；② 该面合同
文档——docs 只写 now，同 diff 更新了吗；③ 证据选层——选的检查能证明承诺的性质吗（testing §1 边界）；
④ Note——决定/备选/真证据齐吗。输出 finding 带「缺陷/位置/影响/证据」，blocker 与建议分开；机器
已可靠拒绝的格式问题不复报。审过什么、发现什么，一句话记进收尾 Note。

**拉人前自检三问**（全部「是」才许拉人）：① 机器能判的都判了吗（门禁/探针/自主评审全绿——D15，拉人 = 最后一道真检查、一次到位）；② 剩下的判断是不是只有人能做（品味/心智模型/授权裁决）；③ 实例与落点备好了吗（四件套下）。

**人侧请求的唯一合法形状（四件套，缺一 = 违规）**：
① **跑起来的实例**（URL 或一行能起的命令；token 每进程一份从启动横幅读，端口是环境状态）；
② **单页走查单**（看哪里 / 点什么 / 判什么 / 约几分钟，精确到落点——「你去体验一下」类无实例无落点请求 = 违规）；
③ **一次一件事**（一张卡只放同一性质的决定，上下文备到一眼可决——同手册问询节流）；④ **收尾留动作**（每轮收尾给人一个明确的最小动作，或明说「无事可做」）。

**节奏**：默认自主推进到「差不多」，收口点一次性拉人体验；反馈 → 修 → 机器复验 → 有新东西才给新实例。
本节不改变 §0.5 的授权规则，只规定自主的**方法**与拉人的**形状与时点**。
