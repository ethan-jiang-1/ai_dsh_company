/**
 * 对抗性世界形状库（2026-11-13，P0 对抗性边界矩阵）。
 *
 * 为什么存在：66 个边界缺陷（BUG-080..146）里约 2/3 住在测试夹具从不变化的轴上——
 * symlink、目录占位、坏 JSON、缺失、越界。这里把「敌意环境」收成可构造、可命名、
 * 可复用的 shape；矩阵 spec 只负责「形状 × 载体 × 不变量」，不再各 spec 手搓。
 *
 * 约定：
 * - 每个 shape 先建 `ws/` 与 `outside/` 两个临时目录；`outside/` 用来断言「没写到外面」。
 * - `build` 只改 `ws`；写 `outside/` 是测试夹具的职责（例如 symlink 目标）。
 * - `expected` 是形状的预期类，来自合同/政策，不来自实现。
 */
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

/** 形状轴：根（`.dsh-company` 本身）/ 叶（根下目标文件）。 */
export type ShapeAxis = 'root' | 'leaf'

/** 归一后的形状类；Agreement 只断言 ok / not-ok，具体子类由 primary 载体断言。 */
export type ShapeClass = 'ok' | 'missing' | 'unsafe'

export interface World {
  readonly ws: string
  readonly outside: string
  cleanup(): void
}

export interface Shape {
  readonly id: string
  readonly axis: ShapeAxis
  readonly expected: ShapeClass
  /** 这张形状能抓到的已修缺陷号（证据/可读性，不是判据）。 */
  readonly catches: readonly number[]
  build(world: World, targetRel: string): void
}

/** 建一对隔离的 ws / outside；调用方负责 cleanup。 */
export function makeWorld(prefix = 'shape-'): World {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  const ws = join(dir, 'ws')
  const outside = join(dir, 'outside')
  mkdirSync(ws)
  mkdirSync(outside)
  return { ws, outside, cleanup: () => { rmSync(dir, { recursive: true, force: true }) } }
}

const company = (ws: string): string => join(ws, '.dsh-company')
const targetOf = (world: World, rel: string): string => join(company(world.ws), rel)

const rootDir = (world: World): void => { mkdirSync(company(world.ws), { recursive: true }) }

/** 根形状：在所有写入口/读载体上语义相同。 */
export const ROOT_SHAPES: readonly Shape[] = [
  {
    id: 'root-missing', axis: 'root', expected: 'missing', catches: [129],
    build: () => { /* 空盘：写入方可以创建，读取方报 missing */ },
  },
  {
    // 根在、目标缺：对叶目标仍是 missing；这正好覆盖「根正常但文件没写」的合法态。
    id: 'root-dir', axis: 'root', expected: 'missing', catches: [],
    build: rootDir,
  },
  {
    id: 'root-file', axis: 'root', expected: 'unsafe', catches: [129, 134],
    build: (world) => { writeFileSync(company(world.ws), 'occupied by a file\n') },
  },
  {
    id: 'root-symlink-out', axis: 'root', expected: 'unsafe', catches: [129, 134],
    build: (world) => { symlinkSync(world.outside, company(world.ws)) },
  },
  {
    id: 'root-symlink-in', axis: 'root', expected: 'unsafe', catches: [129],
    build: (world) => {
      const real = join(world.ws, 'real-company')
      mkdirSync(real)
      symlinkSync(real, company(world.ws))
    },
  },
  {
    id: 'mid-symlink-kb', axis: 'root', expected: 'unsafe', catches: [131],
    build: (world) => {
      rootDir(world)
      const outsideKb = join(world.outside, 'kb')
      mkdirSync(outsideKb)
      symlinkSync(outsideKb, join(company(world.ws), 'kb'))
    },
  },
]

/** 叶形状：按每个载体自己的 targetRel 建目标。 */
export const LEAF_SHAPES: readonly Shape[] = [
  {
    id: 'leaf-missing', axis: 'leaf', expected: 'missing', catches: [],
    build: (world) => { rootDir(world) },
  },
  {
    id: 'leaf-file', axis: 'leaf', expected: 'ok', catches: [],
    build: (world, rel) => {
      const target = targetOf(world, rel)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, 'inside\n')
    },
  },
  {
    id: 'leaf-dir', axis: 'leaf', expected: 'unsafe', catches: [132, 138],
    build: (world, rel) => { mkdirSync(targetOf(world, rel), { recursive: true }) },
  },
  {
    id: 'leaf-symlink-out', axis: 'leaf', expected: 'unsafe', catches: [108, 128, 136],
    build: (world, rel) => {
      const target = targetOf(world, rel)
      mkdirSync(dirname(target), { recursive: true })
      const outsideFile = join(world.outside, 'file')
      writeFileSync(outsideFile, 'outside\n')
      symlinkSync(outsideFile, target)
    },
  },
  {
    id: 'leaf-symlink-in', axis: 'leaf', expected: 'unsafe', catches: [128, 136],
    build: (world, rel) => {
      const target = targetOf(world, rel)
      mkdirSync(dirname(target), { recursive: true })
      const real = join(world.ws, 'real-file')
      writeFileSync(real, 'real\n')
      symlinkSync(real, target)
    },
  },
]

export const ALL_SHAPES: readonly Shape[] = [...ROOT_SHAPES, ...LEAF_SHAPES]

/** `outside/` 的完整快照（条目 + 文件内容 + symlink 目标）；用于断言「外部零变化」。 */
export function outsideSnapshot(world: World): readonly string[] {
  const walk = (dir: string, base: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const rel = base === '' ? entry.name : `${base}/${entry.name}`
    const path = join(dir, entry.name)
    const relPath = `${rel}`
    if (entry.isSymbolicLink()) return [`${relPath}->${readlinkSync(path)}`]
    if (entry.isDirectory()) return [`${relPath}/`, ...walk(path, relPath)]
    return [`${relPath}=${readFileSync(path, 'utf8')}`]
  })
  return walk(world.outside, '').sort()
}

/** 形状是否需要 targetRel：叶形状要，根形状不要。 */
export function needsTarget(shape: Shape): boolean {
  return shape.axis === 'leaf'
}
