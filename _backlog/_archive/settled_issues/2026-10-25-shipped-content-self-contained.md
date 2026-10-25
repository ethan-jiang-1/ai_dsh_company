---
status: 已结
opened: 2026-10-25
---

# 推敲：出厂内容自足（注入给角色的文字不再假设仓库）

> 立卡：2026-10-25 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：做；去向 = `notes/implemented/2026-10-25-installed-shape-self-sufficient.md`（与卡 4 合并）

**问题与期望结果：** 公司手册和角色 skill 是每个成员会话的注入内容，但里面大量引用维护者仓库的 `../docs/*`、`checks/`、`tools/`、`runtime/`、`snapshots/`。装到别人的 home 后这些路径不存在，角色会按不存在的指令行动。期望：新装公司在没有本仓库的机器上，注入内容里的每条指令都能执行，或明确标成“非注入的维护者附录”。

**当前情况：**
- 手册（[AGENTS.md](../../../packages/company-pack/workspace/AGENTS.md)）第 23/30/74/77/99/150 行附近引用 `../docs/*`、`checks/audit/*`、`snapshots/README.md`、`runtime/rehearsal-workspace/`。
- 13/14 份 skill 结尾写“可机械核对的部分归仓库的门禁/审计脚本”；CEO chairing skill 直接写 `node tools/converge.mjs`。
- 模板（[meta.md](../../../packages/company-pack/workspace/templates/meta.md)）把词表指向 `tools/lib/deliverables.mjs`。
- 现有 `md-links` 门禁把 pack 骨架排除、只校验 dev 盘那份（[markdown-links.mjs](../../../tools/lib/markdown-links.mjs)），所以安装形状的悬空链接在结构上不可见。
- `handbook-smoke` 只证明注入基线，不证明链接可解析。

**未决问题：**
- Q2 的 operator 模型：删掉维护者动作、改写成人可执行步骤，还是把审计/收敛工具产品化随包走？
- 哪些链接是“部署相对”的合理引用（例如 `kb/...`），哪些是仓库专属（`../docs`、`checks/`）？
- 维护者说明放哪：仓库 docs 还是 workspace 里但不注入的 README？

**下一步：** 等 Q2；做一次“出厂内容引用清单”（逐文件、逐链接分类 keep/inline/remove/move）；写 RFC；先立门禁再见红。

## 范围与排除项
- 范围：`packages/company-pack/workspace/**` 与 `presets/**/skills/**` 的 Markdown；新“安装形状”链接门禁；相关合同/指南。
- 排除：角色行为重写、preset 组合变更、client UI 文案（另卡）。

## 已知与未决
- 已知：手册是首帧注入，不能把维护者附录留在同一文件里。
- 未决：operator 动作里哪些必须产品化（见卡 4），哪些可以写成手动 runbook。

## 方案与取舍
- A 全部内联/改写，不引用仓库（推荐）：注入内容自足；代价是维护成本。
- B 把仓库工具随包发：角色可跑，但要求 Node/依赖，且把开发工具变成产品面。
- C 保留引用但标“非注入附录”：需要拆文件，且角色仍可能读到；不推荐当主方案。

## 验收标准

（初稿；RFC 时定稿。）

- 新门禁 `shipped-links` 以“安装读者”视角解析 `workspace/` 与 `presets/` 的 Markdown：`..` 不得穿出 workspace，`checks/`、`tools/`、`runtime/`、`snapshots/` 等仓库路径为红。
- 负例：往一份 skill 加 `../docs/release.md` → 红；还原 → 绿。
- `handbook-smoke`、`preset-smoke` 仍绿；release tarball 扫描无仓库专属引用（或全部在非注入文件）。
- 人工走查：手册 + 14 份 skill + 模板，逐条能执行或明确标“维护者”。

## 关闭条件
- Q2 已决；RFC 已批；门禁与人工走查完成；卡顶写结论与去向。

## 裁决（2026-10-25）

- Q2 = 不同公司各自部署。operator 动作优先产品化（卡 4 的 catalog/present）；其余维护者脚本引用改写成“操作员 runbook”，不再出现在注入内容里。
- 去向：`notes/implemented/2026-10-25-installed-shape-self-sufficient.md`（与卡 4 合并）。
