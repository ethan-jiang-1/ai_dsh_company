---
name: company-ui-change-definition
description: Use when adding or changing any company Web UI string, panel, tab, card, label, tooltip, empty state, error, title, or banner. Every user-visible string must ship with zh and en from the first commit, default zh, through the typed company locale dictionary — never as a hardcoded literal.
---

# Company UI 改动的完成定义

适用：改 `packages/company-pack/src/client/` 的任何用户可见文案或展示面（页签、面板、卡片、按钮、空态、错误、tooltip、标题、横幅），以及为这些面提供展示事实的 `src/lib/` 纯函数。

**规则**：任何新文案从第一个 commit 就 zh+en；缺省 zh；文案只住 `company` typed 字典，组件不写中文字面量。规则正文 = `docs/contracts/` 下的 `language.md`（A4 落成前以本 skill + RFC 为准）；机械门禁 = `checks/gates/` 下的 `client-copy.mjs`（A4 转硬）。

## 步骤

1. **加 key**：在 `packages/company-pack/src/client/` 的 `locales.ts` 里给 `zh` 加 key，给 `en` 加同 key 的英文；`{placeholder}` 两语言同名同数。`en` 必须是完整 `Record<CompanyKey, string>`，不写可选。
2. **接线**：组件用槽注入的 `t`（注册时 `locale: NS`）；嵌套组件把 `t` 往下传；注册处的 title/guide/tooltip 用 `() => t(key)` thunk。不要用模块级 `const t = ...` 绕过语言切换。
3. **纯函数不返回中文**：`src/lib/` 的 view model 返回 `CopyToken`/enum（`{ key, params }`），组件侧 `text(token)` 翻译。状态、列名、事件句、预算行、卡片抬头都按这条处理；不要只翻译 JSX、把数据里的中文漏过去。
4. **Host 人可见文案**：命令回执/错误、工具 note、signoff、`blocked-text` 走 `CompanyLanguage.text(zh, en)`；命令 description 在语言变化时 dispose + 重注册；工具 description 英文。不要新增只写中文的 host 回执。
5. **验证**：`pnpm test tests/client`（碰 `src/lib` 加 `pnpm test tests/lib`）；`pnpm typecheck`；A4 后 `pnpm verify` 会跑 `client-copy`。用户可见改动同 diff 刷 `ui-scene-smoke --isolated --golden` 的 zh/en 金样；真页面切换 English 检查无中文残留。

## 判据

- [ ] `locales.ts` 的 zh/en key 与 placeholder 成对；`en` 无 CJK。
- [ ] 组件/注册处没有新增中文字面量；纯函数没有新增中文展示字段。
- [ ] zh/en 都能在真页面看到；缺省仍是 zh；切换不需要刷新。
- [ ] gate/i18n spec/金样与本次改动同 diff；只报告实跑过的检查。

## 指针

- 当前测法 = [tests/README](../../../tests/README.md) 的「改动面 → 最窄检查」client 面板行。
- 收尾 = [close-out-definition](../close-out-definition/SKILL.md)；证据分层 = [testing.md](../../../docs/testing.md)。
- A4 落成前，本 skill 是 day-one 规则的可发现入口；A4 后合同与 gate 接管，本 skill 只留步骤。
