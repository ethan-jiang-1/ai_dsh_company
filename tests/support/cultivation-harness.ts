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
import type { CompanyLanguageState } from '../../packages/company-pack/src/host/language/company-language.ts'

/** 注册真正的培养工具/命令；只替身 Cordis 注册面，回调仍是生产实现。 */
type RegisteredCultivationTool = Parameters<Context['tools']['register']>[0]

export function cultivationRegistrations(
  config: CultivationHostConfig,
  sessionQuery?: unknown,
  companyHome?: string,
  fs?: unknown,
  sandboxPolicy?: unknown,
  roleLabel?: (role: string) => string,
  /** 双语选择器（缺省中文）；`(zh, en) => en` 用来断言 en 回执无中文（BUG-316）。 */
  text?: (zh: string, en: string) => string,
  /** 是否模拟「公司数据停写」（BUG-326 的停写回执路径）。 */
  dataBlocked = false,
  /** 可选语言订阅器（BUG-405：测 `/cultivation` 切 `en` 实时重注册）。 */
  language?: Pick<CompanyLanguageState, 'subscribe'>,
  /** 可选停写英文原因（BUG-405）。 */
  blockedReasonEn?: string,
): {
  readonly command: CommandDefinition['handler']
  /** 注册的命令定义（description/hint 在这里；BUG-326 的判据要用）。 */
  readonly definition: CommandDefinition | undefined
  /** 实时读取当前已注册命令（包含语言切换重注册后的最新版本，BUG-405）。 */
  readonly latestDefinition: () => CommandDefinition | undefined
  readonly proposal: RegisteredCultivationTool
} {
  const commands: CommandDefinition[] = []
  const tools: RegisteredCultivationTool[] = []
  let activeCommand: CommandDefinition | undefined
  const ctx = {
    tools: { register: (definition: RegisteredCultivationTool) => { tools.push(definition); return () => {} } },
    commands: {
      register: (definition: CommandDefinition) => {
        commands.push(definition)
        activeCommand = definition
        return () => {
          if (activeCommand === definition) activeCommand = undefined
        }
      },
    },
    get: (name: string) => name === 'sessionQuery' ? sessionQuery : name === 'fs' ? fs : name === 'sandboxPolicy' ? sandboxPolicy : undefined,
  }
  registerCultivation(
    ctx as Parameters<typeof registerCultivation>[0],
    config,
    companyHome,
    dataBlocked,
    '测试用停写原因',
    roleLabel,
    undefined,
    text,
    language,
    blockedReasonEn,
  )
  const command = commands.find(definition => definition.name === 'cultivation')
  const proposal = tools.find(definition => definition.name === 'cultivation_propose')
  if (command === undefined) throw new Error('registerCultivation 没有注册 /cultivation')
  if (proposal === undefined) throw new Error('registerCultivation 没有注册 cultivation_propose')
  return {
    command: command.handler,
    definition: command,
    latestDefinition: () => activeCommand,
    proposal,
  }
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
