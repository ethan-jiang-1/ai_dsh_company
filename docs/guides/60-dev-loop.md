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
4. **跑最小证据**：起步 `pnpm verify`；有行为测试后只跑"会为这次回归而失败"的那个 +
   typecheck，不默认全量。
5. **沉淀**：门禁守住的事实进 docs/（只写 now），选择进 Note。
6. **只报告实际跑过的检查**：没跑的不算数。

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
5. **新 shell 陷阱（R1 实证）**：后台 job / 新开终端 = 全新环境，`DSH_HOME` **不继承**——
   任何 `pnpm dsh` / `node bin.ts` 调用前必须先 `source dev/env.sh`，否则**静默**落日用
   home `~/.dsh`（写 profile、装包都进日用数据）。实证：R1 部署时一次 `plugin add` 在
   未 source 的 shell 里试图 `mkdir ~/.dsh/profiles/company`，被沙箱 EPERM 拦下（日用
   home 未被污染）——沙箱是最后防线，不是第一防线；第一防线永远是 source env.sh。
6. **端口与实例隔离（部署事实）**：headless 形态（探针/动议）**无端口**——单次任务
   进程，stdout 出结果，日志落 `$DSH_HOME/sessions/`。web 形态（观察窗）起**本地**
   HTTP 端口（值见启动横幅）；因 `DSH_HOME` 指 dev home，它与日用 DSH 的 web 实例
   （若同时开）是两个完全独立进程：profile、会话、凭据、端口互不可见。

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
(cd vendor/dsh && ../../node_modules/.bin/tsdown --env.DSH_BUILD_FACE client)
pnpm --filter @deepseek-ai/dsh-web-frontend run build                       # 前端 dist
source dev/env.sh && pnpm dsh plugin --profile web add file:./packages/company-pack   # 首次会拦 koffi，见下
pnpm dsh web -- --port 3081 --no-open                                      # 3080 是本 GUI 占用
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
- **preset 行的插件必须在 pack dependencies 里**（R1 实证，`pnpm verify` 已加门禁）：
  preset 的 `agent.cordis.yml` 里 `name:` 写的裸插件（如 `@deepseek-ai/dsh-persona`、
  `dsh-skill-filesystem`）会**按安装域解析**——不在 pack dependencies（profile 安装）或根
  devDeps workspace 链接（源码域）里，行就解析不到 → **preset 被标记 broken → UI 给不出可用角色**
  （扫描得到、名字也对，就是不能用；`discoverPresets` 的 `broken` 字段是唯一线索）。
  对应 DSH 的 `verify-cordis-config` 门禁；我们同构到 `scripts/verify.mjs` 检查 7。
- **patchReload**：headless 用途的自定义 profile 必须 `"startup"`（见 §2 第 3.5 层）；web 形态
  才用 `"live"`。
