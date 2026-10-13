import { execFileSync } from 'node:child_process'

// zstd 解压的统一驱动（2026-10-14 重构轮收拢：此前 4 处近似拷贝——orient / snapshot-motion /
// session-log-export / journal-audit，「Node 内置只解第一帧、多帧日志必须走 CLI」的理由各写一遍）。
// 住 drivers/（spawn 真件 = 驱动侧；tools/lib 保持 keyless 纯逻辑——layering.spec 强制）。
// 何时跑：被上述四个入口 import；改动后实跑 pnpm orient、snapshot-motion-smoke 与 session-log-export 对拍。
// ⚠ maxBuffer 由调用方给（沿用各自现值 64M/256M/512M，**故意不统一**——统一缓冲上限属行为
// 变更，须各自先验证超大日志场景；默认值取最大档仅为缺参兜底）。

/** 全量解压一个 zstd 文件为 utf8 文本。`-d -c` 与各处旧写的 `-dc` 同义（合并短旗标）。 */
export const zstdText = (file, { maxBuffer = 512 * 1024 * 1024 } = {}) =>
  execFileSync('zstd', ['-d', '-c', file], { maxBuffer }).toString('utf8')
