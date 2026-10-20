// 失败现场目录：所有浏览器探针共用同一落点与时间戳形状。
//
// 为什么：2026-10-20 审计发现 replay-ui 把截图/aria/console 写进 /tmp 固定名，下一次运行覆盖；
// client-load / cdp-probe 失败无截图。落点统一到 runtime/harness-home/diagnosis/（gitignored），
// 跨进程可回溯，且不把 token/页面内容塞进 tracked 区。
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 建一个带时间戳的失败现场目录。
 * @param {string} root 仓库根。
 * @param {string} label 工具/场景短名（只用作目录前缀）。
 * @returns {string} 目录绝对路径。
 */
export function diagnosisDir(root, label) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = join(root, 'runtime/harness-home/diagnosis', `${label}-${stamp}`)
  mkdirSync(dir, { recursive: true })
  return dir
}
