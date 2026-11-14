---
status: 调查中
severity: P2
opened: 2026-11-14
---

# BUG-170：readCompanyFileAt 对越界 `../` 路径的 missing/unsafe 子类不稳定

> 严重级别：P2（次要）｜发现：2026-11-14｜状态：调查中｜审查：未修（用户指示：抓到 bug 不改，直接报）
>
> **关联**：[探索卡 Round 90](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；`readCompanyFileAt` 是 BUG-156 修复引入的三态读契约，`prd-gate` 以 `missing` 作为旧动议豁免。
> **留痕**：本卡只报不修；复现脚本 = `runtime/tmp/c8c-markdown-shape.mts`。

## 症状

同一个「越出公司盘」的路径，三态子类不一致：

```text
readCompanyFileAt(companyHome, '../outside/secret.md')
  → { kind: 'unsafe', reason: '... outside' }

readCompanyFileAt(companyHome, '../../outside/secret.md')
  → { kind: 'missing' }
```

两者都不是公司盘内可读文件，但第二个返回 `missing`。任何把 `missing` 当「没有这个文件，可豁免」的读者（`prd-gate` 对 meta 就是这样）会在这种 `../` 形状上**跳过而不是拒绝**。文件形状契约测试只钉「零泄漏」，没有钉 subclass，因此矩阵看不出来。

## 根因（假设）

`readCompanyFileAt()` 先 `ensureCompanyRootAt()`，再 `ensureCompanyDirAt(companyHome, dirname(rel))`。`walkCompanyDirs()` 遇到**不存在的段**时 `if (!create) return current` ——提前返回，不再检查后续 `..` 段；因此 `../../outside/secret.md` 的父目录走到一个不存在的中间段就返回，随后 `plainFileProblem()` 看到目标不存在，归为 `missing`；而 `../outside/secret.md` 的父目录段存在/越界，归为 `unsafe`。

## 复现

```sh
node --import tsx/esm runtime/tmp/c8c-markdown-shape.mts
```

看 `read ../outside { kind: 'unsafe' }` 与 `read ../../outside { kind: 'missing' }`。

## 影响 / 失败类

**失败类 6/8（持久化 + 文件形状）**：`missing` 是「可豁免」的安全语义，`unsafe` 是「必须拒绝」；同一类越界路径给出两个不同子类，未来任何新读者都可能把攻击路径当旧动议放行。`prd-gate` 的 `rel` 目前受控，所以不是当前可利用入口，但这是新契约的语义漏洞。

## 修复方向（不在本卡实施）

- `walkCompanyDirs()` 在遇到 `..` 段时先规范化/判定是否越出 root，再做存在性检查；越界统一 `unsafe`；
- 或 `readCompanyFileAt()` 先 `realpath`/`relative` 判 root 前缀，再分 missing/unsafe；
- 契约测试补 `../` / `../../` / `a/../../` 三种形状，断言全部 `unsafe`（或至少同一类）。

## 证据

- `runtime/tmp/c8c-markdown-shape.mts` / `.log`：`../` → unsafe；`../../` → missing。
- 代码：[company-root.ts](../../packages/company-pack/src/host/run-bundle/company-root.ts) 的 `walkCompanyDirs()` / `readCompanyFileAt()`。
