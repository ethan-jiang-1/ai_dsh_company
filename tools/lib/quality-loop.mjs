// 质量环（producer → verifier → 处置 → 复验）的纯判据层（2026-11-10，卡 2026-11-10-producer-verifier-quality-loop）。
//
// 为什么单独抽成 lib：审计要回答的是**契约问题**（裁决是不是原文、覆盖全不全、方法配没配对、
// 验的人有没有写盘），不是会话读取问题。判据住这里 ⇒ keyless spec 能直接喂合成输入把每条红配方
// 跑出来（tests/tools/quality-loop.spec.ts），驱动脚本只负责"把盘上的东西读成输入"。
// 解析器口径的唯一家在本文件；流程口径的唯一家 = `presets/_shared/skills/quality-loop/SKILL.md`
// （改判据形状 = 两边同 diff 改，spec 会拦漂移）。
import { createHash } from 'node:crypto'

/** 质量环产物目录（相对交付目录）。 */
export const QUALITY_LOOP_DIR = 'quality-loop'
/** 轮次上限：R1 产出+裁决，R2 复验；超限必须升级，不许自己加轮磨平分歧。 */
export const MAX_ROUNDS = 2
/** 处置三选一：fixed / 有证据的 rebut / accept risk（写谁接受）。 */
export const DISPOSITION_VALUES = ['fixed', 'rebut', 'accept']

const HEADER_RE = /^<!--\s*quality-loop:\s*(.+?)\s*-->\s*$/

/** 正文口径：去掉结尾空白（文件写出与消息正文的尾随换行不该算"改了"）。 */
export function normalizeVerdictBody(text) {
  return String(text ?? '').replace(/\s+$/u, '')
}

/** 正文哈希口径的唯一实现（驱动脚本与 spec 共用；不要在别处再写一份）。 */
export function verdictBodyHash(text) {
  return createHash('sha256').update(normalizeVerdictBody(text), 'utf8').digest('hex')
}

/** 解析 `k=v` 头行。缺头或格式不对 → null（调用方 fail-closed，不猜）。 */
export function parseVerdictHeader(text) {
  const lines = String(text ?? '').split('\n')
  for (const line of lines) {
    const match = HEADER_RE.exec(line.trim())
    if (match === null) continue
    const fields = {}
    for (const chunk of match[1].split(/\s+/)) {
      const eq = chunk.indexOf('=')
      if (eq <= 0) continue
      fields[chunk.slice(0, eq)] = chunk.slice(eq + 1)
    }
    return {
      round: fields.round ?? null,
      session: fields.session ?? null,
      preset: fields.preset ?? null,
      depth: fields.depth ?? null,
      producer: fields.producer ?? null,
      method: fields.method ?? null,
      bodySha256: fields['body-sha256'] ?? null,
    }
  }
  return null
}

/** 拆头与正文：正文 = 头行之后的全部内容（一字不改）。 */
export function splitVerdict(text) {
  const lines = String(text ?? '').split('\n')
  const index = lines.findIndex(line => HEADER_RE.test(line.trim()))
  if (index < 0) return { header: null, body: String(text ?? '') }
  return { header: parseVerdictHeader(text), body: lines.slice(index + 1).join('\n') }
}

/** 取某个 `##/### 标题` 起的段落（到下一个同级或更高级标题为止）。 */
function section(body, titles) {
  const lines = String(body ?? '').split('\n')
  const start = lines.findIndex(line => {
    const m = /^(#{2,4})\s+(.+?)\s*$/.exec(line)
    return m !== null && titles.some(title => m[2].includes(title))
  })
  if (start < 0) return ''
  const level = /^(#{2,4})/.exec(lines[start])[1].length
  const out = []
  for (let i = start + 1; i < lines.length; i++) {
    const m = /^(#{2,4})\s+/.exec(lines[i])
    if (m !== null && m[1].length <= level) break
    out.push(lines[i])
  }
  return out.join('\n')
}

/** 解析 markdown 表格行；跳过表头分隔行与空行。 */
export function parseTable(text) {
  const rows = []
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.trim()
    if (!line.startsWith('|')) continue
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
    if (cells.every(cell => /^:?-{2,}:?$/.test(cell) || cell === '')) continue
    rows.push(cells)
  }
  return rows
}

/** 检查表：`| check-id | 结果 | 证据 |`（第一行是表头）。 */
export function parseChecklist(body) {
  const rows = parseTable(section(body, ['检查表', 'Checklist']))
  if (rows.length === 0) return []
  const out = []
  for (const cells of rows.slice(1)) {
    if (cells.length < 2) continue
    out.push({
      id: cells[0].replace(/`/g, '').trim(),
      result: (cells[1] ?? '').toLowerCase().trim(),
      evidence: (cells[2] ?? '').trim(),
    })
  }
  return out
}

/** 发现：`- F1 [<check-id>][blocker|advisory] 一句话`。 */
export function parseFindings(body) {
  const out = []
  for (const raw of String(body ?? '').split('\n')) {
    const match = /^\s*[-*]\s*(F\d+)\s*(?:\[([^\]]+)\])?\s*(?:\[([^\]]+)\])?\s*(.*)$/.exec(raw)
    if (match === null) continue
    const [, id, first, second, rest] = match
    const level = [first, second].find(value => /^(blocker|advisory)$/i.test(value ?? '')) ?? null
    const checkId = [first, second].find(value => value !== undefined && value !== level) ?? null
    out.push({ id, checkId, level: level === null ? null : level.toLowerCase(), text: (rest ?? '').trim() })
  }
  return out
}

/** 处置表：`| 发现 | 处置 | 说明 |`（第一行是表头）。 */
export function parseDispositions(text) {
  const rows = parseTable(text)
  if (rows.length === 0) return []
  // 只认首格是 `F<n>` 开头的行——处置表里常夹着"无 / 备注 / 未验证项"这类行，它们不是发现，
  // 当成 discovering id 会让审计冒出假 warning（2026-11-10 E2E 实测）。
  return rows.slice(1).filter(cells => cells.length >= 2 && /^`?F\d+\b/.test(cells[0].trim())).map(cells => ({
    // 首格可以是 `F1`，也可以是 `F1 [RT-04][blocker] 一句话`（把发现标题抄进处置表是常见写法）——
    // 编号按**开头**的 `F<n>` 认，别把整格当 id（2026-11-10 E2E 实测这条曾把合法处置判成 extra/missing）。
    id: /^(F\d+)\b/.exec(cells[0].replace(/`/g, '').trim())?.[1] ?? cells[0].replace(/`/g, '').trim(),
    // 表格里给处置加粗/加码是常见写法（`**已修**`）——判据只认词，不认排版（2026-11-10 E2E 实测）。
    disposition: (cells[1] ?? '').replace(/[*`]/g, '').trim(),
    note: (cells[2] ?? '').trim(),
  }))
}

/** 方法包 skill：frontmatter 的 `metadata.method/version/side` + 正文里的 check-id 表。 */
export function parseMethodSkill(text) {
  const source = String(text ?? '')
  const fence = /^---\n([\s\S]*?)\n---\n?/.exec(source)
  if (fence === null) return null
  const values = { metadata: {} }
  let target = values
  for (const raw of fence[1].split('\n')) {
    if (raw.trim() === '') continue
    const indented = /^\s/.test(raw)
    const m = /^\s*([A-Za-z_][\w-]*):\s*(.*?)\s*$/.exec(raw)
    if (m === null) continue
    if (!indented) {
      target = m[1] === 'metadata' ? values.metadata : values
      if (m[1] === 'metadata' && m[2] === '') continue
    }
    if (m[2] === '') continue
    target[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  const body = source.slice(fence[0].length)
  return {
    name: values.name ?? null,
    description: values.description ?? null,
    method: values.metadata.method ?? null,
    version: values.metadata.version ?? null,
    side: values.metadata.side ?? null,
    checkIds: parseCheckIds(body),
    body,
  }
}

/** 方法包正文的 check-id：任何表头带 `check-id` 的表格的第一列。 */
export function parseCheckIds(body) {
  const ids = []
  let group = []
  const flush = () => {
    if (group.length > 0) {
      const header = group[0]
      if (header.some(cell => /check[-\s]?id/i.test(cell))) ids.push(...group.slice(1).map(cells => cells[0]))
    }
    group = []
  }
  for (const raw of String(body ?? '').split('\n')) {
    const line = raw.trim()
    if (!line.startsWith('|')) { flush(); continue }
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
    if (cells.every(cell => /^:?-{2,}:?$/.test(cell) || cell === '')) continue
    group.push(cells)
  }
  flush()
  return [...new Set(ids.map(id => id.replace(/`/g, '').trim()).filter(id => id !== ''))]
}

/**
 * 审计一次质量环（纯函数，零 I/O）。
 *
 * @param input.rounds - `[{ file, round, verdictText, dispositionsText }]`（dispositionsText 可缺 = 该轮没处置）
 * @param input.methods - `{ producer, verifier }`：两侧方法包解析结果（缺 = 方法层没装到位）
 * @param input.sessions - `{ [sessionId]: { preset, depth, createdAt, firstTurnEnd, assistantTexts, toolNames } }`；
 *   缺某会话 = 日志不可读。`createdAt` / `firstTurnEnd` 支撑"先生产再验证"的次序核对。
 * @returns `{ problems, warnings }`；problems 为空才算过。
 */
export function auditQualityLoop(input) {
  const problems = []
  const warnings = []
  const add = (code, detail) => problems.push({ code, detail })
  const warn = (code, detail) => warnings.push({ code, detail })
  const rounds = [...(input.rounds ?? [])].sort((a, b) => a.round - b.round)
  const sessions = input.sessions ?? {}
  const methods = input.methods ?? {}

  if (rounds.length === 0) {
    add('no-verdict', `${QUALITY_LOOP_DIR}/verdict-r<N>.md 一份都没有——质量环没有裁决就不是质量环`)
    return { problems, warnings }
  }
  /** 已被处置过的发现 id（跨轮累计：处置归首次提出它的那一轮）。 */
  const disposed = new Set()
  /** 上一轮命中的助手正文下标：原文一致必须**单调向后**（不许拿早期草稿冒充后一轮的原文）。 */
  // 原文索引进度按**会话**记：R2 可能是新 verifier session（本轮实测），不能沿用 R1 的索引，
  // 否则新 session 的第一条正文会被从中间开始找，误报 not-verbatim（BUG-059）。
  const lastTextIndexBySession = new Map()
  const seenRounds = new Set()
  for (const round of rounds) {
    if (seenRounds.has(round.round)) add('duplicate-round', `${round.file}：第 ${String(round.round)} 轮出现两次（裁决 append-only，不许覆盖）`)
    seenRounds.add(round.round)
  }
  const overRound = rounds.filter(round => round.round > MAX_ROUNDS)
  if (overRound.length > 0) {
    add('rounds-exceeded', `出现第 ${overRound.map(round => String(round.round)).join('、')} 轮 > 上限 ${String(MAX_ROUNDS)}：超限要升级给授权人，不许自己加轮`)
  }
  if (!rounds.some(round => round.round === 1)) add('no-round-1', '缺第 1 轮裁决（verdict-r1.md）')

  // 方法配对（两侧同名同版本）——没有方法就没有判据，属 fail-closed 面。
  const producer = methods.producer ?? null
  const verifierMethod = methods.verifier ?? null
  if (producer === null || verifierMethod === null) {
    warn('methods-unavailable', '方法层不全（producer/verifier 任一侧缺）：方法配对未核，按 fail-closed 处理')
  } else {
    if (producer.method !== verifierMethod.method) {
      add('method-mismatch', `两侧方法不同：producer=${String(producer.method)} verifier=${String(verifierMethod.method)}`)
    }
    if (producer.version !== verifierMethod.version) {
      add('version-mismatch', `两侧方法版本不同：producer=${String(producer.version)} verifier=${String(verifierMethod.version)}`)
    }
    if (producer.side !== 'producer') add('side-mismatch', `producer 侧方法 metadata.side=${String(producer.side)}（应为 producer）`)
    if (verifierMethod.side !== 'verifier') add('side-mismatch', `verifier 侧方法 metadata.side=${String(verifierMethod.side)}（应为 verifier）`)
  }

  const verifierPreset = 'quality-loop-verifier'
  const producerPreset = 'quality-loop-producer'

  // 任务书：字段齐全 + 方法点名（没点名 = fail-closed，不许"边做边定"）。
  const brief = typeof input.brief === 'string' ? input.brief : null
  if (brief === null) {
    add('no-brief', `缺 ${QUALITY_LOOP_DIR}/brief.md（任务书：目标/约束/基线/产物/方法/轮次/验收）`)
  } else {
    const missingLabels = ['目标', '约束', '基线', '产物', '方法', '轮次', '验收'].filter(label => !brief.includes(label))
    if (missingLabels.length > 0) add('brief-incomplete', `brief.md 缺字段：${missingLabels.join('、')}`)
    const named = /([\w.-]+)@(\d[\w.-]*)/.exec(brief)
    if (named === null) {
      add('brief-no-method', 'brief.md 没点名方法 `<pack>@<version>`（方法缺位的环不算质量环）')
    } else if (producer !== null && verifierMethod !== null
      && (named[1] !== producer.method || named[2] !== producer.version)) {
      add('brief-method-mismatch',
        `brief.md 点名 ${named[1]}@${named[2]}，方法层实际 ${String(producer.method)}@${String(producer.version)}`)
    }
  }

  for (const round of rounds) {
    const where = round.file ?? `verdict-r${String(round.round)}.md`
    const { header, body } = splitVerdict(round.verdictText)
    if (header === null) {
      add('no-header', `${where}：缺 quality-loop 头行（session/preset/depth/method/body-sha256 无处可查）`)
      continue
    }
    if (String(header.round) !== String(round.round)) {
      add('header-round', `${where}：头里的 round=${String(header.round)} 与文件名轮次 ${String(round.round)} 不一致`)
    }
    if (header.preset !== verifierPreset) {
      add('header-preset', `${where}：头里 preset=${String(header.preset)}（必须是 ${verifierPreset}——验的人不是做的人）`)
    }
    if (header.depth === null || !/^\d+$/.test(String(header.depth)) || Number(header.depth) < 1) {
      add('header-depth', `${where}：头里 depth=${String(header.depth)} 不是可核的十进制深度（读不到就写 unavailable 并说明）`)
    }
    const bodyHash = verdictBodyHash(body)
    if (header.bodySha256 !== bodyHash) {
      add('body-modified',
        `${where}：正文 sha256=${bodyHash.slice(0, 12)}… ≠ 头里 ${String(header.bodySha256).slice(0, 12)}…`
        + '（裁决被改过，或头算错了；若用 `tail -n +2 | shasum` 算过，尾随换行会让它差一位——'
        + '用 quality-loop skill 的 `verdict-hash.mjs --fix` 重算）')
    }
    if (producer !== null && verifierMethod !== null && header.method !== null
      && header.method !== `${verifierMethod.method}@${verifierMethod.version}`) {
      add('header-method', `${where}：头里 method=${String(header.method)} ≠ 方法层实际 ${String(verifierMethod.method)}@${String(verifierMethod.version)}`)
    }

    // 会话面：独立会话 / preset / 只读 / 裁决原文。
    const session = header.session === null ? undefined : sessions[header.session]
    if (session === undefined) {
      warn('session-log-missing', `${where}：找不到会话 ${String(header.session)} 的日志——正文与 child 最终消息无法对比（只核到文件自洽）`)
    } else {
      if (session.preset !== verifierPreset) {
        add('session-preset', `${where}：会话 ${String(header.session)} 的 preset=${String(session.preset)}（必须是 ${verifierPreset}）`)
      }
      if (typeof session.depth === 'number' && Number(header.depth) !== session.depth) {
        add('session-depth', `${where}：头里 depth=${String(header.depth)} ≠ 会话实际 ${String(session.depth)}`)
      }
      // 原文一致性：命中的是**该会话任何一条助手正文**，不限定最后一条——同一 child 可被
      // `send_to_subagent` 续跑（R2 复验就是同一 session 的下一条正文；2026-11-10 E2E 实测：
      // 只认最后一条会把 R1 裁决误判成"不是原文"）。
      const sessionKey = header.session === null ? `round:${String(round.round)}` : header.session
      const lastTextIndex = lastTextIndexBySession.get(sessionKey) ?? -1
      const texts = Array.isArray(session.assistantTexts)
        ? session.assistantTexts
        : (typeof session.finalText === 'string' ? [session.finalText] : [])
      if (texts.length === 0) {
        warn('session-final-missing', `${where}：会话 ${String(header.session)} 读不到最终正文——原文一致性未核`)
      } else {
        let matched = -1
        for (let i = lastTextIndex + 1; i < texts.length; i++) {
          if (verdictBodyHash(texts[i]) === bodyHash) { matched = i; break }
        }
        if (matched < 0) {
          add('not-verbatim',
            `${where}：正文与该会话第 ${String(lastTextIndex + 2)} 条起的 ${String(texts.length)} 条助手正文都不一致`
            + `（${bodyHash.slice(0, 12)}…）——裁决必须原文落盘，且要按轮次先后对应`)
        } else {
          lastTextIndexBySession.set(sessionKey, matched)
        }
      }
      // 次序：质量环是"先生产、再验证"，不是两条并行的手。并行发工 = 验证者拿到的是半成品，
      // 那就不是复核。机械面 = 验证者会话必须在**产出者首轮 turn/end 之后**才被创建。
      const producerId = header.producer === null || header.producer === '' ? null : header.producer
      const producerSession = producerId === null || producerId === 'unavailable' ? undefined : sessions[producerId]
      if (producerId === null) {
        add('producer-missing', `${where}：头里没写 producer=<产出者 sessionId>（次序无从核对）`)
      } else if (producerId === 'unavailable') {
        warn('producer-unverified', `${where}：头里 producer=unavailable——先产后验的次序未核`)
      } else if (producerSession === undefined) {
        warn('producer-log-missing', `${where}：找不到产出者会话 ${String(header.producer)} 的日志——先产后验未核`)
      } else {
        if (producerSession.preset !== producerPreset) {
          add('producer-preset', `${where}：产出者会话 preset=${String(producerSession.preset)}（必须是 ${producerPreset}）`)
        }
        const verifierStart = session.createdAt
        const producerStart = producerSession.createdAt
        const producerDone = producerSession.firstTurnEnd
        if (typeof producerDone !== 'number') {
          add('order-violation', `${where}：产出者会话没有 turn/end（还没收工）——两条手同时发出去不算质量环`)
        } else if (typeof verifierStart === 'number' && verifierStart < producerDone) {
          add('order-violation',
            `${where}：验证者在产出者收工前就开跑（verifier@${String(verifierStart)} < producer turn/end@${String(producerDone)}）——先生产、再验证`)
        } else if (typeof verifierStart === 'number' && typeof producerStart === 'number' && verifierStart < producerStart) {
          add('order-violation', `${where}：验证者比产出者还早开跑——次序反了`)
        }
      }
      for (const tool of (session.toolNames ?? [])) {
        if (/^(write|edit|bash)$/.test(tool)) {
          add('verifier-wrote', `${where}：验证者会话调过 ${tool}（只读手不该有写/跑的能力面）`)
        }
      }
    }

    // 覆盖：方法检查表逐行都要有结论。
    const expected = verifierMethod?.checkIds ?? []
    const checklist = parseChecklist(body)
    if (expected.length === 0) {
      warn('method-checklist-missing', `${where}：方法层没有 check-id 表——覆盖无从核对`)
    } else {
      const answered = new Set(checklist.map(row => row.id))
      const missing = expected.filter(id => !answered.has(id))
      if (missing.length > 0) add('checklist-gap', `${where}：检查表缺 ${missing.join(', ')}（缺行 = 不通过）`)
      for (const row of checklist) {
        if (!['pass', 'fail', 'skip'].includes(row.result)) {
          add('checklist-result', `${where}：${row.id} 的结果「${row.result}」不是 pass/fail/skip`)
        }
        if (row.result === 'skip' && row.evidence === '') {
          add('checklist-skip-reason', `${where}：${row.id} 标了 skip 却没写为什么`)
        }
      }
      for (const row of checklist) {
        if (!expected.includes(row.id)) warn('checklist-extra', `${where}：检查表多出 ${row.id}（方法里没有这个 id）`)
      }
    }

    // 处置：每条发现都要三选一，不许静默忽略。
    // 轮次语义（2026-11-10 E2E 校正）：处置归**首次提出该发现的那一轮**；复验轮把上轮发现重列为
    // 「已消除 / 仍成立」是闭环陈述，不必再出一份处置表（否则每轮都要抄一遍，抄漏就假红）。
    // 仍成立却没新处置的情况由检查表的 fail 行暴露，不靠"再抄一遍"。
    const findings = parseFindings(body)
    const dispositions = round.dispositionsText === undefined || round.dispositionsText === null
      ? []
      : parseDispositions(round.dispositionsText)
    const undisposed = findings.filter(finding => !disposed.has(finding.id))
    if (undisposed.length > 0 && dispositions.length === 0) {
      add('no-dispositions', `${where}：发现 ${undisposed.map(finding => finding.id).join('、')} 没有处置文件（dispositions-r${String(round.round)}.md）`)
    }
    const byId = new Map(dispositions.map(row => [row.id, row]))
    for (const finding of findings) {
      const row = byId.get(finding.id)
      if (row === undefined) {
        if (disposed.has(finding.id)) {
          warn('carried-forward', `${where}：${finding.id} 沿用前一轮的处置（本轮只作闭环陈述）`)
        } else {
          add('disposition-missing', `${where}：发现 ${finding.id} 没有处置（三选一：fixed / rebut / accept）`)
        }
        continue
      }
      if (!DISPOSITION_VALUES.includes(row.disposition)) {
        add('disposition-value', `${where}：${finding.id} 的处置「${row.disposition}」不是 ${DISPOSITION_VALUES.join(' / ')}`)
      }
      if (row.note === '') add('disposition-note', `${where}：${finding.id} 的处置没写说明（理由/证据/谁接受）`)
      if (row.disposition === 'accept' && !/accepted-by[:：]/i.test(row.note)) {
        add('disposition-acceptor', `${where}：${finding.id} 标了 accept 但没写 accepted-by:<岗位/姓名>`)
      }
      if (row.disposition === 'accept' && /^blocker$/i.test(finding.level ?? '')) {
        add('blocker-accepted', `${where}：${finding.id} 是 blocker 却以 accept 结案（blocker 要升级给授权人，不能自行接受）`)
      }
    }
    const findingIds = new Set(findings.map(finding => finding.id))
    for (const row of dispositions) {
      if (!findingIds.has(row.id)) warn('disposition-extra', `${where}：处置表里的 ${row.id} 没有对应发现`)
      disposed.add(row.id)
    }
  }

  // 裁决后订正产物：处置表显式标了「未复验」且这是最后一轮 ⇒ warning 让它可见（BUG-056）。
  // 不是硬拦：接受残留由授权人决定；这里只保证审计不把「裁决后改产物」误报成原文一致。
  const latest = rounds.at(-1)
  const latestDispositions = latest?.dispositionsText
  if (typeof latestDispositions === 'string'
    && /unverified/i.test(latestDispositions)) {
    warn('post-verdict-unverified',
      `${String(latest?.file)}：处置表标了 unverified 但这是最后一轮——裁决后改产物必须 R2，或由授权人接受该残留`)
  }

  return { problems, warnings }
}
