# 60 · 开发环：一个变更从意图到调整的操作手册

> 性质：指南层——"怎么操作"的展开与查表处；纪律压缩版在根 AGENTS.md。
> 来源：FAQ 13 `dev-loop.md` + `dual-home-isolation.md`（repo 外研究材料，落点登记见
> [00-index.md](../00-index.md) §外部研究材料登记）；机制结论以 `vendor/dsh/` 工作树为权威，
> 本篇引用的旗标与行为均已在钉住 tag（dsh-v0.1.5-rc.2）核对。

## 0. 全周期速览

| 阶段 | 做什么 | 本 repo 载体 |
|---|---|---|
| 1 意图 | 一行动机 + 一行**外部可观察行为** | `notes/intents.md` 登记行 |
| 2 决策 | 摆方案、选定、**给输掉的方案留尸体** | `notes/proposed/<date>-<slug>.md` 三段式 |
| 3 设计 | decision-complete 的实施计划，人批准后才动手 | Plan Mode + §3 设计四问（有代码起） |
| 4 落地 | 窄证据切片闭环 | §1 六步；交付 = 完整垂直切片 |
| 5 调试 | 逐层排除，不跳层 | §2 调试阶梯 |
| 6 调整 | 证据驱动打磨，不重设计 | 回到阶段 1 但意图更窄；vendor 换 tag 走 §5 |
| 7 收尾 | 只报告实际跑过的检查 | §4 + `pnpm verify` |

## 0.5 新会话开工动作（轮次交接的读侧）

每轮换**全新对话上下文**执行（决策 D11）——干净的轮次上下文，不跨轮携带。新会话固定开场：

```text
AGENTS.md（自动加载）→ docs/00-index.md（台账 + 待定 Q）→ plans/roadmap.md 找当前轮
→ 有 ⛔ 先解阻塞 → Plan Mode 出 decision-complete 计划 → notes/intents.md 登记 → 开工
```

人只需要说"继续下一轮"。判断"环境/上轮就绪了什么"只读当前轮 Note 的"实际跑过的验证 +
环境状态"，不信记忆、不信聊天记录。收尾侧清单见 roadmap"轮次交接"节。

## 1. 落地：六步闭环

```text
核对现场 → 判定窄 diff → 原子修改 owner 面 → 跑最小证据 → 沉淀 gate/Note → 只报告实际跑过的检查
```

1. **核对现场**：不信任记忆，先读当前的代码/文档/日志——权威只在外部可验证状态里。
2. **判定窄 diff**：动手前说清这次动哪几个文件；"改一下 UI"不是窄 diff，"给 X 工具加一张
   卡"是。
3. **原子修改 owner 面**：每个事实一个 owner——改 preset 行不动 host 行语义，改 pack 不动
   vendor（`vendor/dsh/` 只读，簿记见 AGENTS.md）。
4. **跑最小证据**：起步 `pnpm verify` + `pnpm test`（keyless 回归）；有行为测试后只跑"会为这次
   回归而失败"的那个 + typecheck，不默认全量。
5. **沉淀**：门禁守住的事实进 docs/（只写 now），选择进 Note。
6. **只报告实际跑过的检查**：没跑的不算数。
7. **完成定义 = 该面最小"真检查"通过，且发现权在你（代理）一侧**（D15，社区与宿主复盘一致结论）：
   配置/preset 类改动 → `node scripts/preset-smoke.mjs`（**真挂载**；dump/扫描不算证据）；客户端类
   改动 → 查 boot 清单依赖闭环；`agent-instructions` 注入类改动 → `node scripts/handbook-smoke.mjs`
   （断言指令基线 = `company-workspace/AGENTS.md`，未混入开发仓库那份）；**在让用户看 UI 之前，先用机器验证过**。把"你看一眼"当验收手段
   正是宿主 [post-mortem 0003](../../vendor/dsh/docs/postmortem/0003-web-agent-gui-feedback-loop.md)
   记的失败模式（delegated acceptance to the user）。本仓两次事故的复盘见
   [`notes/postmortem/`](../../notes/postmortem/README.md)。

交付形状：一次交付 = **完整垂直切片**——配置/代码 + 验证 + docs + Note 在同一 diff；
proposed Note 在同一 diff 改写为 implemented，不留到交付后。

## 2. 调试阶梯（组合层 → 会话层，不跳层）

行为不符预期时按序排查。demo **现场**的症状→动作表另见
[50-budget-and-ops.md](./50-budget-and-ops.md) §3；本阶梯用于开发插件本身时的排查。

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
| 5 回归层 | snapshot 重放（R5 起） | `snapshots/`；回答"行为为什么变了"的最快路径 |

诊断方法论补一条（R1 血泪）：**栈采样先于二分**——`sample <pid> 3` 看主线程，kevent 空转 =
"等一个不会来的事件"（watcher/未 resolve 的 Promise），CPU 满载 = 死循环；这比砍配置二分快得多
（R1 三刀二分全白切，问题在 profile 形态默认值而非内容）。

一次性实验不落盘：`pnpm dsh --profile <p> --patch ./dev/try-x.patch.yml`——`--patch` 是
"profile 层之后再叠一层"的可重复旗标（`vendor/dsh/apps/cli/src/args.ts`），风险半径一次
进程，连 dev home 都不落。

## 3. 设计四问（R3+ 写第一行 JS 前必答）

| 问 | 判据 | 本 repo 落点 |
|---|---|---|
| ① 占哪个 ctx 键 / 发哪些事件 | 每个新能力一个自己的键，`inject` 声明依赖，不劫持别人的 | company-pack `src/` 的设计节 |
| ② 模型会看见什么新状态 | **日志税**：每个新的模型可见输入配 `SessionEventMap` 成员（并定 `ignorable`），否则 JSONL 回放不出来 | [10-architecture.md](../design/10-architecture.md) §8 已预警；漏了在第 5 阶段以"日志读不全"还债 |
| ③ UI 走哪层 | presenter 纯函数 → `tool.call.toolview` 槽 → `dsh.client.inject`，不一步到顶 | [30-ui-demo.md](../design/30-ui-demo.md) 分层（D6） |
| ④ 证据是什么 | "会为这次回归而失败"的那个测试，现在就点名 | 该变更的 Note"需验证什么" |

## 4. 插拔速查

装法（按离源码远近）：

| 装法 | 命令 | 用途 |
|---|---|---|
| workspace 直跑 | `source dev/env.sh && pnpm dsh --profile headless "…"` | 日常开发，改配置即刻生效 |
| patch overlay | `pnpm dsh --profile <p> --patch ./dev/try-x.patch.yml` | 一次性实验某插件行，不落盘 |
| **公司 overlay（headless 动议）** | `pnpm dsh --profile headless --patch ./dev/company.overlay.yml "…"` | 无 web-app 行的组合里补公司行（insert 语法）；R1 用它验过全组合 |
| profile 内持久 | `pnpm dsh plugin --profile <p> add file:./packages/company-pack` | 验证真实安装形状（`plugin` 子命令把参数转发给 profile 目录里的 pnpm；R5 门禁化） |
| 正式分发 | `pnpm dsh plugin --profile <p> add <npm-name>` | 用户视角；CI 测兼容矩阵 |

⚠ overlay 语法（R1 实证）：`- id:` **只替换已有行**（not found 会警告丢弃）；**新增行必须
`- insert:` 子列表**（教义源自 shipped dsh-headless/dsh-web-app 的 cordis.patch.yml）。

拔法（从轻到重）：会话不挂 preset → patch 行 `disabled: true`（行还在，Loader 每次 mount
求值）→ 卸载（registrations are effects，无残留）。异常时先 `--dump-config` 对照实际组合
再下结论。

## 5. 升级环与发布纪律时点

升级环（AGENTS.md 纪律的展开；做成一个脚本 `scripts/sync-dsh.mjs`，R5 建）：

```text
vendor/dsh 换 tag → 记 SHA 簿记（AGENTS.md）→ typecheck → compatibility 矩阵加列 → 真实安装冒烟
```

发布纪律的时点表（不提前、不欠账）：

| 时点 | 必须补上 | 依据 |
|---|---|---|
| 现在（零 JS，R0–R2） | 无——pack 无代码，不存在依赖声明错误面 | [10-architecture.md](../design/10-architecture.md) §2.1 |
| R3+（pack 有 `src/`） | `@deepseek-ai/cordis` + 用到的 `@deepseek-ai/dsh-*` 作 **peerDependencies**；拒绝精确钉死（pre-stable API，钉死 = 每次上游同步逼发版） | FAQ 13 research.md 生态失败样本 |
| R5（发布） | `dsh.compatibility` 矩阵；`npm pack` → 干净 profile → `dsh plugin add` 冒烟 | [roadmap.md](../plans/roadmap.md) R5 |
| OpenSpec 引入 | 触发条件：**第二贡献者进场**或**向 DSH 上游提 seam**（配合 D9 走方案 B）；此前 notes/ 纪律够用 | FAQ 13 answer.md 决策 5 |

## 6. 双 home 与双 DSH 操作细节

机制与崩溃半径见 FAQ 13 `dual-home-isolation.md`（外部材料）；本 repo 已落 `dev/env.sh`。操作面四条：

1. **环境兜底优先**：一切会话先 `source dev/env.sh`（`DSH_HOME=<repo>/dev/harness-home`）；
   agent 不会自己想起双 home 的区别，靠环境不靠提醒。
2. **dev home 配一次 key**：凭据按 home 隔离，`dev/harness-home/.credentials.yaml` 自己配
   一次 `DEEPSEEK_API_KEY`（或接受真实 API 测试 self-skip）。
3. **迁移方向**：成品先在 dev home 验过；迁日用 `~/.dsh` 是"装正式包"，不是拷目录。
4. **双 DSH（代码层）**：`pnpm dsh` 走 `vendor/dsh` 源码（钉住 tag）；PATH 里的裸 `dsh`
   是日用全局安装，版本随全局升级漂移——当前三处 DSH 恰好同版（0.1.5-rc.2），是巧合
   不是保证。验证一律 `pnpm dsh`；`env.sh` 已把裸 `dsh` 设为拦截提醒（bypass：`command dsh`）。
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
   所以：**判据/审计类脚本要自己拒绝日用 home**（`scripts/deliverables-check.mjs` 已有这道守卫），
   别的 `scripts/*-smoke.mjs` 还是只靠"未设则报错"，同属这一类风险。
6. **端口与实例隔离（部署事实）**：headless 形态（探针/动议）**无端口**——单次任务
   进程，stdout 出结果，日志落 `$DSH_HOME/sessions/`。web 形态（观察窗）起**本地**
   HTTP 端口（值见启动横幅）；因 `DSH_HOME` 指 dev home，它与日用 DSH 的 web 实例
   （若同时开）是两个完全独立进程：profile、会话、凭据、端口互不可见。
7. **排练场 ≠ 运行场（轮间待办②，2026-09-22 落地）**：排练/探针会话的默认 cwd 是
   `dev/rehearsal-workspace/`（`node scripts/rehearsal-init.mjs` 幂等成型；四个 smoke 脚本
   `preset/probe/handbook/delegation` 已默认指这里并会自建，`--cwd` 可显式覆盖）。
   **真盘 `company-workspace/` 只收真实动议的产物**——排练产物不受三态判据约束
   （`drafts/` 本就不需要 `present`），跑在真盘会安静积污（R4 W2 删过 15 份）。
   验收判据 = 新默认跑一次探针后 `git status --porcelain company-workspace/` 为空。
   排练场里手册是指向真盘的**符号链接**（注入基线不变），CHARTER/org/templates 每次刷新，
   **journal 不镜像**（排练记忆不混真记忆）。`snapshot-motion` / `deliverables-check`
   默认仍指真盘——归档与审计本来就属于运行场。

## 7. 环境引导（clean checkout → 可跑通；R0 实证配方，2026-09-22）

```sh
git submodule update --init             # vendor/dsh 钉 tag
corepack enable pnpm                    # 一次性：pnpm 读根 packageManager（钉 11.7.0）
pnpm install                            # 全 workspace（vendor/dsh 全树含 vendored cordis 与 native/system）
# host 面构建（typert 类型图产物，源码直跑需要；tsc 局部 + tsdown host 面）：
node ./node_modules/typescript/bin/tsc -b \
  vendor/dsh/packages/typert/generator \
  vendor/dsh/packages/llm/llm \
  vendor/dsh/packages/interaction/commands \
  vendor/dsh/packages/feedback/command-feedback \
  vendor/dsh/packages/goal/goal \
  vendor/dsh/packages/subagent/subagent
(cd vendor/dsh && ../../node_modules/.bin/tsdown --env.DSH_BUILD_FACE host)
# 原生插件（flock，会话持久化刚需；macOS 用 CommandLineTools 的 cc）：
(cd vendor/dsh/native/system && ../../node_modules/.bin/tsx scripts/build.ts)
# web 观察窗（可选；三件事缺一不可）：
node ./node_modules/typescript/bin/tsc -b vendor/dsh/tsconfig.client.json   # client 面（测试面报错可忽略）
(cd vendor/dsh && DSH_CLIENT_TITLE="DSH Wochen Team" ../../node_modules/.bin/tsdown --env.DSH_BUILD_FACE client)
DSH_CLIENT_TITLE="DSH Wochen Team" pnpm --filter @deepseek-ai/dsh-web-frontend run build   # 前端 dist
source dev/env.sh && pnpm dsh plugin --profile web add file:./packages/company-pack   # 首次会拦 koffi，见下
pnpm dsh web -- --port 3081 --no-open                                      # 3080 是本 GUI 占用

# pack 自己的 client 面（改了 src/client/** 才需要；产物进 lib/）：
node ./node_modules/typescript/bin/tsc -p packages/company-pack/tsconfig.json
(cd packages/company-pack && ../../node_modules/.bin/tsdown)
# ⚠ pack 内容改动后要重装进 profile 才会被伺服：`plugin --profile web remove` + `add`
#   （tsdown 原地写 lib/** 时不用——inode 不变；但 **presets/*.yml 这类源文件用编辑工具改会换 inode**，
#    且安装副本实测是真拷贝（link count 1），不重装则改动不可见——2026-09-22 实证）。
node scripts/client-load-smoke.mjs     # client 面完成定义：真浏览器加载（postmortem 0003；playwright 从 .pnpm store 自动定位）
node scripts/handbook-smoke.mjs        # agent-instructions 注入完成定义：指令基线 = 公司手册（默认只跑 ceo 一次小调用）
node scripts/delegation-smoke.mjs      # 汇报线边界守卫：控制名归团队版（1 条 prompt，~30s）
```

实证过的坑与解法（细节见 notes/implemented/2026-09-22-r0-loop-acceptance.md）：

- **pnpm 入口**：`/usr/local` 老 corepack shim 执行新 pnpm 会 VM 崩
  （ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING）——`corepack enable pnpm` 换 nvm 自带
  corepack 的 shim；根 `packageManager: pnpm@11.7.0` 与 vendor 逐字一致。
- **编译器**：macOS 走 CommandLineTools（本机 xcode-select 已切换）。无垫片直连 CLT cc
  报 `errno.h not found` 时，`export SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk`
  兜底；不需要完整 Xcode。
- **workspace 形状**：glob 必须 `packages/*/*` 两层 + `vendor/*`（vendored cordis 全家）+
  `native/system*`（node-addon-system）；见 pnpm-workspace.yaml 注释。
- **根 devDeps**（tsx/tsdown/typescript/@types/node/@types/js-yaml/lightningcss/vitest）
  版本逐字镜像 vendor 根声明；vendor 换 tag 时随升级环 diff 对齐。
- **凭据**：`cp ~/.dsh/.credentials.yaml dev/harness-home/ && chmod 600`（gitignored）。
- **web 观察窗三件事**（R1 实证）：① client bundles（`tsdown --env.DSH_BUILD_FACE client`）——
  缺了报 `client bundles not found; run pnpm run build before launch`；② 前端 dist
  （`pnpm --filter @deepseek-ai/dsh-web-frontend run build`）——缺了首页 404 空页；
  ③ pack 装进 **web profile**（`plugin add file:./packages/company-pack`，首次被 koffi 构建审批
  拦住 → profile 的 `pnpm-workspace.yaml` 改 `koffi: true` 再装；pnpm 成功后 CLI 才写
  `dsh.profile.bundles`，中途失败要手动补）。观察窗默认端口 3080，**与本 GUI 冲突**，用
  `-- --port 3081`。preset roster 出现在 UI 的 CUSTOM 区（四个角色）。
- **bundle 叠加的重复行 id**（R1 实证）：web-app 已 insert `agent-presets`，pack 再 insert 同 id
  → `duplicate loader entry id` 硬拒。修法：对已存在的行用**替换**语法（`- id:`），只有真正
  新增的行才 insert。
- **根 devDeps 的 workspace 链接**（R1 实证）：insert 的四个行其包名必须同时是根
  `devDependencies`（`workspace:*`）——源码 CLI 下 TS 导入走 tsconfig paths 进 src，但插件清单的
  `require.resolve` 走 **Node 原生解析**，root 无链接就报
  `REQUEST_EXTENSION: DeepSeek request extension preparation failed`。
- **`!!js` 里的 `baseUrl` = profile 目录，不是你的包目录**（R1 实证，`app-boot/src/index.ts:799`
  设 `ctx.baseUrl = pathToFileURL(dirname(configPath)) + '/'`）。所以 bundle 里给 agent-presets 的
  roots 必须写 profile 相对路径（`node_modules/<你的包>/presets/`）；写成 `presets/` 会指向
  `<profile>/presets/`——不存在 → `scanRoot` 遇 ENOENT **静默返回空** → UI 里一个角色都不出现
  （无报错、无警告，最难查的一类）。另：**preset 在 UI 按 trust 分组**——`system` → **Built-in**、
  `user` → **Custom**（`AgentPresetSection.tsx`）。
- **preset 行的插件必须在 pack dependencies 里**（R1 实证，`pnpm verify` 已加门禁）：
  preset 的 `agent.cordis.yml` 里 `name:` 写的裸插件（如 `@deepseek-ai/dsh-persona`、
  `dsh-skill-filesystem`）会**按安装域解析**——不在 pack dependencies（profile 安装）或根
  devDeps workspace 链接（源码域）里，行就解析不到 → **preset 被标记 broken → UI 给不出可用角色**
  （扫描得到、名字也对，就是不能用；`discoverPresets` 的 `broken` 字段是唯一线索）。
  对应 DSH 的 `verify-cordis-config` 门禁；我们同构到 `scripts/verify.mjs` 检查 7。
- **patchReload**：headless 用途的自定义 profile 必须 `"startup"`（见 §2 第 3.5 层）；web 形态
  才用 `"live"`。
- **品牌（皮肤第一笔，零代码）**：`DSH_CLIENT_TITLE` 是构建期环境变量，同时决定**浏览器标签页标题**
  （`apps/web/vite.config.ts`）与**应用内主标题**（`ui-layout/src/client/AppFrame.tsx:192`）——所以
  **上面两条构建命令都要带它**（web dist 与 client 面各注入一次）。侧栏品牌名是插槽
  `sidebar.brand.name`（官方品牌包占着），改它需要 pack 自己的 client 面（R5 皮肤 v1）。
- **上线前必跑 preset 冒烟**（R1 起，两道防线）：
  1. **防线一（快，`pnpm test`）**：已知必填 config 字段必须随工具行给出（如
     `tool-fs-search.sampleOverCapGlobResults`、`tool-todo.allowParallelInProgress`）。
  2. **防线二（真，`node scripts/preset-smoke.mjs`）**：boot 真 web profile → `agentPresets/list`
     断言四角色零 broken → **逐个 `session/create` 真挂一次**。
  **只有防线二能抓"preset 挂载失败"**：行 config 校验发生在挂载时，roster 扫描与 `--dump-config`
  都看不到，UI 还会吞掉错误（症状就是"新建会话点了没反应"）。已反证：去掉一个必填 config 即变红
  （精确指向 preset 与缺失字段），恢复后 ALL PASS。

## 8. 驱动 Web 面会话（RPC；R1 实证）

preset 只在 Web 面挂载（§2 第 3.6 层），所以**验证角色行为必须驱动 Web 面**。Web 面有 HTTP RPC，
可以脚本化建会话、发 prompt、列会话：

```sh
# ① token → cookie（cookie 按 origin 隔离：换端口/换实例都要重新换一次）
curl -sL -c /tmp/ck.txt -o /dev/null "http://127.0.0.1:3081/?token=<TOKEN>"

# ② 建会话（带 agentPreset 即挂角色 preset）
curl -s -X POST "http://127.0.0.1:3081/api/session/create" \
  -H 'Content-Type: application/json' -b /tmp/ck.txt \
  -d '{"type":"client-request","rpcId":"c1","method":"session/create",
       "payload":{"args":{"request":{"cwd":"<绝对 cwd>","agentPreset":"ceo"}}}}'

# ③ 发动议
curl -s -X POST "http://127.0.0.1:3081/api/session/prompt" \
  -H 'Content-Type: application/json' -b /tmp/ck.txt \
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
- 这条通道也是 R5「web 快照 lane」的雏形。


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

**要点（可迁移到别的面）**：

- **"通"不需要考内容**：挂载 + 轮次跑完 + 回话 + 人格进 prompt 已覆盖全部已知失败类
  （postmortem 0001 preset 挂载失败 / 0003 client 砖死的那一类）。
- **能从权威日志读的事实，不要从模型答案推断**：人格是否进 prompt 看 `system/message`，
  这是 keyless 硬证据；模型答案只用来判"有没有回话"。
- **问句要短**：一句 3 秒能答完的 ping 就够；"不要调用工具"能砍掉多步往返（读文件会把一轮拖到几分钟）。
- **完成信号用持久事件**（`turn/end`），不要用状态位（`session/list.running` 是"会话有活着的 agent"，
  idle 也为 true，会让等待永不满足）。
- **慢是常态**：内容档超时 ≥5min；快档 90s 足够；失败重试一次（换新会话）。

### 9.1 测试分层与预算（R3 立，回答"回归不能跑这么慢"）

**教训（R3）**：把"真浏览器 + 真模型 + 真 UI"的委派卡 e2e 当回归门禁——240s 都没等到
（CEO persona 的开工仪式先烧 5–6 步模型往返），而且**依赖模型配合**：模型不调那个工具就永远绿不了。
**这是层次放错，不是脚本写得不好。**

**分层（按"要不要模型"切，不按"重不重要"切）**：

| 层 | 时间 | 跑什么 | 何时跑 |
|---|---|---|---|
| 结构 keyless | ~1s | `pnpm verify` | 每次改动 |
| **单元/组件 keyless** | ~1s | `pnpm test`——含 UI 组件的**纯函数视图模型 + 静态渲染**（`react-dom/server`，不需要 jsdom/浏览器） | 每次改动 |
| 装配 keyless | ~10s | `client-load-smoke`（真页面零挂载失败；slot 名写错会在这里炸） | 客户端改动 |
| 机制/边界（1 条 prompt） | ~30s | `delegation-smoke`（模型可见工具目录 + shadow 边界） | 轮末 / **升 pin 时** |
| 认证档（真模型） | 分钟级 | `preset-smoke` / `probe-smoke` / `handbook-smoke` | **每轮一次**，产出归档；不进回归 |

**三条硬规矩**：

1. **真模型 / 真浏览器不进迭代环**：迭代环只跑 `verify` + `test`（秒级）；分钟级一律"轮末一次"。
   **这条有机械门禁**：`tests/layering.spec.ts` 扫 `tests/**`，出现 `node:child_process` / playwright /
   `fetch(` / 密钥即红（已反证：塞一行 `import { spawn } from 'node:child_process'` 立刻变红）。
   想测真入口 → 写 `scripts/*-smoke.mjs`，别塞进 `tests/`。
2. **能做成纯函数就做成纯函数**：UI 组件把"展示事实"抽成纯函数（范本 `delegationCardModel`），
   keyless 单测直接断言它——组件层就永远不需要模型与浏览器。
3. **认证档要能"重放"而不是"重跑"**：真模型跑一次 → 会话日志归档 → 后续用归档做回放断言
   （R5 replay harness）。**重跑只在升 pin 或行为确实要改时做**；R3 的委派卡端到端（模型→工具→卡片）
   就留给 R5 的 replay harness（试过的慢 e2e 已否决，原因见 delegation.md §6）。

**回归层预算**：`pnpm test` 墙钟 **< 5s**（当前 22 条 ≈2s）。超了先怀疑"有人把模型/浏览器塞进来了"，
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
