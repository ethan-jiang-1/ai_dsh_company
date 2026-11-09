# 2026-11-04 · 减法轮：评估结论与已删清单

状态：implemented（2026-11-04；用户令「全部发现落地、静默自主、步步为营」；预算 = 6 批，已用尽）

> 上游 = 同日 G1–G4 质量轮之后的用户判断：「我们一直在堆东西，完全停不下来」。
> 做法 = 先只读盘点、再一面一批；只减不加；先移后删；每批 `verify` + `test` + 相关 spec。

## 决定

- **减法的靶心不是 docs/门禁，是 notes 的速度。** 7 天窗口实测（135 commit）：notes **+3,550 行 / 70 篇**；
  tests +1,829 行 / 33 文件；src +977；tools +945；checks +91（+1,672/−1,581，**在换不在堆**）；
  docs +44（+628/−584，**在换不在堆**）；probes −184（唯一净减）。
- **本轮实际删**：`bootstrap` 6 个、`tab-icons` 10 个、`bundle-manifest` 7 个、4 文件里 5 个
  **全仓零引用死导出**（`LEGACY_CLIENT_ERRORS_REL` / `ProfileDescriptor` / `runBundlePath` /
  `identityBackupDir` / `identityBackupFor`）。src 净 **+18 / −63 = −45 行**，28 个导出面收窄。
- **设计层同轮追加**：`role-content-plan` **51→35**（探针/闭合接口改指针）、`ui-demo` **147→123**
  （§5 分层归轮 + 命名表退役，历史归 Notes 与 terminology）；两份预算随内容下调。
  加上代码 −45，本轮合计 **−85 行**（不含本 Note）。
- **明确不删（都逐条看过）**：
  - `2026-10-23` 的 12 篇与 `2026-10-16` 的 7 篇：**19/19 都有「决定 + 输掉的方案」**，0 篇纯收据 → 搬去
    `archived/receipts/` 会丢 rationale，不做。
  - 6 门无红证的门禁（`base-clean` / `company-skeleton` / `handbook-budget` / `replay-ui-freshness` /
    `snapshot-index` / `tracked-token`）：逐门读过，**都断言真不变量，0 门可退役**；缺的是红证记录。
  - 15 处源码文本断言：R6-12 已判「client-face 装配面刻意保留（`client-load-smoke` 抓不到同键冲突）、
    CSS/夹具文本属产物契约」；删了会丢真守卫。
  - 113 个零引用导出里剩余的 ~85 个是「只在文件内用」的内部导出，去掉 `export` **零行收益**，本轮不做。
- **下一步的真实刹车**：notes 从「每刀一篇」改为「每轮一篇（批量记录）」；门禁/规则**一进一出**
  （新增任何一条必须先指名替换谁）。这是做法，不是本轮新增的规则。
- **仪器使用审计（同轮追加）**：15 个"只在索引出现"的 smoke/audit 逐个核过——全部有活触发面
  （release / install-lifecycle / scenario-e2e / tool）且至少一处引用，**0 个可退役**；早先的
  "0 引用"是测量口径错（按完整文件名搜且排除 `checks/`）。`checks/smoke` 重复率 0.42%，无抽公共层的必要。
- **收据层清理（同轮追加）**：22 篇 archived receipts 全在 digest 内；预检发现 15 篇仍有入站
  markdown 链接（删了会红 `md-links`），**只删 7 篇零链接原文（438 行）**，15 篇保留；
  digest 改口为「15 在盘 / 7 已删（git 历史保留）」。不重构 archived 链接。
- **研究题收口尝试（同轮追加，已 revert）**：4 个候选（backlog-ux / company-panels-ux /
  ceo-minimal-assembly / multi-user-ux，736 行）实测有 **9 条 archived 入站链接**（8 在
  `_backlog/_archive`、1 在冻结层 `notes/archived`）——删除使 `link-debt` 32→39、
  `notes-archived-links` 红；按计划整批 revert，4 题保留。预检只查活层、漏了归档层
  （本会话第四个口径教训）；不再重试。

## 输掉的方案

- **把 10-23 / 10-16 的 19 篇当收据搬走**：它们不是收据，是带「输掉的方案」的决定；搬走等于删 rationale。
- **退役 6 门无红证门禁**：它们是内容零部署历史、content 随包、手册预算、金样指纹、快照索引、token URL——
  六个真不变量；退役会让对应腐化无声。
- **删 15 处源码文本断言**：装配面与 CSS 契约没有 keyless 行为替身；删了是净损失。
- **全量收窄 113 个零引用导出**：85 个只在文件内用，收 `export` 不改行数、只增加 diff 面；本轮只做有真实清理价值的。

## 验证（实跑）

```text
基线：node tools/notes-audit.mjs --json → 零入链 80 / 死路径 0 / 缺回链 0
      grep 负例留证 checks/gates → 51/57 有红证
      零引用导出扫描（src + tests + tools + checks + probes + snapshots）→ 113；其中全死（仅声明）5
逐批：tsc -b 0 / 相关 spec / pnpm test 142 files 1122 / pnpm verify ALL PASS / lint 0 / dup 0
推送：73b410b / 3197111 / cba7991 / 5a471ed（前三次 SSH 间歇失败，最后一次走 gh HTTPS 凭据）
```

## 边界与触发

- **Phase 5 设计层已做（同轮追加）**：`role-content-plan` 51→35、`ui-demo` 147→123；仍保留
  `architecture` 的通道 D 退役叙述（负知识）与 `roles-isolation` §5（未实施计划）——两者不是历史叙述。
- **门禁红证**：4–5 门可便宜造红（改一个字节 / 加一行），但那是**加**不是减；留给需要时。
- **过程观察**：本轮 push 期间 SSH agent 的可用 key 时有时无（`id_rsa` 被 GitHub 拒；`gh` HTTPS 可用）；
  不是仓库事实，记在这里防下次误判为“没有权限”。
- **取代**：无。这是新增的负知识记录，不取代任何既有 Note。
