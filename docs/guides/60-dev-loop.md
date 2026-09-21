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
| 1 组合层 | `pnpm dsh --profile <p> --dump-config` | 打印最终组合树，确认"我以为挂上的行"真的在、config 是我以为的；层级顺序 bundle → profile patch → home patch → `--patch` overlay（`vendor/dsh/apps/cli/src/dump-config.ts`） |
| 2 装载层 | preset 装不上时看 roster 报错 | roster **连原因一起列出**（fail-loud），报错即诊断，不静默跳过 |
| 3 生效层 | 改 patch 行后要不要重启 | 自定义 profile 的 user patch 层**热重载**（长驻面默认开）；headless/sdk 一次性成型，调试它们要重启（`vendor/dsh/packages/boot/app-boot/src/profile.ts`） |
| 4 会话层 | 读会话 JSONL，不猜 | model-visible ⟺ logged：上下文组装问题从日志（`$DSH_HOME` 下 sessions）重建；读不全 = 欠了 §3 第②问的债 |
| 5 回归层 | snapshot 重放（阶段 5 起） | `snapshots/`；回答"行为为什么变了"的最快路径 |

一次性实验不落盘：`pnpm dsh --profile <p> --patch ./dev/try-x.patch.yml`——`--patch` 是
"profile 层之后再叠一层"的可重复旗标（`vendor/dsh/apps/cli/src/args.ts`），风险半径一次
进程，连 dev home 都不落。

## 3. 设计四问（阶段 3+ 写第一行 JS 前必答）

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
| profile 内持久 | `pnpm dsh plugin --profile <p> add file:./packages/company-pack` | 验证真实安装形状（`plugin` 子命令把参数转发给 profile 目录里的 pnpm；阶段 5 门禁化） |
| 正式分发 | `pnpm dsh plugin --profile <p> add <npm-name>` | 用户视角；CI 测兼容矩阵 |

拔法（从轻到重）：会话不挂 preset → patch 行 `disabled: true`（行还在，Loader 每次 mount
求值）→ 卸载（registrations are effects，无残留）。异常时先 `--dump-config` 对照实际组合
再下结论。

## 5. 升级环与发布纪律时点

升级环（AGENTS.md 纪律的展开；做成一个脚本 `scripts/sync-dsh.mjs`，阶段 5 建）：

```text
vendor/dsh 换 tag → 记 SHA 簿记（AGENTS.md）→ typecheck → compatibility 矩阵加列 → 真实安装冒烟
```

发布纪律的时点表（不提前、不欠账）：

| 时点 | 必须补上 | 依据 |
|---|---|---|
| 现在（零 JS，阶段 0–2） | 无——pack 无代码，不存在依赖声明错误面 | [10-architecture.md](../design/10-architecture.md) §2.1 |
| 阶段 3+（pack 有 `src/`） | `@deepseek-ai/cordis` + 用到的 `@deepseek-ai/dsh-*` 作 **peerDependencies**；拒绝精确钉死（pre-stable API，钉死 = 每次上游同步逼发版） | FAQ 13 research.md 生态失败样本 |
| 阶段 5（发布） | `dsh.compatibility` 矩阵；`npm pack` → 干净 profile → `dsh plugin add` 冒烟 | [roadmap.md](../plans/roadmap.md) 阶段 5 |
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
