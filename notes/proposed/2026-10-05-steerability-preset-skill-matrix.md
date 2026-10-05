# 2026-10-05 · RFC：preset/skill/child 矩阵与 agent-loop seam（毕业拆分 3/6）

> 状态：RFC（已批准待实施；实施次序由用户逐条点名，D32）｜批准：2026-10-05 用户对话拍板（来源 = 推敲卡
> [repository-steerability](../../_backlog/_done/_closed_plans/2026-10-05-repository-steerability.md)
> 毕业；本条不含独立裁决项）

## 问题

「角色名 = preset = skills = child 身份」的错误推断会直接导致改错文件或验错行为：

- 四种会话形态不同源：独立角色 preset 根会话、CEO Lead 会话、teammate、命名 child——child 继承 Lead
  的组合；角色身份与方法论还来自成员名、任务书、CHARTER/KB。不能从名册角色名推断其加载了对应
  preset skills。
- preset 组合自包含：工具行不随 profile/bundle 继承（dev-loop §3.7 实证）；skill 实际生效证据只能从
  会话日志观察（`request/header.tools`），`--dump-config` 只证明组合层。
- seam 无明文：agent loop 属 vendor 运行机制；本 repo 负责 preset、bundle、host/client 面与 workspace
  约束——公司手册不是 Coding Agent 指令。

## 方案

1. **preset/skill/child 矩阵**（唯一家 = [docs/presets.md](../../docs/presets.md)）：四种会话形态 ×
   persona 来源 / 工具来源 / skills 来源 / cwd / CHARTER·KB / 日志位置 / 问人权限，一格一事实；
   与实际 preset 声明一致（改 preset 必同 diff 对照矩阵）。
2. **skill 生效证据定义**：会话日志 header/tool inventory = 可观察事实；读取手段（多帧 zstd 用
   `zstd -dc`）只引 [dev-loop §3.7](../../docs/guides/dev-loop.md) 不抄。
3. **agent-loop seam 段**（落 [docs/presets.md](../../docs/presets.md)；与 dev-loop §3 互链）：loop 属
   vendor；本仓四个责任面（preset 声明 / bundle 装配 / host+client 注册 / workspace 约束）列举；
   「公司手册 ≠ Coding Agent 指令」一句话 + 指针回根 AGENTS.md 入口路由。
4. **联动**：矩阵「改哪个文件」列与
   [pack 边界 RFC](2026-10-05-steerability-pack-boundaries.md) 的 owner 表同事实——改一处两处同步。

## 输掉的方案（留尸）

- **`--dump-config` 当 skill/工具生效证据**：只证明组合层不证明会话实际（测试宪法禁此类假绿）。
- **矩阵写进每个 preset 的 persona**：漂移面 ×5。
- **矩阵进公司手册**：那是公司角色读的面，维护主体不同。

## 验收

- 矩阵与实际 preset 声明逐行对照一致（人工对照 + 必要时 keyless 对照 spec）。
- 四种会话形态各有一行完整来源链；抽查一个真会话日志佐证 skill 证据行可观察。
- 「名册角色名 ≠ 加载 preset」有明确反例说明。
- 修改矩阵任一格能指出唯一文件与最窄验证。
