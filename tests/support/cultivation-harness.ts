/**
 * 培养 host spec 的共享测试脚手架（R5-23 拆族后）：Cordis 注册面替身 + 临时培养盘 + 命令调用。
 * 不是产品代码；只被 tests/host/cultivation-*.spec.ts 使用。
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CommandDefinition } from '@deepseek-ai/dsh-commands'
import type { Context } from '@deepseek-ai/cordis'
import { registerCultivation, type CultivationHostConfig } from '../../packages/company-pack/src/host/cultivation/cultivation.ts'

/** 注册真正的培养工具/命令；只替身 Cordis 注册面，回调仍是生产实现。 */
type RegisteredCultivationTool = Parameters<Context['tools']['register']>[0]

export function cultivationRegistrations(
  config: CultivationHostConfig,
  sessionQuery?: unknown,
  companyHome?: string,
  fs?: unknown,
  sandboxPolicy?: unknown,
): {
  readonly command: CommandDefinition['handler']
  readonly proposal: RegisteredCultivationTool
} {
  const commands: CommandDefinition[] = []
  const tools: RegisteredCultivationTool[] = []
  const ctx = {
    tools: { register: (definition: RegisteredCultivationTool) => { tools.push(definition); return () => {} } },
    commands: { register: (definition: CommandDefinition) => { commands.push(definition); return () => {} } },
    get: (name: string) => name === 'sessionQuery' ? sessionQuery : name === 'fs' ? fs : name === 'sandboxPolicy' ? sandboxPolicy : undefined,
  }
  registerCultivation(ctx as Parameters<typeof registerCultivation>[0], config, companyHome)
  const command = commands.find(definition => definition.name === 'cultivation')
  const proposal = tools.find(definition => definition.name === 'cultivation_propose')
  if (command === undefined) throw new Error('registerCultivation 没有注册 /cultivation')
  if (proposal === undefined) throw new Error('registerCultivation 没有注册 cultivation_propose')
  return { command: command.handler, proposal }
}

/** 临时培养盘只属于当前用例，vitest fork 并发执行时互不共用路径。 */
export async function withCultivationWorkspace<T>(run: (workspace: string, methods: string) => Promise<T>): Promise<T> {
  const root = mkdtempSync(join(tmpdir(), 'cultivation-command-'))
  const workspace = join(root, 'workspace')
  const methods = join(root, 'methods')
  try {
    mkdirSync(join(workspace, '.dsh-company', 'cultivation', 'records'), { recursive: true })
    return await run(workspace, methods)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

export function invokeCultivation(
  handler: CommandDefinition['handler'],
  role: string,
  cwd: string,
  rawInput: string,
) {
  return handler({
    commandId: 'cultivation-test' as never,
    agent: { session: { header: { agentPreset: role, cwd } } } as never,
    rawInput,
    attachments: [],
    signal: new AbortController().signal,
  })
}
