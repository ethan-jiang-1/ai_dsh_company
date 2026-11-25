/**
 * preset 挂载健康面（2026-11-25，dim10 可诊断性）。
 *
 * 为什么：preset 行的 config 校验发生在**会话创建时**，UI 会把失败吞成“点了没反应”
 * （`checks/lanes/preset.entry.mjs` 头注的 R1 实证；仓库内，不随包分发）。此前唯一能把 broken 变可读的入口是
 * 跑 preset-smoke——运维/用户都没有第二条路。这里把 registry 的 `broken` 在**启动时**点名，
 * 并让运维在启动日志里直接看到 id + 原因（不必先跑 preset-smoke）。
 *
 * 不阻塞启动：`agentPresets` 不在组合里（headless 等）时 callback 不触发，report() 返回 ready:false。
 * 只读：不写公司数据、不做修复、不改变挂载结果。
 */
import type { Context } from '@deepseek-ai/cordis'

/** registry 一行里本模块关心的字段（`AgentPreset` 的子集）。 */
export interface PresetHealthRow {
  readonly id: string
  readonly broken?: string
}

/** 当前 broken 清单；`ready=false` = 组合里没有 preset registry（不是“全好”）。 */
export interface PresetHealthReport {
  readonly ready: boolean
  readonly broken: readonly string[]
}

/** preset 挂载健康面：`start()` 捕获服务并做一次启动自检，`report()` 供命令按需读。 */
export interface PresetHealth {
  report(): Promise<PresetHealthReport>
  start(): void
}

/** 纯函数：broken 行 → 「id: 原因」清单（空 broken 字符串按未坏处理）。 */
export function brokenPresetLines(rows: readonly PresetHealthRow[]): string[] {
  return rows
    .filter(row => row.broken !== undefined && row.broken !== '')
    .map(row => `${row.id}: ${row.broken ?? ''}`)
}

/** 启动告警文案（stderr 与 logger 同文；英文：host 日志不占 CJK 棘轮，见 company-static-audit R2）。 */
export function presetHealthMessage(lines: readonly string[]): string {
  return `company-pack: ${String(lines.length)} preset(s) failed to mount (new sessions will do nothing): ${lines.join('; ')}`
}

interface PresetRegistryLike {
  list(): Promise<readonly PresetHealthRow[]>
}

interface InjectedScoped {
  readonly agentPresets?: PresetRegistryLike
}

/**
 * 组合根调用一次：`start()` 里用软 inject 捕获 `agentPresets`（与 src/index.ts 的
 * workspaceRegistry 同款写法——服务缺席时 callback 不触发，不产生 PENDING）。
 */
export function createPresetHealth(ctx: Context): PresetHealth {
  let registry: PresetRegistryLike | undefined
  let started = false
  let warned = false

  const report = async (): Promise<PresetHealthReport> => {
    if (registry === undefined) return { ready: false, broken: [] }
    try {
      return { ready: true, broken: brokenPresetLines(await registry.list()) }
    } catch {
      // registry 读失败按「未就绪」处理：命令回显不谎报“全好”。
      return { ready: false, broken: [] }
    }
  }

  const warnBroken = (): void => {
    if (warned) return
    void report().then(({ ready, broken }) => {
      if (!ready || broken.length === 0 || warned) return
      warned = true
      const message = presetHealthMessage(broken)
      ctx.logger?.warn?.(message)
      process.stderr.write(`dsh: ${message}\n`)
    })
  }

  return {
    report,
    start: () => {
      if (started) return
      started = true
      const inject = (ctx as unknown as {
        inject?: (deps: readonly string[], callback: (scoped: unknown) => void) => unknown
      }).inject
      if (typeof inject !== 'function') return
      inject.call(ctx, ['agentPresets'], (scoped) => {
        const candidate = (scoped as InjectedScoped).agentPresets
        if (candidate !== undefined) registry = candidate
        warnBroken()
      })
    },
  }
}
