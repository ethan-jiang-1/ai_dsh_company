import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../../tools/lib/core/repository-layout.mjs'

// 负例留证 2026-11-17：把 tests/README 的 lib→replay 面表或 Note 的 16 件接回，本 spec 红（BUG-209）；改回 → 绿。
// 负例留证 2026-11-17：把 tools/README 的「不启动进程、不联网」接回，本 spec 红（BUG-211）；改回 → 绿。

/**
 * live 声明不手抄会漂的事实（2026-11-17 BUG-209/211）。
 *
 * 为什么：`tests/README.md` 曾手抄 pre-push 面表（`lib → replay-smoke`），搬移后 `tools/lib`
 * 已经改走 coveredBy，读者却仍会期望 replay；`lib-ownership-split` Note 的「16 件 / 1 件」在
 * 同波搬移里已经不准。`tools/README.md` 的「不启动进程、不联网」又与 `probe/` 的 web 启动管道
 * 直接矛盾。这些不是路径（bare-path 管不到），是**声明与实盘不一致**。
 *
 * 判据（机械、窄）：三处声明只钉「不再手抄」与「唯一源指针/准确措辞」，不重复抄写面表或件数。
 *
 * 负例留证 2026-11-17：把 tests/README 的 lib→replay 面表或 Note 的 16 件接回，本 spec 红（BUG-209）；改回 → 绿。
 * 负例留证 2026-11-17：把 tools/README 的「不启动进程、不联网」接回，本 spec 红（BUG-211）；改回 → 绿。
 */
const testsReadme = readFileSync(join(ROOT, 'tests/README.md'), 'utf8')
const toolsReadme = readFileSync(join(ROOT, 'tools/README.md'), 'utf8')
const ownershipNote = readFileSync(join(ROOT, 'notes/implemented/2026-11-17-lib-ownership-split.md'), 'utf8')

describe('live 声明只有一个事实源', () => {
  it('tests/README 不手抄 pre-push 面表（只留 SURFACE_RULES 指针）（BUG-209）', () => {
    expect(testsReadme).not.toContain('`lib` → `replay-smoke`')
    expect(testsReadme).toContain('面成员与 `coveredBy` 唯一家')
  })

  it('lib-ownership Note 不手写会随搬移漂的件数（BUG-209）', () => {
    expect(ownershipNote).not.toMatch(/16 件 \+ 冻结 CI 套件/)
    expect(ownershipNote).not.toMatch(/测试专属 1 件/)
    expect(ownershipNote).toContain('测试专属支撑 = `tests/support/`')
  })

  it('tools/README 的 lib 纯度句与实盘一致（注入式进程仍算 lib，靠评审）（BUG-211）', () => {
    expect(toolsReadme).not.toContain('不启动进程')
    expect(toolsReadme).toContain('不直接 import/调用进程与网络')
    expect(toolsReadme).toContain('以参数注入')
    expect(toolsReadme).toContain('靠评审')
  })
})
