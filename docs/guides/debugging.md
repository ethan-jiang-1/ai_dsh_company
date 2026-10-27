# 调试阶梯：组合层 → 会话层（不跳层）

> 性质：指南——插件开发排查的**阶梯手册**（2026-10-27 自 [开发环 §2](./dev-loop.md) 迁出；节号保留防断链）。
> demo **现场**的症状→动作表另见 [budget-and-ops](./budget-and-ops.md) §3；本阶梯用于开发插件本身时排查。

| 层 | 手段 | 核对什么 |
|---|---|---|
| 1 组合层 | `pnpm dsh --profile <p> --dump-config` | 打印最终组合树，确认"我以为挂上的行"真的在、config 是我以为的；层级顺序 bundle → profile patch → home patch → `--patch` overlay（`vendor/dsh/apps/cli/src/dump-config.ts`）。⚠ patch 语法两条（`- id:` 替换 / `- insert:` 新增）唯一家 = [开发环 §4](./dev-loop.md) |
| 2 装载层 | preset 装不上时看 roster 报错 | roster **连原因一起列出**（fail-loud），报错即诊断，不静默跳过 |
| 3 生效层 | 改 patch 行后要不要重启 | 自定义 profile 的 user patch 层**热重载**（长驻面默认开）；headless/sdk 一次性成型，调试它们要重启（`vendor/dsh/packages/boot/app-boot/src/profile.ts`） |
| 3.5 **退出层（R1 实证）** | **症状"任务似已跑完但进程不退 + stdout 零输出"→ 先查 `patchReload`** | **自定义 profile（非 shipped 名字）默认 `'live'`**（源码注释："Custom profiles retain the historical live patch-file behavior"）——live watcher 常驻，一次性 headless 任务跑完进程也不退、stdout 不 flush。修法：profile 的 package.json 改 `"patchReload": "startup"`。shipped 名字（headless/web/sdk…）走模板不受此扰。第一分叉点永远是 **shipped 名字 vs 自定义名字** |
| 3.6 **表面层（R1 实证）** | **症状"角色没入戏 / persona 不生效"→ 先问跑在哪个面** | **preset 只在 Web 面挂载**：只有 `web-app` 组合 `session-controller`（其 `composeAgent` 负责"未指定 preset 时挂 default"），headless / sdk / acp 的一次性驱动直接经 core agent registry 建 agent、**绕过 preset**。所以在 headless 里验角色内容永远失败，换 Web 会话（选 preset）验证 |
| 3.7 **工具面层（R1 实证）** | **症状"角色会话只能协调、不能读写文件 / 加载 skill / 写交付物"→ 查 preset 是否声明了工具行** | preset composition 是**自包含**的：工具行不随 profile/bundle 继承（shipped `standard` 自己声明全部工具行）。查证手段：**会话日志 `request/header.tools`** 列出的工具名（`--dump-config` 看不出来——它只打印 profile 树）。⚠ 会话日志是**多 frame zstd**：Node `zstdDecompressSync` 只解第一 frame（读到 200 字节就停），用 `zstd -d -c`（homebrew）读全量 |
| 3.8 **Web RPC 层（R1 实证）** | **UI 静默失败（"新建会话没反应"）→ 直接打 `session/create` RPC 拿真实错误** | UI 不显示 preset mount 失败；RPC 会返回 `agent-preset/invalid` + 具体行与缺失字段（R1 实证：工具行缺必填 config，如 `tool-fs-search.sampleOverCapGlobResults`、`tool-todo.allowParallelInProgress`——**抄 shipped preset 的行要连 config 一起抄**）。驱动方法见 [web-rpc 指南](./web-rpc.md) |
| 3.9 **客户端模块层（R1 误诊 → R2 更正，postmortem 0003）** | **症状"整窗只剩 HARNESS / Failed to load plugins 错误屏"→ 某个 client 入口 apply 抛错，砖的是全 app** | ① client 入口失败**不静默**：BootPage 错误屏 + 浏览器 console 有 `failed to apply loader entry <id> (<name>)`；先跑 `node checks/smoke/client-load-smoke.mjs`（headless 浏览器断言零挂载失败 + 品牌在场）。② `dsh.client.inject` 是 **informational only**（vendor `packages/client/AGENTS.md`）：不排序、不 gate 加载——"inject 引用了不在 entries 里的包" ≠ 挂不上；shell baseline（`platform.ts` 的 `PLATFORM_MODULES`：react/cordis/store/ui-slots/ui-primitives/ui-dockkit）隐式回答这些名字（R1 曾据此误诊"官方 Team UI 挂不上"，实为可用）。③ 真正"挂不上但没报错"的形态是 fiber **PENDING**（声明的服务无人提供，无超时，贡献安静不出现）。④ 复用别人已挂的贡献（如官方 Team remote）：走服务 inject 等它，**别重复 `$mount`**——同一描述符挂两次 = `already mounted` = 全 UI 砖（2026-09-22 实证） |
| 4 会话层 | 读会话 JSONL，不猜；先跑 `pnpm diagnose` 拿失败摘要 | model-visible ⟺ logged：上下文组装问题从日志（`$DSH_HOME` 下 sessions）重建；读不全 = 欠了 [开发环 §3](./dev-loop.md) 第②问的债。⚠ bash 沙箱对会话文件有**间歇视图抖动**（列出得、打开不得），且 headless 会话收尾会删目录——分析要趁进程活着时做（R1 实证） |
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
`dsh --dump-config-schema` 自描述配置 schema——三者回答"这台进程现在真跑着什么"（对照 [开发环 §5](./dev-loop.md) 升 pin 扫描）。
⚠ inspect 是**可见性工具，不是授权边界**（vm 只防意外全局污染，不替代 sandbox/approval）——「查得到」不等于「被授权」（FAQ 07 四边界；2026-09-27 补）。
