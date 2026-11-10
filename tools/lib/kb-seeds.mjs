// kb 装配清单（seed.json）在维护工具侧的唯一读取面。
//
// 为什么需要它：dev 的 `bundle:init` 与排练场 `mirrorCompanyReference` 曾各写一份文件清单，
// 与生产 bootstrap 的 seed.json 三份漂移——dev/rehearsal 盘缺 `policy-lines.md` /
// `review-protocol.md`（COO/CFO 判据无法闭合），`process-docs.md` 的 source 也早已搬走，
// 而 `AGENTS.md` 从未镜像（BUG-054）。旁路只许从 seed.json 派生，不再手抄第三份。
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'

export const SEED_MANIFEST = 'kb-setup/seed.json'
export const RUN_BUNDLE_DIR = '.dsh-company'
export const KB_DIR = `${RUN_BUNDLE_DIR}/kb`

/**
 * 读 seed.json；缺清单 / 坏 JSON / 条目残缺 / target 越界都 fail-loud
 * （与生产 `readSeeds` 同纪律——静默跳过就是 BUG-054 的失败类）。
 * @param {string} contentRoot - pack 的 `content/`。
 * @returns {{ source: string, target: string }[]}
 */
export function readSeeds(contentRoot) {
  const manifest = join(contentRoot, SEED_MANIFEST)
  if (!existsSync(manifest)) throw new Error(`缺 kb 装配清单：${SEED_MANIFEST}（安装形状不完整）`)
  let parsed
  try {
    parsed = JSON.parse(readFileSync(manifest, 'utf8'))
  } catch (error) {
    throw new Error(`kb 装配清单不可解析：${error.message}`)
  }
  const items = Array.isArray(parsed.seeds) ? parsed.seeds : []
  if (items.length === 0) throw new Error(`kb 装配清单为空：${SEED_MANIFEST}`)
  const seen = new Set()
  return items.map((item) => {
    const { source, target } = item ?? {}
    if (typeof source !== 'string' || source === '' || typeof target !== 'string' || target === '') {
      throw new Error(`kb 装配清单条目不完整：${JSON.stringify(item)}`)
    }
    if (isAbsolute(target) || target.split('/').includes('..') || !target.startsWith(`${RUN_BUNDLE_DIR}/`)) {
      throw new Error(`kb 装配 target 越界：${target}`)
    }
    if (seen.has(target)) throw new Error(`kb 装配重复 target：${target}`)
    seen.add(target)
    return { source, target }
  })
}

/** 只取公司事实/章程（`kb/`）；`.dsh-company/README.md` 这类 run bundle 说明件不参与旁路镜像。 */
export function readKbSeeds(contentRoot) {
  return readSeeds(contentRoot).filter(seed => seed.target.startsWith(`${KB_DIR}/`))
}

/**
 * 把 seed 的 kb 文件复制进 workspace。
 * @param {string} contentRoot - pack 的 `content/`。
 * @param {string} workspace - workspace 根（target 自带 `.dsh-company/kb/`）。
 * @param {{ onlyMissing?: boolean }} [options] - `onlyMissing` = 生产 bootstrap 的只补缺语义；
 *   缺省覆盖（排练场镜像要刷新参考状态）。
 * @returns {string[]} 实际写入的 target（相对 workspace）。
 */
export function seedKbFiles(contentRoot, workspace, { onlyMissing = false } = {}) {
  const written = []
  for (const seed of readKbSeeds(contentRoot)) {
    const source = join(contentRoot, seed.source)
    if (!existsSync(source)) throw new Error(`kb 装配缺源：${seed.source}（${SEED_MANIFEST} 指向的文件不存在）`)
    const target = join(workspace, seed.target)
    if (onlyMissing && existsSync(target)) continue
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(source, target)
    written.push(seed.target)
  }
  return written
}
