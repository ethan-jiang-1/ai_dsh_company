# 数据模型复盘收尾：F1–F10 与 BUG-033

状态：已交付（2026-10-27）
上游 = [数据模型落地复盘后的剩余证据与运维缺口](../../_backlog/_archive/settled_issues/2026-10-27-data-model-review-followup.md)

## 问题

0.3.13 的 12 Gap + R1–R6 已落树，但复盘发现 1 个数据丢失缺陷（BUG-033）、记录摘要冒充全文、presented 重建证据是 fake query、revoke 无真启动注入、business 恢复不含方法层、归档/备份无保留、审计 false 只能手改 JSON、迁移无 fixture、敏感背景无提示，以及 Phase C 的浏览器真场景未跑。

## 决定

1. **BUG-033/F1**：`applyRecordUpdates` 成为纯函数，journal 从旧全文 + revokedAt 推导目标全文；恢复只认 old/target，第三态 conflict 不覆盖。顺带修了 `applyRecordUpdates` 丢失 frontmatter 后空行的缺陷（revoke smoke 抓到）。
2. **F2**：`CultivationRecord.bodyTruncated`；hook 只为 open + 最近 120 条非 open 读全文，其余标摘要；全文读失败计入未展开；面板展开明示“正文只加载了摘要”。
3. **F3**：present-catalog-smoke 改用 vendor `TestSessionQueryEngine` + `SessionStore`（live session）回扫事件；不再用手写 fake query。
4. **F4**：新增 `revoke-recovery-smoke`，在真 tarball home/公司盘/方法层注入两种崩溃态，启动真 host 验证回滚/补完。
5. **F5**：lifecycle business 恢复 fixture 加 `company/methods/`，恢复后断方法文件仍在。
6. **F6**：`/cultivation purge <天数>` 清旧 records-archive；`pruneBundleBackups` 只保留最新 5 份换盘备份；升级日志保持追加（人工清理）。
7. **F7**：`/deliverables audit <final.md> true|false` 写 presented 账本并重生成索引；不再要求手改 JSON。
8. **F8**：`tests/fixtures/bundle-manifest-v1.json` + v2 unsupported 边界演练；真实 v2 schema 未出现，不造猜测。
9. **F9**：`secretLikeFindings` 扫描密钥/令牌样式；创作面在背景写入前明示警告；不自动脱敏。
10. **F10**：`multi-window-banner-smoke` 真浏览器同源两页面触发 instance-guard 横幅；`cultivation-gui-probe --summary` 真浏览器 130 条旧记录 + 坏记录，面板显示未展开/坏记录。

## 输掉的方案

- **journal 存目标全文/哈希 vs 纯函数推导**：推导无需 schema 升级，且与 `updateRecord` 同一实现；目标态仍可精确判定。
- **面板 cap 总数**：会藏旧 open；选择摘要全扫 + open 强制全文。
- **presented 重建继续用 fake query**：接线绿不等于真服务；换 vendor 服务，cold/persisted 路径留边界。
- **真实 SIGKILL 注入**：状态注入覆盖恢复决策，不覆盖进程调度；先记录边界，不做脆弱的时点控制。
- **自动删除升级日志**：日志是审计，保留追加；只对 backups/archive 做显式清理。

## 后果

- F3 仍只证 live session；cold/persisted 回扫未覆盖。
- F4 是“崩溃后状态注入 + 真启动”，不是 revoke 执行中 SIGKILL。
- F8 没有 v2 schema，迁移入口只有 fixture/边界；真实 v2 到来时按此模式补迁移。
- F10 的浏览器 records 场景依赖 dev 公司盘/`--summary`；不是 CI 常驻。
- 多 Host 高可用、Windows/容器仍未验。

## 验证

真跑过（2026-10-27，0.3.14）：

| 命令 | 结果 |
|---|---|
| `pnpm test` | 97 files / 907 tests 全绿 |
| `pnpm verify` | ALL PASS |
| `node checks/smoke/release-smoke.mjs` | ALL PASS（0.3.14） |
| `node checks/smoke/lifecycle-smoke.mjs` | ALL PASS（含 business 方法层恢复、降级） |
| `node checks/smoke/present-catalog-smoke.mjs` | ALL PASS（vendor sessionQuery 重建 true；false 保留） |
| `node checks/smoke/concurrent-home-smoke.mjs` | ALL PASS（一个 writer） |
| `node checks/smoke/revoke-recovery-smoke.mjs` | ALL PASS（真 host 启动回滚/补完两态） |
| `node checks/smoke/client-load-smoke.mjs` | ALL PASS |
| `node checks/smoke/multi-window-banner-smoke.mjs` | ALL PASS（同源两页面横幅） |
| `node probes/browser-visual/cultivation-gui-probe.mjs --summary` | ALL PASS（未展开 11 / 坏记录 1） |

红证：临时把 `recoverPendingRevoke` 的 `isTarget` 改成 `includes('revokedAt:')` → BUG-033 用例红（`expected "conflict", received "rolled-back"`）；还原绿。

## 范围 / 排除

- 范围：F1–F10 的当前行为、测试、文档；BUG-033 已迁 fixed_bugs。
- 排除：cold/persisted presented 重建、真实 SIGKILL 注入、真实 v2 迁移、多 Host 高可用、Windows/容器。
