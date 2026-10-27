# release · 发布形状的现在时（company-pack）

> 什么时候读：发布、打包、装进真实 profile、升 vendor pin 时。路线 = §vendor 政策 → release-smoke。
> 顶层合同：vendor 政策、pack 的依赖姿态、兼容台账、真实安装冒烟程序、升 pin 程序。
> 每次发布的操作步骤 = [guides/release-runbook.md](./guides/release-runbook.md)；一条命令入口 = `pnpm release`。
> 依据：FAQ 13（外部研究：dsh-market / dsh-im 生态姿态）；原 dev-loop §5 发布时点表已全部落地随迁本文件（2026-10-12）。
> 执行器：`checks/smoke/release-smoke.mjs`（发布冒烟）与 `tools/sync-dsh.mjs`（升 pin）。

## 依赖姿态（R5a 起的现在时）

- **runtime 依赖 = `peerDependencies`，拒绝精确钉死**（`dependencies` 面已清空）：
  `@deepseek-ai/cordis ^4.x` + 组合行用到的全部 `@deepseek-ai/dsh-*`（**版本以
  `packages/company-pack/package.json` 为准，此处不复述**——复述必漂，2026-09-26 实测本行曾停在
  上一代 pin 而 manifest 已升）。
  理由：DSH API 仍 pre-stable，精确钉 = 每次上游同步逼发版（FAQ 13 生态失败样本）；
  dsh-market 姿态。
- **为什么 peers 装不进 profile 也无碍**：profile 模板自带 `autoInstallPeers: false` +
  `nodeLinker: hoisted`（vendor `app-boot/src/profile.ts` 的 `PROFILE_PNPM_WORKSPACE`）——
  out-of-tree 插件的 peers 由**安装锚兜底解析**（行解析顺序：installation anchor 先于
  profile 目录），所有插件共享 dsh 安装侧的同一份 cordis/工具包，不出现第二份单例。
  peers 是**声明语义**（"验证过的宿主 API 面"），不是安装要求。
- **兼容窗口 = `engines.dsh`**：DSH 在安装/启动时只读这一行（存在即忽略 peers；台账是“已认证 tag”
  台账，不是运行时门）。当前窗口见 `package.json`；`pack-shape` 的 `pack-engines` 强制它覆盖钉住的
  pin，且 license/repository/private 在场。**窗口是“可安装”，不是“已认证”**：已实测通道 = vendor
  `dsh-v0.2.1-rc.2` + npm 发布版 `0.2.1-rc.3`；其他 0.2.x 未执行。
- **npm 发布版不含 browser 两包**：`@deepseek-ai/dsh` meta package 在 rc.2/rc.3 都不依赖
  `@deepseek-ai/dsh-browser-use` 与 `@deepseek-ai/dsh-experimental-browser-use-playwright-mcp`。
  五角色 preset 的 browser 组因此**条件启用**（profile 可解析即开，`DSH_COMPANY_BROWSER=on/off` 强制；
  缺包时整组禁用、角色照常可用）；browser 两包不进 `dependencies`，保住离线/零 runtime 依赖姿态。
- **许可与发布**：`license: UNLICENSED`（内部交付，未授予再分发权）；`private: true` 保留到 publish。
  真实 npm 发布仍是“第二个消费者出现再定”。
- **client 面自打包**：`lib/client.js` 由 tsdown 产出，react 与 `dsh-client-*`/`dsh-api-*`
  留作浏览器模块表 require（见 `packages/company-pack/tsdown.config.ts` 外置规则），
  其余内联——所以 tarball 的浏览器半零 runtime 依赖。
- **exports 不说谎**：`./src/*` 出口已摘（tests 一律相对路径导入源码面；tarball 的 `files`
  不含 src，留着一个指向不存在文件的出口就是发布形状的谎言）。`files` 只发 runtime 两半
  （`lib/index.js` + `lib/client.js`）与 `lib/types/**/*.d.ts`；tsc 的中间 `.js`/`.map`/
  `.tsbuildinfo` 不进包（`lib/**` 会把 216/272 条打成构建中间物）。

## 兼容台账（`checks/gates/lib/compat-tags.json`）

```json
{ "dshReleases": ["<历史 tag>", "<当前钉住 tag>"] }
```
**形状 = 数组，含历史验证 + 当前钉住的那一个**（`pack-shape.mjs` 的 `pack-compat` 门禁强制台账含当前
tag；实况以 `checks/gates/lib/compat-tags.json` 为准，此处不复述具体值）。

FAQ 24 §9.2：`dsh.compatibility` 不是 DSH 字段，安装器/启动器不读。它已从 package manifest 移除，
台账只住 repo、不随包分发；运行时硬门只有 `engines.dsh`。`pack-engines` + `pack-compat` 各查一边。

- 语义：**每个列名都是真实验证过的 vendor pin tag**（升 pin 走 sync-dsh，冒烟过了才加列）。
- 机械门禁：`pnpm verify` 的 `pack-compat`——当前钉住 tag 不在台账里就红
  （升 pin 忘加列 = 没验证过就装作验证过）。`sync-dsh` 检查模式同时核对四处簿记一致
  （submodule HEAD / pin.mjs（checks/gates/lib/pin.mjs）常量 / AGENTS.md 簿记行 / 台账）。

## vendor 政策（钉住的上游；AGENTS.md 只留铁律与指针）

- **只读铁律**：`vendor/` 下受版本控制的内容一个字节都不许改——`pnpm verify` 双门禁强制
  （vendor-pin：submodule HEAD == 簿记 SHA；vendor-clean：`git status --porcelain` 必须为空），
  均带反证（改一个 tracked 文件即 FAIL，报 `M README.md`）。
- **允许面**（只有这两类，别的都算违反）：

  1. **只读**：探索源码、`extends` 它的 tsconfig、import 它的包、跑它的构建脚本。
  2. **树内构建产物**：vendor 自己 `.gitignore` 覆盖的产物（`lib/`、`apps/web/dist/`、
     `node_modules/`）——"从源码跑"要求构建，构建必须在树内；产物不出现在 `git status`，
     不违反 vendor-clean。⚠ **禁止 `git clean -x`**（会删掉运行所需的产物）。

- **想改 vendor 的行为，三条正路（都不碰 vendor）**：

| 想要 | 正路 |
|---|---|
| 组合/配置层面的差异 | 本 pack 的 bundle `cordis.patch.yml`（`- id:` 替换 / `- insert:` 新增）或 profile patch |
| 需要上游修的行为 | 改 **DSH upstream** → 升 pin（`tools/sync-dsh.mjs`，见下节）；期间在本仓记入 `notes/` |
| 上游功能在本形态下不可用 | **先证伪"不可用"再自建**：R1 曾误诊"官方团队 UI 挂不上"→ 自建任务板 + 重复挂 remote → 全 UI 砖（postmortem 0003；实为可用，`dsh.client.inject` 是 informational only）。确属不可用才在本 pack 自己实现等价面 |

- **为什么用 SHA 而不用 tag**：tag 可被移动/别名，SHA 才是钉住的合同。
- **submodule 首次克隆技巧**：本地路径 + `-c protocol.file.allow=always`（单命令放行，未改全局
  配置）；`.gitmodules` 的 URL 已指上游，别改回去。

## 发布冒烟（`node checks/smoke/release-smoke.mjs`，认证档）

程序（脚本按序执行，任一步失败即红）：

0. **前置**：`source run/env.sh`；共用 `requireDevHome` 拒绝日用 home 及其祖先/后代/符号链接别名。读取 vendor CLI `package.json` 的 `bin.dsh`（当前 `apps/cli/lib/bin.js`），检查它和 web dist 在场；缺失即失败，不回退源码。
1. **构建 company-pack**：先删 `lib/` 再 `tsc -b packages/company-pack` + tsdown。**别用 `tsc -p`**——本包 tsconfig 是 solution root（`files: []` + references），`-p` 非 build 模式不展开 references ⇒ 零输入、静默退出 0、零 emit；陈旧态下 tsdown 会拿上一次的产物打包 ⇒ 冒烟验旧包（假绿）。本脚本不重建 vendor；已有 vendor 产物可运行不等于来自当前 SHA 的新鲜构建。配方归 [guides/bootstrap](./guides/bootstrap.md)。
2. **`npm pack`**：tarball 落 `runtime/harness-home/tmp/release-pack/`（npm cache 重定向进
   repo gitignored 区——纪律 §11）。
3. **干净 profile**：dev harness home 下 `release-check`，**先删后建**；预置
   `package.json`（bundles = web 模板形状 `[dsh-base, dsh-web-app]` + `patchReload: startup`——
   自定义 profile 名走 DEFAULT 只有 dsh-base，起不了 web）+ `pnpm-workspace.yaml`
   （hoisted + autoInstallPeers: false，vendor 模板镜像）+ `.npmrc`（store/cache 钉 repo 内，§11）。
4. **真安装**：`node <bin.dsh> plugin --profile release-check add file:<tarball>` → 断言 bundles reconcile、安装副本的 presets/client/**出厂骨架 `workspace/`**、peers 与 engines 窗口。`--profile` 挂在 plugin 子命令上。
5. **boot + RPC**：`node <bin.dsh> --profile release-check -- --port 0 --no-open` → roster 五公司角色 + researcher 零 broken、`session/create` 挂上 ceo 与 researcher、浏览器模块表含本包 client。随机端口的临时实例不替换开发 GUI。
6. **首启自举 + run bundle**（2026-10-13 加，2026-10-24 扩）：干净 `DSH_COMPANY_HOME` 下第一次 boot 必须把骨架落到位（手册/章程/模板/起动件），并在 `<DSH_HOME>/bundle.json` 写 bundle 身份（id / workspace 相对根 / 基部逐文件 sha256）；**新安装不许带扩张数据**（journal / 交付物 / 培养记录）；**第二次 boot 零变更且 bundle.json 字节不变**——"建立好了就不用再建立了"的模拟安装判据。

两个 DSH 调用均为 plain Node，清除继承的 `NODE_OPTIONS`、`NODE_PATH`、`TSX_*`，不走 `pnpm dsh`/tsx。构建和打包各限 120 秒，安装 180 秒，boot 120 秒、实例总寿命 180 秒、每个 HTTP 请求 15 秒；POSIX 子进程组 TERM 后等待，1 秒后 KILL。确认退出才回收 profile（`--keep` 保留）；同 home 的锁目录拒绝并发运行。强杀脚本留下的锁须确认无进程后人工移除。

全绿证明本次已有 vendor 产物配合真 tarball 安装可用；不证明 vendor 新鲜构建，也不覆盖完整浏览器交互。dev profile 的 `link:` 安装不替代这条验证。

**生命周期冒烟**（`node checks/smoke/lifecycle-smoke.mjs`）：真 tarball v1 → 改基部/加扩张 → v2 → 启动，再降级回 v1、business 恢复、卸载、搬 home；补 release-smoke 不覆盖的升级/降级/恢复/卸载/迁移面。它不证明 registry 升级、并发或跨 OS。

**通道矩阵冒烟**（`node checks/smoke/channel-matrix-smoke.mjs --channel all`）：vendor built CLI + 真实全局 `dsh`，验证五角色 roster 与 `session/create`；`--with-browser` 另验装 browser 两包后自动启用。它证明“真实启动器通道”，不证明浏览器 UI；需要 PATH 有 global `dsh` 与网络，默认不进 `release --verify`，发布前手动跑。

**隔离矩阵冒烟**（`node checks/smoke/isolation-matrix-smoke.mjs`）：已有 `bundle.json` 后改 `DSH_COMPANY_HOME` 必须告警且不建新盘；相对/`~` 落点归一。它不证明搬家后 DSH 自己的 `storages/workspace.json`/session cwd 会自动迁移。

## 升 pin 程序（`node tools/sync-dsh.mjs`，认证档）

**触发政策（2026-10-12 用户写死）**：升 pin = **用户策动制**——agent 不主动盯上游 tag、不评估、不建议、不记录候选；只有用户明确指示升 pin 才进本节程序。渠道**只认 RC 与正式版（stable）**；alpha/beta 及其他预发布 tag 通通不管（即使被点名也不作为升 pin 对象——改政策须新 Note，见 D42）。

默认只读核对四处簿记，不做流程语义审计。升级使用 `source run/env.sh && node tools/sync-dsh.mjs --pin <tag> --process-review <repo-relative.json>`；证据文件先经人审提交，两个工作树须干净。

**证据文件命名与落点**（2026-09-26 补；**2026-10-02 迁 archived/**——原"顶层 notes/"与自家先例打架：0.1.7 的孤儿 JSON 早已迁 archived/，且同轮 delta 报告也住 archived/，顶层还会随 pin 无限堆积）：`notes/archived/<YYYY-MM-DD>-pin-review-<目标 tag>.json`（完结流程物证的家，与 delta 报告同住；`--process-review` 传该 repo 相对路径即可——sync-dsh 只要求 git 已跟踪、不限于子目录）。
人审证据 JSON 必含 `fromSha`、`toSha`（完整 SHA）、`reviewedBy`、`reviewedAt`（YYYY-MM-DD）、`processContractReview`（核对 vendor 纪律与本地流程合同的结论，可引用既有 Note）。脚本核对文件受版本控制、字段非空及 SHA 对应；**这是人审声明，不是自动语义审计，也不认证签名者身份**。

升 pin 的人审（`processContractReview` 结论里）必须额外覆盖三项（2026-10-02 立前两项，消化对账轮；2026-10-04 增第三项）：

1. **experimental 行重校**：本 pack 直插的 experimental 行（agent-team 族等）逐字段对照 vendor 同 tag
   的官方 optional bundle patch（如 `packages/experimental/agent-team-profile/cordis.patch.yml`）——差异须是
   有意识的偏离并写明理由（反例：裸 insert 曾无意识吃 `maxMembers` 代码默认 16，而官方组合钉 8）。
2. **货架过账**：对照外部研究树当轮 `_digested/plugin-inventory`（基线对齐新 pin；不对齐时按其
   `_change_log/` 判定影响面），新增/退役能力按判收四档（追平 standard / 未挂载现货 / 评估 / 刻意排除）
   记入收割台账 Note——先查货架再动手是 FAQ 17 四步流程，升 pin 是它的固定触发点。
3. **语料回放全绿**：vendor 换 tag 后先跑 `checks/smoke/replay-smoke.mjs`（r2/r3 会话判据 + foundation workspace
   oracle；资格与缺口见[快照合同](../snapshots/README.md)）再谈语义结论——replay = 升 pin 回归网第一道（[testing.md](./testing.md) §4）。
    已知漂移红（r3 ×2 / foundation ×3 = 录制期组合演进，2026-10-05 裁决维持为漂移金丝雀、不弱化断言不重录掩盖）；升 pin 重校时顺带评估是否以新版本场景重录换更宽绿网（新录不覆盖旧锚，payload 冻结不破）。

程序：验证旧簿记及 `verify` → fetch tag 并核对证据 SHA → 在内存暂存新簿记/台账 → checkout 候选 → `pnpm install` → **vendor 面构建 = staging 树构建后拷回**（`git archive` 候选 → 独立 install + `pnpm run build` → 产物逐目录 `git check-ignore` 守门拷回；嵌套工作区跑不了 vendor face 构建，D27 在案且 0.2.0 逐字复现——见 [pin-upgrade Note](../notes/archived/2026-09-30-pin-upgrade-0.2.0-rc.2.md)）→ `test` + built `release-smoke` → 验证通过才写簿记/台账 → 再 `verify`。候选冒烟时台账仍为旧值，安装检查只确认其在场；成功后台账才增加实测 tag。安装限 180 秒、vendor build 与 release-smoke 各 600 秒，其余命令 120 秒；子进程组等待退出。

捕获到失败或 TERM/INT 时，恢复原 vendor HEAD、AGENTS/verify/compat-tags.json 和安装修改的 lockfile；不使用 reset/clean，不覆盖检测到的并发修改（报出需人工恢复的路径）。锁文件以安装结束时读到的版本为受控版本；运行期间不应并行编辑或安装。`node_modules`、缓存及 ignored 构建产物不回滚，失败后须按原 pin 重装/重建；强杀/断电无自动恢复保证。checkout 已发布 tag 不修改 vendor tracked 内容。

## 版本纪律

- pack 版本 `0.3.13`（`private: true`——**尚未发布到任何 registry**；真实发布动作（npm publish）等
  出现第二个消费者/部署需求时再定；本轮只把本地 tarball 交付内化为 `pnpm release`，未 publish。
  当前 release-smoke 验证的是 `file:` tarball 安装形状）。版本史与每版变化唯一家 =
  [CHANGELOG](../CHANGELOG.md)（此处不写变更史）；改内容必 bump（见下条）。
- 真实发布落定时的已判要件（2026-10-07 借语料 sdlc-11 登记；未到触发不预建脚本）：
  **registry 三态幂等**（无 → publish / sha512 同 → skip / 异 → fail「改内容没升版」）；
  **改内容必 bump 版本**；**发布字节 = 冒烟字节**（publish 的产物必须就是 release-smoke
  验过的那份，不另打包）。
- **OpenSpec 引入**（原 dev-loop §5 时点表随迁）：触发条件 = **第二贡献者进场**或**向 DSH 上游提 seam**（配合 D9 走方案 B）；此前 notes/ 纪律够用（FAQ 13 answer.md 决策 5）。
- 发布前必跑：`pnpm verify` + `pnpm test`（迭代环）+ `release-smoke`（认证档）+
  `channel-matrix-smoke --channel all`（真实 npm 通道）；
  preset/内容改动另跑 `preset-smoke`（guides/dev-loop §9.1 分层）。

## 手动分发（`node tools/export-dist.mjs`，无 key、秒级；2026-09-28 立，精神借 ai_dsh_architect）

一条命令产出仓库外可装的两件套到 `_dist/`：`dsh-company-pack-<version>.tgz` + 生成式《安装手册》。
三条规矩：

- **`_dist/` 是导出目的地不是源**：tgz 全 gitignore；《安装手册》是唯一 tracked 例外——
  由脚本生成（版本/日期/条目数注入），**永不手改**；verify 的 `dist-manual` 门禁核对手册表头
  版本 == pack package.json，**且**含 `run bundle` / `bundle.json` / `company-workspace` 关键句与
  当前 pin（升版本忘重导、或内容退回旧安装形状，都会红；反证 2026-09-28 与 2026-10-24 两次红→绿）。
  版本 bump 必须同 diff 重跑导出。
- **导出先 build**：`tsc -b` + `tsdown`（`lib/` 是 gitignored；直接 `npm pack` 会打旧产物，2026-10-26 实测风险）；
  **打包步 = release-smoke 同一条 `npm pack`**（npm cache 钉 scratch，§11）；导出后对产物本体
  再断言一次发布边界（cordis.patch.yml / lib 双半 / presets 在场，无 `package/` 外文件）。
- **产物身份**：`export-dist` 算 tgz 的 sha256，写同目录 `.sha256` 并注入手册；`dist-manual` 在
  本体在场时逐字节核对，未导出/新 clone 时只查形状，不冒充校验过。
- **导出 ≠ 发布**：不 bump 版本、不跑认证档、不进 registry——按工作树现状打包；真实发布动作
  仍按上文「版本纪律」（第二个消费者出现再定）。

交付对象拿到的安装/验证/卸载步骤都在手册里（镜像 release-smoke 验证过的路径），本节不复述。
