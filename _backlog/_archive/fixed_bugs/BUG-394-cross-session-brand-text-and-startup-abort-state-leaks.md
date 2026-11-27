---
status: 已修
severity: P1
opened: 2026-11-27
---

# BUG-394：切工作区/切会话四重状态滞留——品牌词标、`useWorkspaceText`、策略加载 `AbortError` 吞并及局部错误残留

> 严重级别：P1（跨工作区与会话串味：切到无 `company.md` 的工作区时品牌仍残留前盘名称；切换会话瞬间 `DeliverablesTab`/`LedgerTab` 保留前盘路径导致错误寻址；策略读中止被折算为损坏告警覆盖全局 store 并跨会话留存错误提示）｜发现：2026-11-27｜状态：已修｜审查：待本批收口独立盲审
>
> **留痕**：commit `e2337ab8`（批次 392..398 顺位 2：品牌回落、`useWorkspaceText` 切盘复位、`loadStartup` abort 守卫与 `StrategyPanel` 会话隔离）

## 症状

1. **跨 `cwd` 切工作区品牌名称滞留**（Chromium 实测 `G1_multi_cwd_fallback_brand`）：工作区 A 配有 `.dsh-company/kb/company.md`（`productName: NovaCorp`），切入没有 `company.md` 的工作区 B（或普通目录）的会话后，侧栏左上角品牌仍一直显示 `NovaCorp`，不会回落出厂词标（`DSH 梦之队` / `DSH Dream Team`）；
2. **`useWorkspaceText` 切会话滞留前盘文本**（复现用例 `G6`）：停留在 `档案 -> 成品` 或 `台账` 时切换会话/工作区，在新会话异步读取完成前，画面仍展示前一个工作区的 `ready` 清单，此时点击「打开」会把前盘文件路径配对当前新 `sessionId` 发送；
3. **策略 `loadStartup` 中止覆写全局 store & `StrategyPanel` 切会话留存报错**（复现用例 `H4-A`、`H4-B`）：
   - 会话切换或卸载触发 `AbortController.abort()` 时，底层文件读闭包吞掉 `AbortError` 折成 `{ ok: false }`，而 `loadStartup` 未检查 `signal.aborted`，直接将 `{ optionsProblem: 'unreadable' }` 写回共享 `startupStore`；
   - 在 `StrategyPanel` 触发一次保存失败 `error` 后切到另一个 `sessionId`，局部 `error` 状态未随 `sessionId` 清除，直接在新会话顶部显示上一会话的保存失败报错（`StrategyRow` `draft` 在两会话 `row.value` 均为 `null` 时同样不清理未提交输入）。

## 运行面

- **面 = client**：
  - [company-identity.ts](../../../packages/company-pack/src/client/data/company-identity.ts#L81-L94)（`applyCompanyIdentityRead` 在 `!result.ok` / `eof === false` / `parsed === null` 时调用 `resetCompanyIdentity()`）与 [index.ts](../../../packages/company-pack/src/client/index.ts#L375-L404)（无目标或非 abort 读取失败复位出厂身份）；
  - [workspace-text.ts](../../../packages/company-pack/src/client/data/workspace-text.ts#L37-L68)（`sessionId` 变化渲染期同步将 `state` 重置为 `{ status: 'loading' }`）；
  - [startup-handlers.ts](../../../packages/company-pack/src/client/startup/startup-handlers.ts#L50-L72)（`loadStartup` 读取前后与写入前检查 `signal.aborted`）；
  - [StrategyPanel.tsx](../../../packages/company-pack/src/client/startup/StrategyPanel.tsx#L90-L185)（`errorState` 绑定 `sessionId` 且 `<StrategyRow>` key 包含 `sessionId`）。

## 复现

```sh
pnpm vitest run --config runtime/tmp/ux-audit-r2/vitest.tmp.config.ts
bash -c 'source run/env.sh && node runtime/tmp/ux-audit-r2/round2-deep-audit.mjs'
```

- 实测 `[BUG_CANDIDATE] G1_multi_cwd_fallback_brand — wsBBrand="NovaCorp | ..."`（在真实 Chromium 切进 `workspace-b` 会话后仍保留 `NovaCorp`）；
- 白盒用例 `G1`、`G6`、`H4-A`、`H4-B` 全部复现证实。

## 根因与证据

1. [company-identity.ts](../../../packages/company-pack/src/client/data/company-identity.ts#L84-L86) 失败/坏文件分支直接 `return false` 保留上一份 `current`，导致从公司 A 切入普通盘或公司 B 时保留上一份部署名称。
2. [workspace-text.ts](../../../packages/company-pack/src/client/data/workspace-text.ts#L45-L58) 的 `useEffect` 在 `load()` 完成前未先把旧会话的 `state` 清回 `'loading'`。
3. [startup-handlers.ts](../../../packages/company-pack/src/client/startup/startup-handlers.ts#L52-L59) 未判 `signal.aborted`；同时 [StrategyPanel.tsx](../../../packages/company-pack/src/client/startup/StrategyPanel.tsx#L164-L179) 对跨会话共用实例未按 `sessionId` 重置 `error` 与未保存 `draft`。

## 失败类与同类排查

- **失败类**：组件或模块级缓存以「新会话/新工作区挂载后会自行覆盖」为假设，忽略失败回落（identity 缺失）、异步加载空窗（`useWorkspaceText`）、取消竞态（`AbortError`）以及局部 UI 状态随 `sessionId` 重置。
- **同类排查**：`use-company-data.ts` 随 `sessionId` 重置流错误；`CultivationCompose` 已在 [CultivationBoard.tsx](../../../packages/company-pack/src/client/cultivation/CultivationBoard.tsx#L121) 绑 `key={`${currentSessionId ?? ''}:${viewer}`}`。

## 已修判定

- 切换目标工作区身份读取失败或无效时重置为出厂身份（`FALLBACK_IDENTITY`）；
- `useWorkspaceText` 在 `sessionId` 变化且请求未完成前清除上一会话文本；
- `loadStartup` 在写入 `startupStore` 前检查 `signal.aborted`，并在 `StrategyPanel` 随 `sessionId` 清除 `error` 与未保存 `draft`。

## 修复证据

- 改动面：`packages/company-pack/src/client/data/company-identity.ts`、`packages/company-pack/src/client/index.ts`、`packages/company-pack/src/client/data/workspace-text.ts`、`packages/company-pack/src/client/startup/startup-handlers.ts`、`packages/company-pack/src/client/startup/StrategyPanel.tsx`、`tests/client/ui/brand.spec.ts`、`tests/client/data/workspace-text.spec.ts`、`tests/client/startup/startup-handlers.spec.ts`、`tests/client/startup/strategy-panel-input.spec.ts`
- 红：`pnpm test tests/client/ui/brand.spec.ts tests/client/data/workspace-text.spec.ts tests/client/startup/startup-handlers.spec.ts tests/client/startup/strategy-panel-input.spec.ts`（修前 4 个文件新增 BUG-394 负例均红：品牌保留 `NovaCorp`、切会话仍见 `前盘 deliverables/old.md`、`optionsProblem` 被写为 `'unreadable'`、切会话仍留 `前次保存失败` 与未保存 `wiki` 草稿）
- 绿：`pnpm test tests/client/ui/brand.spec.ts tests/client/data/workspace-text.spec.ts tests/client/startup/startup-handlers.spec.ts tests/client/startup/strategy-panel-input.spec.ts`（4 files, 19/19 passed）
- 提交：commit e2337ab8
