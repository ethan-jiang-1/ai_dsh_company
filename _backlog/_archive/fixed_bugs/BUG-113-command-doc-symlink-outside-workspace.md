---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-113：`/prd` `/req` `/delivery` 通过 deliverables 里的 symlink 读 workspace 外文档（`statSync`/`readFileSync` 跟随）

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C6 / 命令解析）
> **留痕**：Note [2026-11-13-followup-bug-sweep](../../../notes/implemented/2026-11-13-followup-bug-sweep.md)

## 症状

`/prd check` 只把操作员 slug 限定在 deliverables 根，随后 `readFileSync(join(dir,'mrd.md'))` 跟随 symlink。工作区里 `drafts/mrd.md` 指向 workspace 外的文件：

```ts
symlinkSync('/tmp/outside-mrd.md', 'ws/.dsh-company/deliverables/x/drafts/mrd.md')
symlinkSync('/tmp/outside-prd.md', 'ws/.dsh-company/deliverables/x/drafts/prd.md')
/prd check x
→ result success；captured mrd = "# OUTSIDE MRD\n"、prd = "# OUTSIDE PRD\n"
```

`/req` 的 `readIfExists`（`statSync().isFile()`）与 `/delivery` 的文档读取同样跟随 symlink；`resolveDeliverablePath` 只校验 slug/前缀，不看目标 realpath。因此：
- 操作员以为在读公司盘交付物，实际读了 workspace 外文件；
- 模型可写 symlink（workspace 内）即可让检查器读取任意可读文件；某些 checker 的 error 文本会回显文档片段，存在泄露/伪造面。
这与 [BUG-108](BUG-108-catalog-symlink-final-outside.md) 同属「workspace 可写目录里的 symlink 穿透读边界」；本卡是**命令面**。

## 根因（假设）

- `resolveDeliverablePath` 只做 slug 形状 + 相对前缀，不做 `realpath`；`drafts/mrd.md` 本身可以是 symlink。
- `/prd` 直接 `readFileSync`；`/req`/`/delivery` 的 `readIfExists` 用 `statSync`（跟随）而不是 `lstat`。
- 没有「交付物文档必须 realpath 在 company root 内」的判据。

## 暴露的失败类

**路径形状校验 ≠ 目标位置校验**：slug 合法、前缀合法，但最终解析目标在 workspace 外。读面也要 realpath residency；否则 workspace 内的链接可以改变命令读取的对象。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-doc-symlink.mts
```

2026-11-13 输出：

```
result {"kind":"success","text":"PRD 校验通过（x）：1 个机会 / 1 条需求 / 1 条验收。"}
captured {"mrd":"# OUTSIDE MRD\n","prd":"# OUTSIDE PRD\n"}
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md#2026-11-13-修复交接第二轮根因组-s1s6bug-104113)）

- `resolveDeliverablePath` 返回后，对 `drafts/` 下的每个文档做 `lstat`/`realpath`：symlink 或 realpath 不在 company root 内 → 报「交付物文档是 symlink/越界」，不读。
- 或统一用 `readIfExists` 的 `lstat().isFile()` + `realpath` 前缀；`/prd` 的 `readFileSync` 改走同一 reader。
- 加 spec：mrd/prd/sow 等 symlink→外部文件、symlink→内部文件（策略明确）、普通文件；`/prd` `/req` `/delivery` 一致。

## 修复关联

- 发现于 C6 回归扫；与 [BUG-108](BUG-108-catalog-symlink-final-outside.md) 同属 symlink 穿透，但本卡是命令读面。
- 相关：`src/host/commands/deliverable-path.ts`、`prd-command.ts`、`req-command.ts`、`delivery-command.ts`。

## 已修判定

修成：`resolveDeliverablePath` 拒绝 symlink/非目录/越出 company root 的交付物目录；`/prd` `/req` `/delivery` 的 workspace 文档统一走 `readTextInside(companyRoot, …)`（lstat 非 symlink + realpath 在 company root 内）；pack content 规则仍按可信内容读。

- keyless：drafts/mrd+prd 指向 workspace 外 → `/prd` 可读错误拒绝；交付物目录本身 symlink → 拒绝。
- 红证：HEAD 版 prd/deliverable-path → 2 failed；复原全绿。
