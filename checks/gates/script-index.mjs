// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：pnpm verify（每次）；新增/移动公开入口脚本后。
// 为什么：2026-10-20 审计发现 checks/README 手维护漏 5 个公开入口；先做「入口 → README 链接」覆盖。
// 2026-11-03（A- D1）：覆盖门禁反过来强制 README 手工枚举（违反 D28「枚举的家 = 实现自己」）。
// 现在改成「扫描目录 → 渲染生成物 → 校验新鲜度」：README 只链接 checks/INDEX.generated.md，
// 目录一变生成物就红，提示跑 `node tools/checks-index.mjs --write`。
// 负例留证 2026-11-03：临时建 checks/smoke/zz-index-probe.mjs → 生成物未更新 ⇒
//   `FAIL script-index: checks/INDEX.generated.md 与目录不一致……`；跑 --write 后绿；
//   删除探针后生成物多一条 → 再红；--write 还原 → 绿。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { renderScriptInventory, scanPublicScripts } from '../../tools/lib/checks-index.mjs'

export function run({ root, ok, fail }) {
  const readmePath = join(root, 'checks', 'README.md')
  if (!existsSync(readmePath)) {
    fail('script-index', 'checks/README.md 不在盘上——公开入口索引不许消失')
    return
  }
  const generatedPath = join(root, 'checks', 'INDEX.generated.md')
  if (!existsSync(generatedPath)) {
    fail('script-index', 'checks/INDEX.generated.md 不在盘上——先跑 node tools/checks-index.mjs --write')
    return
  }
  const gateCount = readdirSync(join(root, 'checks', 'gates'), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.mjs')).length
  const scripts = scanPublicScripts(root)
  const expected = renderScriptInventory(scripts, { gateCount })
  const actual = readFileSync(generatedPath, 'utf8')
  if (actual !== expected) {
    fail('script-index', `checks/INDEX.generated.md 与目录不一致（${String(scripts.length)} 个公开入口 / ${String(gateCount)} 门）——运行 node tools/checks-index.mjs --write（生成物勿手改）`)
    return
  }
  if (!readFileSync(readmePath, 'utf8').includes('](INDEX.generated.md)')) {
    fail('script-index', 'checks/README.md 未链接 INDEX.generated.md——清单一处家，README 只做指针')
    return
  }
  ok(`script-index ×${String(scripts.length)}（生成库存与目录一致；README 已链接）`)
}
