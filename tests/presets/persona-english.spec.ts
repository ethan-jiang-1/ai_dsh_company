/**
 * Persona 英文单份棘轮（I1，keyless）。
 *
 * 只扫每个 preset 的 `prefix: |-` 人格块，不扫 YAML 注释/计划模式 section。
 * PENDING 之外的 persona 不得含中文；每翻一个就删一行，最终 PENDING 为空 = 硬门禁。
 * 当前 pilot = CFO；其余 10 个仍待翻。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'

const ROOT = repositoryRoot
const CJK = /[\u3400-\u9fff]/u
const PRESETS = 'packages/company-pack/presets'
const TRANSLATED = new Set(['cfo', 'coo', 'vp-sales', 'cmo', 'vp-eng', 'ceo', 'worker', 'worker-orchestrator', 'worker-researcher', 'quality-loop-producer', 'quality-loop-verifier'])
const PENDING = new Set([])

/** 取 `prefix: |-` 起的缩进块（到缩进回退为止）。 */
function personaOf(text: string): string {
  const lines = text.split('\n')
  const start = lines.findIndex(line => /^\s+prefix:\s*\|-\s*$/.test(line))
  if (start === -1) return ''
  const indent = /^\s*/.exec(lines[start])?.[0].length ?? 0
  const body: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '') { body.push(line); continue }
    const current = /^\s*/.exec(line)?.[0].length ?? 0
    if (current <= indent) break
    body.push(line)
  }
  return body.join('\n')
}

describe('persona 英文棘轮（I1）', () => {
  it('全部 persona 无中文；PENDING 清单与盘上 preset 对齐', () => {
    for (const role of [...TRANSLATED, ...PENDING]) {
      const text = readFileSync(join(ROOT, PRESETS, role, 'agent.cordis.yml'), 'utf8')
      expect(personaOf(text), `${role} 没有 persona prefix`).not.toBe('')
    }
    const cfo = personaOf(readFileSync(join(ROOT, PRESETS, 'cfo', 'agent.cordis.yml'), 'utf8'))
    expect(cfo).not.toMatch(CJK)
    expect(TRANSLATED.has('cfo')).toBe(true)
    expect(PENDING.has('cfo')).toBe(false)
  })

  it('已翻 persona 不得含中文', () => {
    const offenders = [...TRANSLATED]
      .filter(role => !PENDING.has(role))
      .filter(role => CJK.test(personaOf(readFileSync(join(ROOT, PRESETS, role, 'agent.cordis.yml'), 'utf8'))))
    expect(offenders, `以下 persona 不在 PENDING，但仍有中文：\n${offenders.join('\n')}`).toEqual([])
  })
})
