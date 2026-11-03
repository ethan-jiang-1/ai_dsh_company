# 2026-11-03 · Phase 1：语义腐化收口（合同与实现对齐）

状态：implemented（2026-11-03；七维复评 Phase 1）

> 上游 = [第五轮打扫卡](../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round5.md) 的 fresh 复评（D4 B-）。
> 关联 = [Phase 0 发布真伪](./2026-11-03-release-truth-phase0.md)。

## 决定

- **文档跟随实现，不恢复已退役能力**：`workflow-ptc` / `tool-workflow` 在 0.8.0 已从 pack 的 imports /
  preset 行 / patch 三源移除，peer 同版删除；`docs/presets.md`、`delegation.md`、`budget-and-ops.md`、
  `design/architecture.md` 的“第三编排通道 / CEO workflow 行”改为**已退役**，不再教人加行。
- **CEO 不挂 `subagent_fork`**：四个职能角色有；CEO 会话的 team 工具 shadow 续驶控制名，挂了是死行只会骗模型
  （CEO preset 注释已有实证）。`docs/presets.md` 的“全体”行改为“四个职能角色有，CEO 不挂”。
- **v3 没有符号链接**：`docs/project-map.md`、`run/README.md`、`bootstrap.md`、`environments.md` 四处
  “dev 盘/排练场制度件符号链接指回 pack”改为“`content/` 只读 + host 注入；`bundle:init` 只建
  `.dsh-company/`；默认章程/状态首启只补缺”。
- **content/ 是手册/模板/默认章程的 owner**：`docs/presets.md` 的“手册/CHARTER/KB → company-workspace/”
  改为 content/（实例才在 workspace）；`docs/data-model.md` 未改（Phase 2 收）。
- **vendor 路径写全**：`docs/subsystems/*`、`docs/architecture.md`、`docs/web-styling.md` 统一加
  `vendor/dsh/` 前缀（5 份文档 + `client/styles.ts` 头注）。
- **preset 验证表收成指针**：`docs/presets.md` 的分层验证表（含 2026-10-23 日期证据）删掉，完成定义
  只指 `preset-change-definition` skill + tests/README。
- **台账与 CHANGELOG**：D54 的 `（D6）` 错引改为 publish-handoff 指针；D17 补“出厂样例除外”；
  D20 行移到 D19+D21 前；CHANGELOG 删 0.7.2 的维护者过程条目，0.8.2 写成“无用户可见变化”。

## 输掉的方案

- **恢复 workflow 行。** 0.8.0 已按“三源零引用”删 peer；没有使用场景，恢复只会把死行带回来。
- **给 CEO 加 `subagent_fork`。** team 工具 shadow 同名控制面，加了也不可达；文档写清例外比加死行诚实。
- **把 `docs/presets.md` 的验证表改成“最新读数”。** 它会随每次跑漂；owner 是 skill，表只会再造一个家。
- **只改文档不查代码。** 本轮每条都先核 pack 三源/实际 preset 行，再改叙述。

## 验证（实跑，2026-11-03 09:0x +08）

```text
rg -n "workflow-ptc|tool-workflow" docs packages/company-pack/src   # 仅“已退役”叙述
rg -n "subagent_fork" docs                                          # 四个职能角色 + CEO 例外
rg -n "符号链接" docs run                                           # 无“dev 盘制度件符号链接”旧说法
rg -n "companyDash|workspace/\\*\\*|docs/subsystems" docs packages   # 无未加 vendor 前缀的引用
pnpm verify                                                         # ALL PASS 53 门 + 2 无对象
```

## 仍未做（后续阶段）

- `_dist/安装手册.md:140` 仍写包内含 `src/**`（模板已定位，重导/重打需与 0.8.2 产物隔离）。
- `notes/implemented` 4 篇仍以现在时写 `workspace/**`/符号链接骨架（需 banner 或归档）。
- `docs/guides/dev-loop.md` 10 个重定向壳、`docs/index.md` 何时读列、CompanyView 死代码、
  workspace-resolution 直测、tests 类型检查、plain dsh tee。
