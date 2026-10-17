// lib.mjs — 闸门共用工具
// 硬约束：无外部依赖、不读网络、不读时钟、不写任何路径（只打印 stdout）
// 确定性：所有遍历结果按路径字典序排序；同输入两次运行输出逐字节相同
import fs from 'node:fs';
import path from 'node:path';

export const EXIT = Object.freeze({
  PASS: 0,        // 通过：有输入面、无违规
  VIOLATION: 2,   // 发现违规
  UNDECIDABLE: 3, // 无法判定（无输入面 / 输入不可读 / 有未解析行）——不许与“通过”同码
  USAGE: 4,       // 用法错误（参数缺失/非法）
});

export const VERDICT = Object.freeze({
  PASS: 'PASS',
  VIOLATION: 'VIOLATION',
  UNDECIDABLE: 'UNDECIDABLE',
});

export function parseArgv(argv) {
  const flags = new Map();
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        add(flags, a.slice(2, eq), a.slice(eq + 1));
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        add(flags, a.slice(2), argv[++i]);
      } else {
        add(flags, a.slice(2), 'true');
      }
    } else {
      rest.push(a);
    }
  }
  return { flags, rest };
}

function add(m, k, v) {
  if (!m.has(k)) m.set(k, []);
  m.get(k).push(v);
}

export const flag = (flags, k, d = null) => {
  const v = flags.get(k);
  return v && v.length ? v[v.length - 1] : d;
};
export const flagAll = (flags, k) => flags.get(k) ?? [];
export const has = (flags, k) => flags.has(k);

/** 递归列文件；跳过 .git/node_modules 等；符号链接不跟随；结果排序（确定性） */
export function walkFiles(root, opts = {}) {
  const {
    maxSize = 2 * 1024 * 1024,
    skipDirs = new Set(['.git', 'node_modules', '.venv', '__pycache__', '.DS_Store']),
    maxDepth = 12,
  } = opts;
  const out = [];
  const stack = [[root, 0]];
  while (stack.length) {
    const [d, depth] = stack.pop();
    let ents;
    try {
      ents = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    ents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        if (!skipDirs.has(e.name) && depth < maxDepth) stack.push([p, depth + 1]);
        continue;
      }
      if (!e.isFile()) continue;
      let st;
      try {
        st = fs.statSync(p);
      } catch {
        continue;
      }
      out.push({ path: p, size: st.size, mode: st.mode & 0o777, oversize: st.size > maxSize });
    }
  }
  out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return out;
}

/** 读文件头部 n 字节（并返回“是否可读”的真结论——可达性探针用真 open 而不是权限位推断） */
export function probeRead(p, n = 2048) {
  let fd = null;
  try {
    fd = fs.openSync(p, 'r');
    const buf = Buffer.alloc(n);
    const got = fs.readSync(fd, buf, 0, n, 0);
    return { readable: true, head: buf.subarray(0, got) };
  } catch {
    return { readable: false, head: Buffer.alloc(0) };
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch { /* noop */ }
    }
  }
}

export function isText(buf) {
  const n = Math.min(buf.length, 1024);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return false;
  return true;
}

/** Shannon 熵（bits/char），确定性 */
export function entropy(s) {
  if (!s.length) return 0;
  const m = new Map();
  for (const ch of s) m.set(ch, (m.get(ch) ?? 0) + 1);
  let h = 0;
  for (const c of m.values()) {
    const p = c / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

export function oct(mode) {
  return '0' + mode.toString(8).padStart(3, '0');
}

/** 相对路径（用于输出可读性；target 之外则返回绝对路径） */
export function rel(base, p) {
  const r = path.relative(base, p);
  return r && !r.startsWith('..') ? r : p;
}

export function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function exists(p) {
  try {
    fs.statSync(p);
    return true;
  } catch {
    return false;
  }
}

/** 统一出口：打印 GATE 行 + 返回退出码 */
export function finish(gateId, verdict, stats, hits) {
  const code =
    verdict === VERDICT.VIOLATION ? EXIT.VIOLATION :
    verdict === VERDICT.UNDECIDABLE ? EXIT.UNDECIDABLE : EXIT.PASS;
  const kv = Object.entries(stats).map(([k, v]) => `${k}=${v}`).join(' ');
  console.log(`GATE ${gateId} verdict=${verdict} hits=${hits} ${kv}`.trimEnd());
  return code;
}

export function usageError(gateId, msg) {
  console.log(`GATE ${gateId} verdict=UNDECIDABLE hits=0 reason=usage-error detail="${msg}"`);
  return EXIT.USAGE;
}

/** 参数白名单校验：未知参数一律 4（用法错），不许静默忽略。
 *  理由（实测暴露）：把 --fixture-policy 拼错一个字母，会静默退回默认策略，
 *  跑出来的"违规"看起来像有效结论 —— 同一套件里"缺参数=4 / 错参数=静默"是不一致处理。 */
export function rejectUnknownFlags(flags, allowed, gateId) {
  const known = new Set(allowed);
  const bad = [...flags.keys()].filter((k) => !known.has(k)).sort();
  if (bad.length) {
    console.log(`GATE ${gateId} verdict=UNDECIDABLE hits=0 reason=usage-error detail="未知参数: ${bad.map((b) => `--${b}`).join(' ')}（已知: ${[...known].sort().map((b) => `--${b}`).join(' ')}）"`);
    return EXIT.USAGE;
  }
  return null;
}
