# 2026-10-03 · 布局卡落地：deliverables 的日期、meta 户口与归档家（C1+A1+B1）

状态：已交付（用户 2026-10-03 拍板五决策点：C1 搬迁 / A1 出生带日期 / B1 全覆盖+一致性门禁 / 先分型再定词 / 归档家=共享盘内 / 并步——全部对话在案；同 diff 落地）

## 拍板结果（五决策点）

① **A1 出生带日期**（D2' 追认解锁：CEO 开局读注入真日期建目录，零改名；A2 退役为其注入缺失时的
回退路径）；② **B1 meta 全覆盖 + 一致性观察门禁**（B4 全量渲染降 Phase 2 待触发——渲染器+client
改动+T-3 验收另立项）；③ **先分型再定词**（类型四型 = 决策/生产/诊断/口径问答；结果跨型七词枚举；
落地事件独立多行字段）；④ **归档家 = 共享盘内** `deliverables-archive/<日期>-<slug>/`（判据**跟随扩根**
= T-11 三选一取"跟随"）；⑤ **并步**（判据先行 → pre-flight 排练 → 真迁移 → 验收）。

## 落地件

1. **判据**（`scripts/lib/deliverables.mjs` + `deliverables-check`）：`slugFromDirName`（剥 A1 日期
   前缀）、双根识别（`deliverables/` + `deliverables-archive/`，T-11 跟随扩根）、meta.md 白名单形状
   （T-2）、`onlySlug` 按归一 slug 匹配（T-7 反静默零匹配）、meta 解析/校验（`parseMeta`/`validateMeta`
   + 词表常量）、新观察项 `FINAL_WITHOUT_META`（T-9）/`META_RESULT_PENDING`/`META_LEDGER_MISMATCH`
   （一致性半边）+ 新违规 `META_SHAPE_BAD`。spec +11（改名存活性红绿 = D20 桥延伸到改名的证明：
   present 记老形状路径、盘上归档新路径 ⇒ 身份对上不判红）。
2. **authorship-audit 跟随扩根**：写入者匹配从裸路径升级为**交付物身份**（迁移改名后日志老路径与
   盘上新路径解析到同一身份——写入者不可考 2→0，查实率提升）；版本交叉核对双根扫描 final。
3. **迁移**（`scripts/migration-rehearsal.mjs`，排练/--execute 一体仪器）：**存量 22 话题全部迁入
   `deliverables-archive/<kickoff>-<slug>/`**（git mv 21 + fs mv 1 untracked）+ 每话题生成 meta.md
   （机械字段：slug/kickoff/类型/参与/墙钟/一句话结论——**「结果」留空 = 回填态**，`META_RESULT_PENDING`
   观察项盯守；类型由台账类型列映射，无行话题按 slug 启发式并留提交供复核）。排练态四判据 PASS
   （无日期空白/根清空/视野穿透归档根/墙钟 0.4s）；git 代理日期 ±1 天偏差样本（token-cn-idc/
   token-works：文件 09-29、首次 add 09-30）——精确校准 = E3 会话日志 createdAt，收敛回填时顺手。
4. **文面同 diff**：手册「交付物三态」节（A1 命名 + meta 户口 + 归档家 + 剥前缀查重，净 0 行
   193/195）；CEO skill 合稿步；docs/index.md D20 行（桥延伸说明）。

## 验收（完成定义，真检查全过）

- `pnpm test` 271 全绿（+11）；`pnpm verify` ALL PASS（含 handbook-budget 193/195）。
- 真盘 `deliverables-check`：**违规 0 —— ALL PASS**；观察项 23 = 22×`META_RESULT_PENDING`（待回填）
  + 1×`slug-unledgered`（既有 7 话题无台账行，收敛时补）；`final-without-meta` 0（meta 已齐）。
- 真盘 `authorship-audit`：50 署名不实 / 5 版本过期 = **迁移前既有真实状态，迁移零新增**（身份匹配
  穿透改名——对照迁移前完全一致）；收敛回填时一并处置。
- `deliverables/` 根清空（活跃视野=进行中动议）；22 归档目录时间轴即目录序。

## 留账（下游）

- **22 个 meta 的「结果」回填** = 轮末收敛动作（观察项盯守）；7 个无台账行话题补台账行。
- **B4 全量渲染**（meta→台账聚合 + ledger.ts/LedgerTab）= Phase 2 待触发，另立项。
- D2'(a) 与布局卡的历史耦合（T-6：B1 模板日期口径并入手册「日期口径」同一句）已由 A1 落地消解
  ——kickoff 即出生日期，meta 不再需要占位口径。
