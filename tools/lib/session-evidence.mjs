// 会话证据包：把一份或多份会话日志折成「树 + 面 + 终态 + 工具调用」的可复判 JSON。
//
// 为什么（BUG-046 / OBS-1 教训）：此前每个 probe 各写一份 rawHeader/readChild（3 份拷贝），
// 卡内证据靠手抄 session id 与 JSON 片段；team member 又读不到 session/page，只能手解 zstd。
// 本模块只做**纯解析与折叠**（输入是已经解压的 JSONL 文本）；读盘/zstd 由调用方（tools/explore-evidence.mjs）
// 用 drivers/zstd.mjs 注入——tools/lib 保持 keyless（layering.spec 强制）。
//
// 判据只读类型化字段：事件 `type`、`data.source.kind`、`data.header.tools[].name`、
// `data.member.id`、`data.childId`、`data.reason.kind`；不对整段 data 做正则猜语义。
// 不证明：语义正确、模型判断、UI 渲染；缺字段显式 `unavailable`，不默认 worker/0。

import { collectText } from './session-log.mjs'

/** 解析 JSONL 文本为记录数组；坏行跳过（不因一行损坏丢掉整份证据）。 */
export function parseSessionRecords(text) {
  return String(text ?? '')
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => {
      try {
        return JSON.parse(line)
      } catch {
        return undefined
      }
    })
    .filter(record => record !== undefined && record !== null && typeof record === 'object')
}

/** 盘上 v4 记录是扁平的；session/page 与旧夹具把它包在 `event` 里。两种都吃。 */
export function recordEvent(record) {
  const event = record?.event
  return event !== null && typeof event === 'object' ? event : record
}

const eventRecords = records => (Array.isArray(records) ? records : []).map(recordEvent)

/** 首帧 `session` 记录：身份唯一来源。缺了显式 unavailable，不猜。 */
export function sessionHeader(records) {
  const header = eventRecords(records).find(event => event?.type === 'session')
  if (header === undefined) {
    return {
      id: undefined,
      preset: 'unavailable',
      depth: 'unavailable',
      origin: undefined,
      parentSession: undefined,
      createdAt: undefined,
      cwd: undefined,
      version: undefined,
      missing: true,
    }
  }
  return {
    id: header.id,
    preset: typeof header.agentPreset === 'string' ? header.agentPreset : 'unavailable',
    depth: header.delegationDepth === undefined ? 'unavailable' : String(header.delegationDepth),
    origin: header.origin,
    parentSession: header.parentSession,
    createdAt: header.createdAt,
    cwd: header.cwd,
    version: header.version,
    missing: false,
  }
}

/** 最后一条 `request/header` 的模型可见工具名。没有 header = 空数组（调用方判未覆盖）。 */
export function toolCatalog(records) {
  const headers = eventRecords(records)
    .filter(event => event?.type === 'request/header')
    .map(event => event.data?.header)
    .filter(header => header !== undefined && header !== null)
  const last = headers.at(-1)
  return Array.isArray(last?.tools)
    ? last.tools.map(tool => tool?.name).filter(name => typeof name === 'string')
    : []
}

/** 系统提示全文（多段 `system/message` 合并；只取 type=text 块）。 */
export function systemText(records) {
  return eventRecords(records)
    .filter(event => event?.type === 'system/message')
    .map(event => collectText(event.data).join('\n'))
    .join('\n')
}

/** 注入面标记：只认 host 注入文案的固定前缀（handbook.ts / contracts.ts 的单一实现）。 */
export function promptMarkers(text) {
  const value = String(text ?? '')
  return {
    handbook: value.includes('Company content (read-only):'),
    workflowContract: value.includes('Workflow engine contract'),
    bytes: Buffer.byteLength(value, 'utf8'),
  }
}

/** 最后一份 durable skill catalog（`user/message` + `source.kind='skill-catalog'` 的 entries）。 */
export function skillCatalog(records) {
  const catalogs = eventRecords(records)
    .filter(event => event?.type === 'user/message' && event.data?.source?.kind === 'skill-catalog')
    .map(event => event.data.source.entries)
    .filter(entries => Array.isArray(entries))
  const last = catalogs.at(-1)
  return Array.isArray(last) ? last.map(entry => entry?.name).filter(name => typeof name === 'string') : []
}

/** turn 终态列表：只读 `turn/end.data.reason.kind`。 */
export function turns(records) {
  return eventRecords(records)
    .filter(event => event?.type === 'turn/end')
    .map(event => ({
      turn: event.data?.turn ?? event.turn,
      reason: event.data?.reason?.kind ?? 'unavailable',
      at: event.time,
    }))
}

function resultTextOf(message) {
  return collectText(message?.content).join('\n')
}

/** 工具调用与结果：按 callId 配对；参数只当字符串保留，不在这里解释业务。 */
export function toolCalls(records) {
  const events = eventRecords(records)
  const results = new Map()
  for (const event of events) {
    if (event?.type !== 'tool/result') continue
    const message = event.data?.message
    const callId = message?.toolCallId ?? event.data?.toolCallId
    if (typeof callId !== 'string') continue
    results.set(callId, {
      isError: message?.isError === true || event.data?.isError === true,
      text: resultTextOf(message),
    })
  }
  return events
    .filter(event => event?.type === 'tool/call')
    .map(event => {
      const callId = event.data?.callId
      const result = typeof callId === 'string' ? results.get(callId) : undefined
      return {
        turn: event.data?.turn ?? event.turn,
        step: event.data?.step ?? event.step,
        id: callId,
        name: event.data?.name ?? '(unavailable)',
        arguments: typeof event.data?.arguments === 'string' ? event.data.arguments : '',
        resultText: result?.text ?? '',
        isError: result?.isError ?? false,
        completed: result !== undefined,
      }
    })
}

/** 子代链接：catalog / team member / workflow branch 三种事件都收；同一 child 取更具体的一类。 */
export function childLinks(records) {
  const links = new Map()
  const put = (id, value) => {
    if (typeof id !== 'string' || id === '') return
    const previous = links.get(id)
    const rank = { named: 1, workflow: 2, member: 3 }
    if (previous === undefined || rank[value.kind] > rank[previous.kind]) links.set(id, { ...previous, ...value })
  }
  for (const event of eventRecords(records)) {
    if (event?.type === 'subagent/catalog') {
      put(event.data?.childId, { id: event.data?.childId, kind: 'named', mode: event.data?.mode, label: event.data?.label })
    } else if (event?.type === 'team/member') {
      put(event.data?.member?.id, { id: event.data?.member?.id, kind: 'member', name: event.data?.member?.name })
    } else if (event?.type === 'tool-workflow/agent-start') {
      put(event.data?.info?.childId, { id: event.data?.info?.childId, kind: 'workflow' })
    }
  }
  return [...links.values()]
}

function argumentsObject(call) {
  if (typeof call.arguments !== 'string' || call.arguments.trim() === '') return undefined
  try {
    const parsed = JSON.parse(call.arguments)
    return parsed !== null && typeof parsed === 'object' ? parsed : undefined
  } catch {
    return undefined
  }
}

/** 显式写盘：只认 write/edit 的类型化 `file_path`；bash 间接写不在这里猜。 */
export function explicitWrites(calls) {
  const writes = []
  for (const call of calls) {
    if (call.name !== 'write' && call.name !== 'edit') continue
    const filePath = argumentsObject(call)?.file_path
    if (typeof filePath === 'string' && filePath !== '') {
      writes.push({ turn: call.turn, tool: call.name, path: filePath, isError: call.isError })
    }
  }
  return writes
}

/** 最后一条 assistant 正文（诊断用；不参与 PASS 判定）。 */
export function finalAssistantText(records) {
  const messages = eventRecords(records).filter(event => event?.type === 'assistant/message')
  const last = messages.at(-1)
  return last === undefined ? '' : collectText(last.data?.message?.content).join('\n')
}

/**
 * 一份会话的完整证据。
 * @param {ReadonlyArray<object>} records 解压后的 JSONL 记录。
 * @param {{id?: string}} [options] 调用方已知的会话 id（日志缺首帧时兜底展示）。
 */
export function buildSessionEvidence(records, { id } = {}) {
  const header = sessionHeader(records)
  const text = systemText(records)
  const tools = toolCatalog(records)
  const calls = toolCalls(records)
  return {
    id: id ?? header.id ?? 'unavailable',
    header,
    surface: {
      tools,
      toolCount: tools.length,
      catalog: skillCatalog(records),
      markers: promptMarkers(text),
    },
    turns: turns(records),
    calls,
    children: childLinks(records),
    writes: explicitWrites(calls),
    finalText: finalAssistantText(records),
  }
}

/** 一条会话树：根 + 直接子代（子代由调用方补全；本模块不读盘）。 */
export function buildSessionTree(root, children = []) {
  return { root, children }
}

/** markdown 摘要：卡内粘贴用；不替代 JSON 证据。 */
/** 会话 id 的短显示：去掉 `session-` 前缀再截 8 位，避免整列都是 `session-`。 */
export function shortSessionId(id) {
  const value = String(id ?? 'unavailable').replace(/^session-/, '')
  return value.slice(0, 8)
}

export function renderSessionTreeMarkdown(tree) {
  const lines = []
  const row = evidence => {
    const header = evidence.header
    const terminal = evidence.turns.map(turn => turn.reason).join(' / ') || '未收口'
    const markers = [
      evidence.surface.markers.handbook ? 'handbook' : '',
      evidence.surface.markers.workflowContract ? 'wf-contract' : '',
    ].filter(Boolean).join('+') || '—'
    return `| \`${shortSessionId(evidence.id)}\` | ${header.preset} | ${header.depth} | ${String(evidence.surface.toolCount)} | ${terminal} | ${markers} | ${String(evidence.surface.catalog.length)} |`
  }
  lines.push('| session | preset | depth | tools | terminal | markers | skills |')
  lines.push('|---|---|---:|---:|---|---|---:|')
  lines.push(row(tree.root))
  for (const child of tree.children) lines.push(row(child.evidence ?? child))
  return lines.join('\n')
}
