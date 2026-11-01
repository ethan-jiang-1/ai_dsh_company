/**
 * 插件市场 index（format 1）的纯构造函数与真校验入口。
 *
 * 形状的唯一权威 = DSH 的 `@deepseek-ai/dsh-plugin-market-index`（vendor 内 built lib）；
 * 字段来源照 vendor 的 plugin-market-generator README：locale `meta`、manifest author/homepage/
 * repository/keywords、`engines.dsh`。这里不发明格式，只把本包 manifest 映射成条目，
 * 再用 DSH 的 `parseMarketIndex` 验一遍。
 */

/** 从 GitHub 仓库 URL 取市场要的网页 URL（去 `.git`；不保留 git+ 前缀）。 */
export function repositoryWebUrl(url) {
  return String(url).replace(/^git\+/, '').replace(/\.git$/, '').replace(/\/+$/, '')
}

/** 本地化文本：英文必有；中文缺省回退英文（format 1 要求 en）。 */
function localized(en, zh) {
  return zh === undefined || zh === '' ? { en } : { en, zh }
}

/**
 * 构造本包的 market index（一个插件、一个版本）。
 * @param {object} input
 * @param {object} input.manifest packages/company-pack/package.json
 * @param {Record<string, {meta?: {title?: string, description?: string}}>} input.locales
 * @param {number} input.publishTimestamp Unix 秒（staged index = 生成时刻；发布后用 generator 重生成）
 * @param {string} [input.icon] 相对 index 的图标路径
 */
export function buildMarketIndex({ manifest, locales, publishTimestamp, icon = 'icons/dsh-company-pack.svg' }) {
  const en = locales.en?.meta ?? {}
  const zh = locales.zh?.meta ?? {}
  const version = manifest.version
  const author = typeof manifest.author === 'string' ? manifest.author : manifest.author?.name
  const repository = manifest.repository?.url === undefined
    ? undefined
    : {
        url: repositoryWebUrl(manifest.repository.url),
        ...(manifest.repository.directory === undefined ? {} : { directory: manifest.repository.directory }),
      }
  const plugin = {
    name: manifest.name,
    title: localized(en.title ?? manifest.name, zh.title),
    description: localized(en.description ?? manifest.description ?? '', zh.description),
    icon,
    ...(author === undefined ? {} : { author }),
    ...(manifest.homepage === undefined ? {} : { homepage: manifest.homepage }),
    ...(repository === undefined ? {} : { repository }),
    metadata: { keywords: Array.isArray(manifest.keywords) ? manifest.keywords : [] },
    versions: [
      {
        version,
        publishTimestamp,
        source: { type: 'npm' },
        engines: manifest.engines?.dsh === undefined ? {} : { dsh: manifest.engines.dsh },
      },
    ],
  }
  return {
    format: 1,
    title: localized(`${en.title ?? manifest.name} market`, zh.title === undefined ? undefined : `${zh.title}市场`),
    description: localized('DSH plugin market index for this package.', '本包面向 DSH 的插件市场索引。'),
    plugins: [plugin],
  }
}
