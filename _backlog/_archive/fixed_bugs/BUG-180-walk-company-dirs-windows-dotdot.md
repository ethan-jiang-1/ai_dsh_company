---
status: 已修
severity: P1
opened: 2026-11-14
---

# BUG-180：walkCompanyDirs 的 `..` 闸只按 `/` 分段，Windows `..\\` 可绕过

> 严重级别：P1（重要）｜发现：2026-11-14｜状态：已修｜审查：agent — 红→绿证据见 `## 修复证据`；同轮八卡留痕 = Note
>
> **关联**：[探索卡 Round 91](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-170 的 `..` 修复只覆盖 POSIX 分隔符。
> **留痕**：Note [2026-11-14-shape-fences-and-gate-parsing.md](../../../notes/implemented/2026-11-14-shape-fences-and-gate-parsing.md)（同轮八卡）；证据 = `runtime/tmp/c9d-win-dotdot.log` + 代码；**Windows 实跑未做**（本机 macOS），按 platform 语义判。

## 症状

`walkCompanyDirs()` 用：

```js
const segments = rel.split('/').filter(Boolean)
if (segments.some(segment => segment === '..')) throw ...
```

Windows 上 `rel` 若来自 `path.join`/Windows 路径，分隔符是 `\`。`path.win32.join('C:\\company', 'deliverables\\..\\..\\outside\\secret.md')`：

```text
joined: C:\outside\secret.md
segments: ["deliverables\\..\\..\\outside\\secret.md"]
```

`segments` 里没有精确的 `..`，闸不命中；`join` 已把路径解析到 companyHome 外。`readCompanyFileAt()` 随后 `plainFileProblem()`：

- 外部目标存在 → `outside` / unsafe（安全）；
- 外部目标**不存在** → `lstat` 先失败，返回 `missing`——而 `missing` 是可豁免语义（`prd-gate` 对 meta 就跳过）。

## 根因（假设）

`walkCompanyDirs()` 只按 POSIX `/` 切段；没有 `path.sep`/`[\\/]+`，也没有先做平台无关的规范化。Windows 下 `..\` 段既不被闸识别，又会被 `path.join` 当分隔符消解。`..` 修复的注释说「越出根」，实际只覆盖 `/`。

## 复现

```sh
cat runtime/tmp/c9d-win-dotdot.log
```

在 Windows 上（未在本机实跑）等价形状：

```text
readCompanyFileAt(companyHome, 'deliverables\\..\\..\\outside\\missing.md')
```

预期会走 `missing`，而不是 `unsafe`；现有 `a/../../outside` 的 POSIX 测试不会抓到。

## 影响 / 失败类

**失败类 6/8（路径形状/持久化）**：这是 BUG-170 的平台上漏。任何在 Windows 上把 `readCompanyFileAt` 的 `missing` 当「旧动议/无文件」豁免的读者，都可能被 `..\` 路径引到公司盘外（外部目标存在时被 `outside` 兜住，缺失时被 `missing` 放过）。严重级按路径安全面定 P1，但需 Windows runner 实跑确认。

## 修复方向（不在本卡实施）

- `segments = rel.split(/[\\/]+/)`；对 `..` 做栈式消解，栈空再遇 `..` 才 unsafe；
- 或入口用 `path.win32`/`path.posix` 按平台规范化后再判；
- 加 Windows CI 形状：`..\outside`、`a\..\..\outside`、存在/缺失两目标。

## 已修判定

```text
`..\` 与 `a\..\..\outside` 按平台无关分隔符同样识别：越界 unsafe、内部消解为盘内路径
POSIX 形状（`../`、`a/../../`）不回归
红证：还原 `split('/')` → `..\` 形状不判（越界折成 missing）
```

判据由 `tests/host/contract/file-shape-agreement.spec.ts` 的 Windows 分隔符用例搭载；Windows 实机未跑（Note 未覆盖轴登记）。

## 修复证据

- 改动面：`packages/company-pack/src/host/run-bundle/company-root.ts`、`tests/host/contract/file-shape-agreement.spec.ts`
- 红：还原只按 / 切 + 不归一分隔符 → `npx vitest run tests/host/contract/file-shape-agreement.spec.ts` 红（..\ 折成 missing）
- 绿：平台无关分隔符 + 入口归一 → `npx vitest run tests/host/contract/file-shape-agreement.spec.ts` 绿（22 passed）
- 提交：commit 8a95fc51

## 证据

- `runtime/tmp/c9d-win-dotdot.log`：`win32.join` 解析到 `C:\outside\secret.md`；`split('/')` 只有一段。
- 代码：[company-root.ts](../../../packages/company-pack/src/host/run-bundle/company-root.ts) 的 `walkCompanyDirs()`。
- 未跑：Windows 实机/CI（本机 macOS）。
