# 2026-10-05 · 运行态 owner 与 run bundle 逻辑合同（steerability 毕业拆分 4/6，已实施）

状态：已消化（2026-10-05 实施完成；来源 = 推敲卡 [repository-steerability](../../_backlog/_done/_closed_plans/2026-10-05-repository-steerability.md) 毕业拆分第 4 条；含同批两项拍板：run bundle = 逻辑合同；profiles/company = 保留 + 标记退役）

## 交付（现在时）

- **[dev/README.md](../../dev/README.md) 立**（dev/ 树分类 owner）：启动配置三件（`env.sh` / 两个 overlay，repo 跟踪非运行态）｜运行态表（主 home `harness-home/`（sessions=数据层证据源、profiles `headless`/`web` current、replay-runs/diagnosis、迁移哈希基线）、**`profiles/company` 退役标记（非权威、不可作为当前入口；删除需消费面清单+回滚方案+单独决定）**、双第二 home（`harness-home-b/` + `harness-home/b/`，多 home 实验与跨 home 审计视角）、`pw-browsers/`（浏览器重定向 + **UI 记忆按 origin 隔离**）、`rehearsal-workspace/` 排练盘（绝不写 live 公司盘）、`logs/` 空置登记待处置）｜层级事实四条（DSH_HOME=数据层不决定代码来源；session cwd=业务事实层；repo cwd≠自动公司盘；排练盘隔离 + `deliverables-archive`（业务产物历史）与 `snapshots/archive`（证据时点副本）语义分立）｜**系统 tmp 出口四条逐项登记**（replay-smoke / dag-visual-probe / cross-process-fs-probe / export-dist 的 mkdtemp 落点；策略 = 进程级自清、跨进程保留诊断按 §11 受控重定向、不预建）。
- **Run bundle 引用合同立**（[snapshots/README](../../snapshots/README.md)「Run bundle 引用合同」节）：**逻辑合同，引用不复制**——八字段反查表（场景与日期 / 代码锚 / profile 与 preset / session 引用（live 世代口径 = session-log-generation）/ session cwd / workspace 引用（来源性质政策）/ 验证命令 / 临时出口）；live 权威 = DSH session + workspace；历史场景不回填（payload 冻结）、新场景缺字段在场景层补一行、**不建独立 manifest 文件**。
- **公司手册旧指针修复**：第 23 行归档形状 `snapshots/<场景>/` → `snapshots/<类型>/<场景>/`（现行五桶；195 行预算内同位数）。

## 验证记录

- **反查走查**：dev/README 所列 8 项与 `ls dev/` 逐一对照全 OK；retired profile 实体确认（file: 复制形状 = cordis.yml / cordis.patch.yml / node_modules / package.json / pnpm-lock.yaml）；tmp 出口四条 = grep 实证写入行（replay-smoke L263、dag-visual-probe L35、cross-process-fs-probe L90、export-dist L47）。
- **run bundle 反查基线** = r2-motion 八字段对照（snapshots/README 合同节内表）：7/8 字段既有可反查；代码锚 ⚠ 未记 → 新场景补一行的依据（历史不回填）。
- `pnpm verify` ALL PASS（含 company-workspace/AGENTS.md 195/195、handbook-budget 手册 19092B + 1024B 余量 ≤ 32768 双档绿）+ `pnpm test` 316/316。

## 输掉的方案（留尸）

- **独立可提交 run manifest 文件**：复制 live 状态必成第二权威（拍板 = 逻辑合同）。
- **删除 profiles/company**：保留迁移材料；删除是独立决定，需消费面清单 + 回滚方案。
- **运行残留提交进仓 / 顺手删 dev/logs**：gitignored 运行态不进版本控制；空置目录只登记待处置。
- **运行态地图并进 dev/README**：全链时序是入口面（entry-runtime-map 的 runtime-map 文件），dev/README 只管 dev 树——两文件分工不重叠。

## 后果

- dev/README 对 runtime-map 的前向引用在 entry-runtime-map 落地时转为正式链接。
- journal-audit coo 缺席（2026-09-24 场次）仍为数据侧待处置观察（[log-generation](./2026-10-05-steerability-log-generation.md) 已记）。
