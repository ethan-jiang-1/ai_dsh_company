// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { expectedSha, expectedTag } from './lib/pin.mjs'

// ── 5. vendor/dsh：submodule 钉在簿记 SHA，且工作树**一个字节都不许改**（铁律）──────
// 负例留证 2026-09-27：submodule HEAD 移到 HEAD~1 → vendor-pin 红；vendor 内 tracked 文件加一字节 → vendor-clean 红；.gitmodules URL 破坏 → gitmodules 红。
// 铁律的允许面（见 AGENTS.md §vendor 铁律）：**只读** + 在 vendor 内产生 **gitignore 覆盖的
// 构建产物**（lib/、dist/、node_modules/——"从源码跑"要求构建，构建必须在树内）。
// 任何 tracked 文件的改动、或未被 gitignore 的新文件，都判 FAIL。
// 为什么用 SHA 而不是 tag：tag 可被移动/别名，SHA 才是钉住的合同。
// （expectedTag / expectedSha 的唯一事实家 = gates/lib/pin.mjs；此处不再重复声明。）
export function run({ root, ok, fail }) {
const vendorDir = join(root, 'vendor/dsh')
const gm = readFileSync(join(root, '.gitmodules'), 'utf8')
if (!gm.includes('vendor/dsh') || !gm.includes('deepseek-ai/deepseek-harness')) fail('gitmodules', 'URL/路径不符')
else {
  const git = (args) => execFileSync('git', ['-C', vendorDir, ...args], { encoding: 'utf8' }).trim()
  try {
    const sha = git(['rev-parse', 'HEAD'])
    sha === expectedSha
      ? ok(`vendor-pin (${expectedTag} @ ${sha.slice(0, 8)})`)
      : fail('vendor-pin', `HEAD 是 ${sha}，簿记为 ${expectedSha}（${expectedTag}）`)
    const dirty = git(['status', '--porcelain'])
    dirty === ''
      ? ok('vendor-clean (工作树零改动)')
      : fail('vendor-clean', `vendor/dsh 被改动（铁律：只读；改动应走 upstream 升 pin 或本仓覆盖）→ ${dirty.split('\n').slice(0, 5).join(' | ')}`)
  } catch { fail('vendor-pin', 'vendor/dsh 未初始化（git submodule update --init）') }
}
}
