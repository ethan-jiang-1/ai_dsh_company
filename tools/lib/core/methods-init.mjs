// 质量环 starter 方法包的安装逻辑（纯函数，零 I/O 副作用由调用方给根）。
//
// 为什么是复制而不是 preset fallback root：方法层的合同是「人拥有、pack 升级不擦」；
// 复制到 <DSH_HOME>/company/methods/ 后，人可以改/换/删，preset 仍只读那一个根，不会出现
// 同名方法两个根、谁覆盖谁的歧义。已存在 = 跳过，不覆盖人的版本。

import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

/** 随 pack 发布的 starter 方法（与 content/methods/ 下的目录同名）。 */
export const STARTER_METHODS = ['system-architecture', 'vv-plan']
/** 两侧 preset id = 方法层的子目录名。 */
export const METHOD_SIDES = ['quality-loop-producer', 'quality-loop-verifier']

/**
 * @typedef {{ path: string, reason: 'exists' | 'source-missing' }} SkippedMethod
 * @typedef {{ copied: readonly string[], skipped: readonly SkippedMethod[] }} SeedResult
 */

/**
 * 把 pack 的 starter 方法复制到方法层。
 * @param {{ contentDir: string, methodsRoot: string }} input - pack 的 `content/`（含 `methods/<side>/<pack>/SKILL.md`）；`methodsRoot` = `<DSH_HOME>/company/methods/`。
 * @returns {SeedResult} 复制/跳过清单；已存在不覆盖。
 */
export function seedMethods(input) {
  const copied = []
  const skipped = []
  for (const side of METHOD_SIDES) {
    for (const pack of STARTER_METHODS) {
      const source = join(input.contentDir, 'methods', side, pack, 'SKILL.md')
      const target = join(input.methodsRoot, side, pack, 'SKILL.md')
      if (!existsSync(source)) {
        skipped.push({ path: `${side}/${pack}`, reason: 'source-missing' })
        continue
      }
      if (existsSync(target)) {
        skipped.push({ path: `${side}/${pack}`, reason: 'exists' })
        continue
      }
      mkdirSync(join(input.methodsRoot, side, pack), { recursive: true })
      cpSync(source, target)
      copied.push(`${side}/${pack}`)
    }
  }
  return { copied, skipped }
}
