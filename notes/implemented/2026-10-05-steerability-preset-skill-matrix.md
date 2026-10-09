# 2026-10-05 · preset/skill/child 矩阵与 agent-loop seam（steerability 毕业拆分 3/6，已实施）

状态：已消化（2026-10-05 实施完成；来源 = 推敲卡 [repository-steerability](../../_backlog/_archive/settled_issues/2026-10-05-repository-steerability.md) 毕业拆分第 3 条）

## 交付（现在时）

- **四形态矩阵立**（唯一家 = [docs/presets.md](../../docs/presets.md)「四形态矩阵」节）：独立 preset 根会话 / CEO Lead / teammate / 命名 child × persona 来源、工具·skills 来源、cwd·CHARTER·KB、日志、问人权限——一格一事实；「改哪一列 → 哪个文件」行与 [pack-boundaries](./2026-10-05-steerability-pack-boundaries.md) 的 owner 表同事实（联动闭环）。
- **skill/工具生效证据定义**：会话日志（`request/header.tools` 列实际工具名）= 可观察事实；读取手段唯一家 = [dev-loop §3.7](../../docs/guides/dev-loop.md)（只引不抄）；`--dump-config` 只证组合层、不证会话实际全貌。
- **agent-loop seam 段**（presets.md 矩阵节尾）：loop 属 vendor 运行机制；本仓四个责任面（preset 声明 / bundle 装配 / host+client 注册 / workspace 约束）；**公司手册 ≠ Coding Agent 指令**（指针回根 AGENTS 入口）。
- **反例落位**：「名册角色名 ≠ 加载 preset」以 sea-reconcile 代笔案为实证反例（[authorship-audit](../../checks/audit/authorship-audit.mjs) 头注为据，不复述案情）。

## 验证记录

- **真会话日志抽查**（session-f1a2731d 的 v4 明文导出）：`"tools":[{"name":"ask_user_question",…}]` 数组与 `"agentPreset":"ceo"` 字段均可直接观察——「skill/工具证据 = 会话日志」在真数据上成立。
- **人工对照（矩阵无新造事实）**：teammate/child 继承 = roles-isolation §2/§4 + pack README 已知限制（composeFrom、`agentPreset=ceo`、Team 工具可见不可调）；问人两条路 = presets.md 工具面既有行；生效边界 = 同文件既有表；世代选择口径 = session-log-generation。
- `pnpm verify` ALL PASS + `pnpm test` 316/316（presets.md 无行预算；bare-path/md-links 硬档扫过）。
- 最窄验证口径：改矩阵任一格 → 唯一文件 = docs/presets.md 该节；检查 = `pnpm verify` +（涉 preset 内容时）`pnpm test tests/presets` + preset-smoke。

## 输掉的方案（留尸）

- **`--dump-config` 当 skill/工具生效证据**：只证组合层不证会话实际（测试宪法禁此类假绿）。
- **矩阵写进每个 preset 的 persona**：漂移面 ×5，一处维护。
- **矩阵进公司手册**：那是公司角色读的面，维护主体不同。
- **keyless 对照 spec 钉矩阵锚点**：语义对照已由人工对照 + 真日志抽查覆盖；机械钉锚点属守卫膨胀（门禁升格判据 = 错误复发）——复发再升。
