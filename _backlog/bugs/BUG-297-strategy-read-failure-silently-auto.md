---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-297：项目策略读失败/损坏时静默变成「全自动」——用户看不到设置已经丢了

> 严重级别：P2（次要偏重：策略是「这一次按什么套路跑」的开关，静默回退 auto 会让人按错口径开工，且没有任何提示）｜发现：2026-11-22（E2E 第二轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续找，别管那边怎么修」）。

## 症状

隔离公司实例里：

1. 打开右栏「策略」，把「做什么」设为 `business-software`；盘上 `.dsh-company/startup.json` 写入 `productType: "business-software"`。
2. 把 `startup.json` 覆盖成坏 JSON（`{ this is not json`），刷新页面，再开「策略」：
   - 三个下拉全部显示「自动」；
   - 面板**没有任何**损坏/读取失败提示；
   - 看起来像用户从来没设过策略。
3. 把 `startup.json` 换成一个**目录**（读取必然失败），刷新后同样全「自动」、无提示。

同一面板对**选项文件**（`startup-options.json`）是有显式错误态的（「选项文件读不出来（可能被截断）；下拉暂不可用…」），所以这不是「面板不做错误态」，而是设置文件这一侧漏了。

证据（本轮隔离实例）：`01b-strategy-corrupt.png` / `01c-strategy-unreadable.png`（原型证据目录，gitignored）。

## 运行面

- **面 = client**：`packages/company-pack/src/client/index.ts` 的 `loadStartup`；`startup/startup-store.ts` 的 `StartupFace`；`startup/StrategyPanel.tsx` 的渲染。
- 纯模型侧已有诊断函数，只是没被接上。

## 复现

1. 用隔离 company profile + 临时 workspace 起真实例（`DSH_COMPANY_HOME` 指向临时盘；无需模型）。
2. 打开「策略」，选 `business-software`，确认 `.dsh-company/startup.json` 里是该值。
3. `printf '{ this is not json' > .dsh-company/startup.json`；刷新页面；打开「策略」。
4. 期望：面板明确说「策略文件损坏/读不到，当前按 auto 显示」；实际：三个下拉全是「自动」，无提示。
5. 再用 `rm startup.json && mkdir startup.json` 重复一次（读失败而非解析失败），同样无提示。

## 根因与证据

1. `loadStartup` 用的是**宽松解析**，丢弃诊断：
   - `packages/company-pack/src/client/index.ts:167`：`settings: parseStartupSettings(settingsText)`
   - `parseStartupSettings` 对坏 JSON/坏形状一律返回 `EMPTY_STARTUP_SETTINGS`（`startup-settings.ts:218` 起）。
2. 仓库里已经有**带诊断**的解析器，且注释明确说「损坏单独报，不伪装成用户选择（BUG-123/136）」：
   - `startup-settings.ts:192-216`：`parseStartupSettingsState` 返回 `{ settings, problem: 'corrupt' | 'unsupported' | null }`
   - 但全仓 client 没有调用它（`loadStartup` 未使用）。
3. `StartupFace` 没有 `settingsProblem` 字段（`startup-store.ts:16-23` 只有 `optionsProblem`），所以即使解析器返回了 problem 也无处存、无处渲染。
4. `StrategyPanel` 只处理 `optionsProblem === 'unreadable'`（`StrategyPanel.tsx:181,194`），没有设置文件的错误位。

## 失败类与同类排查

**失败类 = 静默失败（配置读坏被折成「合法 auto」）**。同族：

- 选项文件已经修过（`optionsProblem`，BUG-085 的教训），设置文件这一半没跟上；
- `parseStartupSettingsState` 的注释与 BUG-123/136 说明这个诊断本来就是为这一面写的；
- 同类读面：ledger/catalog/cultivation 的「不可达 ≠ 空」已分（BUG-291/286），startup 设置是剩余缺口；
- 不扫 vendor 面：这是本包 client 的解析接线。

## 修复方案与范围

- **根因修法**：`loadStartup` 改用 `parseStartupSettingsState`；`StartupFace` 增 `settingsProblem`；`StrategyPanel` 增一条错误行（文案 zh/en），区分：
  - 文件缺失/空 = 合法 auto（不报错）；
  - `corrupt` / `unsupported` / 读取失败 = 明确说「当前按 auto 显示，修文件后重开」。
- 读取失败目前折成 `null`，与「文件不存在」同形；如果要区分，需让 `readWorkspaceText` 返回结果态（与 BUG-298 的 eof 面同族），至少先把 `corrupt` 这一半接上。
- **判据**：`StrategyPanel` 的两条 keyless 用例（corrupt / unsupported）+ 一条真页面两态；不把 `settingsProblem` 折成空。
- **不改**：`parseStartupSettings` 的宽松语义（host/旧调用方可能依赖）；选项文件的既有错误态。
- **材料性**：client 公开文案；修复需授权/留痕裁决，本轮不修。

## 已修判定

- `startup.json` 坏 JSON / 未来 schema 时，「策略」面板明确显示损坏（zh/en），不再冒充 auto；
- 文件缺失/空仍是合法 auto，不产生噪声；
- 读失败（目录/权限）与「文件不存在」能区分（或至少明确说读不到，不静默 auto）；
- 单测 + 真页面两态（corrupt / missing）各绿。
