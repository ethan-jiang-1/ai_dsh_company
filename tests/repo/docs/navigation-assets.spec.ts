// 导航资产骨架守卫（RFC test-navigation，2026-10-05 红→绿落地）
// 何时跑：pnpm test 全量（keyless，毫秒级——纯文件断言，零进程/网络/浏览器）。
// 状态：常驻
// 证明：tests/README.md 与 snapshots/README.md 的导航要素在场（分区行、最窄检查映射锚点、
//   首跑验收定位、oracle 声明政策、tests/README 相对链接可解析——md-links 门禁不扫 tests/，
//   链接存在性由本 spec 补上）。
// 不证明：内容语义质量（人审与走查兜）；脚本触发/成本/状态唯一源 = 脚本头注（script-triggers
//   门禁自述），本 spec 只钉骨架锚点——复述清单必漂，故只断言锚点词不抄内容。
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../../tools/lib/core/repository-layout.mjs'

const read = (rel: string) => readFileSync(join(repositoryRoot, rel), 'utf8')

describe('tests/README 导航骨架', () => {
  it('tests/README.md 在场', () => {
    expect(existsSync(join(repositoryRoot, 'tests/README.md'))).toBe(true)
  })

  it('各领域分区被点名且带「不证明」列', () => {
    const text = read('tests/README.md')
    for (const domain of ['tests/host', 'tests/lib', 'tests/content', 'tests/client', 'tests/presets', 'tests/repo', 'tests/contract', 'tests/tools', 'tests/session', 'tests/evidence', 'tests/ui']) {
      expect(text).toContain(domain)
    }
    expect(text).toContain('不证明')
  })

  it('改动面→最窄检查映射在场（含四类代表锚点）', () => {
    const text = read('tests/README.md')
    expect(text).toContain('最窄检查')
    for (const anchor of ['persona', 'client 面板', '读模型', '检查与工具入口']) {
      expect(text).toContain(anchor)
    }
  })

  it('首跑验收定位：entry-probe 推荐 + 无 key 替代路径', () => {
    const text = read('tests/README.md')
    expect(text).toContain('entry-probe-smoke')
    expect(text).toContain('真模型认证档')
    expect(text).toContain('无 key')
    expect(text).toContain('client-load-smoke')
  })

  it('不复述脚本头注清单（状态字段不抄写）', () => {
    expect(read('tests/README.md')).not.toContain('状态：常驻')
  })

  it('tests/README 相对链接全部可解析', () => {
    const text = read('tests/README.md')
    const links = [...text.matchAll(/\]\(([^)#\s]+?)(?:#[^)]*)?\)/g)]
      .map((m) => m[1]!)
      .filter((target) => !/^https?:/.test(target))
    expect(links.length).toBeGreaterThan(4)
    for (const link of links) {
      expect(
        existsSync(join(repositoryRoot, 'tests', link)) || existsSync(join(repositoryRoot, link)),
        `死链：${link}`,
      ).toBe(true)
    }
  })
})

describe('AGENTS 命令表路径', () => {
  it('命令表提到的 tests/ 路径（含花括号组）都存在', () => {
    const text = read('AGENTS.md')
    const block = /## 命令表[\s\S]*?```sh\n([\s\S]*?)```/.exec(text)?.[1] ?? ''
    const tokens = new Set<string>()
    for (const match of block.matchAll(/tests\/(?:\{[^}\n]+\}|[A-Za-z0-9._-]+)/g)) {
      const raw = match[0]
      const names = raw.startsWith('tests/{')
        ? raw.slice('tests/{'.length, -1).split(',').map((name) => name.trim()).filter(Boolean)
        : [raw.slice('tests/'.length)]
      for (const name of names) tokens.add(`tests/${name}`)
    }
    expect(tokens.size).toBeGreaterThan(0)
    for (const token of tokens) {
      expect(existsSync(join(repositoryRoot, token)), `AGENTS.md 引用不存在的路径：${token}`).toBe(true)
    }
  })
})

describe('snapshots 场景元数据政策', () => {
  it('新场景 oracle 来源性质声明政策在场', () => {
    const text = read('snapshots/README.md')
    expect(text).toContain('来源性质')
    expect(text).toContain('独立 oracle')
  })
})

describe('clean-clone 首跑序列单家锚点（防 handoff/bootstrap 漂移）', () => {
  // 散文家 = bootstrap（AGENTS「fresh clone 顺序唯一家」）；行为家 = tools/dev/setup.mjs（内部含
  // vendor 自身 lock install + typert pass）。本常量只做**漂移守卫锚点**（同 navigation-assets 钉骨架
  // 教义：复述清单必漂，故只钉命令在场+顺序，不抄全文）。handoff §1 是入口自足复述，必须与 bootstrap
  // 共享 init 前缀同序；改序/删步/两家分叉 → 红。2026-11-16 立（接手评估 Top3：序列三家无同步守卫）。
  // 盲审 S4 边界登记：ordered() 取全文首现序（非 §1 块提取）。今日全部首现恰在 §1 sh 块内（有效）；
  // 前文早提同命令会致假红（保守方向，安全）；邻位窗口提及理论上可掩盖 §1 删步——现盘无此形，
  // 若将来 handoff 前文引入同命令再收窄到块提取（仿本文件「AGENTS 命令表」的块抽取）。
  const INIT = ['git submodule update --init', 'corepack enable pnpm', 'pnpm install', 'pnpm bundle:init', 'pnpm setup']
  const ACCEPTANCE = ['node tools/dev/setup.mjs --check', 'pnpm verify', 'pnpm test', 'pnpm typecheck']
  const ordered = (text: string, cmds: string[]) => {
    let last = -1
    for (const cmd of cmds) {
      const at = text.indexOf(cmd)
      expect(at, `缺命令或乱序：${cmd}`).toBeGreaterThan(last)
      last = at
    }
  }
  it('handoff §1 含完整首跑 + 验收序列（按序）', () => {
    ordered(read('docs/guides/repo-handoff.md'), [...INIT, ...ACCEPTANCE])
  })
  it('bootstrap 含共享 init 前缀（按序，与 handoff 不分叉）', () => {
    ordered(read('docs/guides/bootstrap.md'), INIT)
  })
})
