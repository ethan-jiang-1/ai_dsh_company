// 从 client 页签注册面（company-tab-registration.ts）解析页签目录。
//
// 为什么：cdp-probe 原先手写 8 个页签，2026-10-19 新增「成品」后仍是 8/8 绿——
// 清单是手维护的，必漂。这里让探针从注册源读同一份 catalog；解析失败就 fail-loud，
// 不静默退化成「少一个也算全」。

// 2026-10-23（架构评审候选 3）：页签身份收进 tab-icons 的 FACES 表后，注册行只带 face 键；
// 标题不再出现在注册源里 ⇒ 解析器必须同时读身份源，缺一即空（fail-loud，不静默少一个）。
const TAB_ROW = /id:\s*'(dsh-company-pack\/[^']+)',\s*kind:\s*'[^']+',\s*face:\s*'([^']+)'/g
const FACE_ROW = /^\s{2}(\w+): \{ tone: '[^']+', glyph: \w+ \}/gm
const ZH_LABEL = /'tabs\.([a-z-]+)\.label':\s*'([^']+)'/g

/**
 * 解析页签注册目录（注册源 + 身份源两份输入）。
 * @param {string} source `packages/company-pack/src/client/tabs/company-tab-registration.ts` 全文。
 * @param {string} identitySource `packages/company-pack/src/client/ui/tab-icons.tsx` 全文。
 * @param {string} copySource `packages/company-pack/src/client/locales.ts` 全文（取 zh label）。
 * @returns {ReadonlyArray<{ id: string, title: string }>} 按注册源顺序；face 不在身份源 / copySource 无 zh label ⇒ []。
 */
export function parseCompanyTabCatalog(source, identitySource, copySource) {
  if (typeof identitySource !== 'string' || typeof copySource !== 'string') return []
  const faces = new Set([...identitySource.matchAll(FACE_ROW)].map(match => match[1]))
  // zh 对象在 en 之前；同名 key 只取第一次出现（en 也在同一文件里）。
  const labels = new Map()
  for (const match of copySource.matchAll(ZH_LABEL)) if (!labels.has(match[1])) labels.set(match[1], match[2])
  const rows = []
  for (const match of source.matchAll(TAB_ROW)) {
    const face = match[2]
    const title = labels.get(face)
    if (!faces.has(face) || title === undefined) return []
    rows.push({ id: match[1], title })
  }
  return rows
}
