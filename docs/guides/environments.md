# 运行环境：双 home 与双 DSH 操作细节

> 性质：指南——一次安装的运行环境怎么隔离、凭据与端口怎么落
> （2026-10-27 自 [开发环 §6](./dev-loop.md) 迁出；节号保留防断链）。
> 冷启动配方 = [bootstrap](./bootstrap.md)；运行态四轴 = [运行态地图](../runtime-map.md)。

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
