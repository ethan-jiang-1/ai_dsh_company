/**
 * 公司手册注入（2026-11-01 v3）。
 *
 * 手册是**只读产品内容**，住 pack 的 `content/AGENTS.md`；不再 seed 到 workspace，也不依赖
 * `agent-instructions` 的同目录候选。这里在 agent 创建时把手册注册成 system prompt section
 * （agent 作用域），并给出：
 * - 只读内容目录绝对路径（`<company-content>` 占位符的解析）；
 * - `.dsh-company/overrides/` 的优先规则（用户要改模板/手册时）。
 *
 * 注意：`agent-instructions` 仍保留，用来加载**用户项目自己的** `AGENTS.md`/`CLAUDE.md`；
 * 本 section 是公司手册，两者不混。
 */
import type { Context } from '@deepseek-ai/cordis'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NON_ROLE_PRESETS } from '../../lib/delegation-surface.ts'
import { RUN_BUNDLE_PATHS } from '../../lib/run-bundle-paths.ts'

export const HANDBOOK_SECTION = 'company:handbook'
/** 注入预算：build gate 核 `content/AGENTS.md` 字节数；运行时超限只告警，不静默截断。 */
export const HANDBOOK_MAX_BYTES = 32_768

interface AgentLike {
  readonly ctx: Context
}

export interface HandbookInjection {
  readonly text: string
  readonly source: string
  readonly bytes: number
}

/** 读手册：workspace override 优先，否则 pack content。 */
export function readHandbook(contentDir: string, workspace?: string): HandbookInjection {
  const override = workspace === undefined
    ? undefined
    : join(workspace, RUN_BUNDLE_PATHS.overrides, 'AGENTS.md')
  const source = override !== undefined && existsSync(override)
    ? override
    : join(contentDir, 'AGENTS.md')
  const raw = existsSync(source) ? readFileSync(source, 'utf8') : ''
  const text = [
    `Company content (read-only): ${contentDir}`,
    `When a role or skill says \`<company-content>/...\`, read that absolute path.`,
    `Pack-relative paths like \`content/...\` in skills and content resolve against this same directory.`,
    `If \`.dsh-company/overrides/...\` exists, prefer the override for templates/charters/handbook.`,
    '',
    raw,
  ].join('\n')
  return { text, source, bytes: Buffer.byteLength(text, 'utf8') }
}

/**
 * 给每个 agent 注册公司手册 section；agent 作用域，unload/dispose 时释放。
 *
 * 非公司角色（worker family 执行手 + 质量环能力档 producer/verifier）按 brief/任务书干活，
 * 不应被注入角色/汇报线/编制手册。默认跳过**整张非角色表**（`NON_ROLE_PRESETS`，与模型
 * `handbookSkipPresets()` 同源），不按单个 ID 白名单——新增非角色 preset 自动继承；
 * `skipPresets` 只作部署覆盖旋钮。
 * @param ctx - Host 上下文。
 * @param contentDir - pack 的 `content/`。
 * @param workspace - 当前 workspace（可选；用于 override 与内容目录提示）。
 * @param options - `skipPresets`：覆盖默认跳过集合的 preset id。
 */
export function registerHandbook(
  ctx: Context,
  contentDir: string,
  workspace?: string,
  options: { readonly skipPresets?: readonly string[] } = {},
): void {
  const handbook = readHandbook(contentDir, workspace)
  if (handbook.bytes > HANDBOOK_MAX_BYTES) {
    ctx.logger?.warn?.(`company-pack：公司手册 ${String(handbook.bytes)}B 超过注入预算 ${String(HANDBOOK_MAX_BYTES)}B；`
      + 'handbook-budget 门禁会红；运行时仍注入全文，不静默截断')
  }
  const skip = new Set(options.skipPresets ?? NON_ROLE_PRESETS)
  const fibers = new Map<AgentLike, ReturnType<Context['inject']>>()
  const install = (agent: AgentLike): void => {
    if (fibers.has(agent)) return
    if (skip.has(composedPresetOf(agent.ctx) ?? '')) return
    const fiber = agent.ctx.inject(['systemPrompt'], (scope) => {
      scope.systemPrompt.section({
        name: HANDBOOK_SECTION,
        order: 500,
        text: () => handbook.text,
        interpolate: false,
      })
    })
    fibers.set(agent, fiber)
  }
  ctx.on('agent/created', ({ agent }: { agent: AgentLike }) => { install(agent) })
  ctx.on('agent/disposed', ({ agent }: { agent: AgentLike }) => {
    const fiber = fibers.get(agent)
    if (fiber === undefined) return
    fibers.delete(agent)
    void fiber.dispose().catch(() => {})
  })
}

interface PresetReader {
  composedPreset(ctx: Context): string | undefined
}

/** 读 agent 当前 preset id；没有 preset 服务（测试/无 preset 组合）时返回 undefined。 */
export function composedPresetOf(ctx: Context): string | undefined {
  const get = (ctx as unknown as { get?: (name: string) => unknown }).get
  const presets = get?.('agentPresets') as PresetReader | undefined
  return presets?.composedPreset?.(ctx)
}
