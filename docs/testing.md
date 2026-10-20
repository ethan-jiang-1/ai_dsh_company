# 测试宪法：什么算证据

> 性质：合同层——本仓测试政策的**唯一家**。什么时候读 = 挑验证、写验收、判断「这算不算证据」时。规则的目标不是让测试变多，是**让绿有意义**。
> 命令与预算档 = [guides/dev-loop §9.1](./guides/dev-loop.md)；每个脚本头注自述「何时跑/成本/状态」（门禁强制）；
> 快照树规则 = [snapshots/README.md](../snapshots/README.md)；理由与教训 = `notes/`。思想源头 = DSH `docs/testing.md`（55 行宪法）经 `_digested/test-strategy` 消化的本仓投影（登记见 [index.md](./index.md) §外部研究材料登记）。

## 1. 分层与证明边界（每层只证明自己能观察的性质）

| 层 | 证明什么 | **不证明什么** |
|---|---|---|
| 结构门禁 `verify` | 结构、一致性、簿记 | 运行行为 |
| keyless 单测 `test` | 模块正例与错误路径、纯函数视图模型、静态渲染 | 真入口、真渲染交互；whole-client 组合子层 = [tests/README](../tests/README.md)（无浏览器） |
| 装配冒烟（`preset-smoke` / `client-load-smoke`） | 真挂载、零失败 | 内容语义 |
| 机制冒烟（`delegation-smoke`） | 模型可见边界 | 设计取舍、跨面正确 |
| 重放 lane（`replay-smoke`；会话日志 + sidecar 回放，无 key；`--ui` 另加真浏览器端到端） | 会话级行为复现与回归锚 | 录制之外的行为、设计取舍 |
| CLI 集成（`snapshot-motion-smoke`；真实 CLI + 临时 fixture，不进 `pnpm test`） | 真实 CLI 进程路径 | 语义 |
| 发布形状（`release-smoke`） | 安装形状、built 入口可达 | 语义 |
| 认证档（真模型） | 真行为 | 跨面正确 |
| 行为质量档（`probe --full` + candidate-scan 语料） | 角色内容质量 | 机制回归 |

换档先问"这一层能证明我关心的性质吗"，不为安心堆档。

### 1.1 资产命名语法（后缀提示用途；成本与实际档位以头注和参数为准，新资产沿用词表）

| 名字形态 | lane / 层 |
|---|---|
| `tests/**/*.spec.ts` | keyless 回归唯一后缀（`pnpm test`）；按 company/client/presets/harness 领域归位，非 spec 形态 = 静默死资产，不许 |
| `*-e2e-smoke.mjs` | 端到端链路；模型与浏览器是独立成本（presence-e2e 为真模型/RPC，无浏览器） |
| `*-smoke.mjs` | 冒烟：装配/连通（keyless 挂载或单 prompt 级） |
| `*-probe.mjs` | 机制/边界探针（单点机制证据） |
| `*-audit.mjs` / `*-check.mjs` | 审计/判据：读真盘出报告，无模型 |
| `*-eval.mjs` | 语料评估；candidate-scan 自检/标注评分为 keyless，涉及模型才进认证档 |
| 其余动词形（sync / export / init / motion / rehearsal / verify） | 工具脚本，非门禁 |

后缀词表是政策不设新门（未复发，守门禁升格判据）；每个脚本自己的「何时跑/成本」仍由头注自述（`script-triggers`）。用例名 = 行为命题现在时、不写 "should"——测试描述行为，不描述正确性。

## 2. 改动面 → 最小证据（同 diff 交付）

**行级映射**（哪个改动面跑哪个检查、何时升档、回放/视觉夹具的义务）唯一家 =
[tests/README「改动面 → 最窄检查」](../tests/README.md)——2026-10-10 自本节迁入消双写，取舍 =
[该轮 Note](../notes/archived/2026-10-10-minimal-evidence-mapping-home.md)。本节只留政策：

- **同 diff 交付**：最小证据与被证明的改动同一 diff 出现，不欠账到"以后补"；
- 单测、smoke、rationale **不替代组装转录**——会话级行为的固化证据只有回放场景。

## 3. 证据纪律（DSH 教义的本仓投影）

1. **验证世界，不信自报**：断言从会话日志、在盘文件、RPC/外部观察取；agent 自述与模型正文不算证据。
2. **mock 白名单**：只许替非确定边界（模型/网络/时钟），下游保持真实现；每个替身写明"证明不了什么"。本仓 keyless 层零**未列入白名单**的 mock；当前白名单内两处：`company-client-composition` 的 RemoteMock（网络边界）、`foundation-safety` 的 `vi.mock('node:os')`（环境边界）。
3. **真实入口**："能跑"的证据取自真实形态（`pnpm dsh`、真挂载、发布产物）；手搭组装不算数。
4. **单向归因**：单跑才绿 = spec 自身缺陷，不赖环境；测试获取的资源自己负责到 teardown。
5. **掩盖黑名单**：加 sleep、加超时不指认等待状态、加重试、整文件串行化、弱化断言、改归一化凑绿——都不是修法。retry 只许出现在真模型档。
6. **防假绿**：命令链 `set -o pipefail`；自跳过不是成本信号（现状零 skip——引入时须配"预期 N 个真跑"守卫，全跳 = 假绿）。
7. **prove-it-red**：守卫只有挡得住回归才算守卫——制造回归看红、还原看绿，三步留证。**标题带 `BUG-nnn` 的 `describe`/`it` = 守卫声明**：须对到真事故卡 + 同文件带 `// 负例留证 日期：…`（`guard-red-record` 门禁强制；判据为何长这样见该 Note）。
8. **红/场景先行**：机制面改动 = 实现前那个测试已存在且红（红→绿）；行为/UX 面 = 场景先立（Given/When/Then + 判据点名）；口头担忧第二次提起 → 立卡或明确否决，不留复发性话题。

## 4. 资产所有权

- 证据三分法：**回放场景**（会话录制 + 期望，`snapshot.yml`）/ **归档证据**（日期目录，追加不改写）/ **视觉夹具**（合成输入，零模型）——树的规则唯一家 = [snapshots/README.md](../snapshots/README.md)。
- `workspace.expected/` **独立编写**（与录制解耦）——防"同一录制既当回放输入又当期望的一致作弊"。
- 行为质量语料（`candidate-scan-corpus`）：`labels.md` 是判据家；关条目 = 显式决定，不是失修。

## 5. 节奏与授权

- 不默认全量：本地按 §2 选最小证据；CI = 结构门禁 + 干净环境差异；pre-push hook = verify + test。
- **自测轮**（全门禁 sweep + UX 走查 + entry-probe 语义探针）：agent 阶段收口时提案、用户批后跑（2026-10-04 定）；预算按 dev-loop §10 轻任务纪律。
- **已知未覆盖面（明说不覆盖）**：多人交互/协作 UX 面——2026-10-06 用户立项首轮猎捕已立 4 个判据探针（dual-ceo / task-discovery / claim-race / dual-signoff，真模型档、常驻，触发见头注）+ 4 张 bug 卡（BUG-002..005 **已修闭环**——修复落地+复跑转绿，卡迁 [_fixed_bugs](../_backlog/_archive/fixed_bugs/)；BUG-006 于 2026-10-07 发现即修。台账 = 那些已修卡，不另留猎捕日记）；机制面 E1/E2 与 `fs-guard-probe` 不变。

## 6. 升级地图（长大后再借的形状；触发条件即准入门，不预建）

脚本化模型 adapter 进程内 harness（回放覆盖不到的会话级行为；vendor `core/agent-loop/tests/mock-adapter.ts` 源码平面可复用）→ Config 两脸断言（首个带 Config 的 host 插件）→ 自跳过计数守卫（出现 skipIf）→ coverage 死代码扫描（lib 判据逻辑可疑）→ 交互性能预算常数化（性能回归指控）→ 快照世代模型（vendor 会话格式再 bump 且存有跨格式场景）。
