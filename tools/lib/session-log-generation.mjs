// 会话日志世代选择（RFC log-generation，2026-10-05；合同 = tests/harness/session-log-generation.spec.ts）。
//
// 为什么存在：同一会话目录可能并存多世代日志（session.v3.jsonl.zstd + session.v4.jsonl.zstd——世代
// 升级期常态），而历史五处读取点选择逻辑各异（readdir 序第一个 / 迭代序最后一个 / 字典序取末位），
// 读错世代 = 静默遗漏新事件 = 导出/审计错事实。本模块把「选哪一份」钉成唯一语义。
//
// 选择规则（按优先级）：
//   1. 版本化 session.vN.jsonl(.zstd) 优先于无版本 session.jsonl(.zstd)（升级期混装时版本化 = 现行格式）；
//   2. 同为版本化：N 按**数值**比较取最高（v10 > v4——字典序在此会错）；
//   3. 同代双形态：zstd 优先（原始终态；明文 .jsonl 多为导出副本）。
// 排除：child 日志（session.k.jsonl / session.k.vN.jsonl——独立 agent 的日志，发现与读取归 replay 等
//   专用逻辑）与一切不匹配 canonical 形状的文件（header.json 等）。
// 缺失（空目录 / 目录不存在 / 只有 child）返回 undefined——跳过还是报错归调用方政策（审计器跳、
// 采集器 throw），本模块不替调用方决定。
// 解压与坏压缩不在本模块（纯选择逻辑、无子进程——keyless 可测；各调用方已有自己的 fail-loud/report）。

import { existsSync, readdirSync } from 'node:fs'

const VERSIONED = /^session\.v(\d+)\.jsonl(\.zstd)?$/
const UNVERSIONED = /^session\.jsonl(\.zstd)?$/

/**
 * 选一个会话目录的 canonical 日志（规则见文件头）。
 * @param sessionDir - 会话目录路径。
 * @returns `{ name, versioned, generation, zstd }`，无 canonical 日志时 undefined。
 */
export function pickSessionLog(sessionDir) {
  if (!existsSync(sessionDir)) return undefined
  let best = null
  for (const name of readdirSync(sessionDir)) {
    const versioned = VERSIONED.exec(name)
    const unversioned = versioned === null ? UNVERSIONED.exec(name) : null
    if (versioned === null && unversioned === null) continue
    const candidate = {
      name,
      versioned: versioned !== null,
      generation: versioned !== null ? Number(versioned[1]) : 0,
      zstd: name.endsWith('.zstd'),
    }
    if (best === null
      || (candidate.versioned && !best.versioned)
      || (candidate.versioned === best.versioned
        && (candidate.generation > best.generation
          || (candidate.generation === best.generation && candidate.zstd && !best.zstd)))) {
      best = candidate
    }
  }
  return best ?? undefined
}
