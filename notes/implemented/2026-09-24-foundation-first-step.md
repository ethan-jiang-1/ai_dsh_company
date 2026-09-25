# 基础环境小步修正：Notes 入口、运行路径与 home 隔离

状态：implemented（2026-09-24；仅本篇列出的第一批范围）

## Motivation

用户要求先改善 agent 的开发环境，随后明确强调：Notes 是 DSH 核心流程数据；AGENTS.md 及既有结构尽量少动，逐步验证。本次不把审计发现一次性改造成新流程。

## 交付与决定

- 保留根 AGENTS.md 的章节、入口顺序与纪律表，仅补四行 Notes 读写原则、调整布局说明并去除过期测试计数。Notes 是按主题读取的决策输入，也是同 diff 的交付证据；implemented 的实现事实继续维护，明确归档后才作为历史读取。
- 开发指南保留既有生命周期、Plan Mode、todo 和收尾检查，仅补 Notes 检索、取舍、事实维护及证据时效说明。没有据研究结论自动重定本仓流程。
- README 修正角色列表；五份 CHARTER 的工具路径与公司手册/角色 skills 一致，以会话 cwd 为基准使用 `kb/...`、`templates/...`、`deliverables/...`。不改业务数值、职责、历史 journal 或交付物。
- 六个现有 smoke（preset / probe / handbook / delegation / client-load / presence-e2e）共用 [runtime-home.mjs](../../scripts/lib/runtime-home.mjs)。未设 home 或与日用 `~/.dsh` 树重叠即 exit 2；检查符号链接和不存在路径的现有祖先。在创建排练场及启动服务前检查，不改服务启动器或正常测试流程。
- [foundation-safety.spec.ts](../../tests/foundation-safety.spec.ts) 将上述隔离与当前章程路径纳入既有 `pnpm test`，不新增执行层。

## Alternatives considered

- **一次重组入口、ROADMAP 与 Notes 全树**：未采用。现有体系仍有价值，用户要求小步推进；本轮不迁移或删除历史记录。
- **立即重写开发流程和 replay/release**：未采用。研究只证明一些本仓规则不同于 vendor，不代表应当全部替换。此前临时写入的宽泛流程改写已撤回，相关脚本未改。
- **仅提醒先 source env.sh**：不足。已有指南记录 coding 会话会继承日用 home；脚本必须在执行前自行拒绝，反例测试证明这条防线。
- **仅比较路径字符串**：不能识别符号链接及日用目录子路径。本次解析已有路径祖先，并比较目录包含关系；名称前缀相同的独立目录仍可用。

## Consequences 与范围

本次补充而非替代 [R6 开发流程记录](./2026-09-23-r6-content-remediation.md)，保留原有决定和验证历史。研究依据 = DSH 开发记忆（研究稿 2026-09-25 按 research 层生命周期毕业删除，全文见 git `335901e`；其基线为旧 pin rc.2，机制细节以现行 vendor 树为准）：Notes 原则部分采纳；生命周期适配已由 [notes-lifecycle-absorption](./2026-09-24-notes-lifecycle-absorption.md) 与开发环 §12 细则收口。

隔离守卫仅覆盖列出的六个入口，不等于全仓安全边界，也不防守检查后发生的并发符号链接替换。`entry-probe`、`snapshot-motion` 尚未统一；原 `release-smoke`、`deliverables-check` 守卫未改。本次没有扩展 Markdown 链接门禁，没有修改快照 expected、重放比较、发布启动器、vendor pin、client 生命周期或业务内容。

仍待分别核实/决策：Markdown 链接与 fragment 覆盖、ROADMAP 当前/历史的区分、entry probe 会话与判据、workspace expected 的独立性、发布源码/产物入口的证据、sync-dsh 的过程校验。这里只登记线索，不把它们写成已完成或自动排期授权。

## 实际跑过的验证

- `pnpm test -- tests/foundation-safety.spec.ts`：实际命令展开为 `vitest run -- tests/foundation-safety.spec.ts`，本次跑到了全套；12 个文件、107 条通过（含新增 16 条）。不把这次误扩范围描述成仅 focused run。
- `pnpm verify`：ALL PASS；根 AGENTS.md 113/115 行，开发指南 440/440 行，vendor pin 和 clean 检查通过。
- 六个入口逐个 `node --check`，再以缺失和日用 `DSH_HOME` 各启动一次：12 个拒绝用例均 exit 2，并含对应错误诊断；未调用模型、未启动服务。
- 路径反证：临时把 CEO 输出路径恢复为 `../deliverables/<slug>/final.md`，`pnpm exec vitest run tests/foundation-safety.spec.ts` 精确失败 1 条（exit 1）；还原正确路径后同命令 16/16 通过。
- `git diff --check`：通过。
- 未跑真模型、浏览器、正向服务 smoke、replay、release 或 typecheck；本轮不声称这些面得到新认证。

## 环境状态

没有启动替代 GUI、改动凭据或 vendor 受控文件；测试临时目录由测试清理。未提交或推送。正常服务启动行为未重新认证，继续使用前按该面的原有 smoke 检查。
