# 测试宪法：什么算证据

> 性质：合同层——本仓测试政策的**唯一家**。什么时候读 = 挑验证、写验收、判断「这算不算证据」时。规则的目标不是让测试变多，是**让绿有意义**。
> 本文件管**政策与证明边界**；行级映射与命令预算 = [tests/README](../tests/README.md)，脚本索引 = [checks/README](../checks/README.md)。命令与预算档 = [tests/README §验证分层与预算](../tests/README.md)；每个脚本头注自述「何时跑/成本/状态」（门禁强制）；
> 快照树规则 = [snapshots/README.md](../snapshots/README.md)；理由与教训 = `notes/`。思想源头 = DSH `docs/testing.md`（55 行宪法）经 `_digested/test-strategy` 消化的本仓投影（登记见 [external-research.md](./reference/external-research.md)）。

## 1. 分层与证明边界（每层只证明自己能观察的性质）

| 层 | 证明什么 | **不证明什么** |
|---|---|---|
| 结构门禁 `verify` | 结构、一致性、簿记 | 运行行为 |
| keyless 单测 `test` | 模块正例与错误路径、纯函数视图模型、静态渲染 | 真入口、真渲染交互；whole-client 组合子层 = [tests/README](../tests/README.md)（无浏览器） |
| 装配冒烟（`preset-smoke` / `client-load-smoke`） | 真挂载、零失败 | 内容语义 |
| 机制冒烟（`delegation-smoke`） | 模型可见边界 | 设计取舍、跨面正确 |
| 重放 lane（`replay-smoke`；会话日志 + sidecar 回放，无 key；`--ui` 无可用场景） | 会话级行为复现与回归锚 | 录制之外的行为、设计取舍 |
| CLI 集成（`snapshot-motion-smoke`；真实 CLI + 临时 fixture，不进 `pnpm test`） | 真实 CLI 进程路径 | 语义 |
| 发布与分发（`release-smoke`） | 安装形状、built 入口可达 | 语义 |
| 认证档（真模型） | 真行为 | 跨面正确 |
| 行为质量档（`probe --full`；`candidate-scan-eval` 已耗——语料移出本仓，恢复语料时重跑） | 角色内容质量 | 机制回归 |

换档先问"这一层能证明我关心的性质吗"，不为安心堆档。

### 1.1 资产命名语法（文件名 = 证据类型；目录 = lane；两者冲突 = 红）

| 名字 | 证据类型 / 命令 |
|---|---|
| `tests/**/*.spec.ts` | 进程内 keyless（`pnpm test:spec`；`pnpm test` 兼容）；目录 = 被测面 |
| `checks/lanes/*.e2e.mjs` | 真进程（`pnpm test:e2e`；含 keyless process/built） |
| `checks/lanes/*.entry.mjs` | 真浏览器 / 真 profile / 真 tarball（`pnpm test:entry`） |
| `checks/lanes/*-lane.mjs` | lane runner（只调度，不证明行为） |
| `tests/checks/*.test.mjs` | 门禁自身（`pnpm test:checks`） |
| `probes/**/*-probe.mjs` | 手动诊断证据，不进 `test:*`（fixture 入口只允许 `<域>/<fixture>/index.mjs`） |
| `checks/audit/*-(audit\|check\|eval\|ratchet).mjs` | 只读判据/报告 |

**纪律**：后缀只由证据类型决定，目录只由 lane/被测面决定；**名字不编码失败类或 owner**。文件名 token 禁词：`golden`/`util`/`misc`/`helper`/`common`/`tmp`/`temp`/`new`/`old`/`copy`/`backup`。机械判据 = `naming-contract` 门禁；新资产不登记 lane/失败类 = `asset-lanes.spec` / census 红。用例名 = 行为命题现在时、不写 "should"——测试描述行为，不描述正确性。
## 2. 改动面 → 最小证据（同 diff 交付）

**行级映射**（哪个改动面跑哪个检查、何时升档、回放/视觉夹具的义务）唯一家 =
[tests/README「改动面 → 最窄检查」](../tests/README.md)——2026-10-10 自本节迁入消双写，取舍 =
[该轮 Note](../notes/archived/2026-10-10-minimal-evidence-mapping-home.md)。本节只留政策：

- **同 diff 交付**：最小证据与被证明的改动同一 diff 出现，不欠账到"以后补"；
- 单测、smoke、rationale **不替代组装转录**——会话级行为的固化证据只有回放场景（公司行为回放已移部署仓；本仓只保留合成管线场景）。

## 3. 证据纪律（DSH 教义的本仓投影）

1. **验证世界，不信自报**：断言从会话日志、在盘文件、RPC/外部观察取；agent 自述与模型正文不算证据。
2. **mock 白名单**：只许替非确定边界（模型/网络/时钟），下游保持真实现；每个替身写明"证明不了什么"。本仓 keyless 层零**未列入白名单**的模块 mock；当前模块级 mock 仅 `foundation-safety` 的 `vi.mock('node:os')`（环境边界）。`company-client-composition` 的 RemoteMock 与 `probe-web.spec` 的 spawn/fetch 都是**参数注入式假件**（网络/进程边界），不是模块 mock；每个 spec 头注自述“证明不了什么”，不占模块白名单。
3. **真实入口**："能跑"的证据取自真实形态（`pnpm dsh`、真挂载、发布产物）；手搭组装不算数。
4. **单向归因**：单跑才绿 = spec 自身缺陷，不赖环境；测试获取的资源自己负责到 teardown。
5. **掩盖黑名单**：加 sleep、加超时不指认等待状态、加重试、整文件串行化、弱化断言、改归一化凑绿——都不是修法。retry 只许出现在真模型档。
6. **防假绿**：命令链 `set -o pipefail`；自跳过不是成本信号（现状：仅 `ledger.spec` 的 dev-only live 档条件跳过、spec 头注已声明；新增 skip 须配「预期 N 个真跑」守卫，全跳 = 假绿）。
7. **prove-it-red 与共享层升格**：守卫只有挡得住回归才算守卫——制造回归看红、还原看绿，三步留证。**标题带 `BUG-nnn` 的 `describe`/`it` = 守卫声明**：须对到真事故卡 + 同文件带 `// 负例留证 日期：…`（`guard-red-record` 门禁强制；判据为何长这样见该 Note）。**单点业务分支缺陷**可交具名例子守卫；凡根因在**横切共享语义**（Markdown/YAML 解析、安全路径段消解、状态机、门禁判据）或同模块二次复发，**单点例子不予结案**——必须先收口至唯一原语（禁门禁/工具层手写裸正则解析），并同 diff 交付**独立参考真值差分**（如 `mdast` 标准 AST）或**读写全通道等价类矩阵**。
8. **红/场景先行**：机制面改动 = 实现前那个测试已存在且红（红→绿）；行为/UX 面 = 场景先立（Given/When/Then + 判据点名）；口头担忧第二次提起 → 立卡或明确否决，不留复发性话题。
9. **判据读什么，写死**：探针/审计的判据只读类型化字段（agent 正文只认 `content[].type==='text'`、路径只认 `file_path`、行为只认事件 `type`），不对整段 `data`/`arguments` 做正则；结论必须有收口凭据（`turn/end`），超时 = 无结论、不得判绿；判据要能拿同一份事件流离线复判（`--log`/`--evidence`）。

## 4. 资产所有权

- 证据三分法：**回放场景**（会话录制 + 期望，`snapshot.yml`）/ **归档证据**（日期目录，追加不改写）/ **视觉夹具**（合成输入，零模型）——树的规则唯一家 = [snapshots/README.md](../snapshots/README.md)。
- `workspace.expected/` **独立编写**（与录制解耦）——防"同一录制既当回放输入又当期望的一致作弊"。
- 行为质量语料（`candidate-scan-corpus`）已随真实证据移出产品仓：本仓无该资产，`candidate-scan-eval` 标已耗（恢复语料时重跑）；恢复语料时 `labels.md` 仍是判据家。

## 5. 节奏与授权

- 不默认全量：本地按 §2 选最小证据；CI = 结构门禁 + 干净环境差异；pre-push hook = verify + typecheck + lint + dup + smoke:fast + 按面真入口 + **test:coverage + 覆盖率棘轮**（typecheck 面见 2026-11-03 D5 Note；lane 与按面规则唯一家 = `tools/lib/asset-lanes.mjs`）。
- **执行下限** = 关键模块阈值（[`vitest.config.ts`](../vitest.config.ts) `coverage.thresholds`）+ **全量棘轮** `tests/support/coverage-baseline.json`（只升不降；新文件 80/70 下限；<50% 的已知空洞必须豁免并写移除条件）；`pnpm coverage:ratchet` 验，低于即红。失败类决策表 = [tests/failure-classes.md](../tests/failure-classes.md)。
- **tests 部分不在 tsc（已知未覆盖面）**：`tests/client`、`tests/host` / `tests/lib` / `tests/content`、`tests/harness` 均已接各自 `tsconfig.test-*.json`（排除直引 vendor 源码的少量 spec，及混合 host/client 两半全局环境的 `tests/repo/pack-exports.spec.ts`）。
- **自测轮**（全门禁 sweep + UX 走查 + entry-probe 语义探针）：agent 阶段收口时提案、用户批后跑（2026-10-04 定）；预算按 [policy §P3](./policy.md) 轻任务纪律。
- **已知未覆盖面（明说不覆盖）**：多人交互/协作 UX 面——4 个常驻真模型判据探针（dual-ceo / task-discovery / claim-race / dual-signoff，触发见头注），历史 BUG-002..006 台账见 [_fixed_bugs](../_backlog/_archive/fixed_bugs/)；机制面 E1/E2 与 `fs-guard-probe` 不变。
