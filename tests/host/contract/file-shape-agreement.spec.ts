// 负例留证 2026-11-13（P0 矩阵落地时补）：把 `companyFileProblemAt` 的根 symlink 检查去掉 ⇒
// root-symlink-out 用例里 fileProblemAt 说 ok / 其它载体说 not-ok，Agreement 红；还原即绿。
/**
 * 公司盘文件形状的 Agreement 矩阵（P0，2026-11-13）。
 *
 * 判据：同一形状下，所有读载体归一后必须一致——要么都说 ok，要么都说 not-ok；
 * 只有 `readCompanyText` 把 missing/unsafe 折成 undefined 是**声明过**的更粗视图。
 * 子类（missing vs unsafe）允许分歧，但 primary 载体必须等于形状的预期类。
 *
 * 证明不了：写路径、跨进程/重启、内容语义（只判形状，不判 JSON 对不对）。
 */
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { companyFileProblem, companyFileProblemAt, readCompanyFileAt, readCompanyText } from '../../../packages/company-pack/src/host/run-bundle/company-root.ts'
import { plainFileProblem } from '../../../packages/company-pack/src/host/fs/safe-file.ts'
import { ALL_SHAPES, makeWorld, type World } from '../../support/world-shapes.ts'

const TARGET = 'kb/company.md'

interface Reader {
  readonly id: string
  run(world: World): unknown
}

const READERS: readonly Reader[] = [
  { id: 'company.fileProblem', run: (world) => companyFileProblem(world.ws, TARGET) },
  { id: 'company.fileProblemAt', run: (world) => companyFileProblemAt(join(world.ws, '.dsh-company'), TARGET) },
  {
    id: 'safe.plainFileProblem',
    run: (world) => plainFileProblem(join(world.ws, '.dsh-company'), join(world.ws, '.dsh-company', TARGET)),
  },
  { id: 'company.readText', run: (world) => readCompanyText(world.ws, TARGET) },
  { id: 'company.readFileAt', run: (world) => readCompanyFileAt(join(world.ws, '.dsh-company'), TARGET) },
]

/** 归一：ok / not-ok。`readCompanyText` 的 undefined 与 `readCompanyFileAt` 的 missing/unsafe 都是声明过的「更粗」视图。 */
function isOk(id: string, value: unknown): boolean {
  if (id === 'company.readText') return typeof value === 'string'
  if (id === 'company.readFileAt') return (value as { readonly kind?: string } | null)?.kind === 'text'
  return value === null
}

function describeViews(views: readonly { readonly id: string; readonly ok: boolean }[]): string {
  return views.map(view => `${view.id}=${view.ok ? 'ok' : 'not-ok'}`).join(' / ')
}

describe('公司盘文件形状的 Agreement 矩阵', () => {
  for (const shape of ALL_SHAPES) {
    it(`${shape.id}：所有读载体归一后一致`, () => {
      const world = makeWorld()
      try {
        shape.build(world, TARGET)
        const views = READERS.map(reader => ({ id: reader.id, ok: isOk(reader.id, reader.run(world)) }))
        expect(new Set(views.map(view => view.ok)).size, `载体不一致：${describeViews(views)}`).toBe(1)
        expect(views[0]?.ok, `primary 预期 ${shape.expected}，实得 ${describeViews(views)}`).toBe(shape.expected === 'ok')
        const primary = companyFileProblem(world.ws, TARGET)
        expect(primary, `primary 子类不等于预期 ${shape.expected}`).toBe(shape.expected === 'ok' ? null : shape.expected)
      } finally { world.cleanup() }
    })
  }
})
