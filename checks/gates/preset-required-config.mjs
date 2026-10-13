// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { roles } from './presets.mjs'

// ── 3-bis. preset 行 schema 必填字段门禁（preset-required-config，2026-10-09 N4 立）────
// 复发依据（**已实地复发**，不是推测）：postmortem 0001（preset 挂载失败、用户浏览器里才发现）
// 明文把「`scripts/verify.mjs` check 8 — rows with known schema-required fields must carry them」
// 列为它产出的护栏之一；**该门禁现已不存在**（N4 实测：删掉 0001 的元凶字段
// `sampleOverCapGlobResults`，`pnpm verify` 依然 ALL PASS，只有真挂载的 preset-smoke 才红）。
// ⇒ 事故留下的护栏在改名/重构中**静默丢失**，而没有任何机制发现它丢了。
// 判据源 = vendor **committed** 生成物 `docs/config-catalog.md`（145 个 catalog 块 / 56 包有必填字段）：
// 结构即事实——`  name: type` = 必填，`  name?: type` = 有默认值。不用 import vendor TS（免构建、免越界）。
// 病灶形状 = 行**声明了 config 却漏字段**；行压根没 config（如 tool-todo 在别处）不归本门禁管
// （那是"该不该配"的设计问题，preset-smoke 的真挂载覆盖）。
// 负例留证 2026-10-09：删 ceo 行 `sampleOverCapGlobResults: false` → preset-required-config 红 + preset-smoke 红
//（3 FAILURE）；还原 → 双绿。收据 = implemented/2026-10-09-postmortem-guard-restoration.md。
export function run({ root, ok, fail }) {
  // 空转下限：声明了 config 的行数不该莫名缩水（形状变了要报，不是静默少查几行）。
  const MIN_EXPECTED_CONFIG_ROWS = 20
  const catalogPath = join(root, 'vendor/dsh/docs/config-catalog.md')
  const presetRequired = new Map()   // '@scope/pkg' → ['field', ...]
  if (existsSync(catalogPath)) {
    const catalog = readFileSync(catalogPath, 'utf8')
    const blockRe = /<!-- BEGIN GENERATED config-catalog:(@\S+) -->([\s\S]*?)<!-- END GENERATED config-catalog:\1 -->/g
    for (const [, pkg, body] of catalog.matchAll(blockRe)) {
      const fence = /```ts config-catalog\n([\s\S]*?)```/.exec(body)
      if (fence === null) continue
      // 只认顶层 `export interface Config {`（缩进 0）里的字段（缩进恰 2 空格）；嵌套对象/其它接口不算。
      const iface = /^export interface Config \{\n([\s\S]*?)^\}/m.exec(fence[1])
      if (iface === null) continue
      const fields = []
      for (const line of iface[1].split('\n')) {
        const m = /^ {2}([A-Za-z_][A-Za-z0-9_]*):/.exec(line)   // 无 `?` = 必填
        if (m !== null) fields.push(m[1])
      }
      if (fields.length > 0) presetRequired.set(pkg, fields)
    }
  }
  if (presetRequired.size === 0) {
    fail('preset-required-config', '解析不出 vendor docs/config-catalog.md 的必填字段（判据源没了：catalog 格式改了还是文件被移走了？）')
  } else {
    const missing = []
    let checkedRows = 0
    for (const role of roles) {
      const file = join(root, 'packages/company-pack/presets', role, 'agent.cordis.yml')
      if (!existsSync(file)) continue
      const lines = readFileSync(file, 'utf8').split('\n')
      // 逐行找 `- id:` 行块，取块的 name 与 config 子键（YAML 子集：够读本仓自写的 preset 文件）
      for (let i = 0; i < lines.length; i++) {
        const idm = /^\s*-\s*id:\s*(\S+)/.exec(lines[i])
        if (idm === null) continue
        const indent = /^(\s*)/.exec(lines[i])[1].length
        let name = null
        const configKeys = []
        let sawConfig = false
        let inConfig = false
        let configIndent = -1
        for (let j = i + 1; j < lines.length; j++) {
          const raw = lines[j]
          if (raw.trim() === '') continue
          const ind = /^(\s*)/.exec(raw)[1].length
          if (ind <= indent && /^\s*-/.test(raw)) break        // 下一个兄弟行
          if (ind <= indent && /\S/.test(raw)) break
          const nm = /^\s*name:\s*'?"?([^'"\s]+)'?"?\s*$/.exec(raw)
          if (nm !== null && name === null) { name = nm[1]; continue }
          const cfg = /^(\s*)config:\s*$/.exec(raw)
          if (cfg !== null) { sawConfig = true; inConfig = true; configIndent = cfg[1].length; continue }
          if (inConfig === true) {
            const km = /^(\s*)([A-Za-z_][A-Za-z0-9_]*):/.exec(raw)
            if (km !== null) {
              if (km[1].length <= configIndent) { inConfig = false; continue }   // config 块结束
              configKeys.push(km[2])
            }
          }
        }
        // ⚠ 判据必须是「这一行**声明了** config」，不是「config 里还剩几个键」——后者会让
        //   "删掉最后一个必填键"变成"这行不再有 config ⇒ 跳过"，**门禁静默放行**（N4 实测首版就栽在这，
        //   删元凶字段后只看到计数 32→30 而全绿）。声明了 config 的行一律受判，哪怕 config 已空。
        if (name === null || sawConfig === false) continue    // 压根没 config 行 = 不归本门禁（见上）
        const required = presetRequired.get(name)
        if (required === undefined) continue
        checkedRows++
        const lacked = required.filter(f => !configKeys.includes(f))
        if (lacked.length > 0) missing.push(`${role}: ${name}（${lacked.length} 个必填字段缺）${lacked.join(', ')}`)
      }
    }
    if (checkedRows < MIN_EXPECTED_CONFIG_ROWS) {
      fail('preset-required-config', `只识别到 ${checkedRows} 个「声明了 config」的行（期望 ≥${MIN_EXPECTED_CONFIG_ROWS}）——解析退化了（YAML 形状改了？），门禁可能在空转`)
    } else {
      missing.length === 0
        ? ok(`preset-required-config ×${checkedRows} 行（声明了 config 的行，必填字段齐——判据 = vendor config-catalog）`)
        : fail('preset-required-config', `这些 preset 行的 config 漏 schema 必填字段（挂载时整份 preset 失败且 UI 静默——事故 0001 复原）：${missing.join('；')}`)
    }
  }
}
