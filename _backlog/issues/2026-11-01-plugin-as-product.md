---
status: 推敲中
opened: 2026-11-01
---

# 推敲：插件即产品——独立 company profile 与 workspace 自有的 run bundle

> 立卡：2026-11-01 ｜ 状态：推敲中 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：（未结；关闭时写结论 + 下游 RFC/Note 或用户去向）

## 原始意图（用户原话，按时间顺序）

> 这一节是本卡的**目的源头**，不是转述结论。第二个 review agent 请先逐句对照：下面的问题陈述、
> 范围、方案与验收，是否忠实于这些原话；任何偏离都要在 review 里点名。

1. **“这个项目其实是要 Develop plug in as a product”**：
   > 「我们这个项目其实是要，Develop plug in as a product，其实就是这个插件有一个独立的启动的
   > profile，但是启动后，它可以在用户的项目里头，就是要么是用户指定的 workspace 里头去做事情」
2. **“启动时知道 workspace，或启动过程中问”**：
   > 「所以确实是启动的当客知道 workspace 在哪里，或者是启动过程中询问 workspace 在哪里」
3. **“插件内容在插件内，生产状态/产物在用户 workspace”**：
   > 「这个插件的所有的内容都放在这插件内部，但生产的状态，或者最后的输出物 artifacts，也就是
   > 历史上我们说的 run bundle，其实是在用户的 workspace 里」
4. **“这样才能有好 UX；能力能施加到用户指定的 workspace”**：
   > 「这样才能做到很好的用户体验，也就是这个插件的所有的能力可以施加到用户手上的指定的
   > workspace 里头」
5. **“不是小改；repo、`_dist` 说明、整个 README 都要调整；先给 plan”**：
   > 「这个调整可能还挺多的内容，你要好好挖掘，挖掘清楚之后，给出一个 plan。记得不仅仅调整整个
   > repo，记得 _dist 的说明，以及整个项目的 Read me。都要调整啊…… 你得想清楚之后，先给出 plan」
6. **“用 backlog 结构把事情打磨好”**：
   > 「因为不是个简单的事情，所以利用 backlog 结构，如果要去度做研究，就在底下的 research，如果
   > 你觉得底下落地要做什么东西，就是在 issues 下。这个地方把事情打磨好」

## 从原话提炼的产品要求（R1–R5）

| # | 要求 | 当前差距 |
|---|---|---|
| R1 | 产品有独立启动 profile | 现在产品入口是通用 `web` profile；`standalone` 也建 `web` |
| R2 | 启动时知道/询问 workspace | 现在默认 `<DSH_HOME>/company-workspace`；Web 里还要人手加工作区 |
| R3 | 插件内容留在插件内 | pack 的 persona/skills/client 已在包内；但 run bundle 身份与部分产品状态在 home |
| R4 | 生产状态/产物在用户 workspace | `bundle.json` 在 home；方法层/账本/日志在 home；默认公司盘在 home |
| R5 | 好 UX | 首启先选工作区、公司盘在 home、换盘靠 rebind；手册教“一个 home 一个 bundle” |

**一句话目的**：把“插件安装”与“公司运行单元”彻底拆开——插件安装进一个独立的 `company` profile
（独立 home），启动时解析用户 workspace；插件定义只住 pack，run bundle 的**业务形态**（身份 +
公司盘 + 业务产物 + 日志）住用户 workspace；home 留 DSH 运行时与 host 治理（sessions / 凭据 /
workspace 登记 / 锁 / 方法层 / 审计账本）。首启只补缺、不覆盖，打开 Web 就能在目标 workspace 里开工。

> **2026-11-01 自审修订**：上一版把“方法层/审计账本/日志”一并塞进 workspace、把手册全量改名
> `COMPANY.md`、把“一安装多 workspace”当默认。自审后认为这三条都过强：方法层/账本是 host 治理
> 边界（D25/M2），搬进模型可写区是降级；手册全量改名是不必要的 churn；一安装多 workspace 会让
> “当前公司”、lease、Client 选中与方法/账本作用域全部复杂化。修订后的 v1 建议 = **一安装一
> workspace、业务产物进 workspace、治理状态留 home + 只读导出、手册碰撞感知 seed**。下面 Q2–Q4
> 已按此改写；这不是替用户拍板，是把“不建议的默认”撤回。

## 我们摸透了吗 / 准备透了吗（诚实清单）

**已经摸透的（有证据）**
- 独立 `company` profile 能建、能装 pack、能以外部 `DSH_COMPANY_HOME` 启动（T，见研究稿 §4.1）。
- DSH 的 Workspace 登记、首用默认 Documents、Session cwd、sandbox 根、`agent-instructions` 候选、
  composition-time skill 目录的机制（C）；**boot 登记 → 浏览器自动选中 → CEO 会话已端到端 T**
  （研究稿 §4.1b：无 `Choose workspace`，session cwd = workspace，`agentPreset = ceo`）。
- 本仓当前 run bundle 身份/默认盘/methods/ledger/rebind 的落点与冲突（C）。
- 包 `bin` 会被 `dsh plugin add` 链到 profile 的 `node_modules/.bin`（T，2026-11-01 小包实测）。
- 独立 host row（subpath export + `inject` + async apply）能在 `dsh web:` readiness 前登记
  workspace（T，探针包；尚未集成进本包）。

**还没摸透 / 不能装懂**
1. **“用户的项目”是专用公司盘，还是任意已有 repo？** 这决定根布局侵入度、手册是否必须碰名、
   以及 seed 确认的默认策略。原话只说“用户的项目/指定的 workspace”，没有区分。
2. **“启动过程中询问”是终端启动器问，还是 Web 里问？** 终端问最简单、能在 boot 前设好
   `DSH_COMPANY_HOME`（methods 组合需要）；Web onboarding 更产品化，但 host boot 不能等，
   需要自定义 Client/Host 面。原话没有指定界面。
3. **“生产状态”是否包含方法层/审计账本？** 业务产物（kb/deliverables/journal/cultivation）
   显然该在 workspace；方法层/账本是 host 治理，搬进去会反转 D25/M2 的保护。原话的
   “生产的状态”是否覆盖它们，需要人判。
4. **“一次安装”是否意味着“一次安装多个项目”？** 原话没有说多项目；如果一安装一公司盘，
   迁移面、隔离与 UX 都更稳；如果一安装多项目，需要先设计 per-workspace 治理与 Client 切换器。
5. ~~**浏览器自动选中/自动 CEO 会话**~~ **已 T 关**：探针里 boot 登记 workspace 后打开浏览器，
   页面无 `Choose workspace`，自动出现 CEO 会话（cwd = workspace、preset = ceo）。剩余：把
   registrar 集成进本包、seed/consent 与刷新复用未测；集成后 `client-load-smoke` 复验。
6. **`bundle.json` 放进 workspace 后的可写性**：模型在 `workspace-write` 下可写它；host 只能
   校验 + 备份，不能声称防篡改。这是 R4 的固有代价，需要用户接受或另设机制。
7. **文档预算**：现有 `doc-budget` 余量很小（data-model 75/76、profile 63/66、runtime-map 83/88），
   产品形状改写必然触碰上限；要么搬旧内容到 notes/archived，要么按规则提额。不是“改几句话”。
8. **启动器“建/修 profile”的安全边界**：`--from-default-profile` 会替换同名 profile；启动器必须
   “只建缺失、已存在只验证/拒绝”，不能在已有 profile 上 repair。实现与测试尚未做。
9. **独立 host row 的构建/导出**：注册 workspace 需要第二个 host 入口（`exports` + tsdown entry +
   `files`），机制可行但尚未在本包验证；如果改成主 `apply` 内 `ctx.inject`，会引入 boot 时序竞态。

**结论**：机制层“能做”基本摸透；**产品边界层还没完全摸透**，上面 1–4 是必须先由人拍板的分叉，
5–9 是可行性缺口/待验证项。现在说“准备透”是不诚实的；说“方向清楚、边界待拍板、机制可验证”
才是准确状态。

## 问题与期望结果

**问题**：本仓现在同时是“产品源码”和“一个正在运行的部署”：`bundle.json` 在
`<DSH_HOME>/bundle.json`，默认公司盘在 `<DSH_HOME>/company-workspace`，方法层/审计账本/日志在
home；`DSH_COMPANY_REBIND` 是“一个 home 只能有一个盘”的兜底。用户要的产品是“插件装一次/独立
profile，启动时指向我的项目；我的项目拥有公司身份与产物”。两者正相反。

**期望结果**：给出并落地一个长期做对的产品形状：
1. 安装后入口 = `company` profile（独立 home），不是通用 `web`；
2. 启动器在 boot 前解析 workspace（参数 / env / 最近 / 询问），并把它登记为 DSH Workspace；
3. `bundle.json`（v2）、公司盘与**业务产物**（kb / deliverables / cultivation / 日志）在用户
   workspace；home 留 DSH 运行时与 host 治理状态（sessions / 凭据 / 登记 / lease / 方法层 / 账本），
   治理状态另给只读导出——Q3 拍板前不把方法层/账本搬进模型可写区；
4. 首启只补缺、不覆盖；无 workspace/未确认 seed 时停写，不猜、不建；
5. `README`、`_dist/安装手册.md`、pack README、docs 合同与门禁全部换成新形状；
6. v1 数据有迁移路径，旧 `web` 部署不被静默破坏。

**本轮判断完成的标志**：用户对下面「未决问题」的 Q1–Q5 给出确认/否决；确认后本卡补
`## 验收标准` 的最终版并转下游 RFC/实施卡。**本卡不是任务队列，也不是实施授权。**

## 当前情况（2026-11-01）

- **机制可行**：实测 `dsh --profile company --from-default-profile web --dump-default-config`
  能建出 `company` profile（bundles = base + web-app）；`dsh plugin --profile company add <tgz>`
  能追加 `dsh-company-pack`；以 `DSH_COMPANY_HOME=<外部盘>` 启动 `--profile company` 能出 banner、
  落骨架。证明“独立 profile + 外部 workspace”只差产品化，不是造新机制。
  （证据 = [研究稿](../research/plugin-as-product/2026-11-01-plugin-as-product.md) §4.1）
- **身份错位**：首启把 `<home>/bundle.json`（v1，含 `workspace` 绝对路径）写成 home 身份；
  公司盘默认在 home；方法层 `<home>/company/methods`；presented 账本
  `<home>/storages/company_deliverables.json`；升级/错误日志 `<home>/logs`。
  （合同现状 = [数据模型](../../docs/data-model.md)、[运行态地图](../../docs/runtime-map.md) §二·五）
- **入口错位**：`docs/profile.md` 的现行产品形状是 `web`；`tools/standalone.mjs` 也是
  `web` profile + copy 骨架；`README.md` 的安装句是 `plugin --profile <名> add link:…`，
  首启“写 bundle.json 与 company-workspace”。
- **手册错位**：`_dist/安装手册.md` 教“一个 home 一个 bundle、公司盘在 home、侧栏手工加工作区、
  换盘用 `DSH_COMPANY_REBIND=1`”；`checks/gates/dist-manual.mjs` 把这几句钉成必含关键句。
- **浏览器自动选中已 T 探针**：DSH Client 只在 Workspace 为空且无 Session 时建 Documents 默认
  workspace；有登记 workspace 时走 `recentWorkspace()` → `connectWorkspace()` →
  `sessions.create({ workspaceId })`。2026-11-01 用 registrar probe + company pack 端到端实测：
  页面无 `Choose workspace`、body 含 `梦之队 CEO`、`session/list` 0→1、cwd = workspace、
  `agentPreset = ceo`（T，研究稿 §4.1b）。registrar 尚未集成进本包；seed/consent 与刷新复用
  仍未覆盖。（源码 = `vendor/dsh/packages/client/ui-workspace/src/client/navigation.ts`）
- **历史决定需要被取代**：D45（run bundle = `bundle.json` + home + workspace）与 D48
  （目录独立启动 = 隔离 home + `web` profile + copy 骨架）是旧形状；新形状要在
  [决策台账](../../docs/decisions.md) 记新 D 号，并给旧 Note 加取代 banner（历史不回填）。
- **研究依据**：[研究稿](../research/plugin-as-product/2026-11-01-plugin-as-product.md) 已把
  FAQ 26、vendor 源码、当前合同、实测与影响面收在一处；本卡只留判断与验收，不复述机制细节。

## 裁决（2026-11-01，用户授权按推荐推进）

用户令：「有问题你好好想想琢磨，看看你有推荐吗？有几按你的推荐。好的计划有了，你就 setup goal
来推进吧……静默自主执行，给你足够轮次预算，不要询问我，克服一切障碍。」据此：

| # | 裁决 |
|---|---|
| Q1 | **专用公司盘为主验收**；已有项目作支持场景（只补缺 + 首启确认）；根布局 + `.dsh-company/` 元数据 |
| Q2 | **v1 一安装一 workspace**；换项目 = 新 home + 新 workspace；多 workspace 后置 |
| Q3 | **方法层/审计账本留 home**（D25/M2），workspace 只放派生只读导出；全搬需另立安全设计 |
| Q4 | **手册碰撞感知**：`AGENTS.md` 优先；已有 `AGENTS.md` 则 seed `COMPANY.md`；presets 候选同时含两者 |
| Q5 | **0.5.0**；`bundle.json` v2 到 workspace；v1 迁移；`DSH_COMPANY_REBIND` 退役；旧 `web` profile 兼容但非产品入口 |
| Q6 | **启动器为产品入口**（repo `pnpm company` + 安装形态 pack bin）；`DSH_COMPANY_HOME` 直启为 fallback |
| Q7 | **首启 seed 确认**：consent 记录 workspace + packVersion；无 consent/无标记不写盘 |

执行方式：按 [落地顺序](2026-11-01-landing-plan.md) P0–P6 静默推进；测试计划见该卡尾部。
本卡 `毕业：做`，`可关闭：否`——实现落地并验收后才归档。

## 原未决问题（已按上表裁决；保留依据）

### Q1 · workspace 是专用公司盘还是已有项目？布局怎么放？

- **先分清**：workspace 是**专用公司盘**（推荐 v1 默认/验收），还是**任意已有项目**？两者都支持，
  但验收与文档主路径不同：
  - 专用盘：根布局无冲突，`AGENTS.md` 直接是公司手册；
  - 已有项目：根布局会新增公司文件，必须“只补缺 + 首启确认”，手册走碰撞目标
    （`AGENTS.md` 优先，已有则 `COMPANY.md`）。
- **建议布局**：公司盘内容（`AGENTS.md` 或碰名时的 `COMPANY.md`、`kb/`、`templates/`、
  `deliverables/`、`cultivation/`）在 workspace 根；`.dsh-company/` 只放 `bundle.json`、日志、
  导出、自忽略文件。
- 理由：保留现有角色路径/手册引用（160+ 处不用重写）、产物可见、身份不污染根；对已有项目
  用“只补缺 + 首启计划确认”控制侵入。
- 输掉的方案：全部嵌套 `.dsh-company/`（路径大改、产物难发现）；可见 `company/`（撞名风险）。
- **需要用户确认**：v1 是否以“专用公司盘”为主验收、已有项目作支持场景？接受根布局新增
  `AGENTS.md`/`kb/`/`templates/`/`deliverables/`/`cultivation/`/.dsh-company/ 吗？

### Q2 · 一个安装服务一个 workspace，还是多个？

- **建议（v1）**：一个产品安装（home + `company` profile）对应**一个公司 workspace**；换项目 =
  启动器新建一个 home/profile + 指向新 workspace。同一 home 不开多个公司盘。
- 理由：
  - 方法层（D25 自改否决）与 presented 账本（M2 防篡改）现在住 host 保护区；一 home 一 workspace
    让它们保持“每公司一份”，不需要按 bundle id 分区，也不需要把 host 治理状态搬进模型可写区。
  - sessions / 凭据 / workspace 登记都是 home 级；一 home 多盘会让“当前公司”与侧栏其他盘混在一起，
    Client 自动选中、writer lease、产品命令的“当前盘”都要额外状态。
  - 与现行“一次安装 = 一个 run bundle”语义最接近；迁移面最小，失败可回退。
- **代价**：换项目要新建 home/profile（启动器可自动化；pack 不大，但安装有一次 pnpm 成本）。
- **多 workspace 作为后续增量**：需要 per-workspace 的方法层/账本方案 + Client 显式切换器 +
  lease/当前盘状态；本轮不做，不在 v1 验收里偷渡。
- **需要用户确认**：v1 接受“一个安装 = 一个公司 workspace，换项目 = 新 home”吗？还是明确要求
  “一次安装、多个项目”作为 v1 目标？

### Q3 · 方法层 / 审计账本：搬 workspace，还是留 host 保护区？

- **建议（v1）**：**留 home**——方法层 `<home>/company/methods/<role>/`、presented 账本
  `<home>/storages/company_deliverables.json` 维持现状；workspace 只放**业务产物**（公司盘、
  `bundle.json`、日志、交付物、培养记录）。为可携带/备份，host 可在
  `<workspace>/.dsh-company/exports/` 写**派生导出**（methods/ledger 的只读快照），
  权威仍在 home，导出不是第二权威。
- 理由：这两份不是用户产物，是 host 治理状态——方法层是“角色别自改自己”的边界（D25），
  presented 账本是“模型别改审计”的边界（M2）。搬进 workspace 会让模型在 `workspace-write`
  下可写，等于把已立的保护降级。
- 如果用户坚持“生产状态全部在 workspace”：需要另立安全机制（签名、host-only 读写、审批、
  或加密备份），不能在本卡里偷渡；单独立安全设计卡。
- **需要用户拍板**：R4 的“生产状态”是否**必须包含**方法层与审计账本？还是“业务产物在
  workspace、host 治理留 home + 可携带导出”可接受？

### Q4 · 公司手册：继续 `AGENTS.md`，还是碰名时用 `COMPANY.md`？

- **建议（v1，碰撞感知）**：pack 源继续 `workspace/AGENTS.md`；seed 时若 workspace 已有
  `AGENTS.md`，把公司手册写成 `COMPANY.md`；五个 preset 的
  `instructionFileCandidates: ['AGENTS.md','COMPANY.md','CLAUDE.md']`；两者都在时 skip 并告警。
  manifest 的 `skeleton.files` 记录**实际 seed 目标**（`AGENTS.md` 或 `COMPANY.md`），升级按它判定。
- 理由：`agent-instructions` 候选不能含 `/`；碰撞感知既保住专用盘的 `AGENTS.md`，又不覆盖已有项目
  的 `AGENTS.md`，且避免全量改名（5 preset + 骨架 + gates + docs）的 churn。
- 备选：如果用户要求单一名字/单一权威，再评估把 pack 源与所有 gate 全量改成 `COMPANY.md`；
  这是更干净但更大的迁移，不在 v1 默认。
- **需要用户确认**：接受“`AGENTS.md` 优先、已存在时补 `COMPANY.md`”吗？

### Q5 · 版本、迁移与旧入口

- **建议**：`0.5.0` 破坏性版本；`bundle.json` v2（去掉 `workspace` 字段，路径
  `<workspace>/.dsh-company/bundle.json`）；v1 → v2 只在旧 manifest 的 workspace 与当前
  workspace 一致时迁移；`DSH_COMPANY_REBIND` 退役（设置时只告警）；旧 `web` profile 仍可装 pack
  但不是产品入口；旧 `company-workspace` 留在盘上，显式传 `--workspace` 即可继续用。
- **需要用户确认**：接受 0.5.0 破坏性 + 一个版本的 v1 迁移窗口吗？

### Q6 · 启动器交付形状

- **建议**：repo 形态 `pnpm company`；安装形态 pack `bin/dsh-company`（`dsh plugin add` 后落在
  `profiles/company/node_modules/.bin/`）；两者共用一份 bootstrap 逻辑；直接
  `DSH_HOME=… DSH_COMPANY_HOME=… dsh --profile company` 作为无启动器 fallback。
- 备选：只写文档、不做启动器（做不到“询问 workspace/seed 确认/最近 workspace”，不推荐）。
- **需要用户确认**：接受“启动器是产品入口、DSH 命令是 fallback”吗？

### Q7 · 首启 seed 的确认方式

- **建议**：启动器打印“将创建/将跳过”的摘要（advisory），问 y/N；`--yes` 给 CI；确认后写
  `.dsh-company/.seed-consent`（`{v, packVersion, workspace canonical, consentedAt}`）；Host 只在
  consent 匹配或盘上已有 `AGENTS.md`/`COMPANY.md`/`kb/company.md` 标记时 seed；直接
  `dsh --profile company` 无 consent 时只告警、不写。**不用 planHash**：实际计划以 Host 的
  `planBootstrap` 为准，避免启动器与 Host 两套计划算法漂移。
- **需要用户确认**：接受“默认询问一次、不静默写盘”吗？

## 目标形状（推荐；详细依据 = 研究稿）

```text
产品安装（DSH 运行时）                公司 workspace（run bundle）
~/.dsh-company/<company>/             <用户选定项目>/
  profiles/company/                    AGENTS.md（或碰名时 COMPANY.md）
    package.json                       kb/…
    cordis.patch.yml                   templates/…
  sessions/                            deliverables/…
  storages/workspace.json              deliverables-archive/…
  storages/company_deliverables.json   cultivation/…
  .credentials.yaml                    .dsh-company/
  company/methods/<role>/                bundle.json          ← v2 身份
  company/settings.json                  logs/upgrade.log
  company-pack.lock                      exports/methods/     ← 派生导出（非权威）
                                         exports/ledger.json  ← 派生导出（非权威）
                                         .seed-consent
                                         .gitignore           ← 自忽略
```

- 入口：`pnpm company --home <home> --workspace <dir>` / `dsh-company ...`；无参时按
  `--workspace` > `DSH_COMPANY_HOME` > `settings.json` 最近 > TTY 询问；无 TTY 且无值 → fail loud。
  换项目 = 新 home（启动器建）+ 新 workspace；v1 一个安装一个公司盘。
- boot：启动器设 `DSH_HOME`/`DSH_COMPANY_HOME`，spawn `dsh --profile company`；Host 先登记
  workspace（独立 host row，`inject: ['workspaceRegistry']`，async apply），再 seed/升级/目录。
- 手册注入：`AGENTS.md` 优先；若 workspace 已有 `AGENTS.md`，seed `COMPANY.md`；两者都在时
  skip 并告警；presets 候选同时含两者。
- 方法层 / 账本：留 home（D25 / M2 保护）；workspace 的 `exports/` 只是可携带/可读快照，
  权威仍在 home；不把 host 治理状态搬进模型可写区。
- `bundle.json`：v2 在 workspace，但模型在 `workspace-write` 下可写；host 视为“host-owned、
  可被模型损坏”的约定边界，校验失败 fail loud，并在 home 留一份恢复备份；不是防篡改边界。

## 实施切片（内容切片，不是第二套顺序）

> **顺序唯一家 = [落地顺序](2026-11-01-landing-plan.md) 的 P0–P6**；下面的 S1–S5 只是“每片
> 要交付什么内容”，不构成执行顺序、不是任务队列、不单独构成实施授权。落地时按 P0–P6 的
> 出场门推进；片与阶段的映射见落地计划。

### S1 · 产品入口与 workspace 解析

- **交付**：`company` profile 创建/修复、`pnpm company` / `bin/dsh-company` 启动器、workspace
  优先级与 TTY 询问、最近 workspace 设置、boot 时 Workspace 登记、seed 计划/consent、无
  workspace 停写告警。
- **技术支撑**：[研究稿 §10.1–10.3](../research/plugin-as-product/2026-11-01-plugin-as-product.md#101-profile-与启动器)
  （profile/bin T；boot 登记 row T 探针；seed consent 设计）。
- **验收**：§验收标准 1–4；`company-entry-smoke` + `release-smoke` 新断言。
- **依赖**：Q5/Q6/Q7。

### S2 · run bundle 身份与业务状态搬家

- **交付**：`bundle.json` v2 到 `<workspace>/.dsh-company/`；去 home 默认盘；v1 迁移；
  rebind 退役；日志/导出到 workspace；方法层/账本留 home（Q3 默认）并写只读导出；
  一 home 一 workspace 的启动器约束。
- **技术支撑**：[研究稿 §10.5–10.6](../research/plugin-as-product/2026-11-01-plugin-as-product.md#105-bundlejson-v2-与迁移)
  （v2 形状/迁移/备份；治理导出设计）。
- **验收**：§验收标准 5–8；`lifecycle-smoke` / `external-workspace-smoke` / manifest/ledger spec。
- **依赖**：Q1/Q2/Q3/Q5。

### S3 · 公司手册与内容面

- **交付**：碰撞感知 seed（`AGENTS.md` 优先，已存在则 `COMPANY.md`）；五 preset 候选同时含两者；
  manifest 记录实际目标；`handbook-smoke`/`handbook-budget` 覆盖两种目标；README 说明。
- **技术支撑**：[研究稿 §10.4](../research/plugin-as-product/2026-11-01-plugin-as-product.md#104-手册目标与注入)
  （候选过滤、目标选择、升级映射）。
- **验收**：§验收标准 9；`handbook-budget` / `company-skeleton` / `shipped-links` / preset-smoke。
- **依赖**：Q4。

### S4 · 产品文档与分发面（用户点名）

- **交付**：`README.md`、`_dist/安装手册.md`（由 `export-dist` 生成）、`packages/company-pack/README.md`、
  `packages/company-pack/workspace/README.md`、`AGENTS.md` 布局/命令、`docs/{profile,runtime-map,
  data-model,release,project-map,index,decisions,external-research,orient,demo}.md`、
  `docs/guides/{bootstrap,environments,release-runbook}.md`、`run/README.md`、`runtime/README.md`、
  `tests/README.md`、`checks/README.md`、`CHANGELOG.md`、`.agents/skills/web-window-ops`。
- **同时做**：全仓 stale-reference 清扫——`rg 'company-workspace|bundle\.json|DSH_COMPANY_REBIND|
  --profile web|一个 home 一个 bundle|侧栏.*工作区'` 逐条判“现行合同改 / 历史 Note 留 + 取代 banner /
  归档不动”；**文档预算**：现有 `doc-budget` 余量很小（如 data-model 75/76、profile 63/66），
  新增内容优先“搬旧形状到 notes/archived + 链接”，确需提额须按 docs/AGENTS 规则写 Note。
- **技术支撑**：[研究稿 §10.7](../research/plugin-as-product/2026-11-01-plugin-as-product.md#107-文档门禁与-_dist)
  （manual 模板、gate 关键句、doc-budget、stale sweep）。
- **验收**：§验收标准 10–11；`dist-manual` 新关键句；README/手册无旧主路径；`md-links`/`bare-path`/
  `doc-budget` 绿。
- **依赖**：S1/S2/S3 的最终事实；可与 S1 同步起草，最后收口。

### S5 · 验证、迁移与发布收口

- **交付**：新 keyless specs；smoke 矩阵改造；每道新判据红→绿证据；`0.5.0` + `_dist` 重导；
  v1 迁移演练；实现 Note/RFC。
- **技术支撑**：[研究稿 §10.8–10.9](../research/plugin-as-product/2026-11-01-plugin-as-product.md#108-测试矩阵最小可落地)
  （测试矩阵与技术风险）。
- **验收**：§验收标准 12–14；`pnpm verify` / `pnpm test` / release/lifecycle/company-entry/
  client-load；迁移演练记录。
- **依赖**：S1–S4。

## 验收标准

> 这是本卡“做”的判据草稿；Q1–Q5 拍板后定稿。每条都要能在真实入口或 keyless spec 上跑。

1. **产品入口**：干净 `DSH_HOME` + 干净 `HOME`；`pnpm company --workspace <tmp-workspace> --no-open`
   → 建立 `profiles/company`（bundles 含 base/web-app/pack）、装 pack、打出 banner；无
   `<home>/bundle.json`；`<workspace>/.dsh-company/bundle.json` 为 v2（无 `workspace` 字段）。
2. **Workspace 登记**：boot 后 Host/RPC 的 workspace 列表含目标 canonical path；无 Documents
   `default-workspace` 登记；客户端首屏不要求“先手点 Choose workspace”。
3. **启动解析**：`--workspace` > `DSH_COMPANY_HOME` > `settings.json` 最近 > TTY 询问；无 TTY 且
   无值 → 非零退出 + 两条可执行命令；Host 直接 `dsh --profile company` 无 env → 不写盘、不 seed、
   明确告警。
4. **seed 只补缺**：已有 `COMPANY.md`/`AGENTS.md`/`kb/**` 的 workspace，计划全 skip；未确认
   consent 时零写；确认后只建缺件；预设冲突不覆盖；二启字节稳定。
5. **身份搬家**：v1 `<home>/bundle.json` + 旧 workspace → 迁移到 workspace v2（id/createdAt
   保留）；`DSH_COMPANY_REBIND` 只告警不执行；旧盘显式 `--workspace` 仍可用。
6. **方法层/账本（Q3 默认）**：`/cultivation adopt` 仍写 `<home>/company/methods/<role>/`；
   present 仍写 `<home>/storages/company_deliverables.json`；workspace 的
   `.dsh-company/exports/` 有只读快照，权威仍在 home；模型工具不能经 workspace 写这两处
   （除 `danger-full-access` 的约定降级）。
7. **一安装一 workspace**：同一 home 再传不同 `--workspace` 时启动器拒绝并提示“新建 home”；
   session cwd 与登记一致；不会静默把第二个公司盘塞进同一 home。换项目 = 新 home 的路径
   有 smoke 覆盖。
8. **升级/卸载**：v2 pack 升 v3：未改基部替换、改过保留；扩张面不动；卸载 pack 后 workspace
   数据/公司盘完整；旧 `web` profile 装 pack 仍能起（兼容，不是产品入口）。
9. **手册注入**：角色会话首请求注入 `AGENTS.md`；若 workspace 已有 `AGENTS.md`，seed 的
   `COMPANY.md` 被注入；两者都在时按候选顺序加载/去重、不覆盖；超预算由 `handbook-budget` 红；
   两种目标都不在场时角色仍有 persona（不崩）。
10. **README/手册**：根 `README.md`、`packages/company-pack/README.md`、`_dist/安装手册.md` 均写清
    “`company` profile / `--workspace` / `.dsh-company/bundle.json` / workspace 是业务 run bundle /
    home 是 DSH 运行时 + host 治理（方法层/账本）/ 治理状态有只读导出”；不再把“一个 home 一个
    bundle”“侧栏手工加工作区”“rebind”当产品主路径（迁移说明可以保留旧词）。
11. **门禁**：`dist-manual` 新关键句（含 `--workspace`、`company`、`.dsh-company`、
    `AGENTS.md`/`COMPANY.md`、workspace 备份、host 治理；去掉旧必含）；`company-skeleton`/
    `handbook-budget`/`shipped-links`/`run-bundle-clean`/`layout-block`/`bare-path`/`md-links`/
    `doc-budget` 全绿；每道新判据有红→还原→绿原话。
12. **真实入口**：`release-smoke`（干净 home + company profile + 外部 workspace + 注册 + v2 +
    二启稳定）、`lifecycle-smoke`（升降级/卸载/数据保留）、`external-workspace-smoke`（搬 home
    不需 rebind）、`company-entry-smoke`（启动器/解析/seed）、`client-load-smoke`（浏览器打开即
    目标 workspace，零 console error）全绿；真模型不在本轮门槛。
13. **数据迁移演练**：用当前 dev 盘/临时 v1 盘跑迁移，记录 id/createdAt/基部哈希/方法/账本去向；
    旧文件保留一版；失败可回退（旧 home 不动）。
14. **文档与分发一致**：`0.5.0` 同 diff 重跑 `node tools/export-dist.mjs`；tarball 含 `bin/`；
    sha256 手册一致；`pnpm verify` / `pnpm test` 全绿。

## 范围与排除项

**范围（本轮产品形状）**
- `company` profile 与独立 home 的启动器/产品入口；workspace 解析、登记、seed consent。
- `bundle.json` v2、workspace 业务状态（公司盘/日志/导出）与 v1 迁移；方法层/账本留 host。
- 公司手册碰撞感知 seed（`AGENTS.md` 优先，已有则 `COMPANY.md`）与两候选注入；骨架/门禁/内容路径。
- `README`、`_dist/安装手册.md`、pack README、docs 合同/指南/决策台账、`CHANGELOG`。
- 相关 keyless specs、smoke、门禁与红/绿证据；`0.5.0` 导出。

**排除**
- 多租户、跨机器同步、统一对象存储；DSH session 删除 API。
- Windows 支持（继续 POSIX；不承诺跨 OS）；容器镜像/离线预构建。
- 浏览器内自建 onboarding UI（本轮用启动器询问；client 选择器作为后续增量）。
- 重写/删除旧 `DSH_HOME`、旧 sessions、旧 workspace 数据；只迁移、不清理。
- 改 vendor；升级 pin；npm registry 发布（仍按 [release.md](../../docs/release.md) 的第二个消费者再定）。
- 替角色写公司内容、改五角色 persona 语义（除 `COMPANY.md` 路径/候选与必要文案）。

## 已知与未决

- **已知**：profile 可建、pack 可装、外部 workspace 可启动（T）；boot 登记 → 浏览器自动选中 →
  CEO 会话已端到端 T（研究稿 §4.1b）；`agent-instructions` 候选不能含 `/`（C）；
  `customSkillDirs`/`cultivationRoot` 是 composition-time（C）；bin/独立 host row 均有 T 探针。
- **已决（2026-11-01）**：Q1–Q7 按用户授权采用推荐（见上方裁决）；剩余工程项 = Web onboarding（v1 不做）、
  Windows/registry（不承诺/不启用）、不可信项目完整威胁注入（v1 只做边界测试）、逐道新门禁的完整红证
  （已有关键红证，未穷尽）。
- **不做假设**：不能从“profile 叫 company”推断数据隔离；不能从“workspace 已登记”推断模型
  权限；不能从“host 写了文件”推断 Session sandbox 管得住。

## 方案与取舍

已比较并建议的方案（细节 = [研究稿 §6](../research/plugin-as-product/2026-11-01-plugin-as-product.md#6-方案取舍)）：

| 决策 | 推荐 | 输掉的方案 | 为什么 |
|---|---|---|---|
| workspace 布局 | 根盘 + `.dsh-company/` 元数据 | 全嵌套 / 可见 `company/` | 保留 160+ 路径引用与产物可见性；侵入靠只补缺+确认 |
| 产品入口 | `company` profile + 启动器 | 只写文档 / 浏览器 onboarding / 独立应用 | 满足 R1/R2/R5；不换表层、不造第二套机制 |
| workspace 解析 | boot 前定；host 只认 env | host 等浏览器选择 | 方法层 composition-time；boot 不能等 |
| 安装/项目 | 一 home 一 workspace（v1） | 一安装多 workspace | 方法层/账本可留 host 且不串；active/lease/Client 少一层状态；换项目 = 新 home |
| 手册 | 碰撞感知（`AGENTS.md` 优先，已有则 `COMPANY.md`） | 全量改名 `COMPANY.md` / 继续只用 `AGENTS.md` | 不覆盖用户手册；避免全量 churn；复用 agent-instructions |
| 方法层/账本 | 留 home + 只读导出（Q3） | 搬 workspace | D25/M2 保护不降级；代价是备份带 home 导出 |
| seed | 启动器确认 + host 只执行 | host 静默只补缺 | 避免任意 cwd 被变成公司盘 |
| 版本 | 0.5.0 + v1 迁移 + rebind 退役 | 兼容旧 rebind | 指针在 workspace 后 rebind 无意义 |

## 关闭条件

- Q1–Q5 已由用户确认（Q6/Q7 可一并确认或授权按建议执行）。
- 若结论 = 做：`## 验收标准` 定稿；下游 RFC/实施卡的申请已提交并记录去向（`rfc` / `implementation`
  / `用户（日期）` 之一）。**下游受理不是关闭条件**。
- 若结论 = 不做/以后做：写清理由、触发条件与适用范围；需要下游保留的提交申请。
- 满足后写 `可关闭：是`，卡顶补 `> **结论/去向**`，同次 `git mv` 到
  [_archive/settled_issues](../_archive/settled_issues/README.md)，更新两边清单；研究题在最后
  一张使用它的活卡离开时随迁 [_archive/research](../_archive/research/README.md)。

## 给第二个 review agent 的导读

**这张卡是什么**：产品形状与落地的讨论卡，不是实施合同。实施合同在用户批准后另立 RFC/Note；
本卡只回答“为什么做、做成什么样、哪些还没定”。

**先读什么（按顺序）**
1. 本卡「原始意图」与 R1–R5——目的与保真。
2. [研究稿](../research/plugin-as-product/2026-11-01-plugin-as-product.md) §0 结论、§3 机制、
   §4 现状、§5 数据卡。
3. 本卡「未决问题」与「验收标准」——需要用户拍板的分支与可执行判据。

**review 必须逐条回答的六个问题**
1. **意图保真**：R1–R5 能否逐条对回原话？有没有把用户没要的“多租户/SaaS/浏览器 onboarding”
   偷塞进范围？
2. **数据归属**：workspace / home 的每一份事实是否都回答了 owner、authority、scope、备份、
   删除？方法层/账本留 host 的理由（D25/M2）是否成立？workspace 只读导出会不会被误当第二权威？
3. **UX**：启动器解析 + boot 登记 + 首启确认，是否真的能做到“打开就在目标 workspace、不用手点
   Choose workspace”？一安装一 workspace 的“换项目 = 新 home”是否可接受？自动选中已有 T 探针，
   但 registrar 集成/seed/刷新复用仍需复验。
4. **迁移安全**：v1→v2、rebind 退役、手册碰撞 seed、旧 `web` 部署，是否都有只补缺/保留旧
   文件/可回退的路径？有没有“升级即静默覆盖”？`bundle.json` 在 workspace 可被模型写坏，
   host 备份/校验够不够？
5. **分发真相**：`_dist/安装手册.md`、README、`dist-manual` 门禁是否同 diff 改？手册是否还教
   旧形状？tarball 是否含启动器/新骨架？文档预算余量够不够（不够时搬还是提额）？
6. **范围**：排除项是否合理？有没有必须现在做却被推到“以后”的（尤其 workspace 登记、seed
   consent、v1 迁移、doc-budget 处置）？

## 关联

- 落地顺序：[2026-11-01 落地顺序](2026-11-01-landing-plan.md)（P0–P6；本卡 Q1–Q7 是 P0）
- 落地卡：[产品生命周期](2026-11-01-product-lifecycle.md)、
  [workspace 与数据安全](2026-11-01-workspace-and-data-safety.md)、
  [发布与文档](../_archive/settled_issues/2026-11-01-release-and-docs.md)
- 研究：[主稿](../research/plugin-as-product/2026-11-01-plugin-as-product.md)、
  [生命周期](../research/plugin-as-product/2026-11-01-product-lifecycle.md)、
  [信任/数据](../research/plugin-as-product/2026-11-01-trust-and-data.md)、
  [发布/验证](../research/plugin-as-product/2026-11-01-release-and-verification.md)

## 实施回执（2026-11-01）

第一批产品形状已落地：`company` profile + 启动器 + boot 登记 + seed consent + `bundle.json` v2/迁移 +
手册碰撞 + 方法/账本留 host + 治理导出 + `_dist` 0.5.0。验证绿：`pnpm verify` / `pnpm test` /
`release --verify`；**真实旧 home v1 迁移演练 T**（id/createdAt 保留、旧文件 `.migrated-*`、v2 在
workspace）；**`COMPANY.md` 注入 T**（`handbook-smoke --cwd` 全过，不混开发仓库 AGENTS）；
**workspace 搬迁 T**（isolation-matrix 新 case，v2 id 不变）。剩余（Web onboarding、Windows/registry、
威胁注入、逐门禁红证）= [落地顺序 §实施回执](2026-11-01-landing-plan.md#实施回执2026-11-01静默自主执行)
与 [v2 manifest Note](../../notes/implemented/2026-11-01-plugin-as-product-v2-manifest.md)。
