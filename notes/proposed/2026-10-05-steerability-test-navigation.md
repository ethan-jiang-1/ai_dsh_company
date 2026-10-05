# 2026-10-05 · RFC：测试资产导航与历史 oracle 标注（毕业拆分 6/6）

> 状态：RFC（已批准待实施；实施次序由用户逐条点名，D32）｜批准：2026-10-05 用户对话拍板（来源 = 推敲卡
> [repository-steerability](../../_backlog/_done/_closed_plans/2026-10-05-repository-steerability.md)
> 毕业；本条含同批拍板：entry-probe-smoke = 有 key 时的推荐首跑验收——真模型档、非强制、不进
> pnpm test；另给无 key 的 keyless 替代路径。原卡阶段 6（整体收口走查）折入本条验收）

## 问题

- tests/ 四分区（company/client/presets/harness）物理已立（同日迁移 b2b80c0），但各区 owner、测试对象、
  **不证明什么**没有导航 README；「改动面 → 最窄检查」映射靠逐个翻脚本头注。
- 快照资产历史事实与新政策未分：新 `workspace.expected` 是否独立 oracle 需声明；旧场景是录制副本的
  事实应在场景 README/manifest 标明而不篡改 payload。
- 新 Agent 首跑无推荐验收路径：[scripts/smoke/entry-probe-smoke.mjs](../../scripts/smoke/entry-probe-smoke.mjs)
  已是现成真入口（真模型认证档），但文档定位只在「入口链文档改动后跑」。
- 高风险断点缺 focused 反证：退役 profile 误用、失效链接、generated 误编辑、tmp 出口、preset/child
  语义。

## 方案

1. **新增 tests 导航 README（拟，落 tests/ 根）**：四区各一行 owner + 测试对象 + 不证明什么；改动面 →
   keyless spec → 装配 smoke → 机制 probe → replay scene → browser/真模型档映射表；**不复述脚本
   头注**（触发/成本/状态唯一源 = 脚本头注，README 只导航——AGENTS 命令表同款纪律）。
2. **场景元数据政策**：新 `workspace.expected` 须声明独立 oracle 与否；旧录制场景在 README/manifest
   标注来源性质；政策落 [snapshots/README.md](../../snapshots/README.md)；历史 payload 不动。
3. **entry-probe 定位（拍板）**：[docs/guides/dev-loop.md](../../docs/guides/dev-loop.md) §0.5 或 tests
   导航（实施时定）：有 `DEEPSEEK_API_KEY` 时的推荐首跑验收（真模型档、非强制、不作门禁）；无 key
   时的替代路径 = `pnpm verify` + `pnpm test` +
   [client-load-smoke](../../scripts/smoke/client-load-smoke.mjs)；不变成新任务调度流程。
4. **focused 反证测试归位**：日志世代（[日志世代 RFC](2026-10-05-steerability-log-generation.md) 自带）、
   preset/child 语义（[矩阵 RFC](2026-10-05-steerability-preset-skill-matrix.md)）、失效链接与 generated
   误编辑（结构门禁扩展候选，须带新反证）、tmp 出口（[运行态 RFC](2026-10-05-steerability-runtime-runbundle.md)）
   ——本条只收「测试资产导航」own 的部分。
5. **原卡阶段 6 收口走查折入本条验收**。

## 输掉的方案（留尸）

- **tests README 复述脚本清单**：必漂——脚本头注是唯一源。
- **entry-probe 设为必跑门禁**：真模型成本结构错位（花钱、慢）；「推荐」≠「强制」。
- **端到端当默认反馈**：测试宪法分层既定。

## 验收

- 一个 client 改动、一个 preset 改动、一个机制 helper 改动、一个运行态脚本改动——在导航 README 各有
  明确最窄检查行（实测走查）。
- `pnpm test` 不吸收真模型/浏览器档（layering 守卫仍绿）。
- `pnpm verify` 拦住代表性失效指针（既有门禁绿；如扩展门禁须带新反证）。
- 人类走查 + 新 Agent 走查（四任务：改角色 skill / 改 host 工具 / 改 client 页签 / 排查会话产物）
  记录进实施 Note——原卡阶段 6 收口。
