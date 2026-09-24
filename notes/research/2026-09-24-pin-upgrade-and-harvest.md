# 2026-09-24 · 基座轮：升 pin dsh-v0.1.5-rc.2 → dsh-v0.1.7-rc.1 + 能力收割审计

状态：搁置（2026-09-24 晚用户改向：驾驶舱·人机协作优先，升 pin 挪出主线——文件经用户手动移入研究层；复活条件 = 需要新基座的条目出现或用户重新拍板；增量证据 = 同目录 dsh-upstream-delta）

## 问题

上游已出 6 个新 tag（rc.3 → 0.1.7-rc.1，远端已核实），升 pin 触发条件早已满足（触发型登记），
基座债持续累积；且搁置池至少 3 条（自主节律 / 并行快捷派活 / 消息级动态流）的复活条件就是
"上游 seam"——升级即复查窗口。用户 2026-09-24 晚裁决：**增量报告确认风险后升 dsh-v0.1.7-rc.1**。

## 方案

1. `node scripts/sync-dsh.mjs --pin dsh-v0.1.7-rc.1`：vendor 换 tag + AGENTS.md 簿记 + 兼容矩阵加列。
2. 按 [release.md](../../docs/release.md) 升 pin 程序全跑：typecheck / release-smoke / replay-smoke
   （快照漂移按 [guides/dev-loop §9.1](../../docs/guides/dev-loop.md) 判据档处置）/
   delegation-smoke（[delegation.md](../../docs/delegation.md) §4.4 边界复核）。
3. 流程合同对 vendor 重校：AGENTS.md 纪律表所引 vendor 原文（Conventions / testing.md /
   `.agents/notes/README.md` 等）是否有变——外部参考显示 rc.2 之后上游有 0008 复盘（Note 创建标准
   收窄为"持久决定理由"，机械/局部编辑显式豁免），需对照钉住新 tag 后的原文。
4. **搁置池五条逐条复活判定**（报告 + 新 tag 源码复核），结论落 ROADMAP：复活项移队列、未复活项
   留池更新依据。
5. **能力收割审计清单**落本 RFC 附录（每条：能力 / 证据 SHA / 对本 pack 的用途 / 建议立项与否）——
   只出清单与判定，采用各自立项，不与升级混在一轮。

## 前置（未满足不开工）

上游增量研究报告（后台子代理在飞：rc.2..0.1.7-rc.1 全量 diff + 搁置池五问 + 可收割清单 + 升级
风险清单）落 `notes/research/2026-09-24-dsh-upstream-delta.md` 后，本 RFC 补全 §风险与搁置池
复查输入；报告结论与"升 rc.1"裁决冲突时（如重大破坏性变更）回来重裁，不硬升。

## 输掉的方案

- **等正式版再升**：差距越滚越大，且 rc 系已是上游事实稳定线（当前钉的 rc.2 同为 rc）；复活复查
  也顺延——输给"债越早清越便宜"。
- **暂不升、先做价值线**：replay 快照与 client 面都会录两遍/改两遍，返工成本显性；输给顺序。
- **逐 tag 分批升（每 tag 验一次）**：6 次全程序对单人维护者是纯开销，中间 tag 无独立价值；
  输给"一步到位 + 报告先行"。

## 验收

- `pnpm verify` + `pnpm test` 全绿；release-smoke 全绿；vendor-pin 门禁指新 tag 且 vendor-clean
  零改动；兼容矩阵含 0.1.7-rc.1 列、AGENTS.md 簿记同 diff 更新。
- 搁置池五条与审计清单逐条有归宿（ROADMAP / 本 RFC 附录 / 新立项）。
- replay 快照若因上游行为漂移：按 §9.1 处置并记录（重录或 presence 档），不留未解释的红。

## 风险

peers 面变化、client 插件 API 变化、preset 行 schema 变化、录制格式变化——以报告 §风险清单为准
（前置）；升级中途可回退（vendor 钉 SHA + 单 commit revert）。
