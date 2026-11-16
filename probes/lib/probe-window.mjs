/**
 * 观察窗探针的共享开场步骤（浏览器侧）。
 *
 * 为什么抽出来：三条台账/compact/open-in-app 探针各自抄了同一段「首启双模态关掉 + 选会话 + 开右栏」
 * ——同一形状四份拷贝（cdp-probe 也在内，它是驱动层的逐字拷贝契约、不动），改一次要点四处。
 * 这里只收**已在多处重复且语义稳定**的三步；探针各自的断言留在探针里。
 */

/** 首启双模态对话框（0.2.0 起两个，Continue 同名按钮）；每个新浏览器上下文都会再弹。 */
export const NOTICE_DIALOGS = ['Internal Testing Notice', 'Preview Notice']

/**
 * 关掉首启提示对话框（不在场时静默跳过）。
 * @param page - Playwright 页面。
 * @param sleep - 探针自己的 sleep（避免在这里引入计时策略）。
 * @returns 实际关掉的对话框名。
 */
export async function dismissNotices(page, sleep) {
  const dismissed = []
  for (const name of NOTICE_DIALOGS) {
    const dialog = page.locator('[role=dialog]').filter({ hasText: name })
    if (await dialog.count() === 0) continue
    const button = dialog.getByRole('button', { name: /Continue/ })
    if (await button.count() === 0) continue
    await button.first().click()
    dismissed.push(name)
    await sleep(500)
  }
  return dismissed
}

/**
 * 打开历史会话并在需要时展开右栏（会话选择必须在窄视口之前：折叠导航里选不中会话，390px 实测）。
 * @param page - Playwright 页面。
 * @param title - 会话标题（左侧列表里的精确文本）。
 * @param sleep - 探针自己的 sleep。
 * @returns 无。
 */
export async function openSession(page, title, sleep) {
  await page.getByText(title, { exact: true }).first().click()
  await sleep(2000)
  const opener = page.getByRole('button', { name: 'Open right sidebar', exact: true })
  if (await opener.count() > 0) await opener.click()
  await sleep(800)
}

/**
 * 用会话搜索打开历史会话（侧栏标题被折叠/截断/虚拟化时，比按可见文字点更稳）。
 * @param page - Playwright 页面。
 * @param title - 会话标题（搜索框按子串匹配）。
 * @param sleep - 探针自己的 sleep。
 * @returns 无。
 */
export async function openSessionBySearch(page, title, sleep) {
  const searchButton = page.getByRole('button', { name: 'Search sessions' })
  if (await searchButton.count() > 0) {
    if (await searchButton.getAttribute('aria-expanded') !== 'true') await searchButton.click()
  }
  await page.getByPlaceholder('Search session names').fill(title)
  const result = page.getByRole('tree', { name: 'Search results' }).getByRole('treeitem').filter({ hasText: title })
  await result.first().waitFor({ state: 'visible', timeout: 20_000 })
  await result.first().click()
  await sleep(2000)
  const opener = page.getByRole('button', { name: 'Open right sidebar', exact: true })
  if (await opener.count() > 0) await opener.click()
  await sleep(800)
}

/**
 * 打开右栏的公司页签（按左侧指南条目的标签点）。
 * @param page - Playwright 页面。
 * @param label - 页签标签，如 `台账`。
 * @param sleep - 探针自己的 sleep。
 * @returns 无。
 */
export async function openCompanyTab(page, label, sleep) {
  await page.locator('.wk-guide-entry-label').filter({ hasText: label }).click()
  await sleep(1000)
}
