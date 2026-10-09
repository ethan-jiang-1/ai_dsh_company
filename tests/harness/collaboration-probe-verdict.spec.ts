import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

// Exercise the actual verdict block: a helper test alone cannot catch a dropped required check.
function verdict(path: string, from: string, through: string, input: object) {
  const source = readFileSync(`${ROOT}/${path}`, 'utf8')
  const start = source.indexOf(from)
  const end = source.indexOf(through, start)
  if (start < 0 || end <= start) throw new Error(`Verdict block moved: inspect ${path}`)
  const process = { exitCode: undefined as number | undefined }
  const results: { label: string; ok: boolean }[] = []
  runInNewContext(source.slice(start, end), {
    ...input, process, results, console: { log() {} },
    check: (label: string, ok: boolean) => results.push({ label, ok }),
  })
  return { process, results }
}

describe('probe required checks determine the actual exit code', () => {
  it.each(['fileExact', 'claimRace', 'reports', 'membersEnded', 'complete', 'publications', 'noLeadWrites', 'barrierReads', 'recovery', 'barrierReleased', 'none'])('concurrency verdict handles missing %s independently', failed => {
    const evidence = { fileExact: failed !== 'fileExact', claimRace: failed !== 'claimRace',
      reports: failed !== 'reports', membersEnded: failed !== 'membersEnded', writes: [], claims: [], task: {} }
    const barrier = { publications: failed !== 'publications', noLeadWrites: failed !== 'noLeadWrites',
      barrierReads: failed !== 'barrierReads', recovery: failed !== 'recovery' }
    const judged = verdict('probes/team/team-concurrency-probe.mjs', "  check('C1a", '\n} catch (error)',
      { evidence, barrier, barrierReleased: failed !== 'barrierReleased', complete: failed !== 'complete', file: '' })
    expect(judged.results).toHaveLength(5)
    expect(judged.process.exitCode).toBe(failed === 'none' ? 0 : 1)
    expect(judged.results.filter(row => !row.ok)).toHaveLength(failed === 'none' ? 0 : 1)
  })
  it.each(['claimRaceOwner', 'winnerPublishes', 'loserYields', 'reports', 'claimRaceShared', 'sharedControl', 'noLeadWrites', 'membersEnded', 'complete', 'none'])('claim-loser refuses missing %s', failed => {
    const evidence = { claimRaceOwner: failed !== 'claimRaceOwner', winnerPublishes: failed !== 'winnerPublishes',
      loserYields: failed !== 'loserYields', reports: failed !== 'reports', claimRaceShared: failed !== 'claimRaceShared',
      sharedControl: failed !== 'sharedControl', noLeadWrites: failed !== 'noLeadWrites', membersEnded: failed !== 'membersEnded',
      ownerWinner: 'w1', ownerLoser: 'w2', ownerClaims: [], sharedClaims: [] }
    const judged = verdict('probes/team/team-claim-loser-probe.mjs', "  check('A1", '\n} catch (error)',
      { evidence, complete: failed !== 'complete', ownerContent: '', sharedContent: '' })
    expect(judged.results).toHaveLength(8)
    expect(judged.process.exitCode).toBe(failed === 'none' ? 0 : 1)
    expect(judged.results.filter(row => !row.ok)).toHaveLength(failed === 'none' ? 0 : 1)
  })
  it.each(['fileExact', 'readbackW1', 'readbackW2', 'warningVisible', 'complete'])('atomicity refuses missing %s', failed => {
    const evidence = { fileExact: failed !== 'fileExact', readbacks: { w1: failed !== 'readbackW1', w2: failed !== 'readbackW2' }, warningVisible: failed !== 'warningVisible' }
    const judged = verdict('probes/team/team-atomicity-probe.mjs', "  check('C4a", '\n} catch (error)', { evidence, complete: failed !== 'complete', file: '' })
    expect(judged.results).toHaveLength(4)
    expect(judged.process.exitCode).toBe(1)
  })
  it.each(['b1', 'b2', 'b3'])('scope refuses missing %s despite other successful rows', failed => {
    const evidence = { b1: failed !== 'b1', b2: failed !== 'b2', b3: failed !== 'b3' }
    const judged = verdict('probes/fs-taskboard/taskboard-scope-probe.mjs', '    const b1 =', '\n  }\n  await run()', { evidence, cfo: { ended: true }, coo: { ended: true } })
    expect(judged.process.exitCode).toBe(1)
  })
  it.each(['judge1', 'judge2', 'judge3'])('filesystem guard refuses missing %s', failed => {
    const judged = verdict('probes/fs-taskboard/fs-guard-probe.mjs', '  const verdict =', '\n} catch (error)',
      { judge1: failed !== 'judge1', judge2: failed !== 'judge2', judge3: failed !== 'judge3' })
    expect(judged.process.exitCode).toBe(1)
  })
  it('oracle rejects a missing counterexample inventory', () => {
    const source = readFileSync(`${ROOT}/probes/fs-taskboard/collaboration-oracle-probe.mjs`, 'utf8')
    const inventoryStart = source.indexOf('const expectedLabels =')
    const inventoryEnd = source.indexOf('const findings =', inventoryStart)
    const guardStart = source.indexOf('  if (findings.length')
    const guardEnd = source.indexOf('\n  const count =', guardStart)
    expect(inventoryStart).toBeGreaterThan(0)
    expect(guardStart).toBeGreaterThan(inventoryStart)
    const script = source.slice(inventoryStart, inventoryEnd) + '\nconst findings = []\n' + source.slice(guardStart, guardEnd)
    expect(() => runInNewContext(script)).toThrow('oracle case inventory changed or missing')
  })
})
