/**
 * tests/presets 的 YAML 读取缝：preset YAML → 顶层 plugin 行（含嵌套 group）。
 *
 * 为什么单独成文件：P1 起模型 spec 与组合 spec 共用；不要把 `!!js` schema/导航逻辑各抄一份。
 * 不是 spec，不进入 `pnpm test` 的发现面；只被 spec import。
 *
 * 注意：`config` 在 group 行上是**数组**（子行），在普通行上是对象。`flattenPlugins` 只对数组递归，
 * 不对普通 config 对象递归——否则会把 `tool-subagent.config` 当成组。
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const yaml = createRequire(join(ROOT, 'vendor/dsh/package.json'))('js-yaml') as {
  load(text: string, options?: unknown): unknown
  Type: new (tag: string, options: { kind: string, construct: (data: string) => string }) => unknown
  DEFAULT_SCHEMA: { extend(types: unknown[]): unknown }
}

/** DSH 的 preset 用 `!!js` 表达式；测试只把它当字符串，不求值。 */
const YAML_SCHEMA = yaml.DEFAULT_SCHEMA.extend([
  new yaml.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: data => data }),
])

export interface PresetPlugin {
  readonly id?: string
  readonly name?: string
  readonly config?: unknown
  readonly [key: string]: unknown
}

export interface PresetDoc {
  readonly id: string
  readonly plugins: readonly PresetPlugin[]
  readonly raw: string
}

interface PresetFile {
  readonly insert?: readonly {
    readonly name?: string
    readonly config?: { readonly id?: string; readonly plugins?: readonly PresetPlugin[] }
  }[]
}

/** 读一个 preset 的声明文件，返回 `config.plugins`（不递归展开）。 */
export function loadPresetDoc(id: string): PresetDoc {
  const path = join(ROOT, 'packages/company-pack/presets', id, 'agent.cordis.yml')
  const raw = readFileSync(path, 'utf8')
  const docs = yaml.load(raw, { schema: YAML_SCHEMA }) as readonly PresetFile[] | null
  const row = docs?.[0]?.insert?.find(item => item?.name === '@deepseek-ai/dsh-agent-preset')
  if (row?.config?.id !== id) throw new Error(`${id}: 缺 dsh-agent-preset 行或 config.id 不匹配`)
  if (!Array.isArray(row.config.plugins)) throw new Error(`${id}: config.plugins 不是数组`)
  return { id, plugins: row.config.plugins, raw }
}

/** 递归展开 group 行（`config` 是数组时才是子行）。 */
export function flattenPlugins(plugins: readonly PresetPlugin[]): PresetPlugin[] {
  const out: PresetPlugin[] = []
  const walk = (rows: readonly PresetPlugin[]): void => {
    for (const row of rows) {
      out.push(row)
      if (Array.isArray(row.config)) walk(row.config as readonly PresetPlugin[])
    }
  }
  walk(plugins)
  return out
}

/** 一个 preset 的全部行（含嵌套 group）。 */
export function allRows(doc: PresetDoc): PresetPlugin[] {
  return flattenPlugins(doc.plugins)
}

/** 按行 id 找一行（含嵌套 group）。 */
export function rowById(doc: PresetDoc, id: string): PresetPlugin | undefined {
  return allRows(doc).find(row => row.id === id)
}

/** 按插件名找行（含嵌套 group；subpath 不归一，调用方自行匹配）。 */
export function rowsNamed(doc: PresetDoc, name: string): PresetPlugin[] {
  return allRows(doc).filter(row => row.name === name)
}

/** 把普通行的 config 读成对象；group 行（数组）返回空对象。 */
export function pluginConfig(row: PresetPlugin | undefined): Record<string, unknown> {
  return row !== undefined && row.config !== null && typeof row.config === 'object' && !Array.isArray(row.config)
    ? row.config as Record<string, unknown>
    : {}
}
