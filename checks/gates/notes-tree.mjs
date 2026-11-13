// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：每次 verify；在 notes/ 下新增、移动文件或目录，或改 Note 状态行后。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// ── notes 树形与状态行门禁（notes-tree，2026-11-14 立；卡 = _backlog/issues/2026-11-14-notes-tree-and-carrier-gates.md）──
// 为什么：notes/ 的合法形状此前只写在 notes/README §一 的表里，没有任何门禁走查。2026-11-14 研究实测：
//   植入「未登记生命周期目录 / 未登记二级目录 / notes 根散件 / 三级文件 / 无日期文件名」五种形状后
//   `pnpm verify` 全绿——notes-liveness 与 notes-supersession 平铺读目录并按文件名日期过滤，
//   过滤掉的东西没有人补一句；notes-archived-links 虽递归，但只判链接存在性。DSH 用三条
//   `structure:` 报错防的正是「文件对走查不可见」（vendor/scripts/agent-note-tree.ts）。
// 判据（形状）：
//   ① 深度 1 闭集 {proposed,implemented,rejected,archived}；根只许 README.md / AGENTS.md；
//   ② 深度 2 只许文件；`.md` 名 = README.md / AGENTS.md / yyyy-mm-dd-<slug>.md（slug 全小写，
//      点号留给版本号）；唯一允许的第二层目录 = `archived/receipts/`；
//   ③ 深度 3 只许 `archived/receipts/` 下的文件；其它任何深度 3 目录/文件红；
//   ④ 任何 `INDEX.md` 红（D34：目录树即清单；集中索引重复路径元数据并与无关修改争用同一文件）。
// 判据（状态行；前向生效 = 文件名日期 ≥ 2026-11-14，存量按生效日祖父豁免）：
//   ⑤ `状态：` 行全文件恰好 1 行，且在前 12 行内；
//   ⑥ implemented/ 与 archived/ 的状态词须以 implemented|已交付|已消化 开头——归档保留实现状态，
//      不改写成 archived（位置是位置，状态是状态）；proposed/ 只查唯一性（批准标记归 proposals）。
// ⚠ 不查的反面：不判 Note 内容、不判「该不该写 Note」；非 `.md` 证据件（pin-review `.json`）不纳入形状。
// 负例留证 2026-11-14（真树植入 → 红 → 还原 → 绿；逐条原话）：
//   ① notes/zz-lifecycle/ → `未知生命周期目录（允许：proposed、implemented、rejected、archived）`；
//   ② notes/implemented/zz-probe/2026-11-14-x.md → `未登记子目录`（未知二级目录先红，其下文件不再走查）；
//   ③ notes/implemented/zz-no-date.md → `文件名须为 yyyy-mm-dd-<slug>.md`；
//   ④ notes/2026-11-14-root-stray.md → `根目录只允许 README.md / AGENTS.md`；
//   ⑤ notes/implemented/INDEX.md → `集中索引禁止`；
//   ⑥ 日期 ≥ 生效日的 Note 里复制第二行「状态：」→ `状态行必须恰好 1 行（实际 2 行）`；
//   ⑦ 同上把状态词改成 proposed → `状态词须以 implemented/已交付/已消化 开头`；
//   ⑧ receipts/ 下再建目录 → `只许文件（不允许深度 4 目录）`；receipts/ 下无日期文件 → 文件名红；
//   ⑨ 反向豁免：合法新 Note（状态行 ×1）→ 绿；存量（日期 < 生效日）与 receipts 证据件不查状态 → 绿。
//   ⚠ 首版本门禁在 ④ 上是**假守卫**：根文件走了通用命名规则，`2026-11-14-root-stray.md` 因为
//     名字本身合规而放行——正是「先造红再相信绿」要抓的那类（原话见承载 Note 验证节，已修）。
//   ⚠ 首版 ② 的报错只到「未登记子目录」不到「深度 3」：对生命周期目录来说，深度 3 文件必然意味着
//     一个未登记的二级目录，所以「深度 3」只在 receipts/ 下可达（⑧ 证明）。
const LIFECYCLES = ['proposed', 'implemented', 'rejected', 'archived']
/** 每个生命周期根下允许的文件名：目录宪章与 agent 门牌。 */
const ROOT_FILES = new Set(['README.md', 'AGENTS.md'])
/** 唯一允许的第二层目录（其余一律未知形状）。 */
const ALLOWED_SUBDIRS = { archived: ['receipts'] }
/** 全日期前缀 + 小写 slug；点号留给版本号（`2026-11-13-release-0.11.6-refresh.md`）。 */
const NOTE_FILE = /^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9._-]*\.md$/
/** 状态行规则的生效日：此前写成的 Note 按祖父豁免（存量不回扫）。 */
export const STATUS_EFFECTIVE_DATE = '2026-11-14'
const INDEX_MESSAGE = '集中索引禁止（D34：目录树即清单；集中索引重复路径元数据并与无关修改争用同一文件）'

const isDirectory = (path) => {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

const noteDate = (name) => /^(\d{4}-\d{2}-\d{2})-/.exec(name)?.[1]

/** 一个文件条目的形状问题；非 `.md`（证据件）不判。 */
function fileProblems(rel, name, problems) {
  if (name.toLowerCase() === 'index.md') {
    problems.push(`${rel} — ${INDEX_MESSAGE}`)
    return
  }
  if (!name.endsWith('.md')) return
  if (ROOT_FILES.has(name)) return
  if (!NOTE_FILE.test(name)) {
    problems.push(`${rel} — 文件名须为 yyyy-mm-dd-<slug>.md（slug 全小写，点号只用于版本号；日期前缀是地址的一部分）`)
  }
}

/**
 * 树形判据：深度、目录闭集、文件名、INDEX 禁令。
 * @param {string} root checkout 根。
 * @returns {{ problems: string[], files: number }}
 */
export function notesTreeProblems(root) {
  const notesDir = join(root, 'notes')
  if (!isDirectory(notesDir)) {
    return { problems: ['notes/ — 不在盘上（树形门禁的根；目录树就是清单，不许消失）'], files: 0 }
  }
  const problems = []
  let files = 0
  for (const entry of readdirSync(notesDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    if (entry.isFile()) {
      if (entry.name.toLowerCase() === 'index.md') problems.push(`notes/${entry.name} — ${INDEX_MESSAGE}`)
      else if (!ROOT_FILES.has(entry.name)) {
        problems.push(`notes/${entry.name} — 根目录只允许 README.md / AGENTS.md（Note 必须住生命周期目录）`)
      }
      files += 1
      continue
    }
    if (!entry.isDirectory()) continue
    if (!LIFECYCLES.includes(entry.name)) {
      problems.push(`notes/${entry.name}/ — 未知生命周期目录（允许：${LIFECYCLES.join('、')}）`)
      continue
    }
    for (const child of readdirSync(join(notesDir, entry.name), { withFileTypes: true })) {
      if (child.name.startsWith('.')) continue
      const rel = `notes/${entry.name}/${child.name}`
      if (child.isFile()) {
        fileProblems(rel, child.name, problems)
        files += 1
        continue
      }
      if (!child.isDirectory()) continue
      if (!(ALLOWED_SUBDIRS[entry.name] ?? []).includes(child.name)) {
        problems.push(`${rel}/ — 未登记子目录（${entry.name}/ 只许文件；唯一允许的第二层目录 = archived/receipts/）`)
        continue
      }
      for (const inner of readdirSync(join(notesDir, entry.name, child.name), { withFileTypes: true })) {
        if (inner.name.startsWith('.')) continue
        const innerRel = `${rel}/${inner.name}`
        if (!inner.isFile()) {
          problems.push(`${innerRel}/ — ${entry.name}/${child.name}/ 只许文件（不允许深度 4 目录）`)
          continue
        }
        fileProblems(innerRel, inner.name, problems)
        files += 1
      }
    }
  }
  return { problems, files }
}

/**
 * 状态行判据：唯一性、位置、与目录一致；只查文件名日期 ≥ 生效日的 Note。
 * @param {string} root checkout 根。
 * @param {string} [effective] 生效日（测试可覆盖）。
 * @returns {{ problems: string[], checked: number }}
 */
export function notesStatusProblems(root, effective = STATUS_EFFECTIVE_DATE) {
  const notesDir = join(root, 'notes')
  if (!isDirectory(notesDir)) return { problems: [], checked: 0 }
  const problems = []
  let checked = 0
  for (const lifecycle of ['proposed', 'implemented', 'archived']) {
    const dir = join(notesDir, lifecycle)
    if (!isDirectory(dir)) continue
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md') || ROOT_FILES.has(entry.name)) continue
      const date = noteDate(entry.name)
      if (date === undefined || date < effective) continue
      checked += 1
      const at = []
      const lines = readFileSync(join(dir, entry.name), 'utf8').split('\n')
      lines.forEach((line, index) => {
        if (/^状态[:：]/.test(line)) at.push(index)
      })
      const rel = `notes/${lifecycle}/${entry.name}`
      if (at.length !== 1) {
        problems.push(`${rel} — 状态行必须恰好 1 行（实际 ${at.length} 行）`)
        continue
      }
      const line = at[0]
      if (line >= 12) problems.push(`${rel}:${line + 1} — 状态行必须在前 12 行内（当前第 ${line + 1} 行）`)
      if (lifecycle === 'proposed') continue
      if (!/^状态[:：]\s*\**\s*(implemented|已交付|已消化)/.test(lines[line])) {
        problems.push(`${rel}:${line + 1} — 状态词须以 implemented/已交付/已消化 开头（${lifecycle}/ 保留实现状态，不改写成 archived）`)
      }
    }
  }
  return { problems, checked }
}

export function run({ root, ok, fail }) {
  const tree = notesTreeProblems(root)
  const status = notesStatusProblems(root)
  const problems = [...tree.problems, ...status.problems]
  if (problems.length === 0) {
    ok(`notes-tree（形状 ×${String(tree.files)} 文件/目录；状态行 ×${String(status.checked)} 篇新写）`)
    return
  }
  const head = problems.slice(0, 8).join('；')
  fail('notes-tree', `${head}${problems.length > 8 ? ` …共 ${String(problems.length)} 处` : ''}`)
}
