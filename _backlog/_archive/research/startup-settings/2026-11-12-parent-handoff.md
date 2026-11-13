---
topic: startup-settings
intent: 父会话一手核实的机制锚点 + 合同层指针 + 跨题交接，供落地设计引用；不替代主材料
---

# 启动 Settings：核实锚点与合同指针

> 主材料 = [2026-11-12-startup-settings.md](2026-11-12-startup-settings.md)（注入点/modal/持久化/注入链取证 + 方案比较）。本件只补父会话亲自核实、且主材料未收或需强调的事实与合同指针。
> 诚实记账：本件由父会话整理；前一版曾误标「父会话已跑 pnpm verify/test 全绿」——**该陈述不实，已删除**（本轮父会话只做只读源码核实，未跑 verify/test）。

## 一手核实（父会话本轮实读 vendor pin 与公司源码）

- 红框槽：`vendor/dsh/packages/client/ui-conversation/src/client/skeleton/InputBar.tsx` 实读 `renderSlot('conversation.input.left')`（`.tools` 末位）/ `renderSlot('conversation.input.right')`（`.trailing` 首位、模型选择器之前）。运行态 GUI（3080）的「Auto-continue/Follow default」= 第三方插件 `dsh-client-auto-continue`，非核心。
- 第三方注入活证据：`$HOME/.dsh/profiles/web/node_modules/dsh-client-auto-continue/src/client/index.ts:151-161` = `slots.inject('conversation.input.left', …register)` 同款；公司 pack `src/client/index.ts` 已有 6 处同款注册（grep 实跑）。
- 注入机制：`vendor/dsh/packages/core/system-prompt/src/index.ts:62-66` 实读——section text provider 每次 assembly 求值 → 新 section thunk 活读 settings = 改后下一轮生效（端到端时序未真跑，标推论）。
- 公司注入先例：`src/host/prompt/handbook.ts` 实读（order 500、read-once 快照、NON_ROLE_PRESETS 跳过）；`src/host/prompt/language-policy.ts` 实读（`company:language` section order 1，`text: () => languagePolicyText(language.current())` **活读**——这是「设置→prompt」活管道的现成先例）。
- host config 面：`src/host/run-bundle/config.ts` 实读——仅 `cultivationRoot` / `handbookSkipPresets` 两键，未知键 fail-loud。
- **DSH 原生导航活样板**：`vendor/dsh/packages/experimental/client-ui-voice-input/src/client/mount.ts`（L18/L28/L49-55） 实读——`inject […,'pluginNavigation']`；composer 控件的 `openSettings = () => ctx.pluginNavigation.openBundle('<本 bundle>')`；设置卡注册进 `plugins.bundle.config`（key=本 bundle 名）。`ui-plugin-manager/src/client/index.ts:138-149` 实读 `pluginNavigation.openBundle` = 切主面板到 Plugins 页 + 定位该 bundle 详情（**开面板，非居中 modal**）。
- settings modal 无公共 opener（复核）：`ui-settings-general/src/client/index.ts:188-225` 壳 store 在 `sidebar.settings` 注册闭包内私有；`settings.open` shortcut 的 run 闭包捕获 shellInstance，未反射成服务。
- vendor 零改动；pin 与运行态同版本 rc.5（主材料 §0 实测）。

## 合同层事实（落地设计必读）

- workspace 解析链：`DSH_COMPANY_HOME` → 启动 cwd → `<DSH_HOME>/company/settings.json` 最近选择 → DSH picker（[profile 合同](../../../../docs/contracts/profile.md)）。⚠ **命名撞车**：home 级 `company/settings.json` 已是 workspace 最近选择登记（`src/host/workspace/workspace-resolution.ts:53`）；拟议 workspace 级 `.dsh-company/settings.json` 是另一作用域另一文件，落地须显式区分（或另起名）。
- 两轴解析链的决策记忆（硬强制插层不得破坏其不变量）：[delivery-mode-axis](../../../../notes/implemented/2026-11-11-delivery-mode-axis.md)、[product-type-single-source](../../../../notes/implemented/2026-11-11-product-type-single-source.md)、[motion-product-type](../../../../notes/implemented/2026-11-10-motion-product-type.md)——「meta > company > 默认」与 fail-closed（未知类型报错不静默）必须保留。
- host 读 DSH settings 先例 = `src/host/language/company-language.ts`（`settings.describe()` 读 `locale.preference`，`settings/document-updated` 实时跟随）；DSH settings = profile 全局。语言已是活设置（B 类），startup-settings 不应重复造语言旋钮，而是复用同款活管道。
- 实现期约束：company-ui-change-definition（zh+en typed company 字典首 commit 起）；[presets 合同](../../../../docs/contracts/presets.md) 四形态矩阵决定强制 section 的可见面（worker family / quality-loop 不注入手册，同款跳过）。

## 跨题交接

- wiki 指针格式 = [wiki-knowledge-map 主材料](../wiki-knowledge-map/2026-11-12-wiki-knowledge-map.md) §5 形状 A（本地根路径 + index.md 先行；llms.txt/DeepWiki 仅可选外部源）；`settings.wiki` = string 指针，两题落地合流。
- 开放问题 = 主材料 §9（per-session 覆盖、强制档位、贴左/贴右、method 作用域错配、冷启动入口）+ DSH 原生落地材料（modal vs 面板 UX、profile 全局 vs workspace 作用域）。

## 状态

- 本轮父会话只做只读源码核实，**未跑** verify/test（不证研究结论，只证机制锚点）。
- 题名页保持 `调研中`；定性/实施授权待用户，父会话不越权。
