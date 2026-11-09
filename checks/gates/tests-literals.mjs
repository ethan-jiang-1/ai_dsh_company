// 状态：常驻
// 何时跑：改测试、加新 spec、或调整公司 fixture 后；发布前。跑法 = pnpm verify。
//
// 测试也不能固化公司性质：期望值应从 `tests/fixtures/companies/**` 的 profile 读，
// 而不是把公司名/政策数字写进 spec。判据：tests/**/*.spec.ts(x) 里出现公司名或政策数字即红；
// 例外只有四类（allowlist，逐条注明原因）——产品词标、负向守卫、安装手册标题。
// 负例留证（建门时实跑）：把「梦之队」写进一个非 allowlist spec → 红；还原 → 绿。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const BANNED = [
  { name: '公司名', re: /梦之队/ },
  { name: '政策数字', re: /30\s*%|9\s*折|\$\s?500|\$\s?2,?000|\$\s?200|50\s*人/ },
]

/** 例外：每条都是"产品词标"或"负向守卫"，不是把公司事实当期望值。 */
const ALLOW = new Set([
  // 产品词标（出厂 fallback）与"显示名不得带公司名"的反向断言。
  'tests/client/ui/brand.spec.ts',
  'tests/presets/presets.spec.ts',
  // 负向守卫：证明"编码基线拒绝公司手册混入"必须写公司标题样本。
  'tests/harness/session/entry-probe.spec.ts',
  // 安装手册标题是产品名（dsh-company-pack），不是部署公司名。
  'tests/harness/repo/install-manual.spec.ts',
])

function specs(dir, prefix = '') {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) {
      if (entry.name === 'fixtures' || entry.name === 'node_modules') continue
      out.push(...specs(join(dir, entry.name), rel))
    } else if (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.spec.tsx')) {
      out.push(rel)
    }
  }
  return out
}

export function run({ root, ok, fail }) {
  const tests = join(root, 'tests')
  if (!existsSync(tests)) {
    fail('tests-literals', 'tests 目录不存在')
    return
  }
  const files = specs(tests)
  const problems = []
  for (const rel of files) {
    const full = `tests/${rel}`
    if (ALLOW.has(full)) continue
    const lines = readFileSync(join(tests, rel), 'utf8').split('\n')
    for (const [index, line] of lines.entries()) {
      for (const banned of BANNED) {
        if (banned.re.test(line)) {
          problems.push(`${full}:${String(index + 1)} 写死${banned.name}（期望值应从 tests/fixtures/companies 读）`)
        }
      }
    }
  }
  problems.length === 0
    ? ok(`tests-literals（${String(files.length)} 个 spec；公司事实零字面量，例外 ${String(ALLOW.size)} 条）`)
    : fail('tests-literals', problems.slice(0, 8).join('；') + (problems.length > 8 ? ` …共 ${String(problems.length)} 处` : ''))
}
