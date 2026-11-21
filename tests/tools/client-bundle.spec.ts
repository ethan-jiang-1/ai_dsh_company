/**
 * client 构建新鲜度判据（BUG-296）的 keyless 判据。
 *
 * 为什么单独一条：这条判据的全部价值在「源码变了就红」——而它自己不能被「怎么算变」写错。
 * 这里用临时仓库造最小结构：改 client 源 → 指纹变；改无关目录（content）→ 指纹不变；
 * 产物缺失 / 指纹缺失 / 指纹不一致 → 三种 problem 各自点名。
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CLIENT_BUILD_FINGERPRINT_PATH,
  clientBundleProblem,
  clientSourceFingerprint,
  writeClientBuildFingerprint,
} from '../../tools/lib/core/client-bundle.mjs'

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'client-bundle-'))
  const files: readonly (readonly [string, string])[] = [
    ['packages/company-pack/src/client/index.ts', 'export const a = 1\n'],
    ['packages/company-pack/src/lib/helper.ts', 'export const b = 2\n'],
    ['packages/company-pack/content/charter.md', '内容面，不进 client 字节\n'],
    ['packages/company-pack/tsdown.config.ts', 'export default {}\n'],
  ]
  for (const [rel, body] of files) {
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), body)
  }
  mkdirSync(join(root, 'packages/company-pack/lib'), { recursive: true })
  return root
}

describe('client 构建新鲜度', () => {
  it('产物缺失 ⇒ problem=missing 点名先构建', () => {
    const root = fixture()
    try {
      const problem = clientBundleProblem(root)
      expect(problem?.kind).toBe('missing')
      expect(problem?.detail).toContain('build-client.mjs')
    } finally { rmSync(root, { recursive: true, force: true }) }
  })

  it('产物在但没有指纹 ⇒ missing（无法判断是否当前源码构建的）', () => {
    const root = fixture()
    try {
      writeFileSync(join(root, 'packages/company-pack/lib/client.js'), '// bytes\n')
      expect(clientBundleProblem(root)?.kind).toBe('missing')
      expect(clientBundleProblem(root)?.detail).toContain('构建指纹')
    } finally { rmSync(root, { recursive: true, force: true }) }
  })

  it('源码变了没重建 ⇒ stale（这正是 293 被藏住的那个假绿）', () => {
    const root = fixture()
    try {
      writeFileSync(join(root, 'packages/company-pack/lib/client.js'), '// bytes\n')
      writeClientBuildFingerprint(root)
      expect(clientBundleProblem(root)).toBeUndefined()
      writeFileSync(join(root, 'packages/company-pack/src/client/index.ts'), 'export const a = 3\n')
      const problem = clientBundleProblem(root)
      expect(problem?.kind).toBe('stale')
      expect(problem?.detail).toContain('产物过期')
    } finally { rmSync(root, { recursive: true, force: true }) }
  })

  it('指纹只收 client 字节决定者：改 content 不算变（不逼人白重建）', () => {
    const root = fixture()
    try {
      const before = clientSourceFingerprint(root)
      writeFileSync(join(root, 'packages/company-pack/content/charter.md'), '改的是内容面\n')
      expect(clientSourceFingerprint(root)).toBe(before)
      writeFileSync(join(root, 'packages/company-pack/src/lib/helper.ts'), 'export const b = 4\n')
      expect(clientSourceFingerprint(root)).not.toBe(before)
    } finally { rmSync(root, { recursive: true, force: true }) }
  })

  it('构建后写指纹落在产物面（lib/.build-fingerprint，gitignored）', () => {
    const root = fixture()
    try {
      writeFileSync(join(root, 'packages/company-pack/lib/client.js'), '// bytes\n')
      const written = writeClientBuildFingerprint(root)
      expect(CLIENT_BUILD_FINGERPRINT_PATH.endsWith('lib/.build-fingerprint')).toBe(true)
      expect(written).toBe(clientSourceFingerprint(root))
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
})
