# 调试阶梯：组合层 → 会话层（不跳层）

> 什么时候读：插件/启动/会话出问题，按组合层→装载层→生效层→会话层排查时。
> 性质：指南——插件开发排查的**阶梯手册**；demo 现场症状→动作表另见 [budget-and-ops](./budget-and-ops.md) §3。

| 层 | 手段 | 核对什么 |
|---|---|---|
| 1 组合层 | `pnpm dsh --profile <p> --dump-config` | 打印最终组合树（层级顺序：bundle → profile patch → home patch → `--patch` overlay，见 `vendor/dsh/apps/cli/src/dump-config.ts`）；patch 语法见 [bootstrap §插拔速查](./bootstrap.md) |
| 2 装载层 | 查看 preset roster 报错 | roster 连原因一起列出（fail-loud），报错即诊断，不静默跳过 |
| 3 生效层 | 核对 `hmr` row 与重启边界 | 长驻 Web 默认启用 HMR；headless/sdk/acp 通过 `hmr` row `disabled: true` 关闭（判据 = `vendor/dsh/packages/bundle/base/cordis.patch.yml`） |
| 3.5 退出层 | 症状「任务似已跑完但进程不退 + stdout 零输出」 | 查组合里的 `hmr` row；一次性自定义 profile 需退出时设 `disabled: true`，或直接用 shipped `headless` |
| 3.6 表面层 | 症状「角色没入戏 / persona 不生效」 | preset 只在 Web 面挂载（`web-app` 组合 `session-controller`）；headless/sdk/acp 绕过 preset，验证角色内容必须走 Web 会话 |
| 3.7 工具面层 | 症状「角色不能读写文件 / 加载 skill / 写交付物」 | preset composition 自包含（不随 profile 继承）。核对会话日志 `request/header.tools`；会话日志为多帧 zstd，用 `zstd -d -c` 读全量 |
| 3.8 Web RPC 层 | 症状「新建会话 UI 静默无反应」 | 直接调 `session/create` RPC（见 [web-rpc 指南](./web-rpc.md)）获取 `agent-preset/invalid` 与缺失必填 config 字段 |
| 3.9 客户端模块层 | 症状「整窗只剩 HARNESS / Failed to load plugins 错误屏」 | 先跑 `node checks/lanes/client-load.entry.mjs` 定位失败入口，按下方四条客户端排障要点核对 |
| 4 会话层 | 先跑 `pnpm diagnose`，再读 `$DSH_HOME/sessions/` JSONL | `model-visible ⟺ logged`，上下文组装从日志重建；headless 会话收尾会删目录，分析趁进程存活时进行 |
| 5 回归层 | `snapshots/` 回放对比 | 回答「行为为什么变了」的最快路径 |

### 客户端模块层（§3.9）四条排障要点

- **不静默失败**：client `apply` 抛错会直接进入 BootPage 错误屏，浏览器 console 输出 `failed to apply loader entry <id> (<name>)`。
- **`dsh.client.inject` 是模块到达依赖边**：浏览器模块 factory 沿此边在 consumer 前到达（`vendor/dsh` `packages/client/modules` `arriveGraphRow`）；shell baseline（`PLATFORM_MODULES`：`react`/cordis/store/ui-slots/ui-primitives/ui-dockkit）隐式提供基础模块。
- **静默不出现通常是 fiber PENDING**：声明的 Cordis 服务无人提供时会无限等待，贡献安静不挂载。
- **禁止重复 `$mount`**：复用已有贡献（如官方 Team remote）必须走服务 `inject` 等待，同一描述符重复 `$mount` 会抛 `already mounted` 导致整窗失败。

### 通用诊断方法与临时实验

- **栈采样先于二分**：`sample <pid> 3` 看主线程——kevent 空转表示等待未到达事件，CPU 满载表示死循环，比盲目砍配置二分快得多。
- **一次性实验不落盘**：`pnpm dsh --profile <p> --patch ./run/try-x.patch.yml` 在 profile 层之后叠一层，风险半径限单次进程（`vendor/dsh/apps/cli/src/args.ts`）。指令层临时叠加可用 `AGENTS.local.md` / `CLAUDE.local.md`（不进 git，长期规则须归正式文档）。
- **进程内自省**：角色会话内 `cordis_inspect_list` / `cordis_inspect_query` 与组合层 `dsh --dump-config-schema` 回答「进程当前实际装配了什么」。注意 inspect 仅是可见性工具，不构成授权或沙箱边界。
