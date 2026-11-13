// 状态：常驻
// 层契约钉子（BUG-042 修复轮）：child 终止态必须从 **root 可用的 sessionPersistence** 读，
// 不是 isolate 组里的 sessionQuery（host 工具拿不到它——真实装配实测，见 BUG-042 卡）。
//
// 钉什么：`readChildTurnState` 对**真实** JsonlSessionPersistence 的行为——open(read) → read(0) →
//   `childTurnState`（终态 / open turn / 无 turn）+ durable header 身份（BUG-046）→ close；
//   日志由真实 create/append 写入（不是 fake）。
//   这条用真服务而不是 fake：fake 只能证明代码形状，证明不了"host 能拿到这个服务"。
//
// 红配方（prove-it-red）：让 readChildTurnState 丢掉日志最后一条（`events.slice(0,-1)`）→ 前两条红；
//   或改回读 `sessionQuery`（isolate 组，host 没有）→ open 不可用，红。还原 → 绿。
//
// 证明不了什么：真实 company profile 里 host 插件能否拿到 sessionPersistence（由 C2 探针验）；
//   事件正文（只钉 reason.kind）。
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Context } from '../../vendor/dsh/vendor/cordis/src/index.ts'
import * as JsonlSessionPersistence from '../../vendor/dsh/packages/session/session-persistence-jsonl/src/index.ts'
import { SESSION_FORMAT_VERSION, SessionId } from '../../vendor/dsh/packages/core/session/src/types.ts'
import { readChildTurnState } from '../../packages/company-pack/src/host/delegation/delegation-control.ts'

/** Mount the real JSONL persistence on a temp root. */
async function mount(root: string): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(JsonlSessionPersistence, { root })
  return ctx
}

/** Persist a child log through the real write handle: create → append → close. */
async function writeChildLog(
  persistence: { create(header: unknown): Promise<{ append(events: unknown[]): Promise<void>; close(): Promise<void> }> },
  root: string,
  id: string,
  events: unknown[],
): Promise<void> {
  const handle = await persistence.create({
    version: SESSION_FORMAT_VERSION,
    id: SessionId(id),
    createdAt: 1,
    cwd: root,
    isSeeded: false,
    delegationDepth: 1,
    agentPreset: 'worker',
  })
  try {
    await handle.append(events)
  } finally {
    await handle.close()
  }
}

const turnStart = { type: 'turn/start', seq: 0, time: 1, data: { turn: 1 } }
const turnEnd = (kind: string) => ({ type: 'turn/end', seq: 1, time: 2, data: { turn: 1, reason: { kind } } })

describe('child terminal via the real session persistence', () => {
  it('reads the last turn/end reason from a stored child log', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-terminal-persist-'))
    const ctx = await mount(root)
    try {
      await writeChildLog(ctx.sessionPersistence, root, 'child-1', [turnStart, turnEnd('interrupted')])
      await expect(readChildTurnState(ctx.sessionPersistence, 'child-1'))
        .resolves.toEqual({ terminal: 'interrupted', openTurn: false, sawTurn: true, agentPreset: 'worker', delegationDepth: 1 })
    } finally {
      await ctx.fiber.dispose()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('returns completed for a finished turn and undefined when no turn ended', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-terminal-persist-'))
    const ctx = await mount(root)
    try {
      await writeChildLog(ctx.sessionPersistence, root, 'child-2', [turnStart, turnEnd('completed')])
      await expect(readChildTurnState(ctx.sessionPersistence, 'child-2'))
        .resolves.toEqual({ terminal: 'completed', openTurn: false, sawTurn: true, agentPreset: 'worker', delegationDepth: 1 })

      await writeChildLog(ctx.sessionPersistence, root, 'child-3', [turnStart])
      await expect(readChildTurnState(ctx.sessionPersistence, 'child-3'))
        .resolves.toEqual({ openTurn: true, sawTurn: true, agentPreset: 'worker', delegationDepth: 1 })
    } finally {
      await ctx.fiber.dispose()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects for a session that was never stored (caller maps it to unavailable)', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-terminal-persist-'))
    const ctx = await mount(root)
    try {
      await expect(readChildTurnState(ctx.sessionPersistence, 'missing-child')).rejects.toThrow()
    } finally {
      await ctx.fiber.dispose()
      await rm(root, { recursive: true, force: true })
    }
  })
})
