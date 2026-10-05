# 2026-10-05 · 测试资产导航与历史 oracle 标注（steerability 毕业拆分 6/6，已实施）

状态：已消化（2026-10-05 同日实施完成，红→绿收口；来源 = 推敲卡 [repository-steerability](../../_backlog/_done/_closed_plans/2026-10-05-repository-steerability.md) 毕业拆分第 6 条——用户点名「测试资产的思考……起码有一个套路，不能太随便」后开工；同批拍板：entry-probe = 推荐首跑、非强制、不进 pnpm test，另给无 key 替代路径；原卡阶段 6 收口走查折入本条验收，人类走查留给用户收尾）

## 交付（现在时）

- **[tests/README.md](../../tests/README.md) 立**：四区 owner 表（测什么 / **不证明什么**）；改动面 → 最窄检查映射（命令层粒度——政策层唯一家仍 = [testing.md §2](../../docs/testing.md)，锚点由 spec 钉扎）；行业三分对照行（单元 ≈ keyless / 集成 ≈ 装配·机制·CLI / 端到端 ≈ 重放·认证）；新 Agent 首跑验收（有 key = entry-probe-smoke，真模型认证档、非强制；无 key = verify + test + client-load-smoke 三件套）；新 spec 落点规则。
- **[harness/navigation-assets.spec](../../tests/harness/navigation-assets.spec.ts) 立**（7 项 keyless 守卫）：钉导航骨架（四区行 / 映射锚点 / 首跑定位 / 不复述头注 / **tests/README 相对链接可解析**——md-links 门禁不扫 tests/，此缺口由本 spec 补上）+ snapshots oracle 政策在场。
- **[snapshots/README.md](../../snapshots/README.md) 场景元数据政策行立**：新场景的 snapshot.yml / 场景 README 须声明 `workspace.expected` 来源性质（独立 oracle / 录制整盘副本 / authored 回放）；历史 payload 不改写。
- **[dev-loop §9.1](../../docs/guides/dev-loop.md) 首跑行**：新 Agent 首跑验收指针，唯一家 = tests/README。
- focused 反证测试归位确认：日志世代（[log-generation RFC](./2026-10-05-steerability-log-generation.md) 自带 11 例合同 spec）、preset/child（[矩阵 RFC](./2026-10-05-steerability-preset-skill-matrix.md)——已实施，四形态矩阵 + 真日志抽查）、tmp 出口（[运行态 RFC](./2026-10-05-steerability-runtime-runbundle.md)——已实施，dev/README §四逐项登记）——本条只收导航 own 的部分，未越界。

## 验证记录

- **红（判据先行）**：spec 先写先跑——**7/7 failed**（tests/README 缺场 + oracle 政策行缺场；`pnpm test tests/harness/navigation-assets.spec.ts` exit 1，2026-10-05 实跑）。
- **门禁抓我两次**（修正的是内容、不是门禁）：① `bare-path` 抓 tests/README 里 `scripts/smoke|probes` 管道符路径——拆成两个真路径；② `layering` keyless 守卫抓 spec 源码里 `DEEPSEEK_API_KEY` 断言字面量（凭据形状禁令按字面生效）——换锚点为「真模型认证档 / 无 key」，不绕门禁、不字符串拼接逃避。
- **绿**：`pnpm test` 33 文件 **305/305**（+7 导航守卫）；`pnpm verify` **ALL PASS**（proposal-scheduled / notes-liveness / 预算全界内）。
- **新 Agent 六入口只读走查**（独立子代理，无本任务上下文，纯读不跑命令）：四任务（改 CEO persona/skill、新增 host 工具、改 client 页签、排查 deliverables 审计）与五个驾驭问题**全部在限定入口（六文件 + 一步链接）内找到答案，零「未找到」**——每任务均给出文件、最窄命令与完成定义，出处可追溯（AGENTS/project-map/testing/tests-README/scripts-README/dev-loop + 链接一步的 presets/src-README/demo/snapshots/architecture）。

## 走查发现（回流）

- ③ tests/README 改动面表未单列「src/lib 新逻辑」行（需两行拼合）→ **本 diff 已修**（读模型行补「新增模块/影响导出面 → 加 tests/harness（pack-exports 守卫）」）。
- ① 「怎么启动」完整步骤唯一家在 demo.md §前置（一步链接之遥）→ 归 [entry-runtime-map RFC](./2026-10-05-steerability-entry-runtime-map.md)（已实施：runtime-map 立，三首屏闭环，终局五问走查验收通过）。
- ② host 工具编码范式无专文档（活范本 = src/index.ts 头注）→ 归 [pack-boundaries RFC](./2026-10-05-steerability-pack-boundaries.md)（已实施：owner 表 + 依赖图归档）。
- ⑤ persona 生效时点细节已在 presets.md 生效边界表 → 既有家，导航链路已覆盖。
- ④ 纯文档走查未实跑命令 → 人类走查（用户收尾）补实跑面。

## 输掉的方案（留尸）

- **tests README 复述脚本清单**：必漂——脚本头注是唯一源（spec 锚点断言「状态：常驻」不出现，机械防复述）。
- **entry-probe 设为必跑门禁**：真模型成本结构错位（花钱、慢）；「推荐」≠「强制」。
- **端到端当默认反馈**：测试宪法分层既定。
- **改动面表并入 testing.md §2**：testing.md 75/75 预算满且管辖面大于 tests/；当前取舍 = 粒度差（政策层 vs 命令层）+ spec 锚点钉扎——与 §2 的同形张力已向用户明示（2026-10-05 对话），漂移证据出现时最窄修法 = 表只留命令列、每行指回 §2。

## 后果

- 走查注记缺口已按归属分流：可修的本 diff 修，跨条的回流给待实施 RFC（不夹带扩围）；tests/README ↔ testing.md §2 张力登记在案，等复发证据裁决。
