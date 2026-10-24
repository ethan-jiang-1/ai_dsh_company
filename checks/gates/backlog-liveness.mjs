// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { join } from 'node:path'
import { backlogLivenessProblems } from '../../tools/lib/backlog-liveness.mjs'

// ── _backlog 活状态 + 索引交叉核对门禁（backlog-liveness；D33 原门唯一家）───────
// 为什么：D30 未完结卡缺户口、D33 搬卡未同步索引，两类真漂移要求位置、头与索引一起检查。
// 2026-10-09 整体借入 ai_dsh_assitant/scripts/checks/verify-checks.mjs 的
// backlogLivenessProblems + backlogGraduationProblems；method 字段形状来自源 methods/README。
// 本仓适配：制度目录与 README 必需；递归材料按 owner README 解析后的真实目标核对，不能用
// basename 跨桶碰巧满足。活跃区各桶根 README 持有索引，归档统一由 _archive/README 持有。归档旧讨论保留原文、不追补头；新研究与新归档自生效日起从严。
// 既有负例留证 2026-09-27/28：旧状态头缺失 → 红；D33 搬卡漏索引 → 红。
// 迁移反例留证 2026-10-09（真实仓文件，pnpm verify 红→逐项还原绿）：issues 卡删 opened →
//   backlog-liveness 报「缺 opened」；归档总索引改掉一条 settled issue 目标 → 报该卡未被 _archive/README.md 索引；
//   issues/README.md 暂移 → 报必需索引缺失；新 research 文件缺 frontmatter → 报缺 frontmatter。四项各自还原后 ALL PASS。
// 2026-10-10：函数体已原样挪进 tools/lib/backlog-liveness.mjs（本卡「两处重复收成模块」）。
// 2026-10-25：归档「毕业：做」卡的 durable 去向（opened ≥ 2026-10-25；老卡豁免）——理由与反证见 lib 的检查块。
// 留在本文件的是调用与上面这段「为什么」——判据正文只有一份实现，spec 改为直接 import 该模块
// （原先 spec 靠切本文件源码 + vm 求值，改这里的注释就会假红，已实测证伪后拆除）。
export function run({ root, ok, fail }) {
  const problems = backlogLivenessProblems(join(root, '_backlog'))
  problems.length === 0
    ? ok('backlog-liveness（制度目录/README、卡头、关闭判断、method 形状、递归索引、归档做卡去向）')
    : fail('backlog-liveness', problems.join('；'))
}
