---
status: 已修
severity: P1
opened: 2026-11-12
---

# BUG-080：`ui-scene-smoke --lang en` 的页签标题映射漏了「策略」→「Strategy」，en 检查 9/10 假红，第 10 页签无覆盖

> 严重级别：P1（重要）｜发现：2026-11-12｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[启动策略 + wiki 回归/探索卡](../settled_issues/2026-11-12-startup-strategy-wiki-regression-exploration.md)（A1 / H5）
> **留痕**：Note [2026-11-12-startup-strategy-wiki-bug-sweep](../../../notes/implemented/2026-11-12-startup-strategy-wiki-bug-sweep.md)

## 症状

`ui-scene-smoke --isolated --lang en` 在 10 页签状态下 **FAIL**：

```
tabFailures ["仅 9/10 开", "guide 缺失：策略", "策略(entry)"]
catalog ["Inbox", "Board", "Dependencies", "Presence", "Usage", "Tasks", "Cultivation", "Ledger", "Deliverables", "策略"]
```

同一实例的真实页面 `body.txt` 里，页签和 composer 按钮都是英文：

```
Strategy: auto
...
Strategy
Inbox
Board
...
Deliverables
```

也就是说：**产品 en 页面是英文的，检查器却按中文「策略」去找 guide/entry**，于是第 10 个页签没打开，`--lang en` 的「无中文残留」断言只覆盖了前 9 个页签，并在每次运行时假红。

## 根因（假设）

`cdp-probe` 先由 `parseCompanyTabCatalog` 从注册源 + locale 的 **zh label** 解析出 catalog（10 个中文标题），再在 `PROBE_LANG === 'en'` 时用一份**手维护映射**换英文：

```js
const EN_TAB_TITLES = {
  '待办': 'Inbox', '看板': 'Board', '依赖图': 'Dependencies', '在场': 'Presence',
  '用量': 'Usage', '任务板': 'Tasks', '培养': 'Cultivation', '台账': 'Ledger', '成品': 'Deliverables',
  // 缺：'策略': 'Strategy'
};
```

2026-11-12 新增第 10 个页签「策略」时，这份映射没有同步（`probes/browser-visual/cdp-probe.mjs` 的 `EN_TAB_TITLES`）；`ui-scene-smoke` 的 en 断言只检查 `verdict.tabTexts`，而 `tabTexts` 只包含成功打开的页签，所以「第 10 个没开」不会变成「第 10 个有中文」，只会变成 guide 缺失 + 9/10 开 + 最终 FAIL。

## 暴露的失败类

**检查器自己手维护第二份页签清单**：`parseCompanyTabCatalog` 的初衷就是「从注册源读同一份 catalog，避免手写清单漂移」（脚本头注 2026-10-19 的 8/8 教训）；en 标题映射又把手写清单加了回来。新增/改名页签时，产品页面可能完全正确，检查却假红并漏掉该页签的 en 覆盖。

横切范围：任何新增公司页签 / 改 label 的改动都要同时改这里；`ui-scene-smoke --lang en` 是发布前 en 面的唯一真页面检查，假红会掩盖真实的中文残留（若第 10 页签真有中文，本轮也测不到）。

## 复现

```sh
source run/env.sh
node checks/lanes/ui-scene.entry.mjs --isolated --lang en
```

2026-11-12 实跑（本卡发现时）：

- `ui-scene-smoke` 退出 1；证据目录 `runtime/harness-home/diagnosis/cdp-probe-2026-11-12T12-22-42-967Z/`。
- `verdict.json`：`tabFailures = ["仅 9/10 开", "guide 缺失：策略", "策略(entry)"]`；`catalog` 末项 `"策略"`。
- `body.txt`：`Strategy: auto` 与 `Strategy` 都在，说明 en 页面本身有英文标题；检查器没把「策略」映射成 `Strategy`。

## 修复方向（授权：2026-11-12 用户指令；见[修复交接](../../bugs/README.md#2026-11-12-修复交接根因组-wlfvbug-080089)）

- 首选：删掉 `EN_TAB_TITLES` 的手写映射，en 标题从同一份 locale 源派生（`tabCopyFor('en')` / `tabs.*.label` 的 en 值），让 catalog 与页面同源；或至少加 `'策略': 'Strategy'`。
- 加一条守卫：页签注册数 == zh catalog 数 == en catalog 数；新增页签漏 en key 时在 keyless spec 红，而不是等真页面失败。
- 修复后重跑 `ui-scene-smoke --isolated --lang en`，确认 10/10 打开且 `tabTexts` 覆盖第 10 页签；再跑 `--golden` 复核 zh 不受影响。

## 修复关联

- 发现于探索卡 A1；与 H5（en 第 10 页签 / A8 宣称）相关。
- 前置事实：产品 en 页面有 `Strategy`（body.txt），所以本卡是**检查器缺陷**，不是 UI 文案缺陷；第 10 页签的 en 文案是否全部正确，等本卡修复后再由 `--lang en` 连同 `tabTexts` 一起判。

## 已修判定

修成：`ui-scene-smoke --lang en` 的页签清单从 `locales.ts` 的 en 块派生（`parseCompanyTabCatalog` 同时返回 zh/en label），手维护的 `EN_TAB_TITLES` 删除；新增页签漏 en key 时解析整体为空、探针 exit 2，不再静默落回中文。

- keyless：真实注册源 + 字典解析出 10/10 成对（含 `Strategy`）；塞一份缺 en label 的字典 → 返回空；红证：把 `enTitle` 落回 `title` → 2 failed，复原 4 passed。
- 真页面：`ui-scene-smoke --isolated --lang en` 10/10 打开且无中文残留。
