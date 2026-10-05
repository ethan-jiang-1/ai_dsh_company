// 导航资产骨架守卫（RFC test-navigation，2026-10-05 红→绿落地）
// 何时跑：pnpm test 全量（keyless，毫秒级——纯文件断言，零进程/网络/浏览器）。
// 状态：常驻
// 证明：tests/README.md 与 snapshots/README.md 的导航要素在场（四区行、最窄检查映射锚点、
//   首跑验收定位、oracle 声明政策、tests/README 相对链接可解析——md-links 门禁不扫 tests/，
//   链接存在性由本 spec 补上）。
// 不证明：内容语义质量（人审与走查兜）；脚本触发/成本/状态唯一源 = 脚本头注（script-triggers
//   门禁自述），本 spec 只钉骨架锚点——复述清单必漂，故只断言锚点词不抄内容。
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../scripts/lib/repository-layout.mjs'

const read = (rel: string) => readFileSync(join(repositoryRoot, rel), 'utf8')

describe('tests/README 导航骨架', () => {
  it('tests/README.md 在场', () => {
    expect(existsSync(join(repositoryRoot, 'tests/README.md'))).toBe(true)
  })

  it('四区各被点名且带「不证明」列', () => {
    const text = read('tests/README.md')
    for (const domain of ['tests/company', 'tests/client', 'tests/presets', 'tests/harness']) {
      expect(text).toContain(domain)
    }
    expect(text).toContain('不证明')
  })

  it('改动面→最窄检查映射在场（含四类代表锚点）', () => {
    const text = read('tests/README.md')
    expect(text).toContain('最窄检查')
    for (const anchor of ['persona', 'client 面板', '读模型', '运行态脚本']) {
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
      .map((m) => m[1])
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

describe('snapshots 场景元数据政策', () => {
  it('新场景 oracle 来源性质声明政策在场', () => {
    const text = read('snapshots/README.md')
    expect(text).toContain('来源性质')
    expect(text).toContain('独立 oracle')
  })
})
