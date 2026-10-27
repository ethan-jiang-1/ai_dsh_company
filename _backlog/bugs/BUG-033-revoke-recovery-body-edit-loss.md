---
status: 修复就绪
severity: P1
opened: 2026-10-27
---

# BUG-033：revoke 崩溃恢复会把“已撤销 + 用户后改正文”的记录回滚成旧全文

> 严重级别：P1（重要）｜发现：2026-10-27｜状态：修复就绪

## 症状

revoke 在“记录已写 revokedAt、方法尚未删除”之间崩溃后，用户若先手动修改该记录正文（frontmatter 仍保留 `revokedAt:`），下次启动的 `recoverPendingRevoke` 会把整条记录回滚成 journal 里的旧全文，用户正文修改丢失。

## 根因（假设）

`recoverPendingRevoke` 判断“记录是否被我们更新过”只用了 `current.text.includes('revokedAt:')`；这无法区分“我们写的 revokedAt”和“用户在我们之后又改了正文”。journal 只存旧全文，没存目标全文/哈希，因此恢复只能选择“回滚旧全文”，而不是“只撤销我们的 frontmatter 改动”。

## 暴露的失败类

跨 store 恢复的**目标态不可判定**：只有旧状态没有新状态，就必然在“外部改动”与“自己的改动”之间二选一。同类问题会出现在任何 pending journal 恢复。

## 复现

1. 用临时公司盘 + 方法层，写一条 adopted 记录并安装方法。
2. 手工模拟“revoke 已改记录、方法未删”：记录加 `revokedAt`，写 `cultivation/.pending-revoke.json`（旧全文）。
3. 再手动改该记录正文（保留 `revokedAt`）。
4. 调 `recoverPendingRevoke` → 记录被 `restoreRecord` 成旧全文，正文修改丢失。

现有 `tests/company/revoke-journal.spec.ts` 只覆盖“第三种形状（无 revokedAt）”→ conflict，未覆盖“有 revokedAt + 正文被改”。

## 修复关联

`packages/company-pack/src/host/revoke-journal.ts`；`packages/company-pack/src/host/cultivation.ts` 的 revoke 写 journal 处。

## 已修判定

- journal 记录**目标全文或可验证哈希**（或在更新后回写 journal）；恢复时只有 `current === old` / `current === target` 才动，其他形状 → conflict 且不覆盖。
- 新增 keyless：有 revokedAt + 正文被外部改 → conflict，文件字节不变；旧/目标两态仍能回滚/补完。
- 现有 revoke/journal/CAS 用例全绿；`pnpm verify` + `pnpm test` 绿。
