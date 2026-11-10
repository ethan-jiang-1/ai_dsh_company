# 2026-11-10 · 停写回执点名原因：`/req` / `/prd` / `/deliverables` / `/cultivation` 不再说「无 workspace/身份/lease 问题」

状态：implemented（2026-11-10 交付；上游 = [BUG-058](../../_backlog/_archive/fixed_bugs/BUG-058-command-datablocked-reason.md)）
> 同机制的上游决定：[runtime guard](../../_backlog/_archive/settled_issues/2026-11-07-requirements-e2e.md) 的停写守卫
> （C6 已判「期望语义，不是产品红」）；[命令 slug 边界](./2026-11-10-command-slug-boundary.md)（同一命令面的
> 输入边界；本 Note 不覆盖它）。

## 问题

`prepareCompanyRuntime()` 已经知道停写原因（未指定 workspace / writer lease 被占 / bundle 坏 /
落点不安全），但 `src/index.ts` 只把 `dataBlocked` 布尔传给命令与培养注册。命令回执因此硬编码：

> 公司数据已停写（无 workspace/身份/lease 问题）；先选 workspace 再校验。

真实原因恰恰就是其中之一：
- dev home 的 writer lease 被陈旧进程 pid 98394 持有 → 同一句；杀掉 holder 后同命令成功。
- `DSH_COMPANY_HOME` 指向不存在目录 → 同一句；用有效 workspace 重启才成功。
- 同一 web 内建一个 cwd 是有效 workspace 的会话，命令仍是同一句——它读的是启动时的布尔。

## 决定

1. `CompanyRuntime` 增 `blockedReason?: string`；`prepareCompanyRuntime` 在每条停写分支
   （无 workspace / lease 败 / 落点不安全 / workspace 不存在 / bundle corrupt / unsupported）
   `block()` 一个可读原因，多个原因用 `；` 拼接；`dataBlocked=false` 时不带该字段。
2. `src/index.ts` 把 `runtime.blockedReason` 传给 `/req`、`/prd`、`/deliverables`、`/cultivation`
   （`exactOptionalPropertyTypes` 下用 `blockedFields` 展开，不显式传 `undefined`）。
3. 新增 host-only `blockedCompanyText(reason, action)`，四个入口共用：
   `公司数据已停写（原因：<reason>）；先处理该原因再<action>。若已选 workspace 仍停写，重启宿主
   让运行前提重新解析（当前命令读的是启动时的前提）。`
4. **不改变停写守卫本身**：无 workspace / lease 败 / bundle 坏仍然停写；只让原因可见、动作可执行。
5. **不做每命令重新取 lease/重解析 workspace**：lease 是启动期持有的资源，按命令重取会破坏
   writer 语义；raw session 的 cwd 不改变宿主前提，回执明确要求重启，而不是假装 picker 已生效。

## 输掉的方案

- **只改文案、不传原因**：仍然说不对；lease 冲突与无 workspace 需要不同动作。
- **每命令调用 `prepareCompanyRuntime` 重算**：会重复取 lease/写 settings，且可能在命令路径
  制造第二个 writer；停写守卫不是命令级资源。
- **取消停写守卫**：archived `requirements-e2e` C6 已判它是期望语义；本卡只修诊断。
- **接 GUI picker 的 workspace 变更事件**：是否 re-init 未证；本轮先用「原因 + 重启」的准确回执，
  若后续证 picker 会 re-init，再补事件重算。

## 后果

- 回执现在点名真实原因（lease / 未选 workspace / bundle / 落点），不再出现
  「无 workspace/身份/lease 问题」。
- 合法 workspace + 无 lease 冲突时，四个命令的回执与之前逐字一致。
- 启动态仍不会因 raw session cwd 自动更新；回执明确写「重启宿主」，用户不会再被送到
  「先选 workspace」却无效的路径。
- GUI picker 是否 re-init 未证；这是后续决定，不在本修复的承诺里。

## 验证

- `tests/host/run-bundle/runtime-guard.spec.ts`：corrupt / lease 被占 / 无 workspace 三例新增
  `runtime.blockedReason` 断言（`bundle.json 损坏` / `writer lease 被占用` / `未指定 workspace|DSH_COMPANY_HOME`）。
- `req-command.spec` / `prd-command.spec` / `deliverables-command.spec`：dataBlocked 回执断言
  `原因：<reason>` 且 **不** 含「无 workspace/身份/lease 问题」。
- 真入口：`DSH_COMPANY_HOME=/tmp/definitely-not-a-company-workspace` 起 web →
  `/req check` 回执 = `公司数据已停写（原因：DSH_COMPANY_HOME 指向的目录不存在：…）；先处理该原因再校验。…`；
  同一 web 内有效 cwd 会话仍停写；`DSH_COMPANY_HOME=company-workspace` 重启 → 正常回执。
- `pnpm test` 173 files / 1442 tests；`pnpm typecheck` 绿；`pnpm lint` 0 warnings；
  pack 重建（`tsc -b` + `tsdown`）后真入口复跑。

## 未验 / 未覆盖

- GUI picker 是否 re-init 未证（本 Note 只承诺「重启后生效」）。
- lease 冲突的**真入口回执**：keyless guard spec 已断言 reason，未再为它保留 live lease 冲突现场。
- 其它 `dataBlocked` 消费者：`/cultivation` 的 UI/工具面消息已接 reason，但未逐条 live 复跑。
