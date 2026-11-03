# 测试树层次化：tests/harness 按关切分五组

状态：implemented（2026-11-03 第六轮 D/E 批收尾）
上游 = [第六轮七维打扫卡](../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round6.md) ·
材料 = [第七维审计](../../_backlog/_archive/research/repo-hygiene-round6/2026-11-03-seven-dimension-audit-round6.md)（R6-10）

## 决定

`tests/harness/` 从 54 个平铺 spec 改为**五个关切目录**（与 `tests/client` 镜像 `src/client` 同一做法）：

| 目录 | 放什么 | 数量 |
|---|---|---|
| `repo/` | 仓库/发布/包形状/导航/链接/分层等**不变量**（repository-layout、pack-*、src-layering、skip-budget、install-manual…） | 24 |
| `tools/` | `tools/lib/*.mjs` 纯逻辑判据（audit-verdict、converge-rules、notes-audit、workspace-oracle…） | 11 |
| `session/` | 会话日志、诊断、探针驱动（session-log/diagnose、orient、probe-*、replay-*、entry-probe…） | 10 |
| `evidence/` | 协作/证据判据（claim-loser、collaboration、member-stale、recovery-scope、team-barrier、probe-verdict） | 6 |
| `ui/` | 金样与页签目录（ui-golden、ui-surface、company-tab-catalog） | 3 |

顶层不再有散件；读目录名先缩小到一组，再挑文件。

## 输掉的方案

- **保持平铺**：54 个名字里混着「仓库不变量 / 工具纯逻辑 / 会话日志 / 协作证据 / 金样」五类，
  `ls` 不传达其中任何一类——与 `src/client` 同一个病，用户已明示要改。
- **按 `tools/lib` 一一镜像**（每个 .mjs 一个同名 spec 目录）：lib 里也有跨域工具，且一部分 spec
  守的是仓库不变量而不是某个 .mjs；按**关切**分比按**文件对应**稳。
- **同时把 `checks/gates`(54) / `tools/lib`(48) 也搬**：两者是「一门禁一文件 / 一模块一文件」的
  同质目录，被 54 门与 86 脚本以相对路径互引；搬迁收益低于一次性 diff 风险（详见
  [client 层次化 Note](./2026-11-03-client-layering-restructure.md) 的同名取舍）。本轮**只搬测试树**。

## 后果

- 54 份 spec 移动 + import 前缀 `../../` → `../../../`；同 diff 必须跟的路径契约：
  `tsconfig.test-harness.json` 的排除项（混合面 `pack-exports`）、`skip-budget` 的自身排除路径、
  `entry-probe` 从 `import.meta.url` 推 repo 根的层级、`tests/README.md` 的三条导航链接。
- 历史文档（`docs/`、`notes/**`、`_backlog/**`）里的 spec 路径按事实落点机械更新（归档层只改路径）。
- `tests/README.md` 的 harness 行写明五组；`spec 清单 = 目录本身`的教义不变。

## 验证

```text
pnpm typecheck   # exit 0（中途真红一次：pack-exports 的排除路径随移动失效，vendor loader 被拉进
                 #   harness 项目报 TS7053/TS18048；改排除路径后绿）
pnpm test        # 139 files / 1121 tests 全绿（中途两条真红：entry-probe 的 repo 根层级、skip-budget 的自身排除路径）
pnpm verify      # ALL PASS（56 门 + 2 无对象）
find tests/harness -maxdepth 1 -name '*.spec.ts' | wc -l   # 54 → 0
```
