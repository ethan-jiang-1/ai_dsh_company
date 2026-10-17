#!/usr/bin/env node
// run-gates.mjs — 唯一入口（本场对外契约件）
// 调用：node run-gates.mjs --target <目录> [选项]     或     GATE_TARGET=<目录> node run-gates.mjs
// 退出码三态：0 通过｜2 发现违规｜3 无法判定（无输入面/未解析输入；另有 4 = 用法错）
// 确定性：不联网、不读时钟；子闸门按固定顺序执行；同输入两次运行输出逐字节相同
// 只读：不修改 --target 下的任何文件，也不写 --target 之外的任何路径（全部结果只进 stdout）
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EXIT, parseArgv, flag, has, isDir, rejectUnknownFlags } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ALLOWED_FLAGS = ['target', 'live-creds', 'only', 'sources-policy', 'fixture-policy', 'entropy', 'minlen',
  'tracked-only', 'tracked-list', 'max-reachable', 'allow', 'allow-file', 'workspace', 'taint-window', 'help'];
const { flags } = parseArgv(process.argv.slice(2));
{ const bad = rejectUnknownFlags(flags, ALLOWED_FLAGS, 'run'); if (bad !== null) process.exit(bad); }

if (has(flags, 'help')) {
  console.log(`用法: node run-gates.mjs --target <目录> [--live-creds] [--only a1,a2,b1,b2,b3]
                    [--sources-policy report|block] [--fixture-policy report|block]
                    [--entropy 3.5] [--minlen 16] [--tracked-only] [--tracked-list <f>]
                    [--max-reachable 0] [--allow <路径>] [--workspace <目录>] [--taint-window N]
退出码: 0=通过 2=发现违规 3=无法判定 4=用法错`);
  process.exit(EXIT.PASS);
}

const target = flag(flags, 'target', process.env.GATE_TARGET ?? null);
if (!target) {
  console.log('GATE run verdict=UNDECIDABLE hits=0 reason=usage-error detail="缺少 --target <目录> 或 GATE_TARGET"');
  process.exit(EXIT.USAGE);
}
// 逐闸门转发：只转发该闸门认识的参数（否则子闸门的"未知参数=4"会误伤聚合）
const PASSTHRU = {
  a1: ['max-reachable', 'allow', 'allow-file'],
  a2: ['sources-policy', 'fixture-policy', 'entropy', 'minlen', 'tracked-only', 'tracked-list'],
  b1: [],
  b2: ['workspace'],
  b3: ['taint-window'],
};
function argsFor(id) {
  const out = [];
  for (const k of PASSTHRU[id] ?? []) {
    for (const v of (flags.get(k) ?? [])) out.push(v === 'true' ? `--${k}` : `--${k}=${v}`);
  }
  return out;
}

const only = flag(flags, 'only', null)?.split(',').map((s) => s.trim()) ?? null;
const want = (id) => !only || only.includes(id);

const liveCreds = has(flags, 'live-creds');
const credInTarget = isDir(path.join(target, 'home', '.ssh'));

const jobs = [];
if (want('a1')) {
  if (credInTarget) jobs.push(['a1', 'g-a1-cred-reach.mjs', ['--cred-root', path.join(target, 'home', '.ssh'), ...argsFor('a1')]]);
  else if (liveCreds) jobs.push(['a1', 'g-a1-cred-reach.mjs', ['--live-creds', ...argsFor('a1')]]);
  else jobs.push(['a1', null, null]);
}
if (want('a2')) jobs.push(['a2', 'g-a2-secret-scan.mjs', ['--target', target, ...argsFor('a2')]]);
if (want('b1')) jobs.push(['b1', 'g-b1-artifact.mjs', ['--target', target, ...argsFor('b1')]]);
if (want('b2')) jobs.push(['b2', 'g-b2-preexec.mjs', ['--target', target, ...argsFor('b2')]]);
if (want('b3')) jobs.push(['b3', 'g-b3-trace.mjs', ['--target', target, ...argsFor('b3')]]);

console.log(`GATE run begin target=${target} live_creds=${liveCreds} cred_surface_in_target=${credInTarget} gates=${jobs.map((j) => j[0]).join(',')}`);

const results = [];
for (const [id, script, args] of jobs) {
  if (!script) {
    console.log(`GATE ${id} verdict=UNDECIDABLE hits=0 reason=no-cred-surface（target 内无 home/.ssh；如需真机面请加 --live-creds）`);
    results.push({ id, code: EXIT.UNDECIDABLE, out: '' });
    continue;
  }
  const r = spawnSync(process.execPath, [path.join(HERE, script), ...args], { encoding: 'utf8' });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trimEnd();
  if (out) console.log(out);
  const code = r.status === null ? EXIT.UNDECIDABLE : r.status;
  results.push({ id, code, out });
}

const passN = results.filter((r) => r.code === EXIT.PASS).length;
const vioN = results.filter((r) => r.code === EXIT.VIOLATION).length;
const undN = results.filter((r) => r.code === EXIT.UNDECIDABLE || r.code === EXIT.USAGE).length;
const hitSum = results.reduce((a, r) => {
  const m = [...r.out.matchAll(/^GATE \w+ verdict=\w+ hits=(\d+)/gm)];
  return a + m.reduce((x, y) => x + Number(y[1]), 0);
}, 0);

console.log(`SUMMARY target=${target} gates=${results.length} pass=${passN} violation=${vioN} undecidable=${undN} hits_total=${hitSum} per_gate=${results.map((r) => `${r.id}:${r.code}`).join(',')}`);

if (vioN > 0) process.exit(EXIT.VIOLATION);
if (undN > 0) process.exit(EXIT.UNDECIDABLE);
process.exit(EXIT.PASS);
