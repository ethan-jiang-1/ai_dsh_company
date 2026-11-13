// 状态：常驻
// 何时跑：增删角色、改 preset 名册或委派工具键后；发布前。跑法 = pnpm verify。
//
// 名册漂移是静默错误：某份清单少了角色，门禁照绿，署名/journal/参与统计却静默归零。
// 判据：所有角色清单都与 canonical（`src/host/run-bundle/bootstrap.ts` 的 COMPANY_ROLES）集合相等；
// 工具键清单按 vp_eng → vp-eng 归一后再比。
// 负例留证（建门时实跑）：从 company-skeleton 的 ROLES 删 cmo → 红；还原 → 绿。
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const SPECS = [
  { file: 'packages/company-pack/src/host/run-bundle/bootstrap.ts', re: /COMPANY_ROLES\s*=\s*\[([^\]]+)\]/, label: 'COMPANY_ROLES' },
  { file: 'packages/company-pack/src/lib/presence-status.ts', re: /PRESET_KEYS\s*=\s*\[([^\]]+)\]/, label: 'PRESET_KEYS' },
  { file: 'tools/lib/company-roles.mjs', re: /COMPANY_ROLE_IDS\s*=\s*\[([^\]]+)\]/, label: 'COMPANY_ROLE_IDS' },
  { file: 'tools/lib/delegation-model.mjs', re: /FULL_ROLE_IDS\s*=\s*\[([^\]]+)\]/, label: 'FULL_ROLE_IDS' },
  { file: 'checks/gates/company-skeleton.mjs', re: /ROLES\s*=\s*\[([^\]]+)\]/, label: 'company-skeleton ROLES' },
  { file: 'tools/lib/rehearsal.mjs', re: /ROLES\s*=\s*\[([^\]]+)\]/, label: 'rehearsal ROLES' },
  { file: 'checks/lanes/channel-matrix.entry.mjs', re: /ROLES\s*=\s*\[([^\]]+)\]/, label: 'channel-matrix ROLES' },
  { file: 'packages/company-pack/src/client/wiring/delegation-keys.ts', re: /DELEGATION_TOOL_KEYS\s*=\s*\[([^\]]+)\]/, label: 'DELEGATION_TOOL_KEYS', subset: true },
]

function ids(inner) {
  return [...inner.matchAll(/'([^']+)'/g)].map(match => match[1] === 'vp_cmo' ? 'cmo' : match[1].replace(/_/g, '-')).sort()
}

export function run({ root, ok, fail }) {
  const problems = []
  let canonical = null
  for (const spec of SPECS) {
    const path = join(root, spec.file)
    if (!existsSync(path)) { problems.push(`${spec.file} 缺失（名册清单不在）`); continue }
    const match = spec.re.exec(readFileSync(path, 'utf8'))
    if (match === null) { problems.push(`${spec.file} 找不到 ${spec.label} 清单`); continue }
    const list = ids(match[1] ?? '')
    if (canonical === null) { canonical = list; continue }
    if (spec.subset === true) {
      const extra = list.filter(id => !canonical.includes(id))
      if (extra.length > 0) problems.push(`${spec.file} 的 ${spec.label} 含非角色键：[${extra.join(', ')}]`)
    } else if (list.join(',') !== canonical.join(',')) {
      problems.push(`${spec.file} 的 ${spec.label} = [${list.join(', ')}] ≠ canonical [${canonical.join(', ')}]`)
    }
  }
  problems.length === 0
    ? ok(`roster-consistency（${String(SPECS.length)} 份角色清单一致：${(canonical ?? []).join('/')}）`)
    : fail('roster-consistency', problems.slice(0, 8).join('；'))
}
