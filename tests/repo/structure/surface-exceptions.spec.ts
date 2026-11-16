import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ASSETS, PROBES } from '../../../tools/lib/core/asset-lanes.mjs'
import { scanPublicScripts } from '../../../tools/lib/core/checks-index.mjs'
import { repositoryRoot as ROOT, scriptEntries } from '../../../tools/lib/core/repository-layout.mjs'
import { splitGfmTableCells, structuralLines } from '../../../tools/lib/core/repo-markdown.mjs'

/**
 * surface-exceptions 是第二张“面分类”清单：INDEX 回答“有哪些公开入口”，它回答
 * “哪些入口不是默认面”。两张表各自被使用，却没有一处交叉校验——本 spec 把例外表
 * 钉回调用的真实文件/类型，防它腐化成过期清单（D28 同款病）。
 *
 * 判据：
 * 1. 每行路径存在，且是公开入口扫描面里的文件；
 * 2. 面类型与文件形状一致（runner / fixture / 已耗；查询只要求路径存在）；
 * 3. 每个 `*-lane.mjs` 都在表里（runner 不会静默漏登记）；
 * 4. 每个 `probes/<domain>/<fixture>/index.mjs` fixture 都在表里；
 * 5. 除 tools/archive/ 外，任何头注 `状态：已耗` 的入口都必须在表里；
 * 6. 例外表里的文件不得同时被注册成 smoke/probe 资产。
 *
 * 不证明：某个入口“实际上”属于哪个面（那是语义审）；也不证明例外理由成立。
 *
 * 负例留证 2026-11-17：在例外表加一行 `checks/lanes/zz-fake.mjs`（非面 runner）
 *   → 路径不存在 + runner 形状不符两条红；删除 → 绿。
 */

const EXCEPTIONS = join(ROOT, 'docs/reference/surface-exceptions.md')

type Row = { path: string; face: string; reason: string; line: number }

function rowsOf(text: string): Row[] {
  const rows: Row[] = []
  for (const item of structuralLines(text)) {
    if (!item.structural) continue
    const line = item.text.trim()
    if (!line.startsWith('|')) continue
    const cells = splitGfmTableCells(line)
    if (cells.length < 3) continue
    if (cells[0] === '路径' || /^-+$/.test(cells[1] ?? '')) continue
    rows.push({
      path: (cells[0] ?? '').replace(/`/g, '').trim(),
      face: (cells[1] ?? '').trim(),
      reason: (cells[2] ?? '').trim(),
      line: item.lineNumber,
    })
  }
  return rows
}

const rows = rowsOf(readFileSync(EXCEPTIONS, 'utf8'))
const paths = rows.map(row => row.path)
const publicScripts = new Set(scanPublicScripts(ROOT))
const assetNames = new Set(ASSETS.map(asset => asset.name))
const probeNames = new Set(PROBES.map(probe => probe.name))
const kindOf = (face: string): string | undefined => /非面（([^）]+)）/.exec(face)?.[1]

describe('surface-exceptions：例外表与实际文件对账', () => {
  it('每行三列齐全、路径存在、理由非空，且路径是公开入口', () => {
    const problems: string[] = []
    for (const row of rows) {
      if (row.reason === '') problems.push(`${row.path}：缺理由（第 ${String(row.line)} 行）`)
      if (!existsSync(join(ROOT, row.path))) problems.push(`${row.path}：盘上不存在（第 ${String(row.line)} 行）`)
      if (!publicScripts.has(row.path)) problems.push(`${row.path}：不在公开入口扫描面（第 ${String(row.line)} 行）`)
    }
    expect(problems, '例外表必须逐行对到真实公开入口；路径/理由缺失或扫描面外都是红').toEqual([])
  })

  it('面类型与文件形状一致：runner / fixture / 已耗 / 查询', () => {
    const problems: string[] = []
    for (const row of rows) {
      const kind = kindOf(row.face)
      if (kind === undefined) { problems.push(`${row.path}：面列不是「非面（…）」（第 ${String(row.line)} 行）`); continue }
      if (kind === 'runner') {
        if (!row.path.endsWith('-lane.mjs') && basename(row.path) !== 'run-check-tests.mjs') {
          problems.push(`${row.path}：登记为 runner，但既不是 *-lane.mjs 也不是 run-check-tests.mjs`)
        }
      } else if (kind === 'fixture') {
        if (basename(row.path) !== 'index.mjs') problems.push(`${row.path}：登记为 fixture，但文件不是 index.mjs`)
      } else if (kind === '已耗') {
        const head = readFileSync(join(ROOT, row.path), 'utf8').split('\n').slice(0, 8).join('\n')
        if (!/^\/\/ 状态：已耗（\d{4}-\d{2}-\d{2}/m.test(head)) problems.push(`${row.path}：登记为已耗，但头注没有「状态：已耗（YYYY-MM-DD…）」`)
      } else if (kind !== '查询') {
        problems.push(`${row.path}：未知面类型「${kind}」（词表：runner / fixture / 已耗 / 查询）`)
      }
    }
    expect(problems).toEqual([])
  })

  it('每个 lane runner 与 probe fixture 都在例外表里', () => {
    const problems: string[] = []
    const laneDir = join(ROOT, 'checks/lanes')
    for (const entry of readdirSync(laneDir).sort()) {
      if (!entry.endsWith('-lane.mjs')) continue
      const rel = `checks/lanes/${entry}`
      if (!paths.includes(rel)) problems.push(`${rel}：lane runner 未登记进 surface-exceptions`)
    }
    for (const rel of publicScripts) {
      if (!rel.startsWith('probes/') || !rel.endsWith('/index.mjs')) continue
      if (!paths.includes(rel)) problems.push(`${rel}：probe fixture 未登记进 surface-exceptions`)
    }
    expect(problems).toEqual([])
  })

  it('除 tools/archive/ 外，所有已耗入口都在例外表里', () => {
    const problems: string[] = []
    for (const rel of scriptEntries(ROOT)) {
      if (rel.startsWith('tools/archive/')) continue
      const head = readFileSync(join(ROOT, rel), 'utf8').split('\n').slice(0, 8).join('\n')
      if (/^\/\/ 状态：已耗（\d{4}-\d{2}-\d{2}/m.test(head) && !paths.includes(rel)) {
        problems.push(`${rel}：已耗入口未登记进 surface-exceptions`)
      }
    }
    expect(problems).toEqual([])
  })

  it('例外表不重复，且例外不得同时被登记成 smoke/probe 资产', () => {
    expect(new Set(paths).size, `例外表有重复路径：${paths.join(', ')}`).toBe(paths.length)
    const problems: string[] = []
    for (const row of rows) {
      if (row.path.startsWith('checks/lanes/')) {
        const name = basename(row.path).replace(/\.(e2e|entry)\.mjs$/, '')
        if (assetNames.has(name)) problems.push(`${row.path}：在 surface-exceptions，同时是 ASSETS 里的 ${name}`)
      }
      if (row.path.startsWith('probes/')) {
        const name = basename(row.path).replace(/-probe\.mjs$/, '')
        if (probeNames.has(name)) problems.push(`${row.path}：在 surface-exceptions，同时是 PROBES 里的 ${name}`)
      }
    }
    expect(problems).toEqual([])
  })
})
