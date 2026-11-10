---
status: 已修
severity: P2
opened: 2026-11-10
---

# BUG-058：`/req` / `/prd` 的 `dataBlocked` 回执丢掉真实原因，并声称「无 workspace/身份/lease 问题」

> 严重级别：P2（次要）｜发现：2026-11-10｜状态：已修
>
> **留痕**：Note [notes/implemented/2026-11-10-command-blocked-reason.md](../../../notes/implemented/2026-11-10-command-blocked-reason.md)
>
> **审查**：agent — 重读 diff + runtime-guard/四命令 spec 红→绿 + 真入口无 workspace 复跑；见「修复证据」。

## 症状

- 在 dev home 的 writer lease 被另一个进程持有时，`/req check <valid>` 返回：
  `公司数据已停写（无 workspace/身份/lease 问题）；先选 workspace 再校验。`
  ——**「无 lease 问题」是假话**：真实原因就是这个 lease 被占。杀掉旧 holder 后同一条命令立刻成功。
- 在 `DSH_COMPANY_HOME=/tmp/definitely-not-a-company-workspace` 启动、随后用
  `session/create(cwd=company-workspace)` 建会话再跑，仍返回同一句；重启成
  `DSH_COMPANY_HOME=company-workspace` 后成功。也就是说命令读到的是**启动时**的 `dataBlocked` 布尔，
  不是当前会话/当前 workspace 的状态。
- 真实原因在启动 stderr 里有（runtime guard 的 `warn`：未指定 workspace / lease 被占 / 落点不安全等），
  但命令回执把它丢了。

## 根因（假设）

- `prepareCompanyRuntime()` 返回结构化 `CompanyRuntime`（含 `dataBlocked` / `resolutionError` /
  `lease.reason`），但 `src/index.ts` 只把 `dataBlocked` 布尔传给 `registerReqCommand` /
  `registerPrdCommand` / `registerCultivation`；命令层只有一个 boolean，无法说原因。
- 命令注册时把布尔闭包住，没有 workspace/lease 变化后的重新求值路径。runtime-guard 的头注说
  「等 Client picker 选目录后由可见的 session/onboarding 路径再初始化」，但本卡未证明 GUI picker
  真的会 re-init 插件；已证的是 **raw session 的 cwd 不会改变命令的启动态**。
- 回执文案是硬编码的 `无 workspace/身份/lease 问题`，在三种真实原因下都会说反。

## 暴露的失败类

**启动态 → 命令面：错误原因在传递中被压成布尔**。同型消费者：`/req`、`/prd`、`/cultivation`
（都接 `dataBlocked` 布尔）；修复应把「原因」作为结构化值传下去，而不是再加一句文案。
边界：停写守卫本身是**期望语义**（archived `requirements-e2e` C6 已判「不是产品红」）；
本卡只针对**回执丢原因/说反话**与**启动态不可更新**，不要求取消停写守卫。

## 复现

1. 制造 lease 冲突：保留一个持有 dev home writer lease 的旧进程（本轮是 pid 98394，cwd =
   `company-workspace`；`runtime/harness-home/company-pack.lock` 指向它）。
2. 起 web（dev home + company profile），`session/create(cwd=company-workspace)`，执行
   `/req check 2026-11-10-probe-cmd-business-software` → `公司数据已停写（无 workspace/身份/lease 问题）…`。
3. 杀掉旧 holder（`kill 98394`）后重跑 → `编号校验通过…；层 = MRD/StRS/PRD；动议类型 = business-software`。
4. 另证启动态：`DSH_COMPANY_HOME=/tmp/definitely-not-a-company-workspace` 起 web → 同句；
   同一 web 内建一个 cwd=`company-workspace` 的会话 → 仍是同句；用
   `DSH_COMPANY_HOME=company-workspace` 重启 → 成功。
5. 证据：2026-11-10 探索轮；web = dev home + company profile；fixture 用完即删。

## 修复关联

- `packages/company-pack/src/host/run-bundle/runtime-guard.ts`：`CompanyRuntime.blockedReason`
  收 `resolutionError` / `lease.reason` / `bundleState` / `validateCompanyHome` 的原因。
- `packages/company-pack/src/index.ts`：把 reason 传给命令/培养注册；**不做**每命令重取 lease；
  回执明确写「重启宿主」。
- `commands/blocked-text.ts`：`blockedCompanyText(reason, action)`；`req-command.ts` / `prd-command.ts` /
  `deliverables-command.ts` / `cultivation.ts` 共用，保留「公司数据已停写」总句。
- keyless：`req-command.spec` / `prd-command.spec` 加 `blockedReason` 三种输入的文案断言；
  若接 workspace 变更，加一条「picker 后重算」的纯逻辑 spec。
- 真入口：lease 冲突 + 无 workspace 两场景各一次，回执必须点名原因；清因后同命令成功。

## 已修判定

- lease 冲突回执点名「writer lease 被占」/ 无 workspace 回执点名「未选 workspace」，不再出现
  「无 workspace/身份/lease 问题」；总句仍是「公司数据已停写」。
- 在命令可用的条件下（清掉冲突/重启到有效 workspace），`/req check` 与 `/prd check` 返回正常回执；
  不要求停写守卫本身消失。
- keyless spec 覆盖三类 reason 的文案与一条合法路径；`pnpm verify` + `pnpm test` 绿。
- 若确认 GUI picker 会 re-init：补一条「选 workspace 后同进程命令恢复」的真入口证据；
  若不会：回执明确写「需重启宿主」，不把用户送到错误的动作。

## 修复证据（2026-11-10）

- **红**：`runtime-guard.spec` 三例先加 `blockedReason` 断言（修前 `undefined`）；
  `req-command.spec` / `prd-command.spec` / `deliverables-command.spec` 的 dataBlocked 用例先断言
  `原因：<reason>` 且不含「无 … 问题」（修前红）。
- **绿**：`pnpm test` 173 files / 1442 tests；`pnpm typecheck` 绿；`pnpm lint` 0 warnings；
  guard 的 corrupt / lease / 无 workspace 三例 reason 断言通过。
- **真入口**：`DSH_COMPANY_HOME=/tmp/definitely-not-a-company-workspace` 起 web →
  `/req check` = `公司数据已停写（原因：DSH_COMPANY_HOME 指向的目录不存在：…）；先处理该原因再校验。…`；
  同一 web 内有效 cwd 会话仍停写；`DSH_COMPANY_HOME=company-workspace` 重启 → 正常回执。
- **未覆盖**：GUI picker 是否 re-init（回执已明确要求重启）；lease 冲突的 live 回执（keyless guard 覆盖）。
