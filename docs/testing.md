# 测试宪法：什么算证据

> 性质：合同层——本仓测试政策的**唯一家**。规则的目标不是让测试变多，是**让绿有意义**。
> 命令与预算档 = [guides/dev-loop §9.1](./guides/dev-loop.md)；每个门禁/脚本的触发条件与成本 =
> 各自头注（`script-triggers` 门禁强制自述）；快照树的规则 = [snapshots/README.md](../snapshots/README.md)；
> 理由与教训 = `notes/`。思想源头 = DSH `docs/testing.md`（55 行宪法）经外部研究材料
> `_digested/test-strategy` 消化后的本仓投影（登记见 [index.md](./index.md) §外部研究材料登记）。

## 1. 分层与证明边界（每层只证明自己能观察的性质）

| 层 | 证明什么 | **不证明什么** |
|---|---|---|
| 结构门禁 `verify` | 结构、一致性、簿记 | 运行行为 |
| keyless 单测 `test` | 模块正例与错误路径、纯函数视图模型、静态渲染 | 装配、真入口、真渲染交互 |
| 装配冒烟（`preset-smoke` / `client-load-smoke`） | 真挂载、零失败 | 内容语义 |
| 机制冒烟（`delegation-smoke` / `replay-smoke`） | 模型可见边界、组合复现 | 设计取舍、跨面正确 |
| 发布形状（`release-smoke`） | 安装形状、built 入口可达 | 语义 |
| 认证档（真模型） | 真行为 | 跨面正确 |
| 行为质量档（`probe --full` + candidate-scan 语料） | 角色内容质量 | 机制回归 |

换档先问"这一层能证明我关心的性质吗"，不为安心堆档。

## 2. 改动面 → 最小证据（同 diff 交付）

| 改动面 | 最小证据 | 回放场景 |
|---|---|---|
| persona/skill 文案 | `presets.spec` + `preset-smoke` | **行为判据面**改动（改变"模型被要求做什么/判据怎么落"）→ 同 diff 必带；纯措辞润色 → 连通档 + 内容档兜 |
| bundle/preset 行 config（机制面） | 上行 + `delegation-smoke`（工具行） | 同 diff 必带 |
| client 用户可见面（面板/卡片/文案/CSS） | 视图模型 spec + 静态渲染 + `client-load-smoke` + CSS 守卫 | 用户可见改动 → 同 diff 场景或视觉夹具 |
| lib 判据（deliverables / authorship / ledger） | 单测 + oracle 反证（真样本钉列） | — |
| pack 导出/注册面 | 导出形态守卫 + `client-face` + `style-lifecycle` | — |
| 发布/升 pin | `release-smoke` + 升 pin 程序 | **语料回放全绿 = 升 pin 回归网第一道**（release.md 人审项） |

单测、smoke、rationale **不替代组装转录**——会话级行为的固化证据只有回放场景。

## 3. 证据纪律（九条教义的本仓投影）

1. **验证世界，不信自报**：断言从会话日志、在盘文件、RPC/外部观察取；agent 自述与模型正文不算证据。
2. **mock 白名单**：只许替非确定边界（模型/网络/时钟），下游保持真实现；每个替身写明"证明不了什么"。本仓 keyless 层现状零 mock——保持。
3. **真实入口**："能跑"的证据取自真实形态（`pnpm dsh`、真挂载、发布产物）；手搭组装不算数。
4. **单向归因**：单跑才绿 = spec 自身缺陷，不赖环境；测试获取的资源自己负责到 teardown。
5. **掩盖黑名单**：加 sleep、加超时不指认等待状态、加重试、整文件串行化、弱化断言、改归一化凑绿——都不是修法。retry 只许出现在真模型档。
6. **防假绿**：命令链 `set -o pipefail`；自跳过不是成本信号（现状零 skip——引入时须配"预期 N 个真跑"守卫，全跳 = 假绿）。
7. **prove-it-red**：守卫只有挡得住回归才算守卫——制造回归看红、还原看绿，三步留证。

## 4. 资产所有权

- 证据三分法：**回放场景**（会话录制 + 期望，`snapshot.yml`）/ **归档证据**（日期目录，追加不改写）/ **视觉夹具**（合成输入，零模型）——树的规则唯一家 = [snapshots/README.md](../snapshots/README.md)。
- `workspace.expected/` **独立编写**（与录制解耦）——防"同一录制既当回放输入又当期望的一致作弊"。
- 行为质量语料（`candidate-scan-corpus`）：`labels.md` 是判据家；关条目 = 显式决定，不是失修。

## 5. 节奏与授权

- 不默认全量：本地按 §2 选最小证据；CI = 结构门禁 + 干净环境差异；pre-push hook = verify + test。
- **自测轮**（全门禁 sweep + UX 走查 + entry-probe 语义探针）：agent 阶段收口时提案、用户批后跑（2026-10-04 定）；预算按 dev-loop §10 轻任务纪律。
- **已知未覆盖面（明说不覆盖）**：多人并发交互/竞争的 UX 面——机制面有 E1/E2 实测与 `fs-guard-probe`，交互/协作 UX 零测试资产；升级触发 = 多人开门常态化、并发协作缺陷首例、或用户立项。

## 6. 升级地图（长大后再借的形状；触发条件即准入门，不预建）

脚本化模型 adapter 进程内 harness（回放覆盖不到的会话级行为；vendor `core/agent-loop/tests/mock-adapter.ts` 源码平面可复用）→ Config 两脸断言（首个带 Config 的 host 插件）→ 自跳过计数守卫（出现 skipIf）→ coverage 死代码扫描（lib 判据逻辑可疑）→ 交互性能预算常数化（性能回归指控）→ 快照世代模型（vendor 会话格式再 bump 且存有跨格式场景）。
