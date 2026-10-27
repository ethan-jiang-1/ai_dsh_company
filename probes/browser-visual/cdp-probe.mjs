#!/usr/bin/env node
// 状态：常驻
// cdp-probe——观察窗的「呈现即验证」机器腿（borrowed from ai_dsh_loop_advisor，驱动层逐字拷贝）。
// 何时跑：①「启动给我看」类请求的自检（呈现即验证，dev-loop §1 + demo.md §前置的机器实现：
//   先对已起实例断言真实渲染，全绿才把 URL 交给人）；②插件 client 面改动后；
//   ③升 pin / 收割后 UI 回归。成本：默认档零模型（真实渲染断言面）；`--ask` 加一次真实模型调用。
// 前置：GUI URL（demo.md §前置：source run/env.sh → pnpm dsh web -- --port 0 --no-open → 横幅 URL）；
//   Chrome 二进制：DSH_PROBE_CHROME 环境变量或系统 Chrome（run/env.sh 已指 Chrome for Testing）。
// 用法：node probes/browser-visual/cdp-probe.mjs '<gui-url>' [--ask '问题'] [--keep-browser] [--evidence] [--texts] [--json-out <path>]
//   默认断言面 = composer + 品牌 + 右栏**全部**公司页签逐个开（Start-chip 回切）+ 面板体
//   `[data-company-tab-title=…]` 可见且非空 + console/异常捕获。页签清单从注册源
//   `company-tab-registration.ts` 解析（不再手写；2026-10-20 审计：旧清单 8 个漏「成品」）。
//   --ask 会真建会话（registry default = ceo）输入问题发送并等待轮次收口——完整产品环，留测试会话。
// 退出码：0 = 全部断言成立；1 = 有断言失败（JSON verdict 已打印，含 consoleProblems/exceptions；
//   失败时另写 runtime/harness-home/diagnosis/cdp-probe-<时间>/ 的截图/body/verdict/console）。
// 出处：驱动 = ai_dsh_loop_advisor/tools/drivers/cdp-driver.mjs（2026-10-01 owner 指令内化，
//   docs/guides/cdp-probe.md 记模式与环境坑）；场景选择器与本仓坑（首启双模态、Start-chip 回切、
//   dock 前后台子树 .some() 扫描）为本仓 2026-09/10 走查实证。
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs';
import { launchCdpBrowser } from '../../tools/drivers/cdp-driver.mjs';
import { loadChromium } from '../../tools/drivers/playwright.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { join } from 'node:path';
import process from 'node:process';
import { parseCompanyTabCatalog } from '../../tools/lib/company-tab-catalog.mjs';
import { diagnosisDir } from '../../tools/lib/diagnosis.mjs';
import { sleep } from '../../tools/lib/probe-kit.mjs'

const args = process.argv.slice(2);
const guiUrl = args.find(a => !a.startsWith('--'));
const flag = (name) => args.includes(name);
const askIndex = args.indexOf('--ask');
const ask = askIndex >= 0 ? (args[askIndex + 1] ?? '用一句话自报角色与职责。') : undefined;
const keepBrowser = flag('--keep-browser');
const saveEvidence = flag('--evidence');   // 成功也落 verdict/截图（R3-23；默认只在失败时落）
// --texts：逐页签捕获归一化可见文本（UI 金样用）；--json-out <path>：verdict 落指定文件（跨进程消费）。
const captureTexts = flag('--texts');
const jsonOutIndex = args.indexOf('--json-out');
const jsonOut = jsonOutIndex === -1 ? undefined : args[jsonOutIndex + 1];

if (guiUrl === undefined || !/^https?:\/\//.test(guiUrl) || !guiUrl.includes('token=')) {
  console.error("cdp-probe: PASS a booted GUI URL like 'http://127.0.0.1:<port>/?token=<t>'（demo.md §前置产出）");
  process.exit(2);
}

const verdict = {
  booted: false,
  composerReady: false,
  modalsDismissed: [],
  brandPresent: false,
  guideLabels: [],
  tabsOpened: [],
  tabFailures: [],
  askSession: null,
  askTranscriptTail: '',
  consoleProblems: [],
  exceptions: [],
  clientErrors: [],
  errorRingInstalled: false,
  tabTexts: {},
};

// 页签清单 = 注册源解析（单一事实）；解析为空直接 fail-loud，不静默退化成少一个也绿。
let tabs = [];
try {
  const source = readFileSync(join(repositoryRoot, 'packages/company-pack/src/client/company-tab-registration.ts'), 'utf8');
  const identity = readFileSync(join(repositoryRoot, 'packages/company-pack/src/client/tab-icons.tsx'), 'utf8');
  tabs = parseCompanyTabCatalog(source, identity);
} catch (error) {
  console.error(`cdp-probe: 读页签注册源失败：${String(error?.message ?? error)}`);
  process.exit(2);
}
if (tabs.length === 0) {
  console.error('cdp-probe: 页签注册源解析为空（格式漂移？）——拒绝以空清单通过');
  process.exit(2);
}
verdict.catalog = tabs.map(tab => tab.title);

// chromeBin 复用本仓 chromium 解析（loadChromium → executablePath；DSH_PROBE_CHROME 仍可覆盖——
// 驱动的候选表不动，保持「拷贝零修改」契约）。
const chromiumApi = await loadChromium(repositoryRoot).catch(() => undefined)
const chromeBin = process.env.DSH_PROBE_CHROME
  ?? (chromiumApi !== undefined ? chromiumApi.executablePath() : undefined)
const handle = await launchCdpBrowser({ url: 'about:blank', ...(chromeBin !== undefined ? { chromeBin } : {}) }).catch((error) => ({ failed: String(error?.message ?? error) }));
if (handle.failed !== undefined) {
  verdict.error = handle.failed;
console.log(JSON.stringify(verdict, null, 2));
  process.exit(1);
}
verdict.booted = true;
const { evaluate, consoleProblems, exceptions } = handle;
verdict.consoleProblems = consoleProblems;
verdict.exceptions = exceptions;

/** 失败现场：截图 + body 文本 + verdict + console，落到 runtime 诊断区（不再只打印 JSON）。 */
async function writeEvidence(reason) {
  const dir = diagnosisDir(repositoryRoot, 'cdp-probe');
  verdict.evidenceDir = dir;
  writeFileSync(join(dir, 'verdict.json'), JSON.stringify({ reason, ...verdict }, null, 2), 'utf8');
  writeFileSync(join(dir, 'console.log'), [...consoleProblems, ...exceptions].join('\n'), 'utf8');
  writeFileSync(join(dir, 'client-errors.json'), JSON.stringify(verdict.clientErrors ?? [], null, 2), 'utf8');
  const body = await evaluate('document.body.innerText').catch(() => '');
  writeFileSync(join(dir, 'body.txt'), typeof body === 'string' ? body : JSON.stringify(body), 'utf8');
  if (typeof handle.screenshot === 'function') {
    await handle.screenshot(join(dir, 'page.png')).catch(() => {});
  }
  console.error(`cdp-probe: 证据目录 = ${dir}`);
}


try {
  // 主动导航（两段式——实测教训：冷 profile 直接带 token URL，303 换 cookie 链会丢状态、
  // 页面停在 "authentication required"；先到 origin 建立上下文再带 token 进，完整挂载）。
  // console 捕获从起手就位（加载期问题不漏）。
  const origin = new URL(guiUrl).origin;
  await evaluate(`location.href = ${JSON.stringify(origin)}`).catch(() => {});
  await new Promise((resolve) => { setTimeout(resolve, 2000) });
  await evaluate(`location.href = ${JSON.stringify(guiUrl)}`).catch(() => {});
  // composer：第一挂载信号（data-composer-input 是本仓 composer 的稳定标记）
  let composerReady = false;
  for (let i = 0; i < 40 && !composerReady; i++) {
    composerReady = await evaluate(`document.querySelector('[data-composer-input][contenteditable="true"]') !== null`) === true;
    if (!composerReady) await sleep(500);
  }
  verdict.composerReady = composerReady;

  // 未登录/未配凭据的 home 会停在 onboarding（add API key / sign in）——那是**环境未就绪**，
  // 不是页面渲染坏（R3-23：盘上 2026-10-26 的现场就是 0/9 页签 + blank console）。判成 exit 2，
  // 免得 agent 把「没配 key」误诊成 client 崩了。
  if (!composerReady) {
    const bodyText = await evaluate('document.body.innerText').catch(() => '');
    const pendingOnboarding = typeof bodyText === 'string' && /Add API Key|Sign in to your DeepSeek account/i.test(bodyText);
    if (pendingOnboarding) {
      verdict.reason = 'not-onboarded';
      verdict.evidenceDir = await writeEvidence('not-onboarded');
      if (!keepBrowser) await handle.settle();
      console.log(JSON.stringify(verdict, null, 2));
      console.error('cdp-probe: 页面停在登录/凭据引导——该 home 未就绪（exit 2），不是渲染失败；先配凭据或换已 onboarding 的 home。');
      process.exit(2);
    }
  }

  // 首启双模态（0.2.0 起两个：Internal Testing Notice + Preview Notice；Continue 同名按钮）。
  // 每个新浏览器上下文都会再弹——CDP 探针每次都是新上下文，必须处理。
  for (const name of ['Internal Testing Notice', 'Preview Notice']) {
    const dismissed = await evaluate(`(() => {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')];
      const dlg = dialogs.find(d => (d.innerText ?? '').includes(${JSON.stringify(name)}));
      if (dlg === undefined) return 'absent';
      const btn = [...dlg.querySelectorAll('button')].find(b => (b.textContent ?? '').includes('Continue'));
      if (btn === undefined) return 'no-continue';
      btn.click();
      return 'dismissed';
    })()`);
    if (dismissed === 'dismissed') verdict.modalsDismissed.push(name);
  }
  if (verdict.modalsDismissed.length > 0) await sleep(1000);

  // 品牌（AppFrame 主标题，DSH_CLIENT_TITLE 构建期注入）
  verdict.brandPresent = await evaluate(
    `document.body.innerText.includes('DSH 梦之队')`) === true;

  // 右栏全部公司页签：guide 清点 → 逐个开（Start-chip 回切——开一个页签后 guide 列表被
  // 页签条替换，必须回 Start 再开下一个；dock 为每会话保留前后台子树 ⇒ 断言用 includes 扫全文）。
  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /Open right sidebar|打开右侧边栏/.test(b.getAttribute('aria-label') ?? ''));
    if (btn !== undefined) btn.click();
  })()`);
  await sleep(800);
  verdict.guideLabels = await evaluate(
    `Array.from(document.querySelectorAll('.wk-guide-entry-label')).map(e => e.textContent)`) ?? [];
  const missingGuides = tabs.filter(tab => !verdict.guideLabels.some(label => (label ?? '').includes(tab.title)));
  if (missingGuides.length > 0) {
    verdict.tabFailures.push(`guide 缺失：${missingGuides.map(tab => tab.title).join('、')}`);
  }
  // ⚠ 驱动的 evaluate 不 await Promise——时序由场景侧 sleep 控制，页面动作用同步 IIFE。
  for (const tab of tabs) {
    await evaluate(`(() => { const back = [...document.querySelectorAll('[data-dockkit-tab]')].find(t => /start/i.test(t.textContent ?? '')); if (back !== undefined) back.click(); })()`);
    await sleep(400);
    const clicked = await evaluate(`(() => { const entry = [...document.querySelectorAll('.wk-guide-entry-label')].find(e => (e.textContent ?? '').includes(${JSON.stringify(tab.title)})); if (entry === undefined) return false; entry.click(); return true; })()`) === true;
    // title 是面板外框自己拿到的显示名，不受 contentId/kind 语义影响；每个 catalog 条目唯一。
    const selector = `[data-company-tab-title="${tab.title}"]`;
    const probeBody = () => evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (el === null) return { present: false, visible: false, textLength: 0, text: '' };
      const rect = el.getBoundingClientRect();
      const text = (el.innerText ?? '').trim();
      return { present: true, visible: rect.width > 0 && rect.height > 0, textLength: text.length, text };
    })()`);
    let rendered = await probeBody();
    for (let i = 0; i < 6 && !(rendered?.present === true && rendered?.visible === true && rendered?.textLength > 0); i++) {
      await sleep(500);
      rendered = await probeBody();
    }
    const ok = clicked && rendered?.present === true && rendered?.visible === true && rendered?.textLength > 0;
    if (ok) {
      verdict.tabsOpened.push(tab.title);
      if (captureTexts && typeof rendered.text === 'string') verdict.tabTexts[tab.title] = rendered.text;
    }
    else {
      const why = !clicked ? 'entry' : rendered?.present !== true ? 'body' : rendered.visible !== true ? 'hidden' : 'empty';
      verdict.tabFailures.push(`${tab.title}(${why})`);
    }
  }
  if (verdict.tabsOpened.length !== tabs.length) {
    verdict.tabFailures.unshift(`仅 ${verdict.tabsOpened.length}/${tabs.length} 开`);
  }

  // --ask：真建会话（registry default = ceo）→ 输入 → 发送 → 轮次收口 → 抓 transcript 尾。
  // 收口信号 = 正文增长后连续两次采样不变（主会话无 advisor 那种 "Completed in" 标记；
  // 文本长度在 header 计时器下不可作完成信号，文本稳定化才是）。
  if (ask !== undefined && composerReady) {
    verdict.askSession = 'new-session(default-preset)';
    const typed = await evaluate(`(() => {
      const editable = document.querySelector('[data-composer-input][contenteditable="true"]');
      if (editable === null) return 'no-editable';
      editable.focus();
      const ok = document.execCommand('insertText', false, ${JSON.stringify(ask)});
      return ok === true ? 'typed' : 'insert-failed';
    })()`);
    if (typed !== 'typed') verdict.askError = typed;
    else {
      const sent = await evaluate(`(() => {
        const editable = document.querySelector('[data-composer-input][contenteditable="true"]');
        editable.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        return 'sent';
      })()`);
      verdict.sent = sent;
      const pageText = () => evaluate(`document.body.innerText`);
      let prev = await pageText(); let stable = 0; let grew = false;
      for (let i = 0; i < 45 && stable < 3; i++) {
        await sleep(4000);
        const now = await pageText();
        if (now.length > prev.length) { grew = true; stable = 0; }
        else if (now.length === prev.length) stable++;
        else stable = 0;
        prev = now;
      }
      verdict.askTranscriptGrew = grew;
      verdict.askTranscriptTail = prev.slice(-450);
    }
  }
  // 浏览器侧错误环（client/error-ring.ts 安装）：页面内的 error/unhandledrejection/console.error。
  // 这是 agent 能看到的「用户当时到底撞了什么」——此前这类事实只活在用户自己的 DevTools 里。
  const ring = await evaluate(`JSON.stringify({
    installed: typeof window.__DSH_COMPANY_ERRORS__ === 'object' && window.__DSH_COMPANY_ERRORS__ !== null,
    entries: typeof window.__DSH_COMPANY_ERRORS__ === 'object' && window.__DSH_COMPANY_ERRORS__ !== null ? window.__DSH_COMPANY_ERRORS__.list() : [],
  })`).catch(() => '{"installed":false,"entries":[]}');
  try {
    const parsed = JSON.parse(typeof ring === 'string' ? ring : '{"installed":false,"entries":[]}');
    verdict.errorRingInstalled = parsed.installed === true;
    verdict.clientErrors = Array.isArray(parsed.entries) ? parsed.entries.slice(0, 20) : [];
  } catch { verdict.errorRingInstalled = false; verdict.clientErrors = []; }
} finally {
  verdict.consoleProblems = consoleProblems.slice(0, 10);
  verdict.exceptions = exceptions.slice(0, 10);
  const bad = verdict.composerReady !== true
    || verdict.brandPresent !== true
    || verdict.tabFailures.length > 0
    || verdict.consoleProblems.some(p => p.startsWith('console.error'))
    || verdict.exceptions.length > 0
    || verdict.clientErrors.length > 0
    || verdict.errorRingInstalled !== true
    || (ask !== undefined && (verdict.askError !== undefined || verdict.askTranscriptGrew !== true));
  if (bad) await writeEvidence('assertion');
  else if (saveEvidence) { verdict.evidenceDir = await writeEvidence('pass'); }
  if (!keepBrowser) await handle.settle();
}

if (jsonOut !== undefined) {
  try {
    mkdirSync(dirname(jsonOut), { recursive: true });
    writeFileSync(jsonOut, `${JSON.stringify(verdict, null, 2)}\n`, 'utf8');
  } catch (error) {
    console.error(`cdp-probe: 写 --json-out 失败（${String(error?.message ?? error)}）`);
  }
}
console.log(JSON.stringify(verdict, null, 2));
let exitCode = 0;
if (verdict.booted === false || verdict.error !== undefined) exitCode = 1;
if (verdict.composerReady !== true || verdict.brandPresent !== true) exitCode = 1;
if (verdict.tabsOpened.length !== tabs.length || verdict.tabFailures.length > 0) exitCode = 1;
if (verdict.consoleProblems.some(p => p.startsWith('console.error')) || verdict.exceptions.length > 0) exitCode = 1;
if (verdict.clientErrors.length > 0) exitCode = 1;
if (verdict.errorRingInstalled !== true) exitCode = 1;
if (ask !== undefined && (verdict.askError !== undefined || verdict.askTranscriptGrew !== true)) exitCode = 1;
process.exit(exitCode);
