// 从 client 页签注册面（company-tab-registration.ts）解析页签目录。
//
// 为什么：cdp-probe 原先手写 8 个页签，2026-10-19 新增「成品」后仍是 8/8 绿——
// 清单是手维护的，必漂。这里让探针从注册源读同一份 catalog；解析失败就 fail-loud，
// 不静默退化成「少一个也算全」。

// 2026-10-23（架构评审候选 3）：页签身份收进 tab-icons 的 FACES 表后，注册行只带 face 键；
// 标题不再出现在注册源里 ⇒ 解析器必须同时读身份源，缺一即空（fail-loud，不静默少一个）。
const TAB_ROW = /id:\s*'(dsh-company-pack\/[^']+)',\s*kind:\s*'[^']+',\s*face:\s*'([^']+)'/g
const FACE_ROW = /^\s{2}(\w+): \{ tone: '[^']+', glyph: \w+ \}/gm
const TAB_LABEL = /'tabs\.([a-z-]+)\.label':\s*'([^']+)'/g
const EN_BLOCK = /export const en\b[^=]*=\s*\{/

/** 一段字典文本里的 `tabs.<face>.label`（同名后者覆盖前者；zh/en 各切一段用）。 */
function labelsOf(text) {
  const labels = new Map()
  for (const match of text.matchAll(TAB_LABEL)) labels.set(match[1], match[2])
  return labels
}

/**
 * 解析页签注册目录（注册源 + 身份源 + 同一份字典）。
 *
 * 为什么 zh/en 都从 `locales.ts` 派生：cdp-probe 曾手维护 `EN_TAB_TITLES`，新增「策略」时漏映射，
 * `--lang en` 假红且第 10 页签无覆盖（2026-11-12）。现在缺任一语言的 label 就整体返回空——
 * 探针/门禁 fail-loud，而不是静默落回中文。
 * @param {string} source `packages/company-pack/src/client/tabs/company-tab-registration.ts` 全文。
 * @param {string} identitySource `packages/company-pack/src/client/ui/tab-icons.tsx` 全文。
 * @param {string} copySource `packages/company-pack/src/client/locales.ts` 全文（zh + en 两块）。
 * @returns {ReadonlyArray<{ id: string, title: string, enTitle: string }>} 按注册源顺序；
 *   face 不在身份源 / 缺任一语言 label ⇒ []。
 */
export function parseCompanyTabCatalog(source, identitySource, copySource) {
  if (typeof identitySource !== 'string' || typeof copySource !== 'string') return []
  const faces = new Set([...identitySource.matchAll(FACE_ROW)].map(match => match[1]))
  // zh 对象在 en 之前；按 `export const en` 切块，避免同 key 串台。
  const enAt = EN_BLOCK.exec(copySource)
  const zhLabels = labelsOf(enAt === null ? copySource : copySource.slice(0, enAt.index))
  const enLabels = enAt === null ? new Map() : labelsOf(copySource.slice(enAt.index))
  const rows = []
  for (const match of source.matchAll(TAB_ROW)) {
    const face = match[2]
    const title = zhLabels.get(face)
    const enTitle = enLabels.get(face)
    if (!faces.has(face) || title === undefined || enTitle === undefined) return []
    rows.push({ id: match[1], title, enTitle })
  }
  return rows
}
