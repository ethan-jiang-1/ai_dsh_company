---
status: 调查中
severity: P1
opened: 2026-11-14
---

# BUG-180：walkCompanyDirs 的 `..` 闸只按 `/` 分段，Windows `..\\` 可绕过

> 严重级别：P1（重要）｜发现：2026-11-14｜状态：调查中｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 91](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-170 的 `..` 修复只覆盖 POSIX 分隔符。
> **留痕**：本卡只报不修；证据 = `runtime/tmp/c9d-win-dotdot.log` + 代码；**Windows 实跑未做**（本机 macOS），按 platform 语义判。

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

## 证据

- `runtime/tmp/c9d-win-dotdot.log`：`win32.join` 解析到 `C:\outside\secret.md`；`split('/')` 只有一段。
- 代码：[company-root.ts](../../packages/company-pack/src/host/run-bundle/company-root.ts) 的 `walkCompanyDirs()`。
- 未跑：Windows 实机/CI（本机 macOS）。
