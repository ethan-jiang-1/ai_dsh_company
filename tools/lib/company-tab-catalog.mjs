// 从 client 页签注册面（company-tab-registration.ts）解析页签目录。
//
// 为什么：cdp-probe 原先手写 8 个页签，2026-10-19 新增「成品」后仍是 8/8 绿——
// 清单是手维护的，必漂。这里让探针从注册源读同一份 catalog；解析失败就 fail-loud，
// 不静默退化成「少一个也算全」。

const TAB_ENTRY = /id:\s*'(dsh-company-pack\/[^']+)',\s*kind:\s*'[^']+',\s*title:\s*'([^']+)'/g

/**
 * 解析页签注册目录。
 * @param {string} source `packages/company-pack/src/client/company-tab-registration.ts` 全文。
 * @returns {ReadonlyArray<{ id: string, title: string }>} 按源文件顺序。
 */
export function parseCompanyTabCatalog(source) {
  const rows = []
  for (const match of source.matchAll(TAB_ENTRY)) {
    rows.push({ id: match[1], title: match[2] })
  }
  return rows
}
