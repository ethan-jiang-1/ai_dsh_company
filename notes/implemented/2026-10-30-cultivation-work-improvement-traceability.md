# 2026-10-30 · 培养主线与后续工作证据

状态：已交付（用户于 2026-10-29 授权「看上去还可以，这样吧，你就落地实现了, setup goal, 静默自主执行如何?」，后续明确「静默，自主执行，克服一切障碍」并批准实施计划）
上游 = [_backlog/_archive/settled_issues/2026-10-29-cultivation-experience.md](../../_backlog/_archive/settled_issues/2026-10-29-cultivation-experience.md)
前决定：[培养主视图](./2026-10-28-cultivation-main-view.md)、[GUI 行动面](./2026-10-17-cultivation-gui-actions.md)、[培养回路](./2026-10-13-agent-cultivation-loop.md)；这些关于页面位置、命令通道和人侧角色闸的决定继续有效。

## 决定

培养板把“让角色今后的工作更好”作为单一主任务，现有纠正/跨角色建议入口由一个“开始记录一项工作”动作展开。提案仍由人直接编辑；AI 起草 v2 未开放。待处理、方法、素材仍复用既有区块和数据读取，没有新路由或权限通道。

提案卡展示提出者类型与角色语境、目标角色、原始来源、提出时间及已记录的决定。方法卡把来源、提出者、目标、采纳时间与采纳后观察并置；来源缺失明确显示未记录。界面描述的是角色语境而不是已认证的自然人。

每次 pass/fail 验证必须附一项具体的采纳后相似工作事实，经现有 `/cultivation verify` 人侧命令记录结论、依据和时间。最多保留 20 项观察，每项依据不超过 1000 字；超限输入由 host 拒绝。旧 `verification: pass|fail` 状态继续读取并显示，但因没有可靠历史，不伪造依据。失败观察不撤回方法；撤回仍走原有独立动作和确认。目标角色权限闸与 `source: user` 命令日志合同未变。

## 输掉的方案

- 将原型复制成新页面或改造培养专属会话：败于重复状态与既有三 tab / 左板右对话决定；只在现有 `CultivationBoard` 实现主线。
- 把验证依据放在前端本地或另建数据文件：败于无法和决定/记录原子关联、切换会话即丢失；采用现有记录 frontmatter 的有界验证历史。
- 失败即撤回：败于把一次观察混为治理决定；继续要求人另行明确撤回。
- 让 Agent 帮写候选：不在本次授权内；AI 起草 v2 仍须单独批准。

## 后果与边界

培养命令 `verify` 的旧无依据语法现在返回可操作错误，不再写入仅有 pass/fail 的新验证；GUI 会先要求证据。解析器对历史超长/坏形状验证历史保留主培养记录，并在方法卡告警，而不是将整条记录误作不存在。workspace 中的原始材料仍是证据正文；记录只保存其必要复述/背景引用，不复制完整工作档案。

## 验证（实跑）

- 红：`pnpm exec vitest run tests/company/cultivation.spec.ts tests/client/cultivation-board.spec.ts tests/client/cultivation-board-actions.spec.ts` 在实现前分别因缺失验证历史、host 接受空依据、主任务/来源 UI 不存在而失败。
- 绿：`pnpm exec vitest run tests/company/cultivation.spec.ts tests/client/cultivation-board.spec.ts tests/client/cultivation-board-actions.spec.ts tests/client/cultivation-compose-context.spec.ts`：4 files / 98 tests PASS。
- `pnpm test`：118 files / 1011 tests PASS。
- `pnpm typecheck`：exit 0。
- `pnpm verify`：初跑在 bare-path 因卡上的研究路径指针只存在于原型分支而红；移除不存在的活跃路径指针后复跑 ALL PASS。Replay fixture freshness 和 replay UI freshness 因当前盘无对应对象而 SKIP。
- `node probes/browser-visual/cultivation-gui-probe.mjs --isolated`（前置 `source run/env.sh`）：真 Web + Chromium 通过零挂载、单一主入口提交、可选成品背景、采纳、命令日志配对、角色闸拒绝、打开原文；隔离 home 无既有会话时诚实呈现空状态；脚本清理自身 marker 所有隔离运行数据。另跑 `node checks/smoke/ui-scene-smoke.mjs --isolated`，全部公司页签加载且零浏览器错误。
- 真人新手可用性测试未执行；自动化只证明交互路径、角色合同和渲染可运行，不证明文案对新人无困惑。
- 归档：用户 2026-10-30 指出该卡不应继续悬挂；卡按章程移入 settled_issues。真人新手可用性测试仍未执行，保留为本 Note 的后续体验观察，不作为卡关闭条件。
