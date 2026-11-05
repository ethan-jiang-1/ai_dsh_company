# CMO + VP-Eng PRD：产品定义能力、需求账本与第六角色

状态：已交付（2026-11-05；pack 0.9.0）

## 决定

1. **CMO = 第六个公司角色**（`cmo`，order 6，追加在名册末尾）：市场机会 / 产品定义 / MRD；
   与 VP-Sales 的分工 = 新市场与新产品归 CMO，现有客户 / 销售 / 定价归 VP-Sales。
2. **VP-Eng = PRD 主笔**：接 CMO 的 MRD；MRD/PRD 落同一 slug 的 `drafts/mrd.md` + `drafts/prd.md`；
   `final.md` 仍只由 CEO `present`。
3. **共享能力** = `presets/_shared/skills/product-definition/`（CMO + VP-Eng 显式挂载）：
   产品定义脊柱 + 品类 playbook（**项目制/系统集成**、**硬软一体**）；新品类加 reference，不改公共字段。
4. **PRD = 需求账本**（不是文章）：JSON 头（`prd.slices[]` / `prd.requirements[]`）+ 正文；
   编号 `REQ-###` / `AC-###-#`，状态机 `draft → ready → in-dev → accepted`，DoR/DoD，
   **一 REQ 一任务**；机械校验 = `/prd check <deliverables 目录名>`。
5. **CEO 组队**：`assembling-the-team` 增产品定义动议的选人表——默认 **CMO + VP-Eng**（取证才加
   researcher），不默认叫全员；VP-Sales / COO / CFO 只在动议明确问到时进屋。
6. **编制**（保持 50 人）：CMO 线 3 人（原「市场」1 人升 CMO + 产品 2 人从 VP-Eng 移），
   VP-Sales 7→6，VP-Eng 18→16。

## 输掉的方案

- **CMO 作 VP-Sales 的扩展**：市场机会与现有客户销售的边界会混，且名册/在场板/培养面没有位置。
- **PRD 纯 Markdown 散文**：研发无法分批吃，无法一 REQ 一任务，无稳定编号可追溯。
- **PRD + 独立 `prd.requirements.yaml`**：两文件同步必漂；单文件 JSON 头 + 正文同版本。
- **YAML 头**：pack 不能加运行时依赖（`release-smoke` 硬判 `dependencies === undefined`），
  改用 **JSON 头（YAML 子集）**；模板与 `/prd check` 同源，语义不变。
- **共享 skill 放 `content/` 或每角色复制**：前者混淆手册面，后者是第二份事实；放 `presets/_shared/`，
  两个 preset 显式挂载（`_shared` 无 `agent.cordis.yml`，不是 preset）。
- **`/prd check` 只做 skill 清单 / 只做仓内 check**：前者是 guidance 不可强制，后者用户部署里没有；
  做成 host 命令，随 pack 发布。

## 后果 / 边界

- 角色接线面：`tools/lib/company-roles.mjs`、`converge-rules`、`authorship`、`deliverables`、
  `candidate-scan`、`recovery-scope`、`presence-status`、`RoleBadge` / `styles`、presets 门禁、
  测试与文档。
- `handbook-budget` 门禁改为**按声明文件枚举 preset**（`presets/_shared` 不是 preset，缺声明不崩）。
- `preset-smoke` 的 skill 隔离预期集加入**角色自己声明的共享 skill**（否则共享能力被误判泄漏）。
- 版本 **0.9.0**（新角色/能力，minor）；`market-index.staged.json` 同步；**未发布**。
- 启动次序不受影响：CMO 不改变 boot 链；构建缓存边界不变（缓存只在安装前）。

## 验证（实跑，2026-11-05）

- `pnpm verify` ALL PASS；`pnpm test` **145 files / 1140 tests**；`pnpm typecheck` 通过。
- `preset-smoke`：**6 个角色 + researcher 全部可挂载**（共享 skill 预期集按声明目录修正后）。
- 0.9.0 dev 窗口（`--rebuild` 安装 0.9.0）boot **16.9s**（含重建 + 安装）；`cdp-probe` 9 页签、
  tabFailures 0、console/exceptions 零。
- `/prd check`：单测覆盖合法一对、REQ 重号、来源不存在、AC 缺 then、状态无 changeLog、依赖环、
  slice 断链、dataBlocked、缺文件、成功回执。
- `pnpm release --verify`：见发布回执（本 Note 落账后由 release 记录）。
- **未跑**：真实 CEO+CMO+VP-Eng 产品动议（需真模型多轮 spawn，成本/时间超本轮；结构面由
  `/prd check` + preset-smoke 覆盖；行为场景已写进 [product-definition 指南](../../docs/guides/product-definition.md)）。

## 事实落点

`presets/cmo/`、`presets/_shared/skills/product-definition/`、`presets/vp-eng/skills/prd-playbook/`、
`presets/ceo/skills/assembling-the-team/`、`content/templates/{mrd,prd}.md`、
`src/host/prd-command.ts`、`src/lib/prd-check.ts`、`docs/guides/product-definition.md`。
