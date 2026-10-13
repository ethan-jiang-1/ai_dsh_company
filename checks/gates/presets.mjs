// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { COMPANY_ROLE_IDS } from '../../tools/lib/company-roles.mjs'

// ── 3. preset 结构：5 角色 × (声明文件 + ≥1 skill) ─────────────────────────
// 负例留证 2026-09-27：移走一个 SKILL.md → skill-file 红。
// 0.1.7 起显示名/描述/order 内联进 `agent.cordis.yml` 的 `dsh-agent-preset` 行（原 preset.yml 并入），
// 故这里只要求声明文件；挂载验证归 preset-smoke（真 web 逐角色建会话）。
export const roles = COMPANY_ROLE_IDS
export function run({ root, ok, fail }) {
for (const role of roles) {
  const dir = join(root, 'packages/company-pack/presets', role)
  if (!existsSync(join(dir, 'agent.cordis.yml'))) fail('preset-file', `${role}/agent.cordis.yml 缺失`)
  const skillsDir = join(dir, 'skills')
  const skills = existsSync(skillsDir) ? readdirSync(skillsDir, { withFileTypes: true }).filter(e => e.isDirectory()) : []
  if (skills.length === 0) { fail('preset-skill', `${role} 无 skills/<name>/SKILL.md`); continue }
  for (const s of skills) {
    const skillMd = join(skillsDir, s.name, 'SKILL.md')
    if (!existsSync(skillMd)) { fail('skill-file', `${role}/${s.name}/SKILL.md 缺失`); continue }
    const body = readFileSync(skillMd, 'utf8')
    if (!body.includes(`name: ${s.name}`)) fail('skill-name', `${role}/${s.name} frontmatter name 不匹配目录名`)
  }
}
ok(`presets ×${roles.length}`)
}
