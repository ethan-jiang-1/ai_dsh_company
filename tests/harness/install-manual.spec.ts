/**
 * 《安装手册》纯模板判据（2026-11-03 第六轮 F 批）。
 *
 * 为什么补：`tools/lib/install-manual.mjs`（`renderInstallManual`）是收件人拿到的唯一安装/卸载文档的
 * **唯一事实源**，此前零覆盖——第六轮修了两处真实错误（lease 路径写错、workspace 登记/客户端日志/
 * localStorage 未披露），没有判据就还会漂回去。
 *
 * 证明不了：手册是否被正确打包进 `_dist`/发布（归 release-smoke 与 `dist-manual` 门禁）；
 * 版本/日期/sha 与真实 tarball 一致（归 `dist-manual` 门禁）。
 */
import { describe, expect, it } from 'vitest'
import { renderInstallManual } from '../../tools/lib/install-manual.mjs'

const INPUT = {
  version: '9.8.7',
  tarballName: 'dsh-company-pack-9.8.7.tgz',
  digest: 'a'.repeat(64),
  date: '2026-11-03',
  expectedTag: 'dsh-v0.2.1-rc.2',
  entries: 133,
}

const manual = renderInstallManual(INPUT)

describe('安装手册模板（renderInstallManual）', () => {
  it('头部注入版本 / 包名 / sha256 / 日期 / DSH 窗口 / 许可', () => {
    expect(manual).toContain('# dsh-company-pack 安装手册')
    expect(manual).toContain('| 版本 | 9.8.7 |')
    expect(manual).toContain('dsh-company-pack-9.8.7.tgz')
    expect(manual).toContain('a'.repeat(64))
    expect(manual).toContain('| 打包日期 | 2026-11-03 |')
    expect(manual).toContain('engines.dsh')
    expect(manual).toContain('MIT')
  })

  it('安装入口写的是 DSH 原生路径（Plugins 页 + CLI web 自动化 + 首次建 profile）', () => {
    expect(manual).toContain('Plugins')
    expect(manual).toContain('dsh plugin --profile company add')
    expect(manual).toContain('--from-default-profile web')
    expect(manual).toContain('application: applied')
    // 没有自造启动器/bin 的承诺（DSH 约定：只有 named profile 启动应用）
    expect(manual).not.toMatch(/bin\/|launcher|启动器脚本/)
  })

  it('卸载清单披露真实残留路径（lease 在 home 根、workspace 登记、客户端日志、浏览器本地）', () => {
    expect(manual).toContain('## 七、卸载')
    expect(manual).toContain('<DSH_HOME>/company-pack.lock')
    expect(manual).toContain('在 home 根，不在')
    expect(manual).toContain('<DSH_HOME>/storages/workspace.json')
    expect(manual).toContain('<DSH_HOME>/logs/company-client-errors.log')
    expect(manual).toContain('localStorage')
    // 旧错误：把 lease 归到 company/ 下（2026-11-03 修）；这条断言防止回退
    expect(manual).not.toContain('presented 账本、lease 残留')
    // 彻底删除的命令必须点名锁与日志（只删 company/ 会留下它们）
    expect(manual).toMatch(/rm -f\s+<DSH_HOME>\/company-pack\.lock/)
    expect(manual).toMatch(/rm -f\s+<DSH_HOME>\/logs\/company-client-errors\.log/)
  })

  it('安装形态与「不要删整个 home」的边界在场（防止卸载建议造成数据损失）', () => {
    expect(manual).toContain('不要**为了清插件删除整个')
    expect(manual).toContain('本包不代删用户项目')
    expect(manual).toContain('<workspace>/.dsh-company/')
  })
})
