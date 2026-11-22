---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-326：316 只翻了回执/错误正文——命令 description/参数 hint 与内部路径错误仍是中文

> 严重级别：P2（表达层合同：en 命令面板仍显示中文 description/hint；部分路径/写 gate 错误仍原样中文）｜发现：2026-11-23（E2E 第六轮）｜状态：已修｜审查：agent — 逐条核对已修判定（元数据无 CJK / 两类错误 messageEn 无 CJK 且保留原文片段）
>
> **留痕**：commit 6964b619（host 元数据 + 错误类，材料性；批次 Note 覆盖）。

## 症状

316 修了 `correct/adopt/reject/verify/revoke/archive/purge/check` 的成功/用法错误回执（`t(zh,en)`），但：

1. **命令 description / input.hint 仍是中文字面量**：
   ```ts
   description: '培养回路：给自己的角色提交纠正、给别的角色提建议、采纳/拒绝/验证/撤回方法（采纳仅目标角色本人）',
   input: { hint: 'correct <期望行为> :: <做法与证据> | suggest <角色> …' },
   ```
   en 命令面板（`/` 菜单）显示中文说明。
2. **dataBlocked** 分支：`blockedCompanyText(blockedReason, '培养')` 仍按中文拼；
3. **内部 `UnsafeCultivationPathError` 捕获**多处直接 `return { text: error.message }`（`:396/:457/:512/:635/:666/:674`），`error.message` 若是中文，en 面板仍中文；
4. **`CompanyWriteBlockedError`** 直接 `error.message`（`:272-273`），写 gate 的中文错误不经过 `t`。

## 运行面

- **面 = host 命令面 + client 命令面板/培养面板**：`packages/company-pack/src/host/cultivation/cultivation.ts` 的注册 description/hint 与内部 catch；`lib/commands/blocked-text.ts`；`run-bundle/write-gate.ts`。
- 数据面 = 命令注册 + 错误 message。

## 复现

1. en 实例打开会话，输入 `/` 打开命令面板，搜 `cultivation`。
2. 期望：description/hint 英文；实际：中文。
3. 造只读/坏路径 workspace，触发内部 `UnsafeCultivationPathError` / `CompanyWriteBlockedError`；en 面板回执中文。

## 根因与证据

- `cultivation.ts:822`：`description` 中文；`:823`：`input.hint` 中文。
- `:203`：`blockedCompanyText(blockedReason, '培养')` 没有 `t`。
- `:272-273`：`CompanyWriteBlockedError` 的 `error.message` 原样。
- `:396,457,512,635,666,674`：内部 `UnsafeCultivationPathError` 的 `error.message` 原样。
- 316 的 diff 只覆盖 `text: t(...)` 的主回执；上述注册/内部错误不在其中。

## 失败类与同类排查

**失败类 = 316 的迁移面只覆盖主回执，注册元数据与内部 catch 漏掉**。同类：

- 成功/用法错误：已翻（316）。
- 命令 description/hint：本卡。
- dataBlocked / 写 gate / 内部路径错误：本卡。
- 不是「用户内容」：这些都是产品文案/错误 message。

## 修复方案与范围

- **根因修法**：命令注册 description/hint 用同一个 `t`；`blockedCompanyText` 接受 `t` 或返回 zh/en 叶子；内部 `CompanyWriteBlockedError`/`UnsafeCultivationPathError` 在抛出点带结构化 code，由命令面按 locale 渲染，不直接透传 message。
- 至少先把注册 description/hint 与 dataBlocked 两条翻掉；内部错误可以按 code 分支。
- **判据**：en 命令面板 description/hint 无中文；en 下 dataBlocked / 只读 / 坏路径错误无中文；zh 不回归。
- **不改**：316 已翻的主回执；命令协议。
- **材料性**：host 文案；修复需授权/留痕裁决，本轮不修。

## 已修判定

- en `/cultivation` 命令 description/hint 全英文；
- en dataBlocked/写 gate/内部路径错误全英文（用户路径/slug 除外）；
- zh 不回归；
- host spec + en 真页面一条。

## 修复证据

- 改动面：`packages/company-pack/src/host/cultivation/cultivation.ts`（描述/hint/停写/错误走 `t`）、`packages/company-pack/src/host/commands/blocked-text.ts`（`blockedCompanyTextPair`）、`packages/company-pack/src/host/cultivation/cultivation-storage.ts`（`messageEn`）、`packages/company-pack/src/host/run-bundle/write-gate.ts`（`messageEn`）、`tests/support/cultivation-harness.ts`（暴露 `definition`）、`tests/host/cultivation/cultivation-command.spec.ts`
- 红：`vitest run tests/host/cultivation/cultivation-command.spec.ts` —— 把 description/hint 改回中文后「en 选择器 ⇒ 无中文」失败
- 绿：`vitest run tests/host/cultivation/cultivation-command.spec.ts` —— 24/24（en 下 description/hint 无 CJK；`UnsafeCultivationPathError.messageEn` 含 `../evil` 且无 CJK；`CompanyWriteBlockedError.messageEn` 含 "writes are paused" 且无 CJK）
- 提交：commit 6964b619
- **边界（不伪造翻译）**：`CompanyWriteBlockedError` 的 `messageEn` 只保证「停写」这句是英文，`reason` 原文（可能是中文）原样保留；这一取舍写进用例注释。
