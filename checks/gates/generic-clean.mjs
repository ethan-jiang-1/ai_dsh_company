// 状态：常驻
// 何时跑：改 `content/generic/**` 或 `content/AGENTS.md` 后；发布前。跑法 = pnpm verify。
//
// 通用面零特殊性：通用层（AGENTS.md + generic/**）不得出现公司事实或产品类型术语。
// 为什么：换公司/换行业时，通用面应原句照用；出现一个公司词，就说明它被"特殊化"了。
// 词表分两类：
//   ① 公司：公司名、编制数字、政策数字；
//   ② 产品类型：系统工程中间层（StRS/SyRS/IRS）、硬件生命周期词、按域的研发切词（slice）。
//     MRD/PRD 是半通用的问题锚点，允许出现在通用层。
// 负例留证（建门时实跑）：把「梦之队」或「SyRS」写回 generic/routing.md → 红；还原 → 绿。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const CONTENT = 'packages/company-pack/content'

const BANNED = [
  { kind: '公司', name: '公司名「梦之队」', re: /梦之队/ },
  { kind: '公司', name: '编制数字「50 人」', re: /50\s*人/ },
  { kind: '公司', name: '毛利线 30%', re: /毛利[^\n]{0,16}30\s*%/ },
  { kind: '公司', name: '折扣线 9 折', re: /9\s*折/ },
  { kind: '公司', name: '固定支出 $500', re: /\$\s?500/ },
  { kind: '公司', name: '云预算 $2,000', re: /\$\s?2,?000/ },
  { kind: '公司', name: '试点预算 $200', re: /\$\s?200/ },
  { kind: '产品类型', name: '系统工程中间层 StRS/SyRS/IRS', re: /\b(?:StRS|SyRS|IRS)\b/ },
  { kind: '产品类型', name: '硬件生命周期词', re: /BOM|试产|量产|EVT|DVT|PVT|供应链|认证/ },
  { kind: '产品类型', name: '按域研发切词 slice', re: /\bslice\b/i },
  { kind: '产品类型', name: '具体类型 id', re: /hardware-software|b2b-saas/ },
]

function markdownFiles(dir, prefix = '') {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) out.push(...markdownFiles(join(dir, entry.name), rel))
    else if (entry.name.endsWith('.md')) out.push(rel)
  }
  return out
}

export function run({ root, ok, fail }) {
  const content = join(root, CONTENT)
  const generic = join(content, 'generic')
  if (!existsSync(join(content, 'AGENTS.md'))) {
    fail('generic-clean', `${CONTENT}/AGENTS.md 缺失`)
    return
  }
  const files = ['AGENTS.md', ...(existsSync(generic) ? markdownFiles(generic).map(rel => `generic/${rel}`) : [])]
  const problems = []
  for (const rel of files) {
    const lines = readFileSync(join(content, rel), 'utf8').split('\n')
    for (const [index, line] of lines.entries()) {
      for (const banned of BANNED) {
        if (banned.re.test(line)) {
          problems.push(`${CONTENT}/${rel}:${String(index + 1)} 通用面出现${banned.kind}内容「${banned.name}」`)
        }
      }
    }
  }
  problems.length === 0
    ? ok(`generic-clean（${String(files.length)} 份通用面；零公司词/产品类型词）`)
    : fail('generic-clean', problems.slice(0, 8).join('；') + (problems.length > 8 ? ` …共 ${String(problems.length)} 处` : ''))
}
