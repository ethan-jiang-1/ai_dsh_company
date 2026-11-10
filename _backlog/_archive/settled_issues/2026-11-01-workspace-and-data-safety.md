---
status: 已结
opened: 2026-11-01
---

# 推敲：workspace 生命周期与数据安全——选、切、搬、备、删、信任边界

> 立卡：2026-11-01 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：已结（2026-11-01）。workspace 选/切/搬/备/删、lease、登记、v2 身份、seed consent、
> 方法/账本留 host + 导出均有实现与证据；不可信项目边界（恶意 AGENTS、symlink、伪造 consent、危险落点）
> 有 `untrusted-project.spec`。v1 边界：不承诺消除 prompt injection/恶意脚本；`danger-full-access` 下降级约定。
> 去向 = [v2 manifest Note](../../../notes/implemented/2026-11-01-plugin-as-product-v2-manifest.md) + [data-model](../../../docs/contracts/data-model.md)。

## 问题与期望结果

**问题**：workspace 不是“启动参数”四个字。它要能被选择/创建/校验/登记/切换/搬移/备份/恢复/
删除；它的内容会被模型读写；其中有 `bundle.json`、`COMPANY.md`/`AGENTS.md`、导出；
home 里有方法层/账本/秘密；这些面之间的信任边界、可写性、保留责任没有写清。只做“把盘指到
workspace”会在第一次搬家/误删/模型改身份/换机器时坏。

**期望结果**：给出一张可执行的 workspace 生命周期与信任边界合同：
1. workspace 的选择/创建/切换/搬移/删除策略明确（含一安装一 workspace 的边界）；
2. 模型可写面与 host 治理面的边界明确，哪些承诺不能做（防篡改/防删/防注入）；
3. `bundle.json`/导出/手册/方法/账本/秘密的写者、读者、备份、删除责任逐项写清；
4. 搬/删/恢复有步骤与失败提示；不静默建、不静默删、不静默覆盖；
5. 不可信项目内容（AGENTS/skills/symlink/脚本）的支持声明与降级路径写清；
6. 单 writer/并发/多机/共享盘的边界写清。

**本轮判断完成的标志**：伞卡 Q1/Q3 已拍板；本卡「未决问题」已答；候选验收定稿并转
RFC/实施。**本卡不是实施授权。**

## 当前情况

- 研究依据：[信任边界与数据安全](../research/plugin-as-product/2026-11-01-trust-and-data.md)；
  主稿 [§5 数据卡/§6 方案/§10.5–10.6 技术设计](../research/plugin-as-product/2026-11-01-plugin-as-product.md)。
- 现有数据卡（`docs/contracts/data-model.md`）已写“公司盘/方法/账本/会话/凭据/登记”的 owner，但仍是
  “home 公司盘”旧形状；新形状下 `bundle.json` 在 workspace、导出在 workspace、方法/账本留
  home，数据卡要重写。
- 现有 `validateCompanyHome` 拒绝等于/包含 home/OS home/普通文件；但“已存在项目”“符号链接
  “共享盘”“路径大小写”“模型写 manifest”没有完整策略（C）。
- `workspace.create` 要求已存在绝对目录、canonical、同 path 幂等；删除只删登记（C：
  `vendor/dsh/packages/workspace/workspace/src/index.ts`）。
- `bundle.json` 在 workspace 后模型可写；host 只能校验/备份/fail loud（P）。
- 方法层/账本留 home 是 D25/M2 的安全选择；workspace 只放派生导出（P）。
- 多用户/共享盘/多机未验证；v1 单 writer、单 home 一 workspace（P）。

## 未决问题

1. **`bundle.json` 可写边界**：接受“workspace 权威 + host 身份备份 + fail loud”，还是把身份
   权威留 home、workspace 只放副本？前者符合“run bundle 在 workspace”，后者更防篡改；需要拍板。
2. **方法层/账本是否永远留 home？** 若用户要求全搬，先立安全设计（签名/host-only/审批），
   不在本卡偷渡。
3. **已有项目作为 workspace 的支持声明**：v1 是“支持但建议专用盘/只补缺”，还是“明确只支持
   专用盘”？影响 seed 侵入度、手册碰撞、信任声明。
4. **不可信项目**：是否在 README 明确“只建议可信项目/专用盘”？角色会执行项目脚本/读
   AGENTS，产品不能保证 prompt injection 安全。
5. **删除/搬移策略**：workspace 删除只删登记（DSH 语义）还是产品提供“删盘”命令？建议只删
   登记 + 明确“删盘是用户动作”；产品不代删用户项目。
6. **导出签名/校验**：v1 只做派生导出，恢复靠 home 权威；是否要加哈希/签名，后置。
7. **共享盘/多机**：v1 明确不支持，还是做只读/单 writer 支持？建议明确不支持。

## 范围与排除项

**范围**
- workspace 选择/创建/校验/登记/切换/搬移/删除策略；一安装一 workspace 的启动器约束；
- 信任边界表、模型可写面、host 治理面、`bundle.json`/导出/手册/方法/账本/秘密的数据卡；
- 搬 workspace、stale 登记、旧 session cwd、符号链接/不可信项目的失败提示；
- 安全测试（manifest 篡改、consent 伪造、symlink、秘密扫描、日志脱敏）；
- 手册/README 的“workspace/数据/安全”章节（与 [发布与文档卡](./2026-11-01-release-and-docs.md) 共写）。

**排除**
- 多租户/跨机器同步/HA；
- per-role 文件 ACL（roles/owners/签字线仍是 prompt/approval 级）；
- Session 删除 API/物理删会话；
- 共享盘/NFS 的锁语义承诺；
- Windows/容器。

## 方案与取舍

| 选择 | 建议 | 输掉的方案 | 理由 |
|---|---|---|---|
| workspace 数量 | v1 一安装一 workspace | 一安装多 workspace | 方法/账本留 home 才不串；Client active/lease 简单 |
| `bundle.json` | workspace 权威 + home 身份备份 + fail loud | home 权威/workspace 副本 | 符合 run bundle 在 workspace；承认可写 |
| 方法/账本 | 留 home + workspace 只读导出 | 全搬 workspace | D25/M2 安全边界；全搬需新安全设计 |
| 已有项目 | 支持但只补缺 + 确认 + 手册碰撞 | 只支持专用盘 / 静默种入 | 用户要“项目里做事”；不覆盖是底线 |
| 删除 | 只删登记；删盘是用户动作 | 产品代删 | DSH 语义；防误删 |
| 并发 | 单 writer/单机；共享盘不承诺 | 多 writer/共享盘 | 未验证；先诚实 |

## 验收标准

1. **选择/校验**：`--workspace`/env/设置/询问优先级；不存在/文件/不可写/坏符号链接/等于
   home/OS home 各有明确错误；不静默建（`--yes` 才建）。
2. **登记**：boot 时目标 workspace 出现在 DSH 列表；无 Documents 默认盘；登记幂等；无
   registry/headless 不崩。
3. **一安装一 workspace**：同 home 第二 `--workspace` 被拒绝/提示新 home；不会静默塞第二盘。
4. **搬移**：workspace 改名/移动 → 新路径登记；`bundle.json` 跟随；旧 session cwd 仍旧路径
   并提示；不自动改 DSH 存储；stale 登记点名。
5. **身份**：`bundle.json` 损坏/更高版本 → fail loud、保留原文件、恢复备份；模型写坏可诊断；
   不静默重建。
6. **信任边界**：数据卡逐项写 owner/authority/读者/写者/备份/删除；`danger-full-access` 的
   降级声明在场；不把 workspace-write 写成永久安全承诺。
7. **方法/账本**：adopt/audit 仍写 home；workspace 导出是派生；恢复先 home 再导出；导出被改
   不产生第二权威。
8. **不可信内容**：已有 `AGENTS.md`/skills/symlink/脚本的 workspace，seed 不覆盖、symlink 不
   穿出、README 有信任前提；prompt injection 不承诺消除。
9. **秘密/日志**：凭据不进 workspace/导出/tarball；日志脱敏；token 不入库。
10. **红/绿**：manifest 篡改、consent 伪造、symlink、搬移、秘密扫描各有红→还原→绿原话。

## 实施回执（2026-11-01）

- ✅ workspace 解析/登记/一 home 一 workspace：`company-entry-smoke` / `release-smoke` / isolation。
- ✅ `bundle.json` v2 + home 身份备份（创建/升级/迁移）；损坏 fail loud、保留原文件。
- ✅ 方法/账本留 home + `.dsh-company/exports/` 只读导出；治理导出幂等。
- ✅ 搬 home/workspace、stale 登记、rebind 退役、seed consent、symlink 基部 keep 有测试。
- ✅ 不可信项目边界：`untrusted-project.spec`（恶意 AGENTS 不覆盖、symlink 不写穿、伪造 consent/危险落点拒绝）。
- v1 边界：不承诺消除 prompt injection/恶意脚本；`danger-full-access` 下降级约定。

## 关闭条件

- 伞卡 Q1/Q3 已拍板；本卡「未决问题」已答；`## 验收标准` 定稿。
- 下游 RFC/实施申请已提交并记录去向（`rfc` / `implementation` / `用户（日期）`）。
- 满足后写 `可关闭：是`、卡顶补 `> **结论/去向**`，`git mv` 到
  [_archive/settled_issues](./README.md)，更新两边清单。

## 关联

- 伞卡：[插件即产品](2026-11-01-plugin-as-product.md)（Q1/Q3 是前置）
- 研究：[信任/数据](../research/plugin-as-product/2026-11-01-trust-and-data.md)、
  [生命周期](../research/plugin-as-product/2026-11-01-product-lifecycle.md)、
  [主稿 §5/§10.5–10.6](../research/plugin-as-product/2026-11-01-plugin-as-product.md)
- 相邻卡：[产品生命周期](2026-11-01-product-lifecycle.md)、
  [发布与文档](./2026-11-01-release-and-docs.md)
