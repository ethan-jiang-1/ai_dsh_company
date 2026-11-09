# 沙箱后端探测：`sandbox-exec` 不可用时观察窗自动落 `danger-full-access`

状态：已交付（2026-10-10；用户令「这样用户体验最最重要，先把用户体验搞对就行」）。

## 问题：每条 bash 都弹批准框，批了还不算完

用户在观察窗里被反复要求批准沙箱升级，体感是「UX 太糟糕了」。用户还自问「历史上可能我判断错误了这里」——
**判断没错，是环境漂移**。真根因不在策略配置，而在这台机器的 Seatbelt 后端坏了：

```
/usr/bin/sandbox-exec -p '(version 1)(allow default)' /usr/bin/true
→ sandbox-exec: sandbox_apply: Operation not permitted   (exit 71)
```

`osascript` 绕开 harness 跑同一句**也是 71** ⇒ 与 DSH 无关，是 macOS 26.6.2 全机范围禁掉了 Seatbelt
（SIP enabled）。链路：base bundle 把沙箱定成 `DSH_PERMISSION_MODE ?? 'workspace-write'`，审批策略
定成 `mode === 'danger-full-access' ? 'never' : 'ask'`；而 `workspace-write` 需要一个**真能建围栏**的
执行器。DSH 对此 fail-closed（vendor `SandboxUnavailableError`：*refusing to run the command
unconfined*），于是**每条 bash 都退化成「请求升级」**——`ls`、`pwd` 这类纯读命令也一样，且批准一次
只买通一条命令（`allowed-once`），下条照问。

**真实会话证据**（`runtime/harness-home/sessions/…company-workspace--/session-05658e8c…`，CEO preset）：
5 次 `approval/asked`，5 次理由全是同一条
`escalate sandbox to danger-full-access: 沙箱后端在本机不可用（sandbox-exec 无法启动）`，
全部 `allowed-once`。与会话里第一条 `approval/asked`（seq 31）对应的却是一条纯读的
`pwd && ls && ls kb/ceo/`——**批准框与操作的危险程度完全脱钩**，用户只能一路点同意。这才是体感糟的
机制原因：当批准泛滥到只能盲批时，它就不再是安全机制，只是噪音。

## 决定：启动时探测后端，不可用则落 `danger-full-access`

`run/env.sh` 加一段探测（**明示输出，不静默**——这里的坑与双 home 同形：不报错、只是行为悄悄变糟）：

- macOS 上实跑 `sandbox-exec -p '(version 1)(allow default)' /usr/bin/true`；
- 通过 ⇒ 保持 `workspace-write`（**围栏优先，后端恢复就自动回去**，不是硬编码降级）；
- 失败 ⇒ `export DSH_PERMISSION_MODE=danger-full-access`，并在 stderr 说明取舍；
- 逃生阀：已设 `DSH_PERMISSION_MODE` 则尊重；`DSH_SKIP_SANDBOX_PROBE=1` 跳过探测；
- 非 macOS 交给上游链（Linux 走 bwrap/landlock）。

依据 = 上游自己的处方，写在同一条错误信息里：*ensure `sandbox-exec` is usable (macOS) … otherwise
switch the consumer to `danger-full-access`*（`vendor/dsh/packages/sandbox/sandbox/src/index.ts`）。
`danger-full-access` 在 base bundle 里同时把审批策略推成 `never` ⇒ 两个轴一起解决。

## 输掉的方案

- **改 `~/.dsh` 或 dev home 的 profile `cordis.patch.yml`**：只治一份 home，且**换机器/换 home 复发**——
  坑在机器不在配置。更要命的是它会**永久钉死降级**，后端哪天修好了也不会自动回到 `workspace-write`。
- **在 company-pack 里改 permission preset 表**：动的是**所有**部署（含后端正常的机器）的产品行为，
  为了让一台坏机器好用而牺牲所有好机器的围栏；且 pack 是交付物，不该编码本机特例。
- **硬编码 `DSH_PERMISSION_MODE=danger-full-access`**：同样是永久降级，且对 Linux 机器是**无谓**的降权。
- **什么都不做，只在文档里写「多点是」**：等于把机械问题转成人的纪律，且每次批准只买通一条命令——
  一场动议几十上百次点击，不是「多点是」的量级。
- **修好 Seatbelt / 换 Linux**：保留真围栏，是更正确的长期路，但今天在本机做不到（macOS 26 限制），
  且不解决「后端不可用时 UX 崩坏」这个模式本身——探测逻辑对两种结局都成立。

## 验证（真跑过的命令与红/绿）

- **红（造红）**：`if /usr/bin/sandbox-exec -p '(version 1)(allow default)' /usr/bin/true; then …` ⇒
  FAIL 分支（exit 71）⇒ 证明探测判据真的判得出来，不是恒绿。
- **反证（修前语义）**：旧会话 `approval/policy = ask`，39 条命令里 5 次 `approval/asked`。
- **绿（端到端，真模型一次）**：
  `source run/env.sh && pnpm dsh --profile headless "列出 kb/ceo 目录下的文件（只读，不要写任何东西）"`
  ⇒ 会话日志 `session-e373255b…`：`permission/preset = danger-full-access`、
  `sandbox/mode = danger-full-access`、`approval/policy = never`，**`approval/asked` 次数 = 0**。
- **逃生阀各一遍**：已设 `DSH_PERMISSION_MODE=read-only` ⇒ 保留 `read-only`；`DSH_SKIP_SANDBOX_PROBE=1`
  ⇒ 不设值（走上游默认）。
- **回归**：`pnpm verify` ALL PASS（含 vendor-pin / vendor-clean：本次**未动 vendor 一个字节**）；
  `node checks/smoke/client-load-smoke.mjs` ALL PASS；
  新观察窗 `cdp-probe` 全真：composer/品牌/8 页签零失败、console 零 error。

## 后果与边界

- **核账：本机此后 bash 无围栏。** 这是有意的取舍，不是疏漏：该围栏在本机**本就不存在**，
  此前每次 `allowed-once` 事实上已在给全权，却还要人点一次。危险面**没有变大**，只是不再假装有闸门。
- 本改动**只治本机观察窗的启动环境**，未改 `checks/` 的取数——详见下条的两处更正。
- **`checks/` 取数核查（2026-10-10 收口，两次独立查证）**：原先怀疑的"同源隐患"经查**都不成立**，故未动：
  - `checks/smoke/entry-probe-smoke.mjs`：它的 `read-only` 不在脚本里，而在
    `run/entry-probe.patch.yml` 的 profile 层（`sandbox-policy.mode: read-only` + `approval.policy: never`），
    是**有意**的 fail-closed 档。实测该探针**容忍** fail-closed：最近一次归档
    （2026-10-10 的 entry-probe 答卷；真实证据已随 2026-10-25 清理移出产品仓）得 12/13，唯一失败项是 Q1
    引文不匹配（内容问题）；那次会话 1 条 bash 撞 fail-closed，agent 改用 read/grep/glob 完成，
    `approval/asked` = 0。历史分数本就在 0/12–12/12 间波动 ⇒ 是这个探针的固有噪声，不是 sandbox 回归。
  - `checks/smoke/replay-smoke.mjs:279` 的 `DSH_PERMISSION_MODE: 'workspace-write'` 是**死代码**（行号随重构移位）：
    `snapshots/replay/*/replay/cordis.snapshot.yml` 在更外层把 `sandbox-policy.mode` 钉成
    `workspace-write`，覆盖 base bundle 对环境变量的读取。A/B 实跑（同一个真实 headless 命令，只差
    环境变量）产出**逐字节相同**的 `sandbox/mode`、`approval/policy` 与内嵌的
    `Current DSH file policy: workspace-write` ⇒ 改它**既不能变红也不能变绿**，所以留原样。
  - 由此更正前一句的措辞：本 Note 说"replay-smoke 用 workspace-write"**只是就环境变量而言**；真正驱动
    录制事件的是各场景自己的 profile patch。
  - **再次更正（2026-10-10 晚，第三次实跑证伪）**：上面"replay-smoke 与沙箱后端无关"一句**只对
    headless lane（foundation-workspace，场景 patch 钉了 sandbox-policy）成立**，web lane
    （r3-delegation）**姿态敏感**——无钉值场景下会话事件 `sandbox/mode` 的值直接来自 env.sh 的探测
    结果，本机 danger-full-access vs 录制时 workspace-write ⇒ 归一化比对红。修法不是钉值（钉
    workspace-write 在后端损坏的机器上会让 permission 事件整体不发射，实测三条全消失），而是
    `tools/lib/replay-logic.mjs` 的 `normalizeReplayTimeContext`（由 `replay-smoke` 调用）把姿态事件**值**脱敏为 `{{posture}}`（类型/位置/`source`
    保留），r3 随 diff 重录 ⇒ 判据对机器姿态无关。见
    [2026-10-10-replay-posture-redaction](../archived/2026-10-10-replay-posture-redaction.md)。
  - **未做的事**：要让 replay 反映本机真实沙箱姿态，得逐个改场景 `cordis.snapshot.yml` 并重录——那是
    测试面变更，按 [测试宪法](../../docs/testing.md)需另立证据。本 Note 不授权它。
- 后端恢复（或换 Linux）后无需改代码：探测会自动回到 `workspace-write`，届时本 Note 的事实落点
  = `run/env.sh` 那段探测的注释，随改动就地更新。
