---
status: 已修
severity: P1
opened: 2026-11-23
---

# BUG-342：`readHandbook` 读取 `.dsh-company/overrides/AGENTS.md` 时未做 symlink 与普通文件校验

> 严重级别：P1（重要：`.dsh-company/` 是模型可写面，但 `readHandbook` 直接调 `existsSync` + `readFileSync`，既会跟随 symlink 把工作区外文件注入全局 system prompt，遇到目录还会抛 `EISDIR` 打崩 `apply`）｜发现：2026-11-23｜状态：已修｜审查：agent — 逐条核对已修判定（`readCompanyFile` 拒绝外部/中间段 symlink 与目录并告警回退）
>
> **留痕**：Note [2026-11-23-quality-defenses-bugfix-batch](../../../notes/implemented/2026-11-23-quality-defenses-bugfix-batch.md)（P1 host 安全边界；材料性）。

## 症状

1. [`readHandbook`](../../../packages/company-pack/src/host/prompt/handbook.ts#L34-L51) 在读取 `<workspace>/.dsh-company/overrides/AGENTS.md` 时，直接使用原生 `existsSync(override)` 与 `readFileSync(override, 'utf8')`。
2. 当 `.dsh-company/overrides/AGENTS.md` 是指向工作区外部文件的 symlink（或 `.dsh-company` / `overrides` 为 symlink）时，`readHandbook` 会跟随读取外部文件内容并拼入所有公司角色 Agent 的 `company:handbook` system prompt；当 `.dsh-company/overrides/AGENTS.md` 为目录时，`readFileSync` 直接抛出 `EISDIR`，且 [`registerHandbook`](../../../packages/company-pack/src/host/prompt/handbook.ts#L71) 与 [`index.ts`](../../../packages/company-pack/src/index.ts#L139) 均未 `try/catch`，直接打崩 host 插件 `apply()`。

## 运行面

- **面 = host**：[`packages/company-pack/src/host/prompt/handbook.ts`](../../../packages/company-pack/src/host/prompt/handbook.ts#L34-L75)。

## 复现

```sh
node --input-type=module -e "
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readHandbook } from './packages/company-pack/src/host/prompt/handbook.ts';
const root = mkdtempSync(join(tmpdir(), 'hb-'));
mkdirSync(join(root, 'content'));
writeFileSync(join(root, 'content', 'AGENTS.md'), 'default\n');
writeFileSync(join(root, 'secret.txt'), 'OUTSIDE_SECRET\n');
mkdirSync(join(root, 'ws', '.dsh-company', 'overrides'), { recursive: true });
symlinkSync(join(root, 'secret.txt'), join(root, 'ws', '.dsh-company', 'overrides', 'AGENTS.md'));
console.log(readHandbook(join(root, 'content'), join(root, 'ws')).text);
"
```

实测 `readHandbook` 返回正文中包含 `OUTSIDE_SECRET`；若把该目标换成目录，则直接抛出 `Error: EISDIR: illegal operation on a directory, read`。

## 根因与证据

1. 仓库已在 [`company-root.ts`](../../../packages/company-pack/src/host/run-bundle/company-root.ts#L266-L284) 与 [`safe-file.ts`](../../../packages/company-pack/src/host/fs/safe-file.ts) 收口公司盘读面的 symlink/普通文件/越界不变量（`readCompanyFile` / `readCompanyText`）。
2. `handbook.ts` 早于/独立于 `readCompanyText` 编写，遗漏了向统一安全读面切换。

## 失败类与同类排查

- **失败类**：`host` 模型可写目录读面绕过 `readCompanyFile`（与 `BUG-108/113/122/156` 同族）。
- **同类排查**：[`contracts.ts:38`](../../../packages/company-pack/src/host/prompt/contracts.ts#L38) 与 [`delegation-contracts.ts:115`](../../../packages/company-pack/src/host/prompt/delegation-contracts.ts#L115) 均只读只读的 pack `contentDir`，不读 workspace；`workspace` 侧读 override 只有 `handbook.ts` 一处。

## 修复方案与范围

- **根因修法**：`readHandbook` 读取 `overrides/AGENTS.md` 改走 `readCompanyFile(workspace, `${RUN_BUNDLE_PATHS.overrides}/AGENTS.md`)`；仅当返回 `kind === 'text'` 时采用 override，若为 `unsafe`（symlink/目录/越界/不可读）回退到 pack `content/AGENTS.md` 并在 `registerHandbook` 记录 `logger.warn`（不打崩 `apply()`）。

## 已修判定

- `.dsh-company/overrides/AGENTS.md` 为指向外部文件的 symlink、指向外部的中间 symlink 或目录时，`readHandbook` 拒绝读取并安全回退到 pack 默认 `AGENTS.md`，且给出明确警告/不变量断言；
- 合法普通文件 `overrides/AGENTS.md` 仍正常生效。

## 修复证据

- 改动面：`packages/company-pack/src/host/prompt/handbook.ts`、`tests/host/prompt/handbook.spec.ts`
- 红：`pnpm test tests/host/prompt/handbook.spec.ts` —— 接入修复前 2 failed / 6 passed（外部 symlink 注入、目录抛 `EISDIR`）
- 绿：`pnpm test tests/host/prompt/handbook.spec.ts` —— 8/8 passed（叶子/中间段 symlink 与目录安全回退 pack 手册并 warn）
- 提交：commit 4ee3c49c
