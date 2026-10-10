#!/usr/bin/env node
// 状态：常驻
// cdp-probe——观察窗的「呈现即验证」机器腿（borrowed from ai_dsh_loop_advisor，驱动层逐字拷贝）。
// 何时跑：①「启动给我看」类请求的自检（呈现即验证，dev-loop §1 + demo.md §前置的机器实现：
//   先对已起实例断言真实渲染，全绿才把 URL 交给人）；②插件 client 面改动后；
//   ③升 pin / 收割后 UI 回归。成本：默认档零模型（真实渲染断言面）；`--ask` 加一次真实模型调用。
// 前置：GUI URL（demo.md §前置：source run/env.sh → pnpm dsh web -- --port 0 --no-open → 横幅 URL）；
//   Chrome 二进制：DSH_PROBE_CHROME 环境变量或系统 Chrome（run/env.sh 已指 Chrome for Testing）。
// 用法：node probes/browser-visual/cdp-probe.mjs '<gui-url>' [--ask '问题'] [--keep-browser]
//   默认断言面 = composer + 品牌 + 右栏 8 公司页签逐个开（Start-chip 回切）+ console/异常捕获。
//   --ask 会真建会话（registry default = ceo）输入问题发送并等待轮次收口——完整产品环，留测试会话。
// 退出码：0 = 全部断言成立；1 = 有断言失败（JSON verdict 已打印，含 consoleProblems/exceptions）。
// 出处：驱动 = ai_dsh_loop_advisor/tools/drivers/cdp-driver.mjs（2026-10-01 owner 指令内化，
//   docs/cdp-probe.md 记模式与环境坑）；场景选择器与本仓坑（首启双模态、Start-chip 回切、
//   dock 前后台子树 .some() 扫描）为本仓 2026-09/10 走查实证。
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs';
import { launchCdpBrowser } from '../../tools/drivers/cdp-driver.mjs';
import { loadChromium } from '../../tools/drivers/playwright.mjs';
import { existsSync } from 'node:fs';
import process from 'node:process';

const args = process.argv.slice(2);
const guiUrl = args.find(a => !a.startsWith('--'));
const flag = (name) => args.includes(name);
const askIndex = args.indexOf('--ask');
const ask = askIndex >= 0 ? (args[askIndex + 1] ?? '用一句话自报角色与职责。') : undefined;
const keepBrowser = flag('--keep-browser');

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
};

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

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) });

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

  // 右栏 8 公司页签：guide 清点 → 逐个开（Start-chip 回切——开一个页签后 guide 列表被
  // 页签条替换，必须回 Start 再开下一个；dock 为每会话保留前后台子树 ⇒ 断言用 includes 扫全文）。
  await evaluate(`(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /Open right sidebar|打开右侧边栏/.test(b.getAttribute('aria-label') ?? ''));
    if (btn !== undefined) btn.click();
  })()`);
  await sleep(800);
  verdict.guideLabels = await evaluate(
    `Array.from(document.querySelectorAll('.wk-guide-entry-label')).map(e => e.textContent)`) ?? [];
  const tabs = ['待办', '用量', '看板', '任务板', '依赖图', '台账', '在场', '培养'];
  // ⚠ 驱动的 evaluate 不 await Promise——时序由场景侧 sleep 控制，页面动作用同步 IIFE。
  for (const tab of tabs) {
    await evaluate(`(() => { const back = [...document.querySelectorAll('[data-dockkit-tab]')].find(t => /start/i.test(t.textContent ?? '')); if (back !== undefined) back.click(); })()`);
    await sleep(400);
    const clicked = await evaluate(`(() => { const entry = [...document.querySelectorAll('.wk-guide-entry-label')].find(e => (e.textContent ?? '').includes(${JSON.stringify(tab)})); if (entry === undefined) return false; entry.click(); return true; })()`) === true;
    await sleep(900);
    const rendered = await evaluate(`document.body.innerText.includes(${JSON.stringify(tab)})`) === true;
    if (clicked && rendered) verdict.tabsOpened.push(tab); else verdict.tabFailures.push(`${tab}(${clicked ? 'render' : 'entry'})`);
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
} finally {
  verdict.consoleProblems = consoleProblems.slice(0, 10);
  verdict.exceptions = exceptions.slice(0, 10);
  if (!keepBrowser) await handle.settle();
}

console.log(JSON.stringify(verdict, null, 2));
let exitCode = 0;
if (verdict.booted === false || verdict.error !== undefined) exitCode = 1;
if (verdict.composerReady !== true || verdict.brandPresent !== true) exitCode = 1;
if (verdict.tabsOpened.length !== 8 || verdict.tabFailures.length > 0) exitCode = 1;
if (verdict.consoleProblems.some(p => p.startsWith('console.error')) || verdict.exceptions.length > 0) exitCode = 1;
if (ask !== undefined && (verdict.askError !== undefined || verdict.askTranscriptGrew !== true)) exitCode = 1;
process.exit(exitCode);
