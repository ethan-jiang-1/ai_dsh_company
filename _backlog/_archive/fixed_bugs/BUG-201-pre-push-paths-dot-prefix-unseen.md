---
status: 已修
severity: P2
opened: 2026-11-16
---

# BUG-201：pre-push `--paths` 不规范化 `./` 前缀，合法路径被判未分类且不触发 lane

> 严重级别：P2（次要）｜发现：2026-11-16｜状态：已修｜修复：2026-11-16｜审查：agent（独立盲审）— 2 blocker（pre-push 非 ASCII 路径被 git C-quote 误判「未分类」；归档 ×1912 与修复提交 ×1924 不符）已修复；建议 S1–S5 处置（尾注标签、审查落盘、passed 数校正、`--paths` 不支持项、docs/testing.md 合同行）
>
> **关联**：[探索卡 Round 93](../settled_issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-186 的新 `--paths` 入口（`checks/pre-push-surfaces.mjs`）。
> **留痕**：Note [2026-11-16-guard-surfaces-not-samples.md](../../../notes/implemented/2026-11-16-guard-surfaces-not-samples.md)（本批共用）。

## 症状

新入口 `--paths` 直接按逗号切分并 `trim`，不做路径规范化。带 `./` 前缀的合法仓库路径不会被 `SURFACE_RULES` 的锚定 glob 命中：

```sh
node checks/pre-push-surfaces.mjs --dry-run --paths ./packages/company-pack/src/lib/presence/presence.ts
```

输出「未分类改动面……」，然后 `exit=0`；同一路径去掉 `./` 则正确打印 `→ replay`。维护者从 shell 补全/`git status` 复制路径时常带 `./`，会得到「没有 lane」的假阴性。

## 运行面

tooling / pre-push `--paths` 入口；不是产品运行时。

## 复现

```sh
node checks/pre-push-surfaces.mjs --dry-run --paths ./packages/company-pack/src/lib/presence/presence.ts
node checks/pre-push-surfaces.mjs --dry-run --paths packages/company-pack/src/lib/presence/presence.ts
```

第一条：`未分类……` + `本次未触发面级检查` + `exit=0`；第二条：`→ replay`。日志 = `runtime/tmp/c11/paths-dot-prefix.log`。

## 根因与证据

- **根因**：`valueOf('--paths').split(',').map(path => path.trim())` 只去空白；没有 `./` 归一、没有 `path.posix.normalize`，也没有 Windows 反斜杠归一。`globToRegExp` 是锚定匹配，`./` 开头必然不中。
- **确认**：两条命令的输出与退出码对照。
- **影响**：`--paths` 是 2026-11-16 修复批新增的手动预检入口；它的输出被用来判断“改这个面该跑什么”，假阴性会让人漏跑 lane。

## 失败类与同类排查

**失败类 = 配置组合**（路径入口的归一化缺失）。

同类：`--paths` 的逗号切分对含逗号的合法文件名也会拆错（本仓当前没有）；`pre-push` 的 stdin 路径来自 git，天然规范，不受影响。`selectSurfaces` 本身也不归一（调用方责任）；新入口应负责。

## 修复方案与范围

- `--paths` 归一：`replace(/^\.\//,'')` + `posix.normalize` + 反斜杠转 `/`；空段过滤；负例 = `./` 与无反斜杠两种写法结果一致。
- 可选：`--paths` 与 `selectSurfaces` 的契约写进头注，避免下一个消费者再踩。
- 明确不改：`SURFACE_RULES` 的 glob 语义与 stdin 取范围。

## 已修判定

`--dry-run --paths ./packages/company-pack/src/lib/presence/presence.ts` 与去掉 `./` 的输出一致（`→ replay`）；`--paths .\packages\...` 在 Windows 语义下同样命中；含逗号的路径不再被拆（或显式拒绝并说明）。

## 修复证据

- 改动面：`checks/pre-push-surfaces.mjs`、`tests/checks/pre-push-surfaces.test.mjs`
- 红：`pnpm test:checks`（`./` 前缀用例：修复前未分类、无反斜杠命中）
- 绿：`pnpm test:checks`（10 PASS；`./` 与反斜杠都命中 replay）
- 提交：commit 34f84fd2
