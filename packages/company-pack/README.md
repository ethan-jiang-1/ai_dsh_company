# dsh-company-pack

唯一自写包（决策 D1：一个包；行多包少）。三个面按垂直轮长出：

| 面 | 内容 | 出生 |
|---|---|---|
| 配置面（现在） | `presets/<role>/`（persona + skills，硬隔离）+ bundle 行（`cordis.patch.yml`：`agent-preset-registry` 替换出厂行；`dsh.bundle.patch` 为**数组** = registry 1 + 五角色预设行）+ `package.json` 的 peerDependencies（**版本以 `package.json` 为准，此处不复述**——复述必漂） | 轮次 R0–R2（轮次制已退役，见 D23） |
| host 代码面 | `src/` + `src/lib/`（看板/在场/DAG/台账的读模型与 host 代码） | R3+ |
| client 面 | `src/client/` + `dsh.client` 字段 + tsdown 构建（公司面板：在场 / 依赖图 / 用量 / 任务板 / 台账） | R5 |

发布前清单已全部落地（2026-09-25 随升 pin ①）：cordis 在 peerDependencies、`dsh.compatibility`
版本矩阵（历史版本 + 当前钉住，见 `package.json`；`pack-compat` 门禁强制含当前 tag）、
`npm pack` → 干净 profile → `dsh plugin add` 真实安装冒烟 =
release-smoke ALL PASS（[docs/release.md](../../docs/release.md)）。pack 保持 `private: true`——
真实 npm 发布等第二个消费者出现再定（registry 三态等前瞻 =
[harness-alignment 台账](../../notes/archived/2026-09-25-harness-alignment-ledger.md) §五）。

## 已知限制（随行为变更同 diff 更新；2026-09-28 立，借 FAQ 04 package README tier）

- 机制与出厂行替换已对钉版 `dsh-v0.2.0-rc.2` 验证（2026-09-30 升 pin + 插件收割：pack-compat / release-smoke / 全套门禁；本仓嵌套工作区 vendor 自建偏离 = D27）。
- 委派子会话的签字审批到不了人（子会话审批面宿主侧受限）——人机审批实际是 Lead 专属（上游 seam 候选，见归档搁置池 `_backlog/_done/_misc/suspended.md`）。
- 浮窗 raise 置顶依赖 CSS 垫片（vendor rc.2 缺陷；上游修复后撤垫片）。
- 依赖图画布按栏宽等比缩放（`transform: scale()`，fitScale 下限 0.75；**不用 CSS 宽度缩放**——Safari 里 foreignObject 文字不跟缩，会堆向左上角）；更宽的图（约 ≥5 个并行根任务）缩到下限后横向滚动。
- 浮窗几何记忆（位置/大小按页签 contentId 存 localStorage）按 **origin** 隔离：同一次服务运行 + 页面刷新有效；换端口重启即新 origin、记忆清零（vendor 侧栏布局持久化同此边界）。
- 成员会话常驻注入基线 ≈ 手册 17.4KB（2026-10-02 实测；随手册增长）：preset `agent-instructions.maxBytes` 钉 32768 且 **verify `handbook-budget` 门禁强制"手册字节 + 1024B ≤ maxBytes"**（超限 = agent-instructions **静默截断**手册尾部——2026-10-02 曾实测活 bug：预算 16384 落地时手册仅 1.2KB，手册长过预算后"工作纪律"节从未注入、行数栅栏与 overlay 层核对都没抓到；负例即该门禁出生现场）。
- **上网能力（`web_search` / `web_fetch`）必须随每个 preset 声明**：web-app bundle 把 host 上的 `tool-web` 行 `disabled: true`，改为按 agent preset 组合（vendor base 注释原文）——所以它**不是**全局继承来的；漏声明时角色与它 spawn 的 child 都静默无联网。子会话（`subagent` / team teammate）**继承 Lead 的组合**（`composeFrom`；roles-isolation §2/§4），故 Lead 有即可，不必另配。
- **one-shot 委托 child 的目录里看得见 Team 工具但调不通**（上游已登记限制，vendor tool-agent-team README "One-shot child tool visibility"；2026-10-02 真跑实证：child 目录 41 工具含全部六个 Team 工具，调用在身份确认后被拒）。防线 = CEO preset 两份委托 persona 各一句「别碰 team 工具，并行调研只用 subagent」+ `delegation-smoke --delegate` 的 [3] 守卫（边界变了就红）。
- **搜索成本 = 一次完整模型回合**：DeepSeek 无独立检索端点，每次 `web_search` 都按一次 Messages 调用计延迟与 token（故 `searchTimeoutMs` 设 60s）；凭据复用 `DEEPSEEK_API_KEY`，缺失即 fail-loud 结构化报错、不静默降级。`web_fetch` 为匿名抓取，只接受公开 HTTP(S) 目标。
