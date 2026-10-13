// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── 2g. 手动分发手册版本门禁（2026-09-28 立，精神借 ai_dsh_architect 的 tracked manual）────
// 负例留证 2026-09-28：手改手册表头版本 → dist-manual 红，跑 export-dist 还原 → 绿。
// 为什么：_dist/安装手册.md 是 tracked 生成物（tgz 之外的唯一 tracked 例外），表头版本若与
// pack package.json 漂移 = 手册教人装的版本不是仓库当前版本；升版本忘重导 = 谎报。
// 解法：版本 bump 必须同 diff 重跑 `node tools/export-dist.mjs`（手册由脚本生成、永不手改）。
export function run({ root, ok, fail }) {
  const packVersion = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8')).version
  const manualPath = join(root, '_dist', '安装手册.md')
  if (!existsSync(manualPath)) {
    fail('dist-manual', '_dist/安装手册.md 缺失——跑 `node tools/export-dist.mjs` 生成（tracked 生成物，随版本变更同 diff 重导）')
  } else {
    const manual = readFileSync(manualPath, 'utf8')
    const header = manual.split('| 版本 |')[1]?.split('|')[0]?.trim()
    header === packVersion
      ? ok(`dist-manual（安装手册表头版本 = pack package.json ${packVersion}）`)
      : fail('dist-manual', `安装手册表头版本（${header ?? '解析不到'}）≠ pack package.json（${packVersion}）——重跑 \`node tools/export-dist.mjs\` 再提交，别手改手册`)
  }
}
