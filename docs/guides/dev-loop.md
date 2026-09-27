# 开发环：一个变更从意图到调整的操作手册

> 性质：指南层——"怎么操作"的展开与查表处；纪律压缩版在根 AGENTS.md。
> 来源：FAQ 13 `dev-loop.md` + `dual-home-isolation.md`（repo 外研究材料，落点登记见
> [index.md](../index.md) §外部研究材料登记）；机制结论以 `vendor/dsh/` 工作树为权威，
> 本篇引用的旗标与行为均已在**钉住的 vendor 基线**上核对——基线版本与 SHA 的唯一事实家 = 根
> `AGENTS.md` §vendor 簿记（升 pin 时的重校记录 = [pin-upgrade Note](../../notes/implemented/2026-09-25-pin-upgrade-0.1.7-rc.2.md)）。

## 0. 开发环导航

| 需要做什么 | 唯一详细位置 |
|---|---|
| 选择任务、判断授权与 Plan Mode | §0.5 |
| 实施、验证、交接 | §1；验证触发条件见 §9.1 |
| 排查运行问题 | §2 |
| 更新 Notes 与收尾队列项 | §12 |

## 0.5 任务入口与交接

**本仓交接（D23）**：队列条目默认由新对话上下文接手，这是本仓适配。按入口分支行动：

1. **明确任务**：按用户目标与授权进入对应 owner，不从队列另取任务。
2. **继续下一条**：此时才读 `ROADMAP.md` 活动队列；若仅有 ⏸，报告阻塞、触发条件与复活方后停止。
3. **恢复未完成项**：读原任务 Note，核对相关合同、未提交 diff 与必要现场，从已证实缺口继续。

三种分支都只读相关 Notes（`implemented/` 与各 Note 的「输掉的方案」节里仍有效的决定与约束——**没有 `rejected/` 目录**，2026-09-25 裁断），不扫全树。行动前确认结果、owner、范围和验收；用户指令定义目标和授权，合同定义预期，Note 解释取舍，实现与日志证明实际。发生冲突时查关联决定并做区分“实现缺陷/事实过期”的窄检查；关键需求或授权仍不明确时先问人。扩大范围或遇到未授权的关键选择，先确认。

**计划先落盘再执行（用户 2026-09-24 确认的工作方式）**：统筹讨论产出多条目计划时，先把结论显性化为
`notes/proposed/` RFC 与 `ROADMAP.md` 队列，再按"继续下一条"的节奏逐条实施；不以对话内共识代替落盘。

**Plan Mode（D23 本仓政策）**：ROADMAP feature 条目默认先进入 Plan Mode 并用 `exit_plan_mode` 呈批，获批后按批准范围实施；用户已明确批准具体计划时不重复求批。明确授权的机械单步修正可直接做。需 Plan Mode 时用 `/plan` 进入；仅在模式中调用 `exit_plan_mode`。

**长程 goal 的目标写法（两形态 + 三类停止条件，2026-09-25 立）**：**交付型** = 「按 ROADMAP §队列逐条执行」（有界 = 队列空即收口）；**打磨型** = 预算（时间／轮次）+ 输入源（ROADMAP §磨清单 + 执行期审计发现）+ 枯竭即收口。停止条件三类写进 objective：预算耗尽 → 自评收口；队列／输入源空 → 收口并报告；真卡住（机制证伪／验收无法变绿／需人裁决）→ 停并报阻塞与证据，不硬闯。节奏 = 每条一个 commit + push，每完成一条简报。

## 1. 执行链：从授权到有证据交接

§0.5 负责选任务、授权和解决事实冲突；这里从目标、owner 与验收明确后开始：

1. **定切片**：点明本次改动、非目标与验收。多步任务用 `todo_write` 跟踪并随用户反馈调整；机械单步可省。
2. **最窄实施**：只改拥有该事实的合同/实现，不顺手扩范围。`vendor/dsh/` 只读（见根 `AGENTS.md`）。
3. **选证据**：运行能因本次回归失败的最窄检查，再按受影响面补真实入口；触发条件见 §9.1。静态结构检查不证明运行行为。
4. **同步事实**：docs 只写当前合同；仅在出现新决定、约束或关键验证时新增/更新 Note。既有事实变化时更新其 owner，不复制全文到多处。
5. **交接**：逐项报告已完成、未验证、未完成及其证据/下一步。ROADMAP 条目只有完成验收后才离队；只报告实际执行过的命令。

完成定义是该面的最小真实检查通过（D15）；未跑的关键验收明确标缺口。按改动面选择检查与入口验证，细则唯一见 §9.1；结构检查不能替代运行验收。
**证据不许假绿**：命令链一律 `set -o pipefail` + `&&`——`pnpm verify | tail` 的退出码是 `tail` 的，不带 pipefail 必假绿。

**交付记录**：feature 或非平凡变更同 diff 更新实现、当前合同、必要验证与 Note；机械单步只改事实 owner 并运行相关检查，不新建意图或 RFC。

## 2. 调试阶梯（组合层 → 会话层，不跳层）

行为不符预期时按序排查。demo **现场**的症状→动作表另见
[budget-and-ops.md](./budget-and-ops.md) §3；本阶梯用于开发插件本身时的排查。

| 层 | 手段 | 核对什么 |
|---|---|---|
| 1 组合层 | `pnpm dsh --profile <p> --dump-config` | 打印最终组合树，确认"我以为挂上的行"真的在、config 是我以为的；层级顺序 bundle → profile patch → home patch → `--patch` overlay（`vendor/dsh/apps/cli/src/dump-config.ts`）。⚠ patch 语法：`- id:` 只替换已有行，**新增行必须 `- insert:`**（教义源自 shipped dsh-headless 的 cordis.patch.yml；R1 实证） |
| 2 装载层 | preset 装不上时看 roster 报错 | roster **连原因一起列出**（fail-loud），报错即诊断，不静默跳过 |
| 3 生效层 | 改 patch 行后要不要重启 | 自定义 profile 的 user patch 层**热重载**（长驻面默认开）；headless/sdk 一次性成型，调试它们要重启（`vendor/dsh/packages/boot/app-boot/src/profile.ts`） |
| 3.5 **退出层（R1 实证）** | **症状"任务似已跑完但进程不退 + stdout 零输出"→ 先查 `patchReload`** | **自定义 profile（非 shipped 名字）默认 `'live'`**（源码注释："Custom profiles retain the historical live patch-file behavior"）——live watcher 常驻，一次性 headless 任务跑完进程也不退、stdout 不 flush。修法：profile 的 package.json 改 `"patchReload": "startup"`。shipped 名字（headless/web/sdk…）走模板不受此扰。第一分叉点永远是 **shipped 名字 vs 自定义名字** |
| 3.6 **表面层（R1 实证）** | **症状"角色没入戏 / persona 不生效"→ 先问跑在哪个面** | **preset 只在 Web 面挂载**：只有 `web-app` 组合 `session-controller`（其 `composeAgent` 负责"未指定 preset 时挂 default"），headless / sdk / acp 的一次性驱动直接经 core agent registry 建 agent、**绕过 preset**。所以在 headless 里验角色内容永远失败，换 Web 会话（选 preset）验证 |
| 3.7 **工具面层（R1 实证）** | **症状"角色会话只能协调、不能读写文件 / 加载 skill / 写交付物"→ 查 preset 是否声明了工具行** | preset composition 是**自包含**的：工具行不随 profile/bundle 继承（shipped `standard` 自己声明全部工具行）。查证手段：**会话日志 `request/header.tools`** 列出的工具名（`--dump-config` 看不出来——它只打印 profile 树）。⚠ 会话日志是**多 frame zstd**：Node `zstdDecompressSync` 只解第一 frame（读到 200 字节就停），用 `zstd -d -c`（homebrew）读全量 |
| 3.8 **Web RPC 层（R1 实证）** | **UI 静默失败（"新建会话没反应"）→ 直接打 `session/create` RPC 拿真实错误** | UI 不显示 preset mount 失败；RPC 会返回 `agent-preset/invalid` + 具体行与缺失字段（R1 实证：工具行缺必填 config，如 `tool-fs-search.sampleOverCapGlobResults`、`tool-todo.allowParallelInProgress`——**抄 shipped preset 的行要连 config 一起抄**）。驱动方法见 §8 |
| 3.9 **客户端模块层（R1 误诊 → R2 更正，postmortem 0003）** | **症状"整窗只剩 HARNESS / Failed to load plugins 错误屏"→ 某个 client 入口 apply 抛错，砖的是全 app** | ① client 入口失败**不静默**：BootPage 错误屏 + 浏览器 console 有 `failed to apply loader entry <id> (<name>)`；先跑 `node scripts/client-load-smoke.mjs`（headless 浏览器断言零挂载失败 + 品牌在场）。② `dsh.client.inject` 是 **informational only**（vendor `packages/client/AGENTS.md`）：不排序、不 gate 加载——"inject 引用了不在 entries 里的包" ≠ 挂不上；shell baseline（`platform.ts` 的 `PLATFORM_MODULES`：react/cordis/store/ui-slots/ui-primitives/ui-dockkit）隐式回答这些名字（R1 曾据此误诊"官方 Team UI 挂不上"，实为可用）。③ 真正"挂不上但没报错"的形态是 fiber **PENDING**（声明的服务无人提供，无超时，贡献安静不出现）。④ 复用别人已挂的贡献（如官方 Team remote）：走服务 inject 等它，**别重复 `$mount`**——同一描述符挂两次 = `already mounted` = 全 UI 砖（2026-09-22 实证） |
| 4 会话层 | 读会话 JSONL，不猜 | model-visible ⟺ logged：上下文组装问题从日志（`$DSH_HOME` 下 sessions）重建；读不全 = 欠了 §3 第②问的债。⚠ bash 沙箱对会话文件有**间歇视图抖动**（列出得、打开不得），且 headless 会话收尾会删目录——分析要趁进程活着时做（R1 实证） |
| 5 回归层 | snapshot 重放（R5a 起） | `snapshots/`；回答"行为为什么变了"的最快路径 |

诊断方法论补一条（R1 血泪）：**栈采样先于二分**——`sample <pid> 3` 看主线程，kevent 空转 =
"等一个不会来的事件"（watcher/未 resolve 的 Promise），CPU 满载 = 死循环；这比砍配置二分快得多
（R1 三刀二分全白切，问题在 profile 形态默认值而非内容）。

一次性实验不落盘：`pnpm dsh --profile <p> --patch ./dev/try-x.patch.yml`——`--patch` 是
"profile 层之后再叠一层"的可重复旗标（`vendor/dsh/apps/cli/src/args.ts`），风险半径一次
进程，连 dev home 都不落。


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
| ④ 证据是什么 | "会为这次回归而失败"的那个测试，现在就点名 | 该变更的 Note"需验证什么" |

## 4. 插拔速查

装法（按离源码远近）：

| 装法 | 命令 | 用途 |
|---|---|---|
| workspace 直跑 | `source dev/env.sh && pnpm dsh --profile headless "…"` | 日常开发，改配置即刻生效 |
| patch overlay | `pnpm dsh --profile <p> --patch ./dev/try-x.patch.yml` | 一次性实验某插件行，不落盘 |
| **公司 overlay（headless 动议）** | `pnpm dsh --profile headless --patch ./dev/company.overlay.yml "…"` | 无 web-app 行的组合里补公司行（insert 语法）；R1 用它验过全组合 |
| profile 内持久（dev = link:） | `pnpm dsh plugin --profile <p> add link:./packages/company-pack` | **日常开发**：符号链接指仓库源码，内容改动即刻生效；store/cache 由 profile `.npmrc` 钉在 repo 内 |
| profile 内持久（真实形状） | `pnpm dsh plugin --profile <p> add file:./packages/company-pack` | 仅验证真实安装形状——归 R5a release-smoke（干净 profile；`plugin` 子命令把参数转发给 profile 目录里的 pnpm） |
| 正式分发 | `pnpm dsh plugin --profile <p> add <npm-name>` | 用户视角；CI 测兼容矩阵 |

⚠ overlay 语法（R1 实证）：`- id:` **只替换已有行**（not found 会警告丢弃）；**新增行必须
`- insert:` 子列表**（教义源自 shipped dsh-headless/dsh-web-app 的 cordis.patch.yml）。

拔法（从轻到重）：会话不挂 preset → patch 行 `disabled: true`（行还在，Loader 每次 mount
求值）→ 卸载（registrations are effects，无残留）。异常时先 `--dump-config` 对照实际组合
再下结论。

## 5. 升级环与发布纪律时点

升级环（AGENTS.md 纪律的展开；执行器 `scripts/sync-dsh.mjs`，R5a 建——默认检查簿记一致，
`--pin <tag>` 走完整程序）：

```text
vendor/dsh 换 tag → 记 SHA 簿记（AGENTS.md）→ typecheck → compatibility 矩阵加列 → 真实安装冒烟
```

升 pin 重校含**旧机制引用扫描**：`grep` 仓内文档对已退役／改名机制（旧工具名、旧包名、旧行形态）的
引用——换基座实证三处漂移（pack README 旧 bundle 行模型／ui-demo 旧 `cordis_inspect` 形／R5 待办过时，
2026-09-25 收割）。

发布纪律的时点表（不提前、不欠账）：

| 时点 | 必须补上 | 依据 |
|---|---|---|
| ~~现在（零 JS，R0–R2）~~ | 无——pack 无代码，不存在依赖声明错误面 | [architecture.md](../design/architecture.md) §2.1 |
| R3+（pack 有 `src/`）✅ R5a 已补 | `@deepseek-ai/cordis` + 用到的 `@deepseek-ai/dsh-*` 作 **peerDependencies**；拒绝精确钉死（pre-stable API，钉死 = 每次上游同步逼发版） | FAQ 13 research.md 生态失败样本 |
| R5a（发布）✅ 已补 | `dsh.compatibility` 矩阵；`npm pack` → 干净 profile → `dsh plugin add` 冒烟（`release-smoke`） | [ROADMAP.md](../../ROADMAP.md) R5a 行；合同 = [release.md](../release.md) |
| OpenSpec 引入 | 触发条件：**第二贡献者进场**或**向 DSH 上游提 seam**（配合 D9 走方案 B）；此前 notes/ 纪律够用 | FAQ 13 answer.md 决策 5 |

## 6. 双 home 与双 DSH 操作细节

机制与崩溃半径见 FAQ 13 `dual-home-isolation.md`（外部材料）；本 repo 已落 `dev/env.sh`。操作面四条：

1. **环境兜底优先**：一切会话先 `source dev/env.sh`（`DSH_HOME=<repo>/dev/harness-home`）；
   agent 不会自己想起双 home 的区别，靠环境不靠提醒。
2. **dev home 配一次 key**：凭据按 home 隔离，`dev/harness-home/.credentials.yaml` 自己配
   一次 `DEEPSEEK_API_KEY`（或接受真实 API 测试 self-skip）。
3. **迁移方向**：成品先在 dev home 验过；迁日用 `~/.dsh` 是"装正式包"，不是拷目录。
4. **双 DSH（代码层）**：`pnpm dsh` 走 `vendor/dsh` 源码（钉住 tag）；PATH 里的裸 `dsh`
   是日用全局安装，版本随全局升级漂移——**三处同版是巧合不是保证**（别在此处写死版本号；
   基线版本唯一见 `AGENTS.md` §vendor 簿记）。验证一律 `pnpm dsh`；`env.sh` 已把裸 `dsh` 设为拦截提醒（bypass：`command dsh`）。
   注意 `DSH_HOME` 只护数据层：source 过 env.sh 后裸 `dsh` 也落在 dev home，但跑的
   仍是全局代码。
5. **新 shell 陷阱（R1 实证 + R4 更正）**：任何 `pnpm dsh` / `node bin.ts` 调用前必须先
   `source dev/env.sh`，否则**静默**落日用 home `~/.dsh`（写 profile、装包都进日用数据）。
   实证：R1 部署时一次 `plugin add` 在未 source 的 shell 里试图 `mkdir ~/.dsh/profiles/company`，
   被沙箱 EPERM 拦下（日用 home 未被污染）——沙箱是最后防线，不是第一防线。
   ⚠ **R4 更正一处过期表述**：这里原先写"`DSH_HOME` **不继承**"。那只在**普通终端**成立。
   在 **DSH 的 coding 会话里跑 bash** 时，`DSH_HOME` 是**继承且带值的**，值就是日用 home
   `~/.dsh`（实测：不 source 直接 `echo $DSH_HOME` → `/Users/bowhead/.dsh`）。后果比"没设"更坏：
   脚本里"未设则报错"的那道防线**根本不触发**，会安静地拿日用 home 的会话库当输入。
   所以：**判据/审计类脚本要自己拒绝日用 home**。**判据/审计类脚本一律接入 `scripts/lib/runtime-home.mjs`**（在启动前拒绝日用目录、重叠路径及其符号链接；清单唯一源 = 各脚本自己的 import，`grep -l runtime-home scripts/*.mjs` 即得——**别在文档里列名单**，2026-09-26 实测旧名单只列了 6 个而实际已有 17 个）；
   `deliverables-check` / `release-smoke`、`entry-probe` / `snapshot-motion` 均在运行前调用 `requireDevHome`，拒绝缺失或与日用 home 重叠的路径；`sync-dsh --pin` 也要求隔离 home。守卫不涵盖未接入该 helper 的任意脚本，也不防守检查后的并发符号链接替换。
6. **端口与实例隔离（部署事实）**：headless 形态（探针/动议）**无端口**——单次任务
   进程，stdout 出结果，日志落 `$DSH_HOME/sessions/`。web 形态（观察窗）起**本地**
   HTTP 端口（值见启动横幅）；因 `DSH_HOME` 指 dev home，它与日用 DSH 的 web 实例
   （若同时开）是两个完全独立进程：profile、会话、凭据、端口互不可见。
7. **排练场 ≠ 运行场（轮间待办②，2026-09-22 落地）**：排练/探针会话的默认 cwd 是
   `dev/rehearsal-workspace/`（`node scripts/rehearsal-init.mjs` 幂等成型；排练/探针脚本（清单见各脚本头注「何时跑」）
   `preset/probe/handbook/delegation` 已默认指这里并会自建，`--cwd` 可显式覆盖）。
   **真盘 `company-workspace/` 只收真实动议的产物**——排练产物不受三态判据约束
   （`drafts/` 本就不需要 `present`），跑在真盘会安静积污（R4 W2 删过 15 份）。
   验收判据 = 新默认跑一次探针后 `git status --porcelain company-workspace/` 为空。
   排练场里手册是指向真盘的**符号链接**（注入基线不变），CHARTER/org/templates 每次刷新，
   **journal 不镜像**（排练记忆不混真记忆）。`snapshot-motion` / `deliverables-check`
   默认仍指真盘——归档与审计本来就属于运行场。

## 7. 环境引导（配方已迁 [guides/bootstrap.md](./bootstrap.md)）

冷启动引导（clean checkout → 可跑通：submodule / install / 双面构建 / 装包）与全部实证坑的
**唯一家 = [bootstrap.md](./bootstrap.md)**（2026-09-27 自本节整段迁出——常驻层瘦身轮，编号保留防断链）。
何时读 = 新 clone、重建 dev home、vendor 换 tag、任何「跑不起来」的第一站；§11 的工具态重定向
纪律是引导的一部分，配合读。

## 8. 驱动 Web 面会话（RPC；R1 实证）

preset 只在 Web 面挂载（§2 第 3.6 层），所以**验证角色行为必须驱动 Web 面**。Web 面有 HTTP RPC，
可以脚本化建会话、发 prompt、列会话：

```sh
# ① token → cookie（cookie 按 origin 隔离：换端口/换实例都要重新换一次）
#    从响应头抓 set-cookie 显式带上——`curl -c jar` 抓不稳，别用（脚本同法 = [harvest-probe.mjs](../../scripts/harvest-probe.mjs) 的 getSetCookie）
COOKIE=$(curl -s -D - -o /dev/null "http://127.0.0.1:3081/?token=<TOKEN>" | grep -i '^set-cookie:' | head -1 | cut -d' ' -f2 | cut -d';' -f1)

# ② 建会话（带 agentPreset 即挂角色 preset）
curl -s -X POST "http://127.0.0.1:3081/api/session/create" \
  -H 'Content-Type: application/json' -H "Cookie: $COOKIE" \
  -d '{"type":"client-request","rpcId":"c1","method":"session/create",
       "payload":{"args":{"request":{"cwd":"<绝对 cwd>","agentPreset":"ceo"}}}}'

# ③ 发动议
curl -s -X POST "http://127.0.0.1:3081/api/session/prompt" \
  -H 'Content-Type: application/json' -H "Cookie: $COOKIE" \
  -d '{"type":"client-request","rpcId":"p1","method":"session/prompt",
       "payload":{"args":{"request":{"requestId":"r-1","sessionId":"<sid>","mode":"queue",
                                    "content":[{"type":"text","text":"<动议>"}]}}}}'
```

规则（都是实证踩出来的）：

- **endpoint = `<namespace>/<method>`**（斜杠，不是点；见 gateway `claimsEndpoint` 的两段校验）。
  namespace 来自服务键：`session-controller` → `session`，`agent-presets` → `agentPresets`。
- **信封固定** `{"type":"client-request","rpcId":…,"method":…,"payload":{"args":{…}}}`。
- **`args` 是位置参数的具名对象**，名字取自源码参数名：`create(request)` → `args.request`；
  `list(_request, signal)` → **`args._request`**（占位参数的下划线也要照写）。
- 常用：`session/create`、`session/prompt`、`session/list`、`agentPresets/list`。
- **`ask_user_question` 的回答不走 RPC**（走 wire）——脚本化跑到提问就会停下等真人；此时去 UI 里答。
- 这条通道也是 R5a「web 快照 lane」的雏形。


- **读会话日志**用 `scripts/lib/session-log.mjs`（page 与事件解析的共用实现）。两个坑：`session/page`
  的 `throughSeq` 必须是**有效 seq**（`-1` 实测返回 0 条；当前游标可从越界报错 `… is past cursor N` 取），
  完成信号取**持久事件 `turn/end`**（`session/list.running` 是“会话有活着的 agent”，idle 也为 true；用它等会假超时）。

## 9. 门禁分层：连通档（默认，秒级）vs 内容档（按需，分钟级）

**教训（R2，2026-09-22）**：会话级门禁最初写成"五角色 × 三探针按 KB 事实断言内容"——串行跑
30 分钟没跑完；改并发后仍 3 分钟以上，慢轮次实测 150s+ 会把超时判定拖垮。用户裁定：
**"先要它通，对不对没那么重要。"**

**做法**：同一个门禁脚本分两档，默认快档（`scripts/probe-smoke.mjs` 是范例）。

| 档 | 判据 | 成本 |
|---|---|---|
| **连通档（默认）** | 每角色一句 ping（"只回复两个字：在岗，不要调用工具"），断言四件事：① `session/create` 成功（preset 行 config 全过）② 日志出现新 `turn/end` ③ assistant 正文非空 ④ **人格进 prompt**（`system/message` 含角色标记） | 5 角色并发 **≈6s** |
| 内容档（`--full`） | 身份 / 知识 / 产出三探针，按 KB 事实与 veto 语义断言 | 5–10min，按需 |

**要点（可迁移到别的面）**：五条设计要点（"通"不考内容／从权威日志读事实／问句要短／完成信号用持久事件／慢是常态）写在范例脚本头注 = [`scripts/probe-smoke.mjs`](../../scripts/probe-smoke.mjs)（2026-09-26 从本节搬出，一处事实一个家）。

### 9.1 测试分层与预算（R3 立，回答"回归不能跑这么慢"）

**教训（R3）**：把"真浏览器 + 真模型 + 真 UI"的委派卡 e2e 当回归门禁——240s 都没等到
（CEO persona 的开工仪式先烧 5–6 步模型往返），而且**依赖模型配合**：模型不调那个工具就永远绿不了。
**这是层次放错，不是脚本写得不好。**

**分层（按"要不要模型"切，不按"重不重要"切）**：本表给**分层原则 + 各层的代表脚本**；
**每个脚本自己的触发条件与成本在它头注里**（`// 何时跑：…`，门禁 `script-triggers` 强制自述）
——**别把逐个脚本的触发条件抄回本表**（2026-09-26 实测本表曾漏 6 个已存在脚本，而 AGENTS.md 又把
"何时跑"指回本表，成环）：

| 层 | 时间 | 跑什么（代表脚本；**它自己的触发条件在头注**） |
|---|---|---|
| 文档/结构 keyless | 秒级 | `pnpm verify`（含当前 Markdown 链接、物理行预算、裸路径与 pin 一致性门禁） |
| **单元/组件 keyless** | 秒级 | `pnpm test` 或相关 Vitest 文件——含 UI 组件的**纯函数视图模型 + 静态渲染**（`react-dom/server`，不需要浏览器） |
| 装配 keyless | ~10s | `client-load-smoke`（真页面零挂载失败；slot 名写错会在这里炸） |
| 机制/边界（1 条 prompt） | ~30s | `delegation-smoke`（模型可见工具目录 + shadow 边界） |
| **重放 lane（第三档，无 key）** | ~11s | `replay-smoke`（会话日志 + sidecar；已声明 workspace oracle 的场景另比完整工作区）；`--ui`（+真浏览器端到端）——要起进程/浏览器，不进 `pnpm test` |
| CLI 集成（keyless，需子进程） | 秒级 | `node scripts/snapshot-motion-smoke.mjs`（真实 CLI + 临时 fixture；不进 `pnpm test`） |
| 发布形状（无 key） | 分钟级 | `release-smoke`（构建→npm pack→干净 profile→plugin add→built 入口 boot 冒烟；合同 [release.md](../release.md)） |
| 认证档（真模型） | 分钟级 | 按面选择（**逐个脚本的触发条件与成本见其头注「何时跑」**；`script-triggers` 门禁强制） |

**证明边界（每层只证明自己能观察的性质）**：verify 证结构不证行为；keyless 单测证模块正例与错误，
不证装配与真入口；client-load 证挂载零失败不证内容；delegation/replay 证可见边界与组合复现，不证设计
取舍；release-smoke 证安装形状不证语义；认证档证真行为不证跨面正确。换档先问"这一层能证明我关心的
性质吗"，不为安心堆档（对照《Agent-ready Development》05 六层反馈；判定见
[harness-alignment 台账](../../notes/archived/2026-09-25-harness-alignment-ledger.md) §B）。

**三条硬规矩**：

1. **真模型 / 真浏览器不进迭代环的秒级回归档**：keyless 单测与结构检查保持快速；认证档仅在受影响面或验收要求时运行，不按“轮末/每轮”机械触发。需要真入口 → 写 `scripts/*-smoke.mjs`，别塞进 `tests/`。**这条有机械门禁**：`tests/layering.spec.ts` 扫 `tests/**`，出现 `node:child_process` / `spawn(` / playwright /
   `fetch(` / 密钥即红（已反证：塞一行 `import { spawn } from 'node:child_process'` 立刻变红）。**R5a 起另禁两条**（均双红证）：tests/
   不得 import `scripts/` 下的驱动脚本（`scripts/lib/` 纯逻辑库除外）；任何 vitest 配置不得把
   `scripts/` 编进测试发现——重放 lane 是第三档，只由 `scripts/replay-smoke.mjs` 驱动。
2. **能做成纯函数就做成纯函数**：UI 组件把"展示事实"抽成纯函数（范本 `delegationCardModel`），
   keyless 单测直接断言它——组件层就永远不需要模型与浏览器。
3. **认证档要能"重放"而不是"重跑"**：真模型跑一次 → 会话日志归档 → 后续用归档做回放断言
   （R5a replay harness）。**重跑只在升 pin 或行为确实要改时做**；R3 的委派卡端到端（模型→工具→卡片）
   就留给 R5a 的 replay harness（试过的慢 e2e 已否决，原因见 delegation.md §6）。

**回归层预算**：`pnpm test` 墙钟 **< 5s**（秒级；实测量见最近收尾 Note）。超了先怀疑"有人把模型/浏览器塞进来了"，
拆层而不是加超时。

## 10. 自动化只许是轻任务（硬上限，不许无限跑）

**教训（R2，2026-09-22）**：把"跑一场五人动议"当成自动化任务启动，没有预算也没有刹车——
它一路跑了几十步、几十条消息还不见底。用户裁定：**"自动化的任务都一定要变成轻任务，别跑得没完没了。"**

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

**教训（R4→R5a 轮间，2026-09-22）**：断网弄坏 dev profile 后，离线恢复需要写 pnpm 的 registry
元数据缓存——它默认在 `~/Library/Caches/pnpm`（workspace 之外）。为了它走了"从 store 合成元数据"
的弯路，还产生了一串越界写入授权。

**原则（三条）**：

1. **repo 内 = 自由区**：仓库及其 gitignored 运行态区（`dev/harness-home/`、`.pnpm-store/`、
   `dev/rehearsal-workspace/`、`dev/harness-home/cache/`）内的读写不需要任何授权。
2. **越界需求优先用"重定向"消灭，而不是申请**：凡工具要把状态写到 HOME（缓存 / store / 配置），
   **先配置重定向进仓库 gitignored 区，再首次使用**。已有落点：
   - DSH 数据层：`DSH_HOME=dev/harness-home`（env.sh，双 home）
   - pnpm store：仓库根 `.pnpm-store/`；dev profile 的 `.npmrc` 把 `store-dir` / `cache-dir` 钉在 repo 内
   - dev profile 的 pack：`link:` 符号链接（内容改动即刻生效，重装仅在改依赖/bundle 行）
   - 排练/探针 cwd：`dev/rehearsal-workspace/`
   **新工具进工具链时，重定向配置必须在首次使用前完成**——这是引导配方（[bootstrap](./bootstrap.md)）的一部分。
3. **确需越界（重定向覆盖不了的场景）**：先问人，一次说清"写哪个路径、为什么没有替代"；
   沙箱是最后防线（§6 第 5 条），不拿它当默认方案。

**反例存档**：`~/Library/Caches/pnpm` 合成元数据事故（2026-09-22，见
[implemented/2026-09-22-team-assembly-and-rehearsal-split.md](../../notes/implemented/2026-09-22-team-assembly-and-rehearsal-split.md)
环境状态节；清理按 etag `synthetic-from-store` 标记识别）。

## 12. 记录与收尾

按变更规模留下最少充分记录：

- 机械单步修正：更新事实 owner，跑相关检查；不新建 intent、RFC 或收尾 Note。
- 记录判据（不是 diff 大小）：需要 Note 的信号 = **存在真实替代方案 + 持久取舍**；豁免的实质 =
  除决定理由无处安放外，其余事实都已有 owner（代码、测试、现有文档能承载的不重复记）。
- 非平凡决定/feature：相关 `notes/intents.md` 与 RFC/Note 随同变更更新；记录实际决定、关键取舍、跑过的验证与未完成项。
- 完成 ROADMAP 条目：验收通过后删除队列行、更新状态指针；未完成项保留在队列并写清阻塞与下一步。不要把完成标记或过期环境状态堆回活动队列。
- Note 只记录对后续决策、实施或复验仍有用的信息；实现事实变化时更新对应 `implemented/` Note，决定逆转另写并互链。过期或重复且不再指导行动的内容删除；保留有效约束、否决理由和可复用验证证据。
- 交接说明范围、改动 owner、实际跑过的检查及结果、未验证/未完成项与下一步。仅记录会影响恢复的环境线索。

**Note 生命周期细则（2026-09-24 吸纳自 DSH Agent Note lifecycle，点选不推翻；取舍全录 =
[notes/implemented/2026-09-24-notes-lifecycle-absorption.md](../../notes/implemented/2026-09-24-notes-lifecycle-absorption.md)）**：

- **状态行**：`proposed/` / `implemented/` 新写或再编辑的 Note 首部有「状态：」行，开头即生命周期去向（proposed / implemented / 已消化…）；存量不回扫（`postmortem/` 另有约定；research 层见下条）。
- **备选必载**：proposed RFC 记「输掉的方案」；决定类 Note 保留"它击败了什么"——没记录击败对象的决定会重新引发争论（备选只记录、不编造）。
- **毕业 = 正文改写**：`proposed → implemented` 不只挪文件——提案改写成现在时的已交付事实，删迁移计划
  与未来时态，仍有维护价值的验收/风险写进「后果 / 验证」。
- **新增 Note 触发取代检查**：落盘前搜同决定、同机制的既有 owner——完整取代：吸收独有理由后旧 Note 同 diff 删除；部分取代：双方保留互链并更新仍有效的事实。
- **否决理由的去留**：随 owner Note 的「输掉的方案」节，不单开 rejected 目录（2026-09-25 裁断
  见 notebook-hygiene；原 rejected Note 形态取消）；只在仍能阻止一个可信错误时保留，防复犯价值消失即删。
- **implemented 只跟事实**：随实现更新的只有路径、名称、结构等事实；决定被推翻时另写新 Note 互链，
  不把旧文改写成相反。
- **research 层 = 未完结研究（2026-09-26 用户令修订 09-25 旧形状；原裁决 = [implemented/research-notes-lifecycle](../../notes/implemented/2026-09-25-research-notes-lifecycle.md)）**：目录语义 = TODO——只放有待跑实验 / 待答问题 / 待落地调研的稿件，首部状态行写清「喂给谁 + 毕业动作」；
  **研究落地即离场**：完结迁 `notes/archived/`（仍被引用的证据台账，可读可引但不在工作集）、过时/被推翻迁 `notes/rejected/`（负知识防复犯）——修订 09-25「不开 archived/rejected」裁断（实操反馈：隐形状态行无法一眼分辨死活，可见分类桶更有效）；无人引用的死稿直接删（git 即归档）；
  机械门禁 = `verify` 的 `research-liveness`（未完结研究必须自带户口）；索引 = research/README.md。

**流程规则**：

- 任务入口、授权与 Plan Mode 适用条件唯一见 §0.5；多步任务的 todo 规则见 §1。
- 默认遵循钉住的 DSH 纪律；vendor 原文是权威，本仓适配按 D 号记录约束与证据。根 `AGENTS.md` 只提供纪律落点索引，不是逐源清单。升 pin 时按 [release.md](../release.md) 重校流程合同。
- 按改动面选择验证（§9.1）；结构门禁不替代运行验收。入口探针机器通过不等于语义审阅通过。
- 新门禁反证的操作口径 = **只回滚实现、保留新测试**——连测试一起回滚会得全绿假象；红→还原→绿三步留证。
- 收到人审/用户反馈：成立就修复并补证据；不成立用技术事实反驳，**不作表演式同意**。
- 条目收尾后可派**中立体清扫**（独立子代理；输入 = diff + 收尾 Note + ROADMAP 行；固定清单格式与首跑样例见 [implemented/notebook-hygiene](../../notes/implemented/2026-09-25-notebook-hygiene.md) 实况）——扫与修分家。
- 文档卫生按指导价值：移除失效/重复指令与无行动价值的历史噪声；保留仍指导当前决策、解释约束或支持复验的证据。不以净减行数为目标（D26）。
- **`notes/intents.md` 的行 = 一行指针**（日期 + 一句话 + 状态 + 链接），**详情归对应 Note**——在行里复述 Note 内容是造重复事实家（2026-09-26 实测：5 天 585B → 40.5KB、≈600B/行，且与 Note 双写）。历史行只留指针，不回填细节。
- **push 落点**：`origin` 已指向 `ssh://git@ssh.github.com:443/ethan-jiang-1/ai_dsh_company.git`（22 端口被拦），`git push origin master` 直接用；命令链一律 `set -o pipefail` + `&&`（不带 pipefail 的 `cmd | tail` 退出码是 `tail` 的 = 假绿）。push 由 **pre-push hook 强制跑全量 `pnpm verify`**（2026-09-27 立，enforcement 通道；接线 = `source dev/env.sh` 幂等设 `core.hooksPath`；bypass = `--no-verify`，用后须在收尾 Note 说明原因）。

## 13. 自主优先协议（2026-09-26 立，用户令；D29）

> 依据 = 用户原话归纳：「尽量遵循 DSH 的研发流程」「尽量想办法自主解决问题（探索、借鉴成熟 DSH 插件思想，
> 尤其是下载量大、影响力够的）」「阶段感觉可以了、不得不让人介入 REVIEW 时再 REVIEW——其实有些 REVIEW
> 你是可以自主做的」。适用 = 开发代理对维护者（手册「需要你」/问询节流是同精神条款，本节不替代它）。

**三条规矩**：① **遵循 DSH 研发流程**（D13/D23 已立，纪律表 = 落点索引，本节不重复）；② **自主解决问题**——
动手发明前**先探索**，优先借鉴**成熟 DSH 插件**（下载量 / 影响力够 = 门槛）的既有思想与形状（D13
「优先现成载体、提 seam 不自建」的问题面延伸；探索产物按 research 层生命周期落盘）；③ **REVIEW 分级**——
能自主审的**自主审**（独立子代理盲审 / 中立体清扫 / code-review 双轴），**阶段收口、不得不人审时才人审**，
人审形状 = 下述四件套。

**拉人前自检三问**（全部「是」才许拉人）：① 机器能判的都判了吗（门禁/探针/自主评审全绿——D15，拉人 = 最后一道真检查、一次到位）；② 剩下的判断是不是只有人能做（品味/心智模型/授权裁决）；③ 实例与落点备好了吗（四件套下）。

**人侧请求的唯一合法形状（四件套，缺一 = 违规）**：
① **跑起来的实例**（URL 或一行能起的命令；token 每进程一份从启动横幅读，端口是环境状态）；
② **单页走查单**（看哪里 / 点什么 / 判什么 / 约几分钟，精确到落点——「你去体验一下」类无实例无落点请求 = 违规）；
③ **一次一件事**（一张卡只放同一性质的决定，上下文备到一眼可决——同手册问询节流）；④ **收尾留动作**（每轮收尾给人一个明确的最小动作，或明说「无事可做」）。

**节奏**：默认自主推进到「差不多」，收口点一次性拉人体验；反馈 → 修 → 机器复验 → 有新东西才给新实例。
本节不改变 §0.5 的授权规则，只规定自主的**方法**与拉人的**形状与时点**。
