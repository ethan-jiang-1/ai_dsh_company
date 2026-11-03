/**
 * 测试临时目录 / 环境夹具（2026-10-28 R4-P3 收家）。
 *
 * 此前 host-composition / apply-lifecycle / catalog-wiring 各有一份 mkdtemp + 环境变量
 * 保存/恢复 + rmSync 的样板；catalog.spec / two-homes 各有一份裸 mkdtemp。这里只收
 * **临时目录生命周期**，不替调用方决定 DSH_HOME/公司盘布局。
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** 只建临时目录；调用方自己负责 rmSync（目录型测试用）。 */
export function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

export interface TempEnv {
  readonly dir: string
  readonly home: string
  readonly company: string
  readonly workspace: string
  /** 设置环境变量并记住原值；undefined = 删除。 */
  readonly set: (vars: Readonly<Record<string, string | undefined>>) => void
  /** 恢复环境并删除整棵临时目录（幂等）。 */
  readonly cleanup: () => void
}

/** 临时目录 + home/company/workspace 三个约定子路径 + 环境保存/恢复。 */
export function createTempEnv(prefix: string): TempEnv {
  const dir = makeTempDir(prefix)
  const saved = new Map<string, string | undefined>()
  let cleaned = false
  // 测试进程的 env 是完整 NodeJS.ProcessEnv；client 构建面把 process.env 收窄成 DSH_CLIENT_*，
  // 这里显式回宽，避免 test project 用 client 类型时任意 key 索引报 TS7053（2026-11-03）。
  const env = process.env as Record<string, string | undefined>
  return {
    dir,
    home: join(dir, 'home'),
    company: join(dir, 'company'),
    workspace: join(dir, 'workspace'),
    set(vars) {
      for (const [key, value] of Object.entries(vars)) {
        if (!saved.has(key)) saved.set(key, env[key])
        if (value === undefined) delete env[key]
        else env[key] = value
      }
    },
    cleanup() {
      if (cleaned) return
      cleaned = true
      for (const [key, value] of saved) {
        if (value === undefined) delete env[key]
        else env[key] = value
      }
      rmSync(dir, { recursive: true, force: true })
    },
  }
}
