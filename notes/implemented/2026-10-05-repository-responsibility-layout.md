# 2026-10-05 · 仓库职责分区与证据路径迁移

状态：implemented（用户明确要求整理期一次物理整理、优先长期收益；实施中，验收仍待回放/审计/门禁与独立导航走查完成；取代[先前保留平铺的决定](2026-10-05-project-navigation-and-directory-review.md)，保留其历史验证记录）

## 决定与长期收益

脚本、测试和快照按稳定职责物理分区。路径迁移成本由消费者与验证吸收，不能作为不整理的长期理由。维护者从目录即可找到验证入口、运维操作、已耗仪器和证据类型；脚本头注继续唯一声明触发、成本与状态。

- `scripts/smoke/`：装配、行为、回放及 CLI 集成入口。
- `scripts/probes/`：窄机制与视觉探针。
- `scripts/audit/`：交付物、作者、journal 与语料判据。
- `scripts/tools/`：导出、初始化、日志捕获、快照捕获和升 pin。
- `scripts/archive/`：已耗仪器；移动不恢复其执行资格。
- `scripts/lib/`：可供 keyless 测试导入的共享实现；真实进程/浏览器驱动归 `scripts/drivers/`。
- `tests/company/`、`tests/client/`、`tests/presets/`、`tests/harness/`：按领域导航，全部仍属 keyless，Vitest 继续递归发现。
- `snapshots/replay/`、`snapshots/visual/`、`snapshots/probes/`、`snapshots/archive/`、`snapshots/corpora/`：按主要消费合同分类；场景内部整套保留。replay 桶包含行为录制，不表示每个历史场景都已有可运行的重放 lane。

`pnpm verify`、`pnpm test`、`pnpm dsh` 保持稳定；`scripts/run-gates.mjs` 保留门禁完整实现和 pin 事实家，不为目录对称拆出浅 runner。`scripts/deliverables-check.mjs` 保留一个相对符号链接兼容已有公司手册入口，其规范入口在 `scripts/audit/`；其余内部调用与当前操作文档改用新路径，不保留一整套根部 wrappers。

## 共享发现与风险

`repositoryRoot` 固定从共享路径模块定位 checkout，不依赖入口深度或调用者 cwd。脚本触发、状态与临时端口门禁使用同一递归入口清单，排除 lib/drivers 和符号链接，包含 archive。

快照发现以类型目录的直接场景为单位，不深入 replay、sessions 或 workspace 副本。收敛预算按场景名识别 `memory-convergence-*`，journal 审计从规范场景定位原样 `workspace.actual/kb/...`，避免搬桶后预算归零和归档漏扫。回放把规范路径和稳定场景 ID 分开，保留 R2 专用 UI 分支；workspace oracle 的符号链接拒绝政策不放宽。

原始会话、sidecar、oracle、归档 workspace 和公司历史事实不做全文路径替换。当前导航与可执行引用机械更新，历史收据保留时点。公司手册仅同步审计命令路径、owners 仅同步机制证据入口，CHARTER/ledger 仅替换快照路径 token，不改事实叙述。旧路径用 `node scripts/tools/snapshot-path.mjs <旧路径>` 查规范目标，不能宣称旧原生文件路径自动有效。

`_backlog/_done/` 已明确冻结且不是任务源（dev-loop §0.5）；裸路径门禁将它并入历史观察档，与 implemented/postmortem 相同，不改当时执行的命令收据。活跃推敲卡的裸路径仍判红，所有 Markdown 导航目标仍执行硬链接检查；这不是按某条失败内容添加豁免。

## 输掉的方案

- **只加索引、继续平铺**：第一阶段曾选择，用户明确以长期收益否决；索引与物理职责分区共同实施。
- **按有无文件 IO 分层**：隔离文件夹具属于 keyless，不能误搬到认证档。
- **仅移动目录、逐个改硬编码**：无法防止新增分区再次漏扫；发现和根路径集中在共享模块。
- **整个 lib 无条件准入**：真实驱动物理移出，并检查共享库的本地传递依赖；目录名本身不证明无进程/网络效果。
- **拆开场景内部资产**：sessions/replay/oracle/workspace 由同一消费合同绑定，只移动父层。

## 迁移映射

脚本与测试按文件同名移动，规范索引见 `scripts/README.md` 与项目地图。脚本入口 41 个移动，3 个驱动移动，30 个既有 spec 移动，稳定门禁入口不动。证据场景 26 个按如下映射：

| 新类型 | 原场景名（同名保留） |
|---|---|
| replay | foundation-workspace, r1-motion, r2-motion, r3-delegation, r4-motion, r5b-presence-e2e, scenario-b |
| visual | dag-visual, dag-midflight |
| probes | attention-e2e, browser-behavior-probe, entry-probe, harvest-probe, human-loop-e2e, motion-taskboard-probe, taskboard-presence-probe |
| archive | emergency-x-incident-review, q3-business-review, memory-convergence-2026-09-25, memory-convergence-2026-09-26, memory-convergence-2026-10-04, memory-convergence-2026-10-04-2, memory-convergence-2026-10-04-3, memory-convergence-2026-10-04-4, memory-convergence-2026-10-04-5 |
| corpora | candidate-scan-corpus |

## 验证记录

第一轮脚本/tests 迁移后 `pnpm test`：31 文件、289 项通过；44 个迁移后入口及驱动的 Node 语法/相对 import 目标检查通过；兼容链接目标与 `git diff --check` 通过。此时快照消费者尚未全部迁完，该结果不代表总目标完成。

最终验证摘要：`pnpm verify` ALL PASS；`pnpm test` 在迁移收尾后 32 文件、298 项通过（最终复跑 2.64s），仅既有 React SSR useLayoutEffect warning；layering 图守卫与 keyless import focused 9 项均通过；snapshot-motion CLI、candidate-scan 自检、sync-dsh、export-dist、journal-audit 的 canonical 归档红绿反证均通过。根快照合同也纳入 Markdown 链接门禁，冻结场景正文仍不全量扫描。递归头注/状态/端口以嵌套坏入口反证均 red；冻结裸收据进入观察档，但活跃裸引用与冻结 Markdown 导航以独立坏引用反证仍 red；收敛预算临时降到 1M，能对真实分类归档 2.2M 报 red（恢复 16M 后 green）。26 场景 765 个 tracked 文件逐 SHA-256 对比迁前 Git 基线，payload 无缺失/变化；5 个当前导航 README/labels 文件仅发生允许的路径导航变更。递归入口清单 43 项、脚本索引 0 遗漏，canonical 场景 26 项、快照索引 0 遗漏。

回放资格按快照合同：修复当前 vendor 的五参数 profile patch 调用合同，并从已提交 `session.N.v3.jsonl` 发现 child，而非以 gitignored raw 计数。R2 实际 `node scripts/smoke/replay-smoke.mjs --scenario replay/r2-motion --wall 60` ALL PASS：5 会话、member/task 集合等价、presence 同形，queued 27→25 只作原有记录项。R3 HEAD/path-mapped 与规范目录均为同样 2 项 red（旧手册截断与 child persona sidecar），不能重录或弱化断言掩盖。Foundation 的完整 workspace oracle 和会话数通过，但 full lane 还有工具返回 meta、system prompt 与 bash schema 的 3 项历史漂移 red；完整 red 不作为目录迁移绿证。

独立只读走查验证六条任务导航：Web 观察窗与 code/home/cwd、五角色挂载、blank page、盘面/留痕审计、局部 client 回归与实际渲染、历史快照查找。复核脚本与场景索引 0 遗漏、839 条链接 0 违规；发现测试词表曾把 e2e/eval 后缀绝对化，已改为后缀提示、头注定义成本与档位。真模型、Web 和浏览器档未因纯路径迁移强行重跑。
