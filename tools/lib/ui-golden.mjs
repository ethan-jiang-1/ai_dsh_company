// 纯逻辑：真页面 UI 金样的归一化与比较（keyless，无 I/O）。
//
// 为什么（2026-10-27/28 六维提分 D5）：公司页签此前只有"挂载/非空"冒烟，没有"内容变了要发现"的
// 回归网。金样档把隔离场景（无会话的公司壳）每个页签的可见文本存成一份 JSON，改动即红，
// 由人决定"这是有意的 UI 变化（--refresh-golden）还是回归"。
//
// 边界：金样只覆盖**隔离空壳**（无会话数据面）；会话内数据渲染仍由 keyless 渲染 spec 与
// 真模型档覆盖。文本归一化 = 去零宽字符、折叠空白、去首尾——时间/计数不做掩码，
// 场景本身保证这些值确定（隔离盘、无会话、零调用）。

/** 归一化可见文本：去零宽、折叠空白、trim。 */
export function normalizeText(text) {
  return String(text ?? '').replace(/\u200b/g, '').replace(/\s+/g, ' ').trim()
}

/** 从 {标题: 原始文本} 造一份可提交的金样（不含时间戳，保证 diff 干净）。 */
export function buildGolden({ catalog, tabTexts }) {
  const tabs = {}
  for (const title of catalog) tabs[title] = normalizeText(tabTexts?.[title] ?? '')
  return { schema: 1, scene: 'company-shell', catalog: [...catalog], tabs }
}

/**
 * 比对金样与本次捕获。
 * @returns {{ catalogProblems: string[], tabProblems: Array<{tab: string, expected: string, actual: string}> }}
 */
export function compareGolden(golden, { catalog, tabTexts }) {
  const goldenCatalog = Array.isArray(golden?.catalog) ? golden.catalog : []
  const catalogProblems = []
  if (goldenCatalog.join('|') !== [...catalog].join('|')) {
    catalogProblems.push(`页签目录变了：金样 [${goldenCatalog.join('、')}] / 注册面 [${catalog.join('、')}]`)
  }
  const tabProblems = []
  for (const title of goldenCatalog) {
    const expected = normalizeText(golden?.tabs?.[title] ?? '')
    const actual = normalizeText(tabTexts?.[title] ?? '')
    if (expected !== actual) tabProblems.push({ tab: title, expected, actual })
  }
  return { catalogProblems, tabProblems }
}

/** 金样形状校验（门禁用）：schema/catalog/tabs 齐、每个页签都有非空文本。 */
export function goldenProblems(golden, catalog) {
  const problems = []
  if (golden === null || typeof golden !== 'object' || Array.isArray(golden)) return ['金样不是对象']
  if (golden.schema !== 1) problems.push(`schema 应为 1，实际 ${String(golden.schema)}`)
  if (golden.scene !== 'company-shell') problems.push(`scene 应为 company-shell，实际 ${String(golden.scene)}`)
  const tabs = golden.tabs ?? {}
  for (const title of catalog) {
    const text = normalizeText(tabs[title])
    if (text === '') problems.push(`页签「${title}」的金样文本为空`)
  }
  const extra = Object.keys(tabs).filter(title => !catalog.includes(title))
  if (extra.length > 0) problems.push(`金样含注册面没有的页签：${extra.join('、')}`)
  return problems
}

/** 首处差异的可读片段（失败信息用；不打印整段）。 */
export function firstTextDiff(expected, actual) {
  const left = String(expected)
  const right = String(actual)
  let i = 0
  while (i < left.length && i < right.length && left[i] === right[i]) i += 1
  const from = Math.max(0, i - 30)
  return {
    at: i,
    expected: left.slice(from, i + 60),
    actual: right.slice(from, i + 60),
  }
}
