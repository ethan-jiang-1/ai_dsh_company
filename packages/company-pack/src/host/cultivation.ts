/**
 * 培养回路 host 面（2026-10-13 培养卡 C 路径）：`cultivation_propose` 工具 + `/cultivation`
 * 命令族 + 部署本地角色方法层写入。
 *
 * 权限分工（培养卡拍板③/V3/V4）：**提案对分身开放**（工具署 preset/会话），**采纳/拒绝/
 * 撤回/验证是人专用**——命令只由人在会话输入框敲（vendor `dsh-commands` 教义：命令不经模型、
 * run 记会话日志）；模型侧没有这些动作的工具。采纳的角色闸 = 命令所在会话的 preset 必须等于
 * 记录的目标角色（仅建议权：跨角色建议由目标本人采纳；单操作者可信协作口径，不宣称认证隔离）。
 *
 * 两个落点：
 * - **培养记录** = 会话 cwd 的 `cultivation/records/*.md`（公司盘共享，UI 与分身均可读，写留日志）；
 * - **方法层** = `<profile>/company-cultivation/<role>/<slug>/SKILL.md`——根由 bundle patch 行
 *   config.cultivationRoot 注入（!!js 锚 baseUrl = loader 树根），与各角色 preset 的第二
 *   customSkillDirs 同前缀构造对齐；在分身 workspace 沙箱之外（D25 自改否决维持——分身写不了），
 *   pack 升级不擦。生效边界：**新开的该角色会话**加载（运行中会话不吃热更新——presets.md
 *   生效边界表）。
 *
 * keyless 判据 = `tests/company/cultivation.spec.ts`（读模型 + 已注册命令与临时文件行为）；真机制（目录发现/
 * 隔离/命令 wiring/跨会话生效）= `probes/session-context/cultivation-method-layer-probe.mjs`。
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
// 纯类型导入：ctx.commands 的 Context 增强（服务本体由 base bundle 挂载，vendor patch 钉行）。
import type {} from '@deepseek-ai/dsh-commands'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CULTIVATION_ROLES,
  methodSkillText,
  parseRecord,
  recordText,
  roleLabel,
  type CultivationRecord,
} from '../lib/cultivation.ts'

/** bundle patch 行注入的 host config（cordis.patch.yml `company-client` 行）。 */
export interface CultivationHostConfig {
  /** 方法层根（绝对路径）；缺席时 adopt/revoke 明确报错，提案/拒绝照常（记录面不依赖它）。 */
  readonly cultivationRoot?: string
}

/** 名册集合（提案目标必须是五角色）。 */
const ROSTER = new Set<string>(CULTIVATION_ROLES)

/** 记录目录（相对会话 cwd；公司盘共享）。 */
const RECORDS_REL = join('cultivation', 'records')

/** 方法 slug 合法形状（skill 目录名安全；中文期望走默认 slug = method-<recordId>）。 */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/

/** 会话角色 + cwd 的最小读面（工具与命令共用）。 */
interface SessionFace {
  readonly role: string
  readonly cwd: string
}

/** 命令/工具执行上下文里 Agent 的最小结构面（本地声明，不引 dsh-agent 类型图）。 */
interface AgentLike {
  readonly session?: { readonly header?: { readonly cwd?: string, readonly agentPreset?: string } } | undefined
}

/** 从执行上下文取「所在会话的角色 + cwd」；任一缺席给 null（调用方报可操作错误）。 */
function sessionFaceOf(agent: AgentLike | undefined): SessionFace | null {
  const header = agent?.session?.header
  const role = header?.agentPreset
  const cwd = header?.cwd
  if (typeof role !== 'string' || role === '' || !ROSTER.has(role)) return null
  if (typeof cwd !== 'string' || cwd === '') return null
  return { role, cwd }
}

/** 记录 id：时间戳 + 短随机（文件名倒序 ≈ 最新在前）。 */
function newRecordId(now = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 6)
  return `${String(now.getFullYear())}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${rand}`
}

/** 把 `head :: body` 切开（分隔符两侧留白皆可；无分隔符 = body 空）。 */
function splitBody(raw: string): { readonly head: string, readonly body: string } {
  const at = raw.indexOf('::')
  if (at === -1) return { head: raw.trim(), body: '' }
  return { head: raw.slice(0, at).trim(), body: raw.slice(at + 2).trim() }
}

/** 读全部记录（文件名倒序 = 最新在前；坏形状跳过并计数——不撒谎也不崩）。 */
function loadRecords(recordsDir: string): { readonly records: readonly CultivationRecord[], readonly broken: number, readonly reachable: boolean } {
  if (!existsSync(recordsDir)) return { records: [], broken: 0, reachable: false }
  const records: CultivationRecord[] = []
  let broken = 0
  for (const name of readdirSync(recordsDir).filter(n => n.endsWith('.md')).sort().reverse()) {
    const record = parseRecord(name.replace(/\.md$/, ''), readFileSync(join(recordsDir, name), 'utf8'))
    if (record === null) broken++
    else records.push(record)
  }
  return { records, broken, reachable: true }
}

/** 改写一条记录的 frontmatter 字段（upsert；正文原样保留）。 */
function updateRecordFile(path: string, updates: Readonly<Record<string, string>>): void {
  const text = readFileSync(path, 'utf8')
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
  if (match === null) throw new Error(`记录 ${path} 没有 frontmatter，无法改写`)
  const lines = match[1]!.split('\n')
  for (const [key, value] of Object.entries(updates)) {
    const at = lines.findIndex(line => line.startsWith(`${key}:`))
    if (at === -1) lines.push(`${key}: ${value}`)
    else lines[at] = `${key}: ${value}`
  }
  writeFileSync(path, `---\n${lines.join('\n')}\n---${text.slice(match[0].length).startsWith('\n') ? '' : '\n'}${text.slice(match[0].length)}`)
}

/** 写一条新记录，返回记录 id。 */
function writeRecord(recordsDir: string, draft: Parameters<typeof recordText>[0]): string {
  mkdirSync(recordsDir, { recursive: true })
  const id = newRecordId()
  writeFileSync(join(recordsDir, `${id}.md`), recordText(draft))
  return id
}

/** 命令核心与提案工具共用的培养文件操作；Node fs 实现保持在本模块内部。 */
interface CultivationStorage {
  writeRecord(recordsDir: string, draft: Parameters<typeof recordText>[0]): string
  readRecord(recordsDir: string, id: string): { readonly path: string, readonly text: string } | null
  updateRecord(path: string, updates: Readonly<Record<string, string>>): void
  loadRecords(recordsDir: string): ReturnType<typeof loadRecords>
  installMethod(root: string, role: string, slug: string, text: string): void
  removeMethod(root: string, role: string, slug: string): string | null
}

/** Host 文件系统适配器；记录与方法均保留原有落盘格式和路径。 */
const nodeCultivationStorage: CultivationStorage = {
  writeRecord,
  readRecord(recordsDir, id) {
    const path = join(recordsDir, `${id}.md`)
    return existsSync(path) ? { path, text: readFileSync(path, 'utf8') } : null
  },
  updateRecord: updateRecordFile,
  loadRecords,
  installMethod(root, role, slug, text) {
    const methodDir = join(root, role, slug)
    mkdirSync(methodDir, { recursive: true })
    writeFileSync(join(methodDir, 'SKILL.md'), text)
  },
  removeMethod(root, role, slug) {
    const methodDir = join(root, role, slug)
    if (!existsSync(methodDir)) return null
    rmSync(methodDir, { recursive: true, force: true })
    return methodDir
  },
}

/** 命令行为只依赖会话输入、配置与培养存储；Cordis 注册留在外层适配器。 */
function cultivationCommandHandler(config: CultivationHostConfig, storage: CultivationStorage) {
  return ({ agent, rawInput }: { readonly agent?: AgentLike, readonly rawInput: string }) => {
    const face = sessionFaceOf(agent)
    if (face === null) {
      return { kind: 'error' as const, text: '培养命令需要公司角色会话（当前会话不是五角色 preset，或 cwd 缺席）。' }
    }
    const { head, body } = splitBody(rawInput)
    const tokens = head.split(/\s+/).filter(t => t !== '')
    const sub = tokens[0] ?? ''
    const recordsDir = join(face.cwd, RECORDS_REL)

    // correct <期望行为一句话> :: <做法与证据正文>
    if (sub === 'correct' || sub === 'suggest') {
      const isSuggest = sub === 'suggest'
      const targetRole = isSuggest ? tokens[1] : face.role
      const expectation = (isSuggest ? tokens.slice(2) : tokens.slice(1)).join(' ').trim()
      if (isSuggest && !ROSTER.has(targetRole ?? '')) {
        return { kind: 'error' as const, text: '用法：suggest <角色> <期望行为一句话> :: <建议与证据>；角色须在名册。' }
      }
      if (expectation === '') return { kind: 'error' as const, text: '期望行为不能为空（:: 之前的一句话）。' }
      if (body === '') return { kind: 'error' as const, text: '正文不能为空（:: 之后写做法与证据）。' }
      if (isSuggest && targetRole === face.role) {
        return { kind: 'error' as const, text: '给自己的角色用 correct；suggest 指向别的角色。' }
      }
      const id = storage.writeRecord(recordsDir, {
        kind: isSuggest ? 'suggestion' : 'correction',
        targetRole: targetRole!,
        proposerRole: face.role,
        proposerKind: 'human',
        source: '（会话内提交）',
        expectation,
        body,
      })
      return {
        kind: 'success' as const,
        text: `已提交培养记录 ${id}（${isSuggest ? `建议 → ${roleLabel(targetRole!)}，待其本人在 ${roleLabel(targetRole!)} 会话里处理` : '纠正，待你采纳'}）。培养页可查收件箱。`,
      }
    }

    // adopt <id> [as <slug>]
    if (sub === 'adopt') {
      const id = tokens[1]
      if (id === undefined) return { kind: 'error' as const, text: '用法：adopt <记录id> [as <方法slug>]。' }
      const found = storage.readRecord(recordsDir, id)
      if (found === null) return { kind: 'error' as const, text: `记录 ${id} 不存在（cultivation/records/ 里没有 ${id}.md）。` }
      const { path, text } = found
      const record = parseRecord(id, text)
      if (record === null) return { kind: 'error' as const, text: `记录 ${id} 形状坏，无法采纳。` }
      if (record.status !== 'open') return { kind: 'error' as const, text: `记录 ${id} 已是 ${record.status === 'adopted' ? '已采纳' : '已拒绝'}，不重复处理。` }
      if (record.targetRole !== face.role) {
        return { kind: 'error' as const, text: `仅建议权：${record.id} 的培养对象是 ${roleLabel(record.targetRole)}，请在 ${roleLabel(record.targetRole)} 的会话里采纳。` }
      }
      if (config.cultivationRoot === undefined) {
        return { kind: 'error' as const, text: '方法层根未配置（bundle patch 行 config.cultivationRoot 缺席）——无法部署方法。' }
      }
      let slug = tokens[2] === 'as' ? tokens[3] : undefined
      if (slug === undefined) slug = `method-${id}`
      if (!SLUG_RE.test(slug)) {
        return { kind: 'error' as const, text: `方法 slug 只认小写字母/数字/连字符（≤64 位）：${slug}。` }
      }
      storage.installMethod(config.cultivationRoot, record.targetRole, slug, methodSkillText({ slug, expectation: record.expectation, body }))
      storage.updateRecord(path, { status: 'adopted', methodSlug: slug, decidedAt: new Date().toISOString() })
      return {
        kind: 'success' as const,
        text: `已采纳 ${id}：方法 ${slug} 部署到 ${roleLabel(record.targetRole)} 方法层。新开的 ${roleLabel(record.targetRole)} 会话会加载它；运行中的会话不受影响。验证后用 verify 回填结果；不灵了用 revoke ${slug} 撤回。`,
      }
    }

    // reject <id> :: <理由>
    if (sub === 'reject') {
      const id = tokens[1]
      if (id === undefined || body === '') return { kind: 'error' as const, text: '用法：reject <记录id> :: <一句话理由>。' }
      const found = storage.readRecord(recordsDir, id)
      if (found === null) return { kind: 'error' as const, text: `记录 ${id} 不存在。` }
      const record = parseRecord(id, found.text)
      if (record === null) return { kind: 'error' as const, text: `记录 ${id} 形状坏。` }
      if (record.status !== 'open') return { kind: 'error' as const, text: `记录 ${id} 已处理过（${record.status}）。` }
      if (record.targetRole !== face.role) {
        return { kind: 'error' as const, text: `${record.id} 的培养对象是 ${roleLabel(record.targetRole)}，请在该角色会话里处理。` }
      }
      storage.updateRecord(found.path, { status: 'rejected', reason: body.split('\n')[0]!, decidedAt: new Date().toISOString() })
      return { kind: 'success' as const, text: `已拒绝 ${id}（理由已留档，提出者可在培养页查回执）。` }
    }

    // verify <id> <pass|fail>
    if (sub === 'verify') {
      const id = tokens[1]
      const outcome = tokens[2]
      if (id === undefined || (outcome !== 'pass' && outcome !== 'fail')) {
        return { kind: 'error' as const, text: '用法：verify <记录id> <pass|fail>——在真实同类任务上验证后回填。' }
      }
      const found = storage.readRecord(recordsDir, id)
      if (found === null) return { kind: 'error' as const, text: `记录 ${id} 不存在。` }
      const record = parseRecord(id, found.text)
      if (record === null) return { kind: 'error' as const, text: `记录 ${id} 形状坏。` }
      if (record.status !== 'adopted') return { kind: 'error' as const, text: `只有已采纳的方法才能回填验证（${id} 现为 ${record.status}）。` }
      if (record.targetRole !== face.role) {
        return { kind: 'error' as const, text: `${record.id} 归 ${roleLabel(record.targetRole)}，请在该角色会话里回填。` }
      }
      storage.updateRecord(found.path, { verification: outcome })
      return { kind: 'success' as const, text: `已回填验证：${id} → ${outcome === 'pass' ? '已验证（在同类任务上见过效）' : '验证未通过（建议修订或撤回）'}。` }
    }

    // revoke <slug>
    if (sub === 'revoke') {
      const slug = tokens[1]
      if (slug === undefined) return { kind: 'error' as const, text: '用法：revoke <方法slug>。' }
      if (config.cultivationRoot === undefined) {
        return { kind: 'error' as const, text: '方法层根未配置（config.cultivationRoot 缺席）。' }
      }
      const methodDir = storage.removeMethod(config.cultivationRoot, face.role, slug)
      if (methodDir === null) return { kind: 'error' as const, text: `${roleLabel(face.role)} 方法层里没有方法 ${slug}。` }
      const { records } = storage.loadRecords(recordsDir)
      let marked = 0
      for (const record of records) {
        if (record.status === 'adopted' && record.methodSlug === slug && record.targetRole === face.role) {
          storage.updateRecord(join(recordsDir, `${record.id}.md`), { revokedAt: new Date().toISOString() })
          marked++
        }
      }
      return { kind: 'success' as const, text: `已撤回方法 ${slug}（删除 ${methodDir}；标记 ${String(marked)} 条记录）。新开的 ${roleLabel(face.role)} 会话不再加载它。` }
    }

    return {
      kind: 'error' as const,
      text: '子命令只认：correct / suggest / adopt / reject / verify / revoke（培养页有各命令的一句话用法）。',
    }
  }
}

/** 「/cultivation」命令族与提案工具的注册面。 */
export function registerCultivation(ctx: Context, config: CultivationHostConfig): void {
  const storage = nodeCultivationStorage
  // ── 分身提案工具（V3）：只开提案，不开采纳 ──────────────────────────────────
  ctx.tools.register(defineTool({
    name: 'cultivation_propose',
    description: 'Propose a cultivation record for your own role (correction) or another role (suggestion). '
      + 'A correction targets YOUR role and describes a working practice to adopt; a suggestion goes to a DIFFERENT '
      + 'role with evidence. Proposals are recorded in the company workspace and await the target role driver\'s '
      + 'decision (/cultivation adopt or reject, human-only). You cannot adopt your own or anyone\'s proposal.',
    parameters: {
      kind: {
        type: 'string',
        required: true,
        description: '"correction" (for your own role) or "suggestion" (to another role).',
      },
      targetRole: {
        type: 'string',
        required: true,
        description: 'Role id the cultivation targets: ceo / vp-eng / vp-sales / coo / cfo.',
      },
      expectation: {
        type: 'string',
        required: true,
        description: 'One sentence of the expected behavior, e.g. "收口前逐项列出未决项".',
      },
      body: {
        type: 'string',
        required: true,
        description: 'The proposed practice and its evidence (methodology first; keep company facts cited, not embedded).',
      },
      source: {
        type: 'string',
        description: 'Optional coordinate of the original material, e.g. "deliverables/x/final.md" or a session reference.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', required: true },
          recorded: { type: 'boolean', required: true },
          note: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      const face = sessionFaceOf(exec.agent)
      if (face === null) {
        return { id: '', recorded: false, note: '提案需要公司角色会话上下文（agent preset + cwd）。' }
      }
      if (!ROSTER.has(args.targetRole)) {
        return { id: '', recorded: false, note: `目标角色 ${args.targetRole} 不在名册（ceo/vp-eng/vp-sales/coo/cfo）。` }
      }
      if (args.kind === 'correction' && args.targetRole !== face.role) {
        return { id: '', recorded: false, note: `纠正只指向自己的角色（当前会话 = ${face.role}）；给别的角色用 suggestion。` }
      }
      if (args.kind === 'suggestion' && args.targetRole === face.role) {
        return { id: '', recorded: false, note: '给自己的角色用 correction；suggestion 指向别的角色。' }
      }
      if (args.kind !== 'correction' && args.kind !== 'suggestion') {
        return { id: '', recorded: false, note: 'kind 只认 correction / suggestion。' }
      }
      const id = storage.writeRecord(join(face.cwd, RECORDS_REL), {
        kind: args.kind,
        targetRole: args.targetRole,
        proposerRole: face.role,
        proposerKind: 'agent',
        source: args.source?.trim() !== '' && args.source !== undefined ? args.source : '（会话内提交）',
        expectation: args.expectation,
        body: args.body,
      })
      return {
        id,
        recorded: true,
        note: `已记录培养提案 ${id}（${args.kind === 'correction' ? '纠正' : `建议 → ${roleLabel(args.targetRole)}`}），待目标角色本人用 /cultivation adopt 采纳或 reject 拒绝。`,
      }
    },
  }))

  // ── /cultivation 命令族（V4/V8：人专用直控面，不经模型）─────────────────────
  ctx.commands.register({
    name: 'cultivation',
    description: '培养回路：给自己的角色提交纠正、给别的角色提建议、采纳/拒绝/验证/撤回方法（采纳仅目标角色本人）',
    input: { hint: 'correct <期望行为> :: <做法与证据> | suggest <角色> <期望行为> :: <建议> | adopt <id> [as <slug>] | reject <id> :: <理由> | verify <id> <pass|fail> | revoke <slug>' },
    handler: cultivationCommandHandler(config, storage),
  })
}
