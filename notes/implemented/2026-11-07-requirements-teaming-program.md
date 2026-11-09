# 2026-11-07 · 需求识别/编号落地 + VP-Eng 组队：程序 Note

状态：已交付（2026-11-07；用户批准执行计划 W0–W5，11 张执行卡 + 程序伞卡全部收口）

## 决定

1. **编号只承载身份**：`MR-###`（市场机会）/ `REQ-###`（需求，**任一层**）/ `IF-###`（接口）/ `TC-###`（验证），
   各自一条 append-only 序列、动议内全局唯一；`AC-<REQ号>-<n>` 从属父 REQ。号由 owner 登记条目时取 `max+1`。
2. **层归文档、状态归条目、专业域与验证方归字段**：每份需求文档头声明 `layer`（MRD/StRS/PRD/SyRS/IRS；
   验证计划用 V&V）+ `definition`（`json-ledger` / `headings` / `table-rows` / `none`）。层、状态、
   专业域、验证方都不进号。状态 = 草案 / 生效 / 作废；PRD 生命周期映射（draft→草案，ready/in-dev/accepted→生效，
   withdrawn→作废，deferred→草案）。
3. **追溯由作者写边、索引派生、检查判红**：下游写行首 `traces:`（PRD 另写 `source:`），TC 写 `covers:`；
   矩阵由 `/req check` 派生；缺上游 = 孤儿红、指向空号 = 悬空红、重复定义红、退役词红、覆盖缺口红、
   区间计数断言红。跨动议 `<动议键>:<ID>` v1 不实现（遇 `:` 标未支持）。
4. **强制点 = `/req check <slug>` 操作员命令**（R10）：纯逻辑住 `src/lib/requirements-check.ts`，命令住
   `src/host/commands/req-command.ts`；`/prd check` 管 MRD/PRD 结构，`/req check` 管编号/层/追溯/退役词/计数；
   角色只能引用结果，不自证。
5. **范围 marker + 旧盘豁免**：新动议在 `.dsh-company` 的 meta 写 `编号体系: identity`（可另写 `需求层:`）
   才进入编号检查；无标记的旧动议只读豁免，checker 记 `skipped`，不回溯判红。dev 盘 process-docs 手动迁移 +
   备份；`STATE_FILES` 只补缺、不覆盖用户改版。
6. **VP-Eng 组队三门**：VP-Eng 根会话本来就是 Team Lead（`agentTeam` 投影 = 单成员 `lead`），
   可 `spawn_teammate` 带**研发小队**（成员继承 VP-Eng 组合，是"VP-Eng 带的工程师"，不冒充别的角色）；
   要 CMO/SA/SQA 的真人格/真结论走**命名委托**（`vp_cmo` / `system_architect` / `system_qa`，`maxDepth: 2`）；
   CEO 团队里的 `vp-eng` teammate 受 CEO 的 `vp_cmo maxDepth 1` 限制（D7 不动）。`eng-teaming` 四档决策树 =
   自己做 / 一次性 worker / 命名专家 / 持久小队；SQA 结论只能由 `system_qa` 出、原样保留。

## 输掉的方案

- **旧层前缀 `STR/SYR/IFR`（层进号）**：双号入口；把未定的层序固化进每个号；等于再加前缀族。V1 盲测中
  同时被点名为更硬的先验撞车（`STR→字符串`、`SYR→叙利亚`、`IFR→航空规则`）。
- **状态写成前缀（`TBD-` / `proposal:`）**：ID 随状态变形、状态一改就要重键；改条目状态位。
- **`VP/V/VR` 验证点号**：`VP` 撞角色名 `VP-Eng`（八次失败 #4 的现场）；验证点改为**引用** REQ/IF，
  号由 SQA 用 `TC-###` 发（covers 指向被验对象）。
- **把 CMO/SA/SQA 做成 teammate**：`spawn_teammate` 没有 preset 参数 ⇒ 成员继承 Lead 组合，
  独立人格/独立判断不成立；SQA 的"不通过"会变成 VP-Eng 自说自话。走命名委托。
- **只留 PRD 正文标题、去掉 JSON 账本**：要重写 `/prd check` + 模板 + 测试；保留 JSON 为唯一定义点、
  正文标题改引用（「需求说明：REQ-###」）。
- **全量回扫旧盘**：659 个 `V-` / 71 个 `VP-` / 75 个 `VR-` ⇒ 历史永久红；改 marker + 旧动议豁免。
- **跨动议键 v1 就实现**：键格式未定；先显式标"未支持"，不造第二套规则。
- **并发加锁**：v1 不加锁，靠 Lead 串行分配 + 撞号红兜底，把"可能撞号"写进已知限制。
- **用命名 child 做多轮任务板协作**：命名 child 没有 `send_message`（团队版按成员名寻址）；持久协作只能
  `spawn_teammate`。

## 落地（实现即载体；每卡 1–3 commit）

| 卡 | 落点 | 提交 |
|---|---|---|
| A1 编号合同 | `content/state/process-docs.md`（R1–R10/退役词/范围豁免/并发）、meta 标记、`content/AGENTS.md`、`docs/guides/product-definition.md`、`base-clean`/`company-skeleton` | `40fa060` |
| A2 五层模板 | `content/templates/{mrd,strs,prd,syrs,irs,allocation}.md`（layer+definition；PRD JSON 唯一定义点；allocation `none`） | `2bfdb09` |
| A5 校验器 | `packages/company-pack/src/lib/requirements-check.ts` | `0174e58` |
| A6 命令 | `packages/company-pack/src/host/commands/req-command.ts`、`src/index.ts`、pack README | `c6c3d76` |
| A3 CMO/VP-Eng | cmo persona + `mrd-playbook`（MRD+StRS）、vp-eng persona + `prd-playbook`/`eng-workflow`、共享 `product-definition` | `fbe02aa` |
| A4a SA | system-architect persona + `systems-architecture`（SyRS/IRS/allocation/架构；验证点改引用） | `a23ec20` |
| A4b SQA | system-qa persona + `vv-playbook`（`layer: V&V` + table-rows + covers + L1–L4） | `1eb21e2` |
| A7 迁移 | `STATE_FILES` 加 process-docs；release-smoke 内容清单；`docs/release.md` 升级说明；dev 盘迁移 + 备份 | `33b3273` |
| A8 E2E | SA/SQA 资产（已退役删除） | `961ebf0` |
| B1 组队 | vp-eng `vp_cmo` 行 + `eng-teaming` skill + 手册/delegation/presets/README/board 继承口径修正 + `probes/team/vp-eng-root-lead-probe.mjs` | `1cae832` |
| B2 收口 | `probes/team/vp-eng-teaming-probe.mjs` + 本 Note + D57/D58 + 归档 | 见 W5 收口提交 |

实现面文件：合同/模板 6 + 命令/校验器 2 + 4 个角色内容 + 2 个门禁 + 1 个 bootstrap 种子 + 3 个探针 +
docs 6 处。`checks/INDEX.generated.md` 随新探针重新生成。

## 验证（实跑；红证与绿证都留）

- **V1 词表盲测**（2026-11-07，1 次调用，`standard` preset）：A 组 `MR/REQ/IF/TC/AC` 胜出；记录 =
  [validation-trial](../../_backlog/_archive/research/requirements-identification-numbering/2026-11-07-validation-trial.md)。
- **V2/V4/V11 原型 trial**：lab 重键 16 StR / 33 SyR / 22 IR 无悬空无重复；4/4 负例红；22 IFR 无计数漂移；
  V11 的"摘要表 = 引用、字段锚定行首"两条教训进 A5 spec 回归。
- **A1–A7 keyless**：`pnpm test tests/host`（43 files / 287 tests）+ `pnpm test tests/presets`（50）+
  `tests/client`（332）；**W5 全量**：`pnpm test` 150 files / 1218 tests、`pnpm typecheck`、`pnpm lint`
  （0 warnings / 0 errors）、`pnpm dup`（0 clones）、`pnpm verify` ALL PASS、`pnpm notes:audit`（状态行不符 0）。
  红证：合同/模板缺失、双定义点、checker 判据关掉、命令 skipped 分支、bootstrap 未 seed、SA/SQA 退役号形、
  vp-eng 组队行缺失 —— 每条都先见红再还原绿（见各卡 `## 交付证据`）。
- **A8 五层真跑**（真模型，两轮）：第 1 轮 20min 墙 → 5/6（缺 V&V，SQA 子会话被墙切断）；重跑 1 次
  30min + SA/SQA 并行 → **ALL PASS**：六份文档 + 头全对 + checker 绿（MR 4 / REQ 44 / IF 8 / TC 49）+
  无 final.md + teammate/命名 child 接线正确。两次差异记录在卡上，不写成"稳定"。
- **B2 VP-Eng 包真跑**（真模型，2026-11-07 20:55–21:14，`session-29d0a0bf-9975-403d-a75a-adff4b9bf02c`，
  动议 slug `2026-11-07-recon-bank-autorecon-v3`）→ **ALL PASS**：① `prd-detail` teammate 继承 vp-eng 组合、
  depth 1、parent = 根；② `cmo` / `system-architect` / `system-qa` 三个命名 child 各拿自己 preset、depth 1、
  同一 parent；③ 包产物 8/8 在场（mrd/strs/prd/syrs/irs/vv-plan/sqa-review/vp-eng-package）；④ SQA 裁决词在场且
  包索引点名 SQA；⑤ 无 final.md。观察：VP-Eng 为补齐产物重起过同 preset 子会话（同 preset ×2），接线判据按
  "存在即通过"口径，不误判为失败。
- **CEO 回归**：`product-team-e2e-smoke` → `ALL PASS`（CEO 两件套仍走 team：members=[cmo,vp-eng]、任务板 2 且
  PRD blockedBy MRD；202s）。
- **委派边界**：`delegation-smoke` → `ALL PASS`（activation 回执、child 首帧 `agentPreset`、child 无 Team 工具）。
- **挂载/页面**：`preset-smoke`（6 角色 + 3 子人格）、`probe-smoke` 快档 6/6、`client-load-smoke`、
  `release-smoke`（安装形状 + 首启自举 + 幂等 + 既有盘升级）全 PASS。

## 剩余风险 / 未验

- A8/B2 都是**单轮样本**，不证一般可靠性；`/req check` 的真会话回执在 A8 里被 dev home 的 writer lease
  阻断（宿主 `dataBlocked` 守卫，不是产品红），命令 green 路径由 A6 的 keyless 断言覆盖。
- 跨动议键 `<动议键>:<ID>` 未实现（遇到只标未支持）；并发取号不加锁（Lead 串行 + 撞号红兜底）。
- `需求层` 默认到 PRD；声明 SyRS/IRS/V&V 才查对应层与 TC 覆盖。
- dev profile 的 pack 安装临时改为 `link:`（让新 skill 生效并重建 `lib/`）；`pnpm company` 默认 tarball
  会在下次启动时还原安装形状。
- 旧盘迁移只覆盖 dev 盘（备份 `process-docs.md.bak-2026-11-07`）；其他部署按 `docs/release.md` 的升级说明
  （种子只补缺 + 旧动议 skipped）。

## 上游卡

- 程序伞卡：[requirements-teaming-landing](../../_backlog/_archive/settled_issues/2026-11-07-requirements-teaming-landing.md)
- 执行卡 A1–A8 / B1/B2：[settled_issues](../../_backlog/_archive/settled_issues/README.md) 同批归档。
- 研究题：[requirements-identification-numbering](../../_backlog/_archive/research/requirements-identification-numbering/README.md)、
  [vp-eng-teaming](../../_backlog/_archive/research/vp-eng-teaming/README.md)；执行计划在编号研究材料内。
