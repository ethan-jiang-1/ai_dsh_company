#!/usr/bin/env node
// g-b2-preexec.mjs — 族 B / 闸 2：命令「执行前」闸（M1 执行环节 · K4）
//
// 目标面（三选一，按序）：
//   --command "<单条命令>"            单条判定
//   --command-file <文件>            逐行判定（# 注释与空行跳过）
//   --target <目录>                  <目录>/commands.txt 与 <目录>/commands/*.txt
// 判定等级：ALLOW（放行）｜CONFIRM（需人确认 —— **本闸门把“需确认”计为非通过**，否则无人值守时执行前闸等于没有闸）｜DENY（硬拒）
// 退出码：0 通过（全部 ALLOW）｜2 违规（有 CONFIRM 或 DENY）｜3 无法判定（无输入面）｜4 用法错
//
// ⚠ 射程（务必与 README 的“恒过与误漏申报”同读）：这是**字符串分类器**，不是沙箱、不是内核闸。
//   它能被编码/拼接/变量展开绕过 ⇒ 只当“提高成本 + 留痕”，不得当“防住 M1”。
import fs from 'node:fs';
import path from 'node:path';
import { EXIT, VERDICT, parseArgv, flag, has, rel, isDir, finish, usageError, rejectUnknownFlags } from './lib.mjs';

const GATE = 'b2';
const ALLOWED_FLAGS = ['target', 'command', 'command-file', 'workspace', 'help'];
const { flags } = parseArgv(process.argv.slice(2));
{ const bad = rejectUnknownFlags(flags, ALLOWED_FLAGS, GATE); if (bad !== null) process.exit(bad); }
if (has(flags, 'help')) {
  console.log('用法: node g-b2-preexec.mjs (--command "<cmd>" | --command-file <f> | --target <dir>) [--workspace <dir>]');
  process.exit(EXIT.PASS);
}

const CRED_RE = /(~\/\.ssh|\/\.ssh\/|\bid_(rsa|dsa|ecdsa|ed25519)\b|\.aws\/credentials|\.netrc|\.pgpass|\bsecurity\s+find-(generic|internet)-password)/i;
const EGRESS_RE = /\b(curl|wget|nc|netcat|scp|sftp|rsync|ssh|ftp|telnet)\b/i;
const SHELL_RE = /\b(bash|sh|zsh|ksh|python[0-9.]*|node|perl|ruby|php)\b/i;

const RULES = [
  // [class, level, regex, why]
  ['downloader-pipe-to-shell', 'DENY', /(curl|wget|fetch)\b[^|;\n]{0,300}\|\s*(sudo\s+)?(bash|sh|zsh|ksh|python[0-9.]*|node|perl|ruby)\b/i, '下载内容直接管道进解释器'],
  ['pipe-to-shell', 'DENY', /cat\b[^|;\n]{0,120}\|\s*(sudo\s+)?(bash|sh|zsh)\b/i, '管道进 shell'],
  ['credential-exfil', 'DENY', /(?:curl|wget|scp|sftp|nc|netcat|rsync|mail|base64)\b[^\n]{0,200}(~\/\.ssh|\/\.ssh\/|\bid_rsa\b|\.aws\/credentials|\.netrc)/i, '凭据路径与出网/编码动作同现'],
  ['credential-exfil', 'DENY', /(~\/\.ssh|\/\.ssh\/|\bid_rsa\b|\.aws\/credentials|\.netrc)[^\n]{0,200}\|\s*(curl|wget|nc|base64|mail)/i, '凭据路径管道到出网/编码'],
  ['root-destructive-delete', 'DENY', /\brm\s+(-[A-Za-z]+\s+)+(--\s+)?(\/|~|\$HOME|\*)\s*($|[;&|])/i, '递归删除根/家目录/通配'],
  ['force-push', 'DENY', /\bgit\s+push\b[^\n]{0,120}(--force\b|\s-f\b)/i, '强推远端'],
  ['credential-path-touch', 'CONFIRM', CRED_RE, '触及凭据路径'],
  ['git-push', 'CONFIRM', /\bgit\s+push\b/i, '推远端'],
  ['destructive-delete', 'CONFIRM', /\brm\s+(-[A-Za-z]*r[A-Za-z]*f[A-Za-z]*|-[A-Za-z]*f[A-Za-z]*r[A-Za-z]*)\b/i, '递归强制删除'],
  ['outbound-network', 'CONFIRM', EGRESS_RE, '出网动作'],
  ['obfuscated-exec', 'CONFIRM', /\bbase64\s+(-d|--decode|--decode)\b|\beval\b|\$IFS|\\x[0-9a-fA-F]{2}|xargs[^\n]{0,40}\b(bash|sh)\b/i, '编码/绕写特征'],
  ['interpreter-inline-exec', 'CONFIRM', /\b(python[0-9.]*|node|perl|ruby)\s+-(c|e)\b/i, '解释器内联执行'],
  ['var-split-exec', 'CONFIRM', /\b[a-zA-Z_]\w*=(curl|wget|bash|sh|rm|cat|ssh|base64|nc)\b/i, '命令名变量化（绕写特征）'],
  ['env-dump', 'CONFIRM', /\b(printenv|env\b\s*$|set\b\s*$)/i, '环境变量外溢面'],
];

const workspace = flag(flags, 'workspace', null);

function classify(cmd) {
  for (const [cls, level, re, why] of RULES) {
    if (re.test(cmd)) return { cls, level, why };
  }
  if (workspace) {
    const re = /(?:>>?|\btee\b)\s*("?)(\/[^\s"';|&]+)\1/g;
    let m;
    while ((m = re.exec(cmd)) !== null) {
      const p = path.resolve(m[2]);
      if (!p.startsWith(path.resolve(workspace) + path.sep) && !p.startsWith('/tmp/')) {
        return { cls: 'write-outside-workspace', level: 'CONFIRM', why: `目标 ${m[2]} 不在 --workspace 内` };
      }
    }
  }
  return { cls: 'none', level: 'ALLOW', why: '' };
}

// —— 输入面 ——
const items = []; // {file, line, cmd}
let surface = null;
const single = flag(flags, 'command', null);
const fileArg = flag(flags, 'command-file', null);
const target = flag(flags, 'target', process.env.GATE_TARGET ?? null);

if (single !== null) {
  surface = 'argv';
  items.push({ file: '<argv>', line: 0, cmd: single });
} else if (fileArg) {
  surface = 'command-file';
  if (!fs.existsSync(fileArg)) {
    console.log(`GATE ${GATE} verdict=${VERDICT.UNDECIDABLE} hits=0 reason=command-file-not-found path=${fileArg}`);
    process.exit(EXIT.UNDECIDABLE);
  }
  readLines(fileArg).forEach((l) => items.push({ file: fileArg, line: l.line, cmd: l.text }));
} else if (target) {
  if (!isDir(target)) {
    console.log(`GATE ${GATE} verdict=${VERDICT.UNDECIDABLE} hits=0 target=${target} reason=target-not-a-directory`);
    process.exit(EXIT.UNDECIDABLE);
  }
  surface = 'target';
  const f1 = path.join(target, 'commands.txt');
  if (fs.existsSync(f1)) readLines(f1).forEach((l) => items.push({ file: rel(target, f1), line: l.line, cmd: l.text }));
  const d1 = path.join(target, 'commands');
  if (isDir(d1)) {
    const subs = fs.readdirSync(d1).filter((n) => n.endsWith('.txt')).sort();
    for (const n of subs) {
      const f = path.join(d1, n);
      readLines(f).forEach((l) => items.push({ file: rel(target, f), line: l.line, cmd: l.text }));
    }
  }
} else {
  process.exit(usageError(GATE, '需要 --command / --command-file / --target 之一'));
}

function readLines(f) {
  const out = [];
  const raw = fs.readFileSync(f, 'utf8').split('\n');
  raw.forEach((text, i) => {
    const t = text.trim();
    if (!t || t.startsWith('#')) return;
    out.push({ line: i + 1, text: t });
  });
  return out;
}

if (!items.length) {
  console.log(`GATE ${GATE} verdict=${VERDICT.UNDECIDABLE} hits=0 target=${target ?? '-'} surface=${surface} reason=no-command-surface（无命令行：不代表通过）`);
  process.exit(EXIT.UNDECIDABLE);
}

let deny = 0;
let confirm = 0;
let hits = 0;
items.forEach((it, idx) => {
  const r = classify(it.cmd);
  const verdict = r.level === 'ALLOW' ? 'ALLOW' : (r.level === 'DENY' ? 'DENY' : 'CONFIRM');
  if (verdict === 'DENY') deny++;
  if (verdict === 'CONFIRM') confirm++;
  if (verdict !== 'ALLOW') hits++;
  console.log(`CMD ${GATE} idx=${idx + 1} file=${it.file} line=${it.line} class=${r.cls} verdict=${verdict} why="${r.why}" cmd="${it.cmd.replace(/"/g, "'")}"`);
});

console.log(`INFO ${GATE} surface=${surface} cmds=${items.length} deny=${deny} confirm=${confirm} allow=${items.length - hits} workspace_scope=${workspace ?? 'unset'}`);
console.log(`INFO ${GATE} 语义: ALLOW=放行 | CONFIRM=需人确认（非通过） | DENY=硬拒 —— 本闸门把 CONFIRM 计为非通过，否则无人值守时等于无闸`);
console.log(`INFO ${GATE} 射程: 字符串分类器（可被编码/拼接绕过）⇒ 只提高成本与留痕，不宣称防住 M1`);

const stats = { surface, cmds: items.length, deny, confirm };
if (hits > 0) process.exit(finish(GATE, VERDICT.VIOLATION, stats, hits));
process.exit(finish(GATE, VERDICT.PASS, stats, 0));
