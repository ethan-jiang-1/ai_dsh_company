import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { assertProcessReview, pinTransaction, replaceOne } from '../../scripts/lib/pin-transaction.mjs'

const dirs: string[] = []
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'pin-transaction-'))
  dirs.push(dir)
  const metadata = join(dir, 'package.json')
  const lock = join(dir, 'lock.yaml')
  const unrelated = join(dir, 'user.txt')
  writeFileSync(metadata, 'old metadata\n')
  writeFileSync(lock, 'old lock\n')
  writeFileSync(unrelated, 'user work\n')
  return { metadata, lock, unrelated }
}
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })

function transactionOptions(paths: ReturnType<typeof fixture>) {
  return {
    updates: [{ path: paths.metadata, content: 'candidate metadata\n' }],
    observedPaths: [paths.lock],
    validate: async (_context: { observe: (path: string) => void }) => {},
    verify: async () => {},
    rollback: async () => {},
  }
}

describe('pin candidate publication and controlled rollback', () => {
  it('publishes only after candidate validation succeeds', async () => {
    const paths = fixture()
    const options = transactionOptions(paths)
    options.validate = async ({ observe }) => {
      expect(readFileSync(paths.metadata, 'utf8')).toBe('old metadata\n')
      writeFileSync(paths.lock, 'candidate lock\n')
      observe(paths.lock)
    }
    options.verify = async () => {
      expect(readFileSync(paths.metadata, 'utf8')).toBe('candidate metadata\n')
    }
    await pinTransaction(options)
    expect(readFileSync(paths.lock, 'utf8')).toBe('candidate lock\n')
    expect(readFileSync(paths.unrelated, 'utf8')).toBe('user work\n')
  })

  it('failed validation leaves compatibility unpublished and restores changed lock', async () => {
    const paths = fixture()
    const options = transactionOptions(paths)
    let restoredHead = false
    options.validate = async ({ observe }) => {
      writeFileSync(paths.lock, 'partial install\n')
      observe(paths.lock)
      throw new Error('build failed')
    }
    options.rollback = async () => { restoredHead = true }
    await expect(pinTransaction(options)).rejects.toThrow('build failed')
    expect(readFileSync(paths.metadata, 'utf8')).toBe('old metadata\n')
    expect(readFileSync(paths.lock, 'utf8')).toBe('old lock\n')
    expect(readFileSync(paths.unrelated, 'utf8')).toBe('user work\n')
    expect(restoredHead).toBe(true)
  })

  it('post-publication verify failure restores exact old bytes and pin callback', async () => {
    const paths = fixture()
    const options = transactionOptions(paths)
    let restoredHead = false
    options.verify = async () => { throw new Error('gate failed') }
    options.rollback = async () => { restoredHead = true }
    await expect(pinTransaction(options)).rejects.toThrow('gate failed')
    expect(readFileSync(paths.metadata, 'utf8')).toBe('old metadata\n')
    expect(restoredHead).toBe(true)
  })

  it('refuses to overwrite edits made while validating a candidate', async () => {
    const paths = fixture()
    const options = transactionOptions(paths)
    options.validate = async () => { writeFileSync(paths.metadata, 'concurrent user work\n') }
    await expect(pinTransaction(options)).rejects.toThrow('concurrent metadata edit')
    expect(readFileSync(paths.metadata, 'utf8')).toBe('concurrent user work\n')
  })

  it('retains concurrent edits during rollback and reports incomplete recovery', async () => {
    const paths = fixture()
    const options = transactionOptions(paths)
    options.validate = async ({ observe }) => { writeFileSync(paths.lock, 'install lock\n'); observe(paths.lock) }
    options.verify = async () => {
      writeFileSync(paths.metadata, 'concurrent metadata\n')
      writeFileSync(paths.lock, 'concurrent lock\n')
      throw new Error('verify failed')
    }
    await expect(pinTransaction(options)).rejects.toThrow('rollback incomplete')
    expect(readFileSync(paths.metadata, 'utf8')).toBe('concurrent metadata\n')
    expect(readFileSync(paths.lock, 'utf8')).toBe('concurrent lock\n')
    expect(readFileSync(paths.unrelated, 'utf8')).toBe('user work\n')
  })

  it('surfaces a failed pin rollback instead of reporting recovery', async () => {
    const paths = fixture()
    const options = transactionOptions(paths)
    options.validate = async () => { throw new Error('validation failed') }
    options.rollback = async () => { throw new Error('vendor changed concurrently') }
    await expect(pinTransaction(options)).rejects.toThrow('rollback incomplete: vendor changed concurrently')
  })
})

describe('pin bookkeeping and human review assertions', () => {
  const fromSha = 'a'.repeat(40)
  const toSha = 'b'.repeat(40)
  const review = { fromSha, toSha, reviewedBy: 'human reviewer', reviewedAt: '2026-09-24', processContractReview: 'Compared vendor process instructions with the local development guide; deviations recorded in the Note.' }
  it('accepts explicit review evidence for the exact SHA pair', () => {
    expect(() => assertProcessReview(review, fromSha, toSha)).not.toThrow()
  })
  it('rejects absent human evidence or a different candidate', () => {
    expect(() => assertProcessReview({ ...review, reviewedBy: '' }, fromSha, toSha)).toThrow('reviewedBy')
    expect(() => assertProcessReview({ ...review, processContractReview: '' }, fromSha, toSha)).toThrow('processContractReview')
    expect(() => assertProcessReview(review, fromSha, 'c'.repeat(40))).toThrow('exact fromSha and toSha')
    expect(() => assertProcessReview({ ...review, reviewedAt: 'later' }, fromSha, toSha)).toThrow('YYYY-MM-DD')
  })
  it('rejects missing or duplicate bookkeeping markers', () => {
    expect(() => replaceOne('no marker', /const expectedTag = '[^']+'/, 'new')).toThrow('found 0')
    expect(() => replaceOne("const expectedTag = 'one'\nconst expectedTag = 'two'", /const expectedTag = '[^']+'/, 'new')).toThrow('found 2')
    expect(replaceOne("const expectedTag = 'old'", /const expectedTag = '[^']+'/, "const expectedTag = 'new'")).toBe("const expectedTag = 'new'")
  })
})
