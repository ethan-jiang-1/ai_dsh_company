---
status: 已结
opened: 2026-10-27
---

# 推敲：数据模型落地复盘后的剩余证据与运维缺口

> 立卡：2026-10-27 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：做；F1/BUG-033 已修迁 fixed_bugs，F2–F10 落 [Review follow-up Note](../../../notes/implemented/2026-10-27-data-model-review-followup.md)。

**问题与期望结果：** 0.3.13 的代码面已收口，但复盘发现“实现正确”不等于“证据与运维合同完整”：还有 1 个数据丢失缺陷、2 个 UI/证据真实性缺口、1 个备份证据缺口、1 个保留/删除缺口，以及审计命令、迁移演练、敏感摘录三个小口。期望按 F1–F9 收口，而不是把边界当完成。

**当前情况：** `git` 干净且与 origin 同步（`d034a0b`）；`pnpm test` 97 files / 898 tests、`pnpm verify`、release/lifecycle/concurrent/present/isolation/upgrade/client-load 均实跑通过。复盘仍发现下表问题。

**未决问题：** F2 的“摘要记录”如何向用户标明正文不完整；F3 真 sessionQuery 重放要不要起持久化服务；F4 真实崩溃注入用 kill 还是子进程；F6 的保留策略（天数/大小/显式 purge）。

**下一步：** Phase A 先修 F1/F2，再补 F3/F4/F5 证据；Phase B 做 F6/F7/F8；F9 视敏感需求。

## 范围与排除项

- 范围：数据模型的证据真实性、记录展示诚实性、保留/审计/迁移的可操作性。
- 排除：多 Host 高可用、跨机器同步、方法层迁 home 级、Windows/容器（仍为明示未验）。

## F 账

| # | 发现 | 严重 | 证据 |
|---|---|---|---|
| F1 | revoke 恢复会把“已撤销 + 用户后改正文”回滚成旧全文 | 高 | 已修：[BUG-033](../fixed_bugs/BUG-033-revoke-recovery-body-edit-loss.md) |
| F2 | 非 open 记录只读 60 行摘要，但面板展开仍把截断 body 当全文；全文读失败也不计入未展开 | 中 | 已修：`summaryOnly`/`bodyTruncated` + 全文失败计数 + 面板明示 |
| F3 | presented 重建 smoke 的 `sessionQuery` 是 fake（真实 vendor 事件 + 假查询） | 中 | 已换 vendor `sessionQuery` + `SessionStore` live session；cold/persisted 边界保留 |
| F4 | revoke 崩溃恢复只有单元测试，没有真进程 kill/重启注入 | 中 | 已加真 host 启动注入 smoke；SIGKILL 时点仍为边界 |
| F5 | business 恢复 smoke 不含方法层（`company-cultivation/`） | 中 | 已加 fixture + 恢复断言 |
| F6 | records-archive、`bundle.json.bak-*`、升级日志无保留/清理策略 | 中 | 已加 purge + 备份保留 5 份；日志追加（人工清理） |
| F7 | `presented=false` 审计没有命令/UI，只能手改 JSON | 中低 | 已加 `/deliverables audit` |
| F8 | 版本迁移只有 fail-loud，没有 v1→v2 演练/夹具 | 中低 | 已加 v1 fixture + v2 unsupported 边界；真实 v2 未出现 |
| F9 | 培养背景 `contexts` 是会话摘录，可能带秘密；只有 UI 提示 | 低 | 已加 secret-like 扫描 + 创作面警告 |

## F10（Phase C）

- 已加 `multi-window-banner-smoke`（真浏览器同源两页面横幅）与 `cultivation-gui-probe --summary`（真浏览器 records 未展开/坏记录）。

## 方案与取舍

- F1：journal 存目标全文或哈希，恢复只认 old/target；第三种形状 conflict。**先修**。
- F2：记录对象加 `summaryOnly`/`bodyTruncated`，面板展开时明说“只读摘要”；全文失败计入未展开。**先修**。
- F3：加一个真 `sessionQuery`/持久化会话的重建 smoke；保留现有 fake 作为接线层测试，不冒充真日志。
- F4：用子进程写 pending 后 `SIGKILL`，再启动/恢复；至少覆盖“方法在/方法不在”两态。
- F5：lifecycle restore 增加一条方法文件与记录，恢复后断言方法可用/记录状态。
- F6：`cultivation archive` 增 `--purge` 或独立 retention 命令；对 `bundle.json.bak-*` 与升级日志定“保留 N 份/不自动删”的明确合同。
- F7：加 `/deliverables audit <path> true|false`（人命令）或面板按钮；不要求用户手改 JSON。
- F8：加 v1 fixture + 迁移函数/演练测试；没有 v2 就先把“迁移入口/失败语义”测出来，不空喊。
- F9：至少加 secret-like 扫描/提示，或在记录写入时对 contexts 做脱敏提示；不自动上传。

## 验收标准

- [ ] F1：BUG-033 已修判定满足；正文被外部改 ⇒ conflict 且字节不变。
- [ ] F2：摘要记录展开明确“不完整”；全文失败计入未展开；面板/ hook 测试。
- [ ] F3：真 sessionQuery/持久化重建 smoke 绿，fake 仍作接线测试。
- [ ] F4：子进程 kill 注入两态恢复绿。
- [ ] F5：business 恢复含方法层断言。
- [ ] F6：保留/清理合同 + 命令/测试。
- [ ] F7：false 审计有第一入口，不要求手改 JSON。
- [ ] F8：迁移入口有 fixture/演练。
- [ ] F9：敏感摘录有明确处理。
- [ ] `pnpm verify` + `pnpm test` + 相关 smoke 全绿。
