/**
 * 插件市场 index（format 1）的纯构造函数。
 *
 * 形状的唯一权威 = DSH 的 `@deepseek-ai/dsh-plugin-market-index`（vendor 内 built lib）；
 * 字段来源照 vendor 的 plugin-market-generator README：locale `meta`、manifest author/homepage/
 * repository/keywords、`engines.dsh`。这里不发明格式，只把本包 manifest 映射成条目；
 * 真校验在 `tools/market-index.mjs`（用 vendor 的 parseMarketIndex）。
 */

/** 市场声明的分类/标签/排序键；插件引用前必须先在这里声明。 */
const MARKET_METADATA = {
  categories: {
    company: { title: { en: 'Company & teams', zh: '公司与团队' } },
  },
  labels: {
    'dsh-plugin': { title: { en: 'DSH plugin', zh: 'DSH 插件' } },
    'multi-agent': { title: { en: 'Multi-agent', zh: '多智能体' } },
  },
  sortKeys: {
    published: { title: { en: 'Published', zh: '发布时间' }, order: 'desc' },
  },
}

/**
 * 已列版本的发布时间保持稳定：重复 `--prepare` 不因"生成时刻"改变已跟踪文件的字节。
 * 同 name+version 已有条目 → 沿用它的 publishTimestamp；版本变了或显式 refresh → 用 now。
 */
export function stablePublishTimestamp({ existingIndex, name, version, now, refresh = false }) {
  if (!refresh && existingIndex !== undefined) {
    const plugin = (existingIndex.plugins ?? []).find(item => item?.name === name)
    const listed = (plugin?.versions ?? []).find(item => item?.version === version)
    const stamp = listed?.publishTimestamp
    if (Number.isInteger(stamp) && stamp > 0) return stamp
  }
  return now
}

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
 * @param {string} [input.icon] 图标：data URL（推荐，单文件可托管）或相对 index 的路径
 */
export function buildMarketIndex({ manifest, locales, publishTimestamp, icon }) {
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
    ...(icon === undefined ? {} : { icon }),
    ...(author === undefined ? {} : { author }),
    ...(manifest.homepage === undefined ? {} : { homepage: manifest.homepage }),
    ...(repository === undefined ? {} : { repository }),
    metadata: {
      category: 'company',
      keywords: Array.isArray(manifest.keywords) ? manifest.keywords : [],
      labels: ['dsh-plugin', 'multi-agent'],
      sortKeys: { published: publishTimestamp },
    },
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
    title: localized('Dream Team plugins', '梦之队插件'),
    description: localized('Plugins for the Dream Team company in DSH.', '梦之队公司在 DSH 里的插件索引。'),
    metadata: MARKET_METADATA,
    plugins: [plugin],
  }
}
