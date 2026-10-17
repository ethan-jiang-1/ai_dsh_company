#!/usr/bin/env node
// g-b1-artifact.mjs — 族 B / 闸 1：不可信输入件「引入前」闸（K5）
//
// 目标面：--target <目录>，约定形状
//   <target>/register.jsonl           登记表（一行一件：{"name","version","source","license","net":[],"reviewed_by"}）
//   <target>/artifacts/<件名>/…       候选件的声明面（README/SKILL.md/mcp.json/install.sh/…）
// 检查动作（全部离线、确定性）：
//   1 REGISTER-MISSING          候选件不在登记表 ⇒ 未登记不得启用
//   2 REGISTER-VERSION-MISMATCH 登记版本与件自报版本不一致
//   3 LICENSE-MISSING           件内无 LICENSE/COPYING 且 manifest 无 license 字段
//   4 INJECTION-SURFACE         说明文本/脚本含针对 agent 的注入特征（逐条给 pattern 名+文件+行号）
//   5 EGRESS-UNDECLARED         可执行面有网络动作，但 manifest.net 未声明该主机（含“未声明任何主机”）
//   6 REVIEWER-PLACEHOLDER     登记表复核人为占位名/空 ⇒ 单列 advisory（全公司真实人名待补，见 v1 §八）
//   7 PKG-EXISTENCE_DEFERRED    声明的包依赖存在性检查需要网络 ⇒ 本闸门不判、只记 note（不得当“已核”）
// 退出码：0 通过｜2 违规｜3 无法判定（无 artifacts 面）｜4 用法错
import fs from 'node:fs';
import path from 'node:path';
import { EXIT, VERDICT, parseArgv, flag, has, walkFiles, probeRead, isText, rel, isDir, finish, usageError, rejectUnknownFlags } from './lib.mjs';

const GATE = 'b1';
const ALLOWED_FLAGS = ['target', 'help'];
const { flags } = parseArgv(process.argv.slice(2));
{ const bad = rejectUnknownFlags(flags, ALLOWED_FLAGS, GATE); if (bad !== null) process.exit(bad); }

if (has(flags, 'help')) {
  console.log('用法: node g-b1-artifact.mjs --target <目录>（含 register.jsonl 与 artifacts/<件>/）');
  process.exit(EXIT.PASS);
}
const target = flag(flags, 'target', process.env.GATE_TARGET ?? null);
if (!target) process.exit(usageError(GATE, '缺少 --target <目录>（或 GATE_TARGET）'));
if (!isDir(target)) {
  console.log(`GATE ${GATE} verdict=${VERDICT.UNDECIDABLE} hits=0 target=${target} reason=target-not-a-directory`);
  process.exit(EXIT.UNDECIDABLE);
}
const artRoot = path.join(target, 'artifacts');
if (!isDir(artRoot)) {
  console.log(`GATE ${GATE} verdict=${VERDICT.UNDECIDABLE} hits=0 target=${target} reason=no-artifact-surface（无 artifacts/ 面：不代表通过）`);
  process.exit(EXIT.UNDECIDABLE);
}

const PLACEHOLDER_RE = /(待补|待定|TBD|TODO|<[^>]*>|模拟占位|placeholder|xxx)/i;

// —— 登记表 ——
const registerPath = path.join(target, 'register.jsonl');
const register = [];
let registerMalformed = 0;
if (fs.existsSync(registerPath)) {
  const raw = fs.readFileSync(registerPath, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  for (const line of raw) {
    try { register.push(JSON.parse(line)); } catch { registerMalformed++; }
  }
}

// —— 注入特征 ——
const INJECTION_PATTERNS = [
  ['ignore-previous-instructions', /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i],
  ['do-not-tell-user', /(do\s+not|don'?t)\s+(tell|inform|notify)\s+the\s+user|不要(告诉|通知|告知)用户|不让用户知道/i],
  ['read-credentials', /(read|cat|open|读取|读出|发送)[^\n]{0,40}(~\/\.ssh|\.ssh\/|\bid_rsa\b|\.aws\/credentials|\.netrc|私钥|凭据)/i],
  ['exfiltrate-outbound', /(exfiltrat|上传到\s*https?:\/\/|外传到|send\s+[^\n]{0,30}\s+to\s+https?:\/\/)/i],
  ['pipe-download-to-shell', /(curl|wget)[^\n|]{0,200}\|\s*(sudo\s+)?(ba|z|k)?sh/i],
  ['base64-pipe-to-shell', /base64\s+(-d|--decode)[^\n|]{0,80}\|\s*(ba|z|k)?sh/i],
  ['embedded-code-exec', /\beval\s*\(|\bchild_process\b|\bos\.system\s*\(|\bsubprocess\.(run|Popen|call)\s*\(|Runtime\.getRuntime\(\)\.exec/i],
  ['agent-directed-imperative', /(assistant|agent|AI|助手)[^\n]{0,30}(must|shall|必须|应当)[^\n]{0,40}(always|immediately|立即|一律)/i],
];
const EGRESS_ACTION_RE = /(curl|wget|fetch\s*\(|requests\.(get|post)|axios|http\.request|https?:\/\/)/i;
const URL_RE = /https?:\/\/([A-Za-z0-9.\-]+)/g;
const EXEC_EXT_RE = /\.(sh|bash|zsh|js|mjs|cjs|ts|py|rb|json|ya?ml)$/i;

const artifacts = fs.readdirSync(artRoot, { withFileTypes: true })
  .filter((e) => e.isDirectory()).map((e) => e.name)
  .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

if (!artifacts.length) {
  console.log(`GATE ${GATE} verdict=${VERDICT.UNDECIDABLE} hits=0 target=${target} reason=empty-artifact-surface`);
  process.exit(EXIT.UNDECIDABLE);
}

const hits = [];
const notes = [];
let declTotal = 0;

for (const name of artifacts) {
  const dir = path.join(artRoot, name);
  let manifest = null;
  const manifestPath = path.join(dir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { manifest = null; }
  }
  const version = manifest?.version ?? 'unversioned';

  // 1/2 登记与版本
  const entry = register.find((r) => r?.name === name);
  if (!register.length) {
    hits.push({ cls: 'REGISTER-MISSING', path: rel(target, dir), line: 0, detail: 'register.jsonl 缺位或为空（未登记不得启用）' });
  } else if (!entry) {
    hits.push({ cls: 'REGISTER-MISSING', path: rel(target, dir), line: 0, detail: `件 ${name} 不在登记表` });
  } else {
    if (entry.version && version !== 'unversioned' && entry.version !== version) {
      hits.push({ cls: 'REGISTER-VERSION-MISMATCH', path: rel(target, dir), line: 0, detail: `register=${entry.version} artifact=${version}` });
    }
    const reviewer = String(entry.reviewed_by ?? '').trim();
    if (!reviewer || PLACEHOLDER_RE.test(reviewer)) {
      notes.push({ cls: 'REVIEWER-PLACEHOLDER', path: rel(target, dir), line: 0, detail: `reviewed_by="${reviewer}"（占位/空 ⇒ 具名复核未闭合，advisory）` });
    }
    if (Array.isArray(entry.net) && entry.net.length) { /* 已在 egress 检查中使用 */ }
  }

  // 文件面
  const files = walkFiles(dir, { maxSize: 1024 * 1024 });
  let hasLicense = false;
  const declaredHosts = new Set(Array.isArray(manifest?.net) ? manifest.net : (Array.isArray(entry?.net) ? entry.net : []));

  for (const f of files) {
    const base = path.basename(f.path);
    if (/^(LICENSE|COPYING)/i.test(base)) hasLicense = true;
    if (f.oversize) continue;
    const probe = probeRead(f.path, Math.min(f.size + 1, 512 * 1024));
    if (!probe.readable || !isText(probe.head)) continue;
    const text = probe.head.toString('utf8');
    declTotal++;
    const lines = text.split('\n');

    for (const [pname, re] of INJECTION_PATTERNS) {
      const idx = lines.findIndex((l) => re.test(l));
      if (idx !== -1) {
        hits.push({ cls: 'INJECTION-SURFACE', path: rel(target, f.path), line: idx + 1, detail: `pattern=${pname} "${lines[idx].trim().slice(0, 90)}"` });
      }
    }

    const isExec = EXEC_EXT_RE.test(f.path) || (f.mode & 0o111) !== 0;
    if (isExec && EGRESS_ACTION_RE.test(text)) {
      URL_RE.lastIndex = 0;
      const hosts = new Set();
      let m;
      while ((m = URL_RE.exec(text)) !== null) hosts.add(m[1]);
      for (const h of [...hosts].sort()) {
        if (!declaredHosts.has(h)) {
          const idx = lines.findIndex((l) => l.includes(h));
          hits.push({ cls: 'EGRESS-UNDECLARED', path: rel(target, f.path), line: idx + 1, detail: `host=${h} declared=[${[...declaredHosts].join(',')}]` });
        }
      }
    }
  }

  if (!hasLicense && !manifest?.license) {
    hits.push({ cls: 'LICENSE-MISSING', path: rel(target, dir), line: 0, detail: '件内无 LICENSE/COPYING 且 manifest 无 license 字段' });
  }
  const deps = manifest?.dependencies ?? manifest?.requires ?? null;
  if (deps && (Array.isArray(deps) ? deps.length : Object.keys(deps).length)) {
    notes.push({ cls: 'PKG-EXISTENCE_DEFERRED', path: rel(target, dir), line: 0, detail: `声明包依赖 ⇒ 存在性检查需外部接口（v1 互审 §4 R-2 已给命令，本场未跑）；本闸门不据此改判` });
  }
}

for (const h of hits) console.log(`HIT ${GATE} class=${h.cls} path=${h.path} line=${h.line} detail="${h.detail}"`);
for (const n of notes) console.log(`NOTE ${GATE} class=${n.cls} path=${n.path} detail="${n.detail}"`);
console.log(`INFO ${GATE} target=${target} artifacts=${artifacts.length} register_entries=${register.length} register_malformed=${registerMalformed} decl_files=${declTotal} hits=${hits.length} notes=${notes.length}`);
console.log(`INFO ${GATE} 边界: 包名存在性检查(网络)不在本闸门可判定面内 ⇒ note 单列，不改判；injection/egress 为静态文本判定，可被编码绕过（见 README 恒过与射程申报）`);

const stats = { target, artifacts: artifacts.length, hits: hits.length, notes: notes.length };
if (hits.length > 0) process.exit(finish(GATE, VERDICT.VIOLATION, stats, hits.length));
process.exit(finish(GATE, VERDICT.PASS, stats, 0));
