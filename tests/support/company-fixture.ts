/**
 * 公司 fixture 加载器（三层分离的测试资产，2026-11-09）。
 *
 * 为什么：测试不能把"这家公司是什么"写成常量。公司性质从 fixture profile 读，
 * 同一套 spec 换 fixture 跑两遍，才算"换公司成立"。
 *
 * 格式与目标 content 的 company 层同构：
 * - `identity.md`：frontmatter（company / productName / productType / timeZone）
 * - `organization.md` / `policy-lines.md`：`- key: value` 平文本行
 *
 * 判据边界：本加载器只读 `tests/fixtures/companies/**`；它不读产品 content。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const COMPANIES = fileURLToPath(new URL('../fixtures/companies/', import.meta.url))

export interface CompanyFixture {
  readonly id: string
  readonly dir: string
  readonly identity: Readonly<Record<string, string>>
  readonly organization: Readonly<Record<string, string>>
  readonly policy: Readonly<Record<string, string>>
}

/** fixture 根目录（绝对路径）。 */
export function companyFixtureRoot(): string {
  return COMPANIES
}

/** 盘上的公司 fixture id（排序）。 */
export function listCompanyFixtureIds(): readonly string[] {
  if (!existsSync(COMPANIES)) return []
  return readdirSync(COMPANIES, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
}

/** 取 YAML 头字段；没有头返回空对象。 */
function frontmatter(text: string): Record<string, string> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text)
  if (match === null) return {}
  const fields: Record<string, string> = {}
  for (const line of (match[1] ?? '').split('\n')) {
    const field = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line.trim())
    if (field !== null) fields[field[1] ?? ''] = (field[2] ?? '').trim()
  }
  return fields
}

/** 取 `- key: value` 平文本行（中英文冒号都认）。 */
function keyValues(text: string): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const match = /^-\s*([^:：]+)[:：]\s*(.+)$/.exec(line.trim())
    if (match !== null) fields[(match[1] ?? '').trim()] = (match[2] ?? '').trim()
  }
  return fields
}

/** 读一家公司 fixture；缺文件即抛（fixture 坏了要早红，不静默）。 */
export function loadCompanyFixture(id: string): CompanyFixture {
  const dir = join(COMPANIES, id)
  if (!existsSync(dir)) {
    throw new Error(`公司 fixture 不存在：${id}（盘上：${listCompanyFixtureIds().join(', ')}）`)
  }
  const read = (name: string): string => {
    const path = join(dir, name)
    if (!existsSync(path)) throw new Error(`公司 fixture ${id} 缺 ${name}`)
    return readFileSync(path, 'utf8')
  }
  return {
    id,
    dir,
    identity: frontmatter(read('identity.md')),
    organization: keyValues(read('organization.md')),
    policy: keyValues(read('policy-lines.md')),
  }
}

/**
 * 用 fixture 造一个最小 `content/`（state + charters + 手册），供 bootstrap 等机制测试。
 * 同一套 spec 用不同 fixture 调用它，就是"换公司跑"。
 */
export function materializeCompanyContent(contentDir: string, fixture: CompanyFixture): void {
  const company = fixture.identity['company'] ?? fixture.id
  mkdirSync(join(contentDir, 'state'), { recursive: true })
  mkdirSync(join(contentDir, 'charters'), { recursive: true })
  writeFileSync(join(contentDir, 'AGENTS.md'), `# ${company} 手册\n`)
  writeFileSync(join(contentDir, 'state/company.md'), `# ${company}\n\n公司名: ${company}\n`)
  writeFileSync(join(contentDir, 'state/org.md'),
    `# ${company} 编制\n\n- 总人数: ${fixture.organization['总人数'] ?? ''}\n- 部门数: ${fixture.organization['部门数'] ?? ''}\n`)
  writeFileSync(join(contentDir, 'state/owners.md'), '# owners\n')
  writeFileSync(join(contentDir, 'state/motion-ledger.md'), '# ledger\n')
  mkdirSync(join(contentDir, 'product-types/hardware-software'), { recursive: true })
  writeFileSync(join(contentDir, 'product-types/hardware-software/requirements-model.md'), '# process\n')
  mkdirSync(join(contentDir, 'company'), { recursive: true })
  writeFileSync(join(contentDir, 'company/policy-lines.md'),
    `# policy\n\n${Object.entries(fixture.policy).map(([key, value]) => `- ${key}: ${value}`).join('\n')}\n`)
  writeFileSync(join(contentDir, 'charters/ceo.md'), `# ${company} CEO\n`)
  mkdirSync(join(contentDir, 'kb-setup'), { recursive: true })
  writeFileSync(join(contentDir, 'kb-setup/seed.json'), JSON.stringify({
    seeds: [
      { source: 'state/company.md', target: '.dsh-company/kb/company.md' },
      { source: 'state/org.md', target: '.dsh-company/kb/org.md' },
      { source: 'state/owners.md', target: '.dsh-company/kb/owners.md' },
      { source: 'state/motion-ledger.md', target: '.dsh-company/kb/motion-ledger.md' },
      { source: 'charters/ceo.md', target: '.dsh-company/kb/ceo/CHARTER.md' },
    ],
  }))
}
