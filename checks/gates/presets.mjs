// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { COMPANY_ROLE_IDS, COMPANY_SUPPORT_PRESET_IDS } from '../../tools/lib/company-roles.mjs'

// ── 3. preset 结构：六角色 × (声明文件 + ≥1 skill，含第二 skill 根) + 非角色 preset × 声明文件 ───
// 负例留证 2026-09-27：移走一个 SKILL.md → skill-file 红。
// 0.1.7 起显示名/描述/order 内联进 `agent.cordis.yml` 的 `dsh-agent-preset` 行（原 preset.yml 并入），
// 故这里只要求声明文件；挂载验证归 preset-smoke（真 web 逐角色建会话）。
export const roles = COMPANY_ROLE_IDS
/** 非角色 preset（worker family / 质量环能力档）只要求声明文件 + 行能挂（skills 由 preset-smoke 真挂载验证）。 */
export const supportPresets = COMPANY_SUPPORT_PRESET_IDS
export function run({ root, ok, fail }) {
// ── 名单 ↔ 包内注册：preset 目录存在 ≠ 装进组合。每个 preset 必须在 package.json 的
// `dsh.bundle.patch` 数组里登记（它是 patch 的并入清单，不登记则名册里没有它）。
// 负例留证 2026-11-06：加 SA/SQA 时只建了 preset 目录、忘了登记数组 ⇒ `preset-smoke` 报
// `Unknown agent preset: system-architect`；本检查就是那次漏项的机械闸门。
const packJson = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8'))
const patch = packJson?.dsh?.bundle?.patch ?? []
for (const preset of [...roles, ...supportPresets]) {
  const rel = `./presets/${preset}/agent.cordis.yml`
  if (!patch.includes(rel)) fail('preset-bundle', `${rel} 未进 package.json dsh.bundle.patch（装了也不进名册）`)
}
for (const entry of patch) {
  if (!String(entry).startsWith('./presets/')) continue
  if (!existsSync(join(root, 'packages/company-pack', entry))) fail('preset-bundle', `${entry} 指向的文件不存在`)
}
for (const preset of supportPresets) {
  const dir = join(root, 'packages/company-pack/presets', preset)
  if (!existsSync(join(dir, 'agent.cordis.yml'))) {
    fail('preset-file', `${preset}/agent.cordis.yml 缺失（非角色 preset 必须随包发布）`)
  }
  // 非角色 preset 若声明了自己的 skills 目录，同样要过 frontmatter 校验——否则 skill 会静默不挂。
  const skillsDir = join(dir, 'skills')
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true }).filter(e => e.isDirectory())) {
      const skillMd = join(skillsDir, entry.name, 'SKILL.md')
      if (!existsSync(skillMd)) { fail('skill-file', `${preset}/${entry.name}/SKILL.md 缺失`); continue }
      if (!readFileSync(skillMd, 'utf8').includes(`name: ${entry.name}`)) {
        fail('skill-name', `${preset}/${entry.name} frontmatter name 不匹配目录名`)
      }
    }
  }
}
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
ok(`presets ×${roles.length} + 非角色 ×${supportPresets.length}`)
}
