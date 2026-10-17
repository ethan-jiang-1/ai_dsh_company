#!/usr/bin/env node
// g-a2-secret-scan.mjs — 族 A / 闸 2：密钥材料与高熵凭据串扫描（M4 的“存量外流面”）
//
// 目标面：--target <目录> 下的全部文本文件（默认跳过 >2MB 与二进制）
// 判定类别（可机械执行，逐条给行号）：
//   1 PRIVATE-KEY-MATERIAL   内容含 "-----BEGIN ... PRIVATE KEY-----"
//   2 KEY-LIKE-FILE          文件名形如 id_rsa / *.pem / *.key / *jumper* / *prod*，且非公钥
//   3 KNOWN-TOKEN-PREFIX     已知前缀：AKIA… / ghp_… / github_pat_… / sk-… / xox?-… / AIza…
//   4 HIGH-ENTROPY-ASSIGNMENT 赋值语句右侧串长 ≥ --minlen 且 Shannon 熵 ≥ --entropy
//
// 面分类（CEO 契约 §4②：取证面必须与自产面分开，否则第一天被误报淹掉）：
//   surface=self（默认 block） | surface=sources（drafts/**/sources/**，默认 report） | surface=fixture（gates/fixtures/**，默认 block）
// 退出码：0 通过｜2 违规（有 blocking 命中）｜3 无法判定（target 不存在 / --tracked-only 但跟踪面不可判）｜4 用法错
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EXIT, VERDICT, parseArgv, flag, has, walkFiles, probeRead, entropy, isText, rel, isDir, finish, usageError, rejectUnknownFlags,
} from './lib.mjs';

const GATE = 'a2';
const ALLOWED_FLAGS = ['target', 'entropy', 'minlen', 'sources-policy', 'fixture-policy', 'tracked-only', 'tracked-list', 'help'];
const { flags } = parseArgv(process.argv.slice(2));
{ const bad = rejectUnknownFlags(flags, ALLOWED_FLAGS, GATE); if (bad !== null) process.exit(bad); }

if (has(flags, 'help')) {
  console.log('用法: node g-a2-secret-scan.mjs --target <目录> [--entropy 3.5] [--minlen 16] [--sources-policy report|block] [--fixture-policy report|block] [--tracked-only] [--tracked-list <文件>]');
  process.exit(EXIT.PASS);
}

const target = flag(flags, 'target', process.env.GATE_TARGET ?? null);
if (!target) process.exit(usageError(GATE, '缺少 --target <目录>（或 GATE_TARGET）'));
if (!isDir(target)) {
  console.log(`GATE ${GATE} verdict=${VERDICT.UNDECIDABLE} hits=0 target=${target} reason=target-not-a-directory`);
  process.exit(EXIT.UNDECIDABLE);
}
const entropyMin = Number(flag(flags, 'entropy', '3.5'));
const minLen = Number(flag(flags, 'minlen', '16'));
if (!Number.isFinite(entropyMin) || !Number.isInteger(minLen)) process.exit(usageError(GATE, '阈值参数非法'));
const sourcesPolicy = flag(flags, 'sources-policy', 'report');
const fixturePolicy = flag(flags, 'fixture-policy', 'block');
if (!['report', 'block'].includes(sourcesPolicy) || !['report', 'block'].includes(fixturePolicy)) {
  process.exit(usageError(GATE, '策略只能取 report|block'));
}

// 跟踪面：显式列表（确定性）优先；否则 git（本地、无网络）
const trackedListFile = flag(flags, 'tracked-list', null);
let tracked = null; // Set | null(unknown)
if (trackedListFile) {
  try {
    const abs = path.resolve(trackedListFile);
    const base = isDir(target) ? target : process.cwd();
    tracked = new Set(fs.readFileSync(abs, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean)
      .map((s) => path.resolve(base, s)));
  } catch {
    process.exit(usageError(GATE, `--tracked-list 不可读: ${trackedListFile}`));
  }
}
const trackedOnly = has(flags, 'tracked-only');
if (trackedOnly && !tracked) {
  console.log(`GATE ${GATE} verdict=${VERDICT.UNDECIDABLE} hits=0 target=${target} reason=tracked-surface-unknown（需 --tracked-list 或 git 跟踪面）`);
  process.exit(EXIT.UNDECIDABLE);
}

const PRIV_HEADER_RE = /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/;
const PUB_MARK_RE = /-----BEGIN (?:PUBLIC KEY|CERTIFICATE|OPENSSH PUBLIC KEY)-----/;
const KEYNAME_RE = /(^|\/)(id_(rsa|dsa|ecdsa|ed25519)|[^/]*\.(pem|key|p12|pfx|jks))$/i;
// 站点模式要求分隔符定界（[._-]）；否则 "prd" 命中 templates/prd.md（2026-10-12 真盘面实跑暴露的假阳，已修）
const SITE_RE = /(^|[._-])(jumper|prod|prd)([._-]|$)/i;
const TOKEN_RES = [
  [/AKIA[0-9A-Z]{16}/g, 'AWS-ACCESS-KEY-ID'],
  [/ghp_[A-Za-z0-9]{36}/g, 'GITHUB-PAT-CLASSIC'],
  [/github_pat_[A-Za-z0-9_]{22,}/g, 'GITHUB-PAT-FINE'],
  [/sk-[A-Za-z0-9]{20,}/g, 'OPENAI-STYLE-KEY'],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/g, 'SLACK-TOKEN'],
  [/AIza[0-9A-Za-z\-_]{35}/g, 'GOOGLE-API-KEY'],
];
const ASSIGN_RE = /(?:^|[^A-Za-z0-9_])(secret|token|password|passwd|api[_-]?key|access[_-]?key|private[_-]?key|credential)\s*[:=]\s*["'`]?([A-Za-z0-9+/=_\-.]{8,})["'`]?/gi;

const SOURCES_RE = /(^|\/)drafts\/(?:[^/]+\/)?sources\//;
// 面分类**锚在闸门自身安装目录**（绝对路径），不依赖“相对 target 根的路径”与当前工作目录 ——
// 2026-10-12 修复：旧版用 target 相对路径判 fixture 面，导致 `--target fixtures`（扫描根本身落在 fixtures 内）
// 时夹具反而被判成 self 面，同一次输入在两个 cwd/两种 target 写法下给出不同的面与策略。
// 2026-10-17 补第二种形状（CEO 2026-10-17 批准：**修分类器**，不动阈值/不加白名单/不删归档）：
//   同批**合成夹具**被**复制**到别处时（v2 归档家 `…-v2/drafts/vp-eng/gates/fixtures/**`、
//   v3 载体 `…/carrier/checks/lib/ci-security-gates/fixtures/**`），锚点判据认不出它们 ⇒
//   面从 `fixture`(report) 掉进 `self`(block) ⇒ 本机盘恒红 **11 条假红**（实跑 `surface_fixture=0`
//   即为该缺陷的自证）。现在 = **锚点 ∪ 形态**：任一路径段为 `gates` 或以 `-gates` 结尾
//   （如 `ci-security-gates`），其后（**任意层**）出现 `fixtures` 段 ⇒ `fixture` 面。
//   ⚠ **阈值 / confidence / block-report 语义 / 自测期望表一字未动**；夹具面仍是 `report`，
//   只在显式 `--fixture-policy=block` 时才拦。
//   ⚠ **有意让路（副作用，写进射程）**：今后任何合法仓库里出现 `gates/**/fixtures/**` 形状的路径
//   都会被判夹具面 ⇒ 默认 advisory、**不拦提交**。这与锚点树原有的同一类让路同源（v2 已记账的
//   「被降级的 fixture 面里若真掉进一份真凭据，它只会是 ADVISORY」），**不是新开的洞**。
const GATES_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ANCHOR = `${path.join(GATES_DIR, 'fixtures')}${path.sep}`;
const EVIDENCE_ANCHOR = `${path.join(GATES_DIR, 'evidence')}${path.sep}`;
/** 结构性夹具形态：`gates` 或 `*-gates` 段 + 任意层 + `fixtures` 段（2026-10-17 立）。 */
const FIXTURE_SHAPE_RE = /(^|\/)(?:[^/]*-)?gates\/(?:[^/]+\/)*fixtures\//;

function surfaceOf(p) {
  const abs = path.resolve(p);
  if (abs.startsWith(FIXTURE_ANCHOR) || abs.startsWith(EVIDENCE_ANCHOR)) return 'fixture';
  if (FIXTURE_SHAPE_RE.test(abs)) return 'fixture';
  if (SOURCES_RE.test(abs)) return 'sources';
  return 'self';
}
function policyOf(surface) {
  if (surface === 'sources') return sourcesPolicy;
  if (surface === 'fixture') return fixturePolicy;
  return 'block';
}

const files = walkFiles(target);
let scanned = 0;
let skippedBinary = 0;
let skippedOversize = 0;
const hits = [];

for (const f of files) {
  const surface = surfaceOf(f.path);
  if (f.oversize) { skippedOversize++; continue; }
  const probe = probeRead(f.path, f.size + 1 > 2 * 1024 * 1024 ? 2 * 1024 * 1024 : f.size + 1);
  if (!probe.readable) continue;
  if (!isText(probe.head)) { skippedBinary++; continue; }
  scanned++;
  const text = probe.head.toString('utf8');
  const lines = text.split('\n');
  const add = (cls, lineNo, detail) => {
    const pol = policyOf(surface);
    hits.push({ cls, path: f.path, line: lineNo, surface, policy: pol, detail });
  };

  // 1 私钥材料（只回显类别标签，不回显密钥头字面量 —— 防自指假阳）
  // 1 私钥材料（**全文**判形：2026-10-12 修复——旧版只看前 4KB，导致"藏在文件后部的密钥头"漏检，
  //   连本稿自身引用密钥头的行（第 212 行）都逃过了检测）。只回显类别标签，不回显字面量（防自指）。
  if (PRIV_HEADER_RE.test(text)) {
    const idx = lines.findIndex((l) => PRIV_HEADER_RE.test(l));
    const m = (text.match(/-----BEGIN ([A-Z0-9]+ )*PRIVATE KEY-----/) ?? []);
    const kind = (m[1] ?? '').trim().replace(/\s+/g, '-');
    add('PRIVATE-KEY-MATERIAL', idx + 1, `${kind}${kind ? '-' : ''}PRIVATE-KEY`);
  }

  // 2 名形状件（非公钥）
  if (!PRIV_HEADER_RE.test(text) && (KEYNAME_RE.test(f.path) || SITE_RE.test(f.path)) && !PUB_MARK_RE.test(text)) {
    add('KEY-LIKE-FILE', 1, 'filename-shape');
  }

  // 3 已知前缀
  for (const [re, name] of TOKEN_RES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const lineNo = text.slice(0, m.index).split('\n').length;
      add('KNOWN-TOKEN-PREFIX', lineNo, `${name} ${m[0].slice(0, 4)}…(len=${m[0].length})`);
      break; // 每文件每类只报首个（计数仍在 detail）
    }
  }

  // 4 高熵赋值
  ASSIGN_RE.lastIndex = 0;
  let a;
  while ((a = ASSIGN_RE.exec(text)) !== null) {
    const val = a[2];
    if (val.length < minLen) continue;
    const h = entropy(val);
    if (h < entropyMin) continue;
    const lineNo = text.slice(0, a.index).split('\n').length;
    add('HIGH-ENTROPY-ASSIGNMENT', lineNo, `key=${a[1]} len=${val.length} entropy=${h.toFixed(2)}`);
    break;
  }
}

const blocking = [];
const advisory = [];
for (const h of hits) {
  const trackedFlag = tracked ? (tracked.has(path.resolve(h.path)) ? 'yes' : 'no') : 'unknown';
  h.tracked = trackedFlag;
  const isBlocking = h.policy === 'block' && (!trackedOnly || trackedFlag === 'yes');
  (isBlocking ? blocking : advisory).push(h);
  const prefix = isBlocking ? 'HIT' : 'ADVISORY';
  console.log(`${prefix} ${GATE} class=${h.cls} path=${rel(target, h.path)} line=${h.line} surface=${h.surface} policy=${h.policy} tracked=${trackedFlag} detail="${h.detail}"`);
}

const bySurface = { self: 0, sources: 0, fixture: 0 };
for (const h of hits) bySurface[h.surface]++;
console.log(`INFO ${GATE} target=${target} scanned=${scanned} skipped_binary=${skippedBinary} skipped_oversize=${skippedOversize} hits_total=${hits.length} blocking=${blocking.length} advisory=${advisory.length} surface_self=${bySurface.self} surface_sources=${bySurface.sources} surface_fixture=${bySurface.fixture} thresholds="entropy>=${entropyMin} minlen>=${minLen}" policies="sources=${sourcesPolicy} fixture=${fixturePolicy} tracked_only=${trackedOnly}"`);

const stats = { target, scanned, hits_total: hits.length, blocking: blocking.length, advisory: advisory.length };
if (scanned === 0) {
  // 无文本输入面 ≠ 通过（CEO 契约 §4①：天然为 0 不是“能跑”）
  console.log(`GATE ${GATE} verdict=${VERDICT.UNDECIDABLE} hits=0 target=${target} reason=no-text-surface scanned=0`);
  process.exit(EXIT.UNDECIDABLE);
}
if (blocking.length > 0) process.exit(finish(GATE, VERDICT.VIOLATION, stats, blocking.length));
process.exit(finish(GATE, VERDICT.PASS, stats, 0));
