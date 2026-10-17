#!/usr/bin/env node
// g-a1-cred-reach.mjs — 族 A / 闸 1：凭据可达性闸（K2a 的“效果层”）
//
// 判据：**本进程（= 与 agent 同 Unix 用户、同权限面）能否真的打开并读出凭据材料**。
//      不用“权限位推断”，用真 open()+read() 探针 —— 因为同用户下 chmod 不产生隔离
//      （v1 互审 §6-3 已判：~/.ssh 现为 0400/0600，属主可读 ⇒ 与 agent 同用户时等于没隔离）。
//
// 目标面：--cred-root <目录>（默认 --target <目录>/home/.ssh）或 --live-creds（真机 $HOME/.ssh）
// 退出码：0 通过（可达数 ≤ --max-reachable）｜2 违规（超阈值）｜3 无法判定（无凭据面）｜4 用法错
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  EXIT, VERDICT, parseArgv, flag, flagAll, has, walkFiles, probeRead, oct, rel, finish, usageError, rejectUnknownFlags,
} from './lib.mjs';

const GATE = 'a1';
const ALLOWED_FLAGS = ['target', 'cred-root', 'live-creds', 'max-reachable', 'allow', 'allow-file', 'help'];
const { flags } = parseArgv(process.argv.slice(2));
{ const bad = rejectUnknownFlags(flags, ALLOWED_FLAGS, GATE); if (bad !== null) process.exit(bad); }

if (has(flags, 'help')) {
  console.log('用法: node g-a1-cred-reach.mjs [--target <目录>] [--cred-root <目录>] [--live-creds] [--max-reachable N] [--allow <路径>]...');
  process.exit(EXIT.PASS);
}

const target = flag(flags, 'target', process.env.GATE_TARGET ?? null);
const maxReachable = Number(flag(flags, 'max-reachable', '0'));
if (!Number.isInteger(maxReachable) || maxReachable < 0) {
  process.exit(usageError(GATE, '--max-reachable 必须为非负整数'));
}
const allow = new Set(flagAll(flags, 'allow').concat(flagAll(flags, 'allow-file').flatMap((f) => {
  try { return fs.readFileSync(f, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean); } catch { return []; }
})));

let credRoot = flag(flags, 'cred-root', null);
let mode = 'target-scoped';
if (!credRoot && has(flags, 'live-creds')) {
  credRoot = path.join(os.homedir(), '.ssh');
  mode = 'live';
}
if (!credRoot && target) {
  const cand = path.join(target, 'home', '.ssh');
  credRoot = cand;
}
if (!credRoot) {
  process.exit(usageError(GATE, '需要 --cred-root <目录> 或 --live-creds 或 --target <目录>（含 home/.ssh）'));
}

const files = walkFiles(credRoot, { maxDepth: 3 });
if (!files.length) {
  // 无输入面 ≠ 通过（CEO 契约 §4 第一条：天然为 0 不是“能跑”）
  console.log(`GATE ${GATE} verdict=${VERDICT.UNDECIDABLE} hits=0 cred_root=${credRoot} mode=${mode} scanned=0 reason=no-cred-surface`);
  process.exit(EXIT.UNDECIDABLE);
}

const KEYNAME_RE = /(^|\/)(id_(rsa|dsa|ecdsa|ed25519)|[^/]*\.(pem|key|p12|pfx|jks))$/i;
// 站点模式：要求分隔符定界（[._-]）；否则 "prd" 会命中 templates/prd.md —— 2026-10-12 真盘面实跑暴露的假阳，已修
const SITE_RE = /(^|[._-])(jumper|prod|prd)([._-]|$)/i;
const PRIV_HEADER_RE = /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/;
const PUB_MARK_RE = /-----BEGIN (?:PUBLIC KEY|CERTIFICATE|OPENSSH PUBLIC KEY)-----/;

/** 只回显“类别标签”，不回显密钥头字面量：否则闸门自己的证据文件会变成下一轮的命中源（自指假阳） */
function keyLabel(head) {
  const m = head.match(/-----BEGIN ([A-Z0-9]+ )*PRIVATE KEY-----/);
  if (!m) return 'none';
  const kind = (m[1] ?? '').trim().replace(/\s+/g, '-');
  return `${kind}${kind ? '-' : ''}PRIVATE-KEY`;
}

let nonPub = 0;
let keyShape = 0;
const hits = [];

for (const f of files) {
  const base = path.basename(f.path);
  if (base.endsWith('.pub')) continue;
  nonPub++;
  const probe = probeRead(f.path, 200);
  const head = probe.head.toString('utf8');
  const isKeyName = KEYNAME_RE.test(f.path) || SITE_RE.test(f.path);
  const hasPrivHeader = PRIV_HEADER_RE.test(head);
  const looksPublic = PUB_MARK_RE.test(head);
  if (!probe.readable) continue;
  if (!(isKeyName || hasPrivHeader)) continue;
  if (looksPublic && !hasPrivHeader) continue; // 公钥/证书不算凭据材料
  keyShape++;
  const cls = hasPrivHeader ? 'PRIVATE-KEY-MATERIAL' : 'KEY-LIKE-FILENAME';
  hits.push({
    path: f.path,
    size: f.size,
    mode: oct(f.mode),
    shape: keyLabel(head),
    cls,
    allowed: allow.has(f.path),
  });
}

const counted = hits.filter((h) => !h.allowed);
for (const h of counted) {
  console.log(`HIT ${GATE} class=${h.cls} path=${h.path} size=${h.size} mode=${h.mode} readable=yes shape="${h.shape}"`);
}
for (const a of allow) console.log(`INFO ${GATE} allowed path=${a}`);
console.log(`INFO ${GATE} cred_root=${credRoot} mode=${mode} nonpub_files=${nonPub} keyshape_readable=${keyShape} allowed_excluded=${hits.length - counted.length} policy_max_reachable=${maxReachable}`);
console.log(`INFO ${GATE} 口径: nonpub_files = ${credRoot} 下常规文件（不含 *.pub）; keyshape_readable = 名形状或内容含 BEGIN ... PRIVATE KEY 头且本进程可读`);

const scannedInfo = { cred_root: path.resolve(credRoot), mode, scanned: files.length, nonpub_files: nonPub, keyshape_readable: keyShape };
if (counted.length > maxReachable) {
  process.exit(finish(GATE, VERDICT.VIOLATION, scannedInfo, counted.length));
}
process.exit(finish(GATE, VERDICT.PASS, scannedInfo, 0));
