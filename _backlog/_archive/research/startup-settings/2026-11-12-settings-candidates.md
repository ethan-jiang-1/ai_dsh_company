---
topic: startup-settings
intent: 全仓盘点可做成启动 settings 的指定点/默认值/阈值，按 A/B/C/D 分类，补齐 wiki/productType/deliveryMode/method 之外的候选字段，防 settings 面缺损
---

# 启动 Settings 候选字段全仓盘点（指定点 / 默认值 / 阈值）

> 姊妹材料 = [2026-11-12-startup-settings.md](2026-11-12-startup-settings.md)（机制半：注入槽 / 自持 modal / `.dsh-company/settings.json` / host section 注入链，已吸收不重复）。本篇 = 内容半：**全仓每一个「我们指定这样/那样」的点**，按 A/B/C/D 分类。
> 用户口径：不盘点「让模型更聪明」的旋钮（persona 质量 / 措辞质量）；只盘点公司/用户**指定**的绑定、选择、默认、阈值。

## 0. 方法与基线

- 【事实】repo HEAD = `11ff166f`（本轮 `git rev-parse --short HEAD` 实跑）；日期 2026-11-12。vendor/dsh 钉 `dsh-v0.2.1-rc.5`（根 AGENTS.md §vendor 簿记），本轮只读 grep vendor，未写任何 vendor 文件。
- 【事实】本轮实读：根 AGENTS.md、姊妹机制研究全文（441 行）、docs/content-charter.md、content/README.md、content/manifest.json、`src/index.ts`、`cordis.patch.yml`、`src/host/**` 全部关键模块（workspace-resolution / runtime-guard / bootstrap / handbook / language-policy / company-language / req / delivery / prd / deliverables / signoff / client-diagnostics / cultivation / contracts / retry-policy / rotating-log / requirements-check / run-bundle-paths）、11 个 preset YAML（ceo 全文 + 其余逐行 grep 核对）、`_shared` 与 CEO skills 全文、content 全部层（AGENTS.md / state ×5 / company ×3 / generic ×6 / charters 抽样+grep / product-types check-rules ×2 / delivery-modes rules ×2 / templates/meta.md / kb-setup ×2 / contracts/workflow.md）、client 关键面（locales / roles / company-identity / index / tabs / cultivation 数据面，grep 全量常量）、run/ 三件 + tools/setup.mjs + docs/guides/environments.md + docs/contracts/profile.md、vendor 五个设置面定点核对、tests 钉值抽样。
- 分级：【事实】= 一手 file:line（本轮实读）或实跑输出；【推论】= 由事实推出；【建议】= 方案取向。**§1 总表的「现家/现值/消费者」列均为【事实】，「建议」列为【建议】；§2 的强制点判断除引源外为【推论】。**
- 分类透镜 = content-charter：四槽（人/流程/方法/政策，docs/content-charter.md:17-22）、三层+方法正交轴（:28-36）、铁律 3「一个事实一个家」（:44）、§8「政策/阈值/公司事实 = 低成本数据，放公司层」（:69-73）、红牌「把政策数字写进代码或注释」（:83）。**settings 只存选择，规则正文/政策数字留在内容层与公司盘。**
- 本轮未跑 pnpm test/verify（任务明示不需要，零代码改动）；未建卡、未动题名页 README、未翻任何 status。

## 1. 盘点总表

> 类别：**A** = 适合启动 modal（workspace 级启动绑定）；**B** = 别处已可配（DSH settings / profile patch / env），modal 至多反映/链接；**C** = 内容层选择或公司事实（选择可暴露，正文/数字不进 settings.json）；**D** = 不是用户设置（机制不变量 / dev-ops / 模型智力旋钮）。作用域：W=workspace，P=profile/部署，S=会话，M=动议。

| # | 候选 | 类 | 现家 file:line | 现值/默认 | 消费者 | 作用域 | 今天怎么改 | 建议 |
|---|---|---|---|---|---|---|---|---|
| 1 | wiki 依赖指针 | A | 无现有机制（姊妹 §8.6：vendor/公司 0 命中） | 无 | 新 prompt section | W | 不可 | 新字段 `wiki`（已知四字段） |
| 2 | 强制产品类型 | A | content/state/company.md:4；src/host/commands/req-command.ts:150-154；src/host/run-bundle/bootstrap.ts:108-114 | 出厂 business-software；动议 meta > company.md > 五层默认 | /req check、首启 seed、手册 content/AGENTS.md:16、product-definition SKILL.md:28-30 | W+M | 改 kb/company.md 或动议 meta.md | 新字段 `productType`（已知） |
| 3 | 强制交付模式 | A | req-command.ts:73-79；delivery-command.ts:51-57；content/AGENTS.md:17 | 缺省/占位 = productized（隐式，不建包） | /req、/delivery、三个 workflow skill 的 dispatch 头 | W+M | 动议 meta.md | 新字段 `deliveryMode`（已知） |
| 4 | 强制方法包 | A | presets/quality-loop-producer/agent.cordis.yml:28；verifier:26；_shared/skills/quality-loop/SKILL.md:19,38 | 任务书点名 `<pack>@<version>`，缺 = fail-closed | 质量环两侧、vp-eng persona:39 | W 引用 / 方法包公司级 | 人放方法目录 + 任务书点名 | 新字段 `method`（已知；作用域错配见 §2.4） |
| 5 | 协作模式（单操作者/多人） | A | content/generic/collaboration.md:16-18 | 开场由人口头声明「这场是多人模式」；没声明 = 单操作者 | CEO spawn 行为、审批路由（human-interface.md:26）、派活行 | W（今天实为 S 口头） | 会话里口头声明 | 新字段 `collaborationMode` |
| 6 | 工作时区 | A | presets/ceo/agent.cordis.yml:28（六角色同钉）；content/state/company.md:5；packages/company-pack/README.md:155 | Asia/Shanghai 写死；company.md 声明了但**未接** | time-context 日期通道；client 身份显示（company-identity.ts:67） | W 期望 / 今天 P 硬编码 | 改 preset YAML（且 presets.spec.ts:343 钉着） | 新字段 `timeZone` + 解双家（§2.6） |
| 7 | 质量环开关与轮次上限 | A | presets/vp-eng/agent.cordis.yml:39（何时用 = 模型判断）；quality-loop SKILL.md:35 | 用不用靠模型判「复杂产出」；轮次上限默认 2 | VP-Eng 发工 brief | W | 任务书里写 | 新字段 `qualityLoop.mode/maxRounds`（可选） |
| 8 | 互审强度 | A | presets/ceo/skills/chairing-staff-meeting/SKILL.md:37-38 | 互审是重仪式：写不出防哪个失效就不设；**默认单审或 CEO 自审** | CEO 收口流程 | W | 动议里口头要求 | 新字段 `crossReview`（可选） |
| 9 | 需求层默认深度 | A | content/templates/meta.md:24；src/lib/requirements-check.ts:34；product-types/*/check-rules.json:4 | 不写 = 到 PRD 为止（MRD/StRS/PRD） | /req check 层判、meta 模板 | W 默认 + M 声明 | 动议 meta.md `需求层:` | 新字段 `defaultRequirementLayers`（可选） |
| 10 | 首启播种剖面（样例/空白） | A缓做 | content/kb-setup/seed.json:3-73；bootstrap.ts:121-146 | 恒播样例公司事实（sample:true），only-fill | 首启 bootstrap | W 首启 | 不可（无开关） | 缓做：需新内容变体（§2.10） |
| 11 | 界面/工作语言 | B | cordis.patch.yml:28-31（bundle 缺省 zh）；src/host/language/company-language.ts:35-42,99；prompt/language-policy.ts:59-64 | DSH locale.preference 唯一源；缺省 zh；非 zh/en→en；live 每轮求值 | company:language section（order 1）、host 回执 | P | DSH Settings→General 语言行 | **不重复造**；modal 反映/链接（先例 pattern） |
| 12 | cultivationRoot（方法层根） | B | cordis.patch.yml:111（!!js 锚 baseUrl）；src/host/run-bundle/config.ts:13-19；cultivation.ts:69-72 | `<DSH_HOME>/company/methods/` | host adopt/revoke、preset customSkillDirs 同前缀 | P（公司级） | profile patch 该行 config | modal 不拥有；至多显示 |
| 13 | handbookSkipPresets | B | src/index.ts:63-66；cordis.patch.yml:112-115（注释掉的覆盖例）；handbook.ts:76 | 缺省 = NON_ROLE_PRESETS 派生（5 个 support） | 手册注入跳过集合 | P | profile patch 覆盖 | 部署旋钮，不进 modal |
| 14 | 新会话默认 preset | B | cordis.patch.yml:38-41；run/company.overlay.yml:7-10 | default: ceo | agent-preset-registry | P | profile patch | modal 不拥有（DSH 组合面） |
| 15 | 团队容量四阈值 | B | cordis.patch.yml:85-91；docs/contracts/profile.md:59-60 | maxMembers 8（vendor 代码默认 16，agent-team/src/index.ts:42）/ maxTasks 256 / maxMessageBytes 65536 / disposalTimeoutMs 5000 | agent-team 服务；maxMembers 兼编制守卫（patch:84 注释） | P | 组合层调（profile.md 明示） | modal 不拥有；与 kb/org.md 编制联动提示 |
| 16 | 问询窗口形态/时长 | B | presets/ceo/agent.cordis.yml:135-136（六角色同）；vendor tool-ask-user/src/index.ts:24 | mode: timed / timeout: 120（vendor 默认 legacy；BUG-021 显式钉住） | ask_user_question | P | preset/profile patch | 部署钉值，非 workspace 绑定 |
| 17 | 联网取证面 | B | presets/ceo/agent.cordis.yml:143-147（全员同）；vendor ui-settings-web-search README | fetch:true / searchTimeoutMs 60000；web-app 把 host tool-web disabled，preset 自声明 | web_search/web_fetch | P | preset 行 / DSH Web search 设置页 | 若要做「本次禁联网」需新机制（§8 开放） |
| 18 | 浏览器取证开关 | B | presets/ceo/agent.cordis.yml:162（DSH_COMPANY_BROWSER=on/off + 包可解析自动探测）；run/env.sh:66 | dev 强制 on；发布缺包自动 off | browser-use 组 | P/env | 环境变量 | env 已可配；modal 至多反映 |
| 19 | 权限/沙箱/审批 preset | B | run/entry-probe.patch.yml:2-14（形状例）；vendor interaction/permission-presets；run/env.sh:38-51（DSH_PERMISSION_MODE） | DSH 权限 preset 面（composer 已有下拉） | 全会话 | P/S | DSH 权限 preset / env | 不重复造 |
| 20 | 模型选择 | B | vendor client/ui-model-selection、ui-settings-models（本轮 ls 确认存在） | composer 模型选择器 | 会话 | S | DSH 现成面 | 不重复造 |
| 21 | auto-continue 模式 | B | 第三方 dsh-client-auto-continue（姊妹 §2 活证据） | Follow default / off / recover / loop | 会话 | S+P | 该插件自己的 settings | 不重复造 |
| 22 | plan 模式 | B | presets/ceo/agent.cordis.yml:86-99（公司化 section）；vendor plan-mode | 会话模式切换 | 会话 | S | composer plan 槽 | 不重复造 |
| 23 | 并行工具调用上限 | B | vendor client/ui-settings-agent-loop README（Plugins→Agent loop） | agent-loop namespace 可配 | agent loop | P | DSH 设置页 | 不重复造 |
| 24 | API key / 凭据 | B | docs/guides/environments.md:11-12；根 AGENTS.md §密钥 | `<home>/.credentials.yaml`，按 home 隔离 | 真模型调用 | P | 凭据库 / DSH 设置 | 绝不进 settings.json |
| 25 | workspace 本身 | B | src/host/workspace/workspace-resolution.ts:105-135（env→cwd→saved→picker）；run/env.sh:10 | DSH_COMPANY_HOME / cwd / `<DSH_HOME>/company/settings.json` 最近选择 | host boot | P | env / DSH picker | settings 是 workspace 级，workspace 不是字段；**命名冲突见 §7.2** |
| 26 | 默认章程（哪份 charter） | C | content/charters/<role>.md ×6；seed.json:50-72；content/README.md:9-10 | 每角色一份默认，首启 only-fill 到 kb/<role>/CHARTER.md | 角色开工动作 | W | 改 run bundle 里的实例 | 无「选哪份」机制；编辑归 kb，modal 可链接 |
| 27 | 手册/模板 override | C | src/host/prompt/handbook.ts:34-40；content/README.md:6-8 | `.dsh-company/overrides/AGENTS.md`/templates/ 存在即优先（提示级） | 手册注入、模板读取 | W | 放 override 文件 | 文件存在即选择，不需 settings 字段 |
| 28 | 政策线数字 | C | content/company/policy-lines.md:6-12,23 | 毛利 30% / 折扣 9 折 / 维护年费 15–20% / 固定支出 $500/月 / 云 $2000/月 / 试点 $200/月 / 并行 8 / 服务信用 ≤10% | request_signoff（signoff-tool.ts:17 明言数值在部署 policy）、CFO/COO skills | W | 改 kb/policy-lines.md | **数字不进 settings.json**（charter §8/红牌）；modal 链接编辑 |
| 29 | 公司身份（名/产品名/样例标记） | C | content/state/company.md:2-6；src/client/data/company-identity.ts:52-68 | 梦之队（样例）/ DSH 梦之队 / sample:true | 品牌（Brand.tsx:10）、角色会话 | W | 改 kb/company.md | 公司事实留 company.md；modal 可作编辑入口 |
| 30 | 编制/客户盘公司事实 | C | content/state/org.md:3,9,72 | 50 人六条线；现有客户 9 家 | 章程/组队/超编守卫 | W | 改 kb/org.md | 同上 |
| 31 | 人侧归属/席位/费率 | C | content/state/owners.md:12-17；roster.md:3-5；company/rates.md:5-6,11-22 | 全 `<待填>` = 配置缺口，不得编 | 问询路由、COO/CFO fail-closed | W | 填 kb 三件 | modal 可做**缺口清单**（只读投影，§8） |
| 32 | 对外件复核闸门 | C | content/company/review-protocol.md:7-8 | 缺具名复核声明不得外发，fail-closed | final/对外件 | W | 改 kb/review-protocol.md | 政策规则正文留内容层 |
| 33 | 产品类型包内容/新类型 | C | content/product-types/ ×2；product-definition SKILL.md:38 | 2 类型；新类型随包发布，**workspace 覆盖暂不支持** | /req 规则、playbook | P 内容 | 改 pack（发版） | 选择 = 字段 2；正文不进 settings |
| 34 | 交付模式包内容 | C | content/delivery-modes/ ×2 + 隐式 productized；delivery-mode-coverage.spec.ts:37-41 | 2 包 + 1 隐式默认 | /delivery 规则 | P 内容 | 改 pack | 选择 = 字段 3 |
| 35 | 方法包正文（starter） | C | content/methods/quality-loop-{producer,verifier}/{system-architecture,vv-plan}/SKILL.md；tools/methods-init.mjs:16 | starter 两包，`pnpm methods:init` 播到 `<DSH_HOME>/company/methods/` | 质量环 | 公司级 | 人放方法目录 | 选择 = 字段 4；正文住方法层 |
| 36 | 维护年费口径 | C | content/company/policy-lines.md:8 | ≈项目额 15–20% | CFO 测算 | W | 改 kb/policy-lines.md | 政策数字，同 #28 |
| 37 | 定价曲线 3-4-3 | D | presets/vp-sales/skills/pricing/SKILL.md:3,14 | project-services 里程碑计费 3-4-3；productized 缺方法 fail-closed | 定价 skill | 方法规则 | 改方法内容 | 方法规则正文，非选择 |
| 38 | 动议类型（决策/生产/诊断/口径问答） | D | content/templates/meta.md:20 | 模型按动议性质选枚举 | meta 户口 | M | 动议 meta.md | 每动议选择，非 workspace 启动绑定（§6.13） |
| 39 | seed only-fill 不覆盖 | D | content/kb-setup/seed.json:3；bootstrap.ts:227-261（wx） | 恒 only-fill | 首启/补种 | 机制 | 不可 | 机制不变量（用户数据安全） |
| 40 | 手册注入预算 | D | src/host/prompt/handbook.ts:21（32_768B）；presets/ceo/agent.cordis.yml:253（maxBytes 32768） | 超限告警不截断；gate 核对 | 手册/agent-instructions | 机制 | 不可 | 预算门禁 |
| 41 | 压缩/裁剪阈值 | D | presets/ceo/agent.cordis.yml:116-118（全员同：8192/4096/1024） | tool-result-pruner 三值 | 长会话上下文 | 机制 | preset 行 | 上下文机制，非用户绑定 |
| 42 | 重试策略/深度表 | D | src/lib/retry-policy.ts:18-24（maxAttempts 2）,42-51（vp-eng 3 / 其余 2 / child=worker）；presets maxDepth 行（ceo:216 等） | parity spec 钉死（delegation-retry.spec.ts） | subagent_retry、委派 | 机制 | 不可（两份声明同改） | 机制不变量 |
| 43 | journal 读取窗口 | D | content/charters/ceo.md:13（六章程同）；ceo preset:48；kb-setup/guide.md:27 | 最近 3 篇 | 开工动作 | 内容启发式 | 改内容 | 上下文装载启发，非绑定 |
| 44 | 等待/预算/组队启发 | D | chairing SKILL.md:30-32（单次等待≤3min）；delegation-policy SKILL.md:10-14,27-29（默认自己做/15×/effort 档） | guidance | CEO/委派 | 流程 guidance | 改 skill | 流程判断指导，非用户指定 |
| 45 | 新成员 fresh 默认 | D | chairing SKILL.md:69 | 默认 fresh+任务书；fork 显式 | spawn_teammate | 机制+guidance | 不可 | 0.2.1 activation 机制 |
| 46 | client UI 常量族 | D | src/client/cultivation/cultivation-data.ts:123,129（30s/120 条）；cultivation-actions.ts:170（20s）；tabs/LedgerTab.tsx:31；AttentionTab.tsx:46,76；company-tab-registration.ts:71-150（order 50-58） | 轮询/上限/页签名次 | UI | 机制 | 改代码 | UI 机制，非启动绑定 |
| 47 | 日志/诊断容量 | D | src/host/logging/rotating-log.ts:9（256KB）；commands/client-diagnostics.ts:20-22（256KB/8000 字符） | 有界追加 | 日志 | 机制 | 不可 | 运维容量 |
| 48 | 培养文本限额 | D | src/lib/cultivation-record.ts:72-74（2000/20/1000）；cultivation.ts:285-286,483-484 | 记录/验证字数限 | /cultivation | 机制 | 不可 | 存储形状 |
| 49 | archive/purge 天数 | D | src/host/cultivation/cultivation.ts:511-513,542-544 | 必填参数 1..3650，无默认 | 人命令 | 命令参数 | 命令传参 | 人每次指定，非默认值 |
| 50 | 内容加载 tier（t0/t1/t2） | D | content/manifest.json:4-63 | t0 常驻/t1 摘要/t2 按需；**src 运行时无消费者**（§7.1） | 仅 checks/gates/content-manifest.mjs | 内容组织 | 改清单 | 上下文经济，非用户旋钮 |
| 51 | 编号/退役词/层规则 | D | src/lib/requirements-check.ts:34,107,371；product-types/*/check-rules.json:3-10 | 五层默认 + 类型包覆盖 | /req check | 内容规则 | 由 productType 驱动 | 已被字段 2 覆盖 |
| 52 | 日期/署名/A1 命名纪律 | D | content/generic/work-handoff.md:12-13；deliverable-states.md:7-8,13 | 真日期 fail-closed、署名行、`<日期>-<slug>` | 全员 | 流程不变量 | 不可 | 流程契约 |
| 53 | persona 收紧开关（注释） | D | presets/ceo/agent.cordis.yml:49-50（complete/includeRuntimeContext 注释） | 未启用 | persona | 智力旋钮 | — | 任务明示排除 |
| 54 | UI 收口 disabled 行 | D | cordis.patch.yml:15-20（ui-trajectory/ui-sidebar-terminal） | disabled:true（2026-11-02 用户定案） | web UI | 产品决定 | bundle 行 | 已定案的产品面，非启动绑定 |
| 55 | session-search 隔离组 | D | cordis.patch.yml:54-67（path !!js / openAt: first-search） | per-profile cache | 六角色 session_search | 机制 | 不可 | 机制 wiring（freshProvider/forkProvider 同理，patch:92-96） |
| 56 | workflowPresets fallback | D | src/index.ts:132（['vp-eng']）；prompt/contracts.ts:31-34 | 工具探测失败时的白名单 | workflow 合同注入 | 机制 | 不可 | 能力探测 fallback |
| 57 | dev/ops 环境族 | D | run/env.sh:4,10,38-51,66；run/company.overlay.yml；tools/setup.mjs:93（DSH_CLIENT_TITLE 构建期烤入）；environments.md:22-25（端口） | 双 home / 沙箱探测 / 构建标题 | 开发环 | dev | source/构建 | **开发者面，明确不进用户 settings** |
| 58 | 一安装一公司/多 profile 体检 | D | docs/contracts/profile.md:21,31-32；runtime-guard.ts:138-142 | 数据隔离靠 DSH_HOME；多 profile 装包告警 | 部署形状 | 部署 | 换 home | 部署形状，非字段 |

## 2. A 类详述（强制点 + 拟字段）

> 强制三档（沿用姊妹 §5.5）：**软** = prompt section 注入（order 501 紧随手册 500，thunk 活读）；**硬** = 命令解析链插 settings 层；**首启** = 播种层读一次。以下除已知四字段外均为本轮新增候选。

### 2.1–2.4 已知四字段（简列，详见姊妹 §5.5/§7）

- **wiki**（string 指针，默认 null）：无现有消费点，纯新造；软强制 = section 注入「依赖 wiki = Z，先读 index」。格式待 wiki-knowledge-map 姊妹研究合流。
- **productType**（enum：盘上 `content/product-types/` 目录名，今天 business-software / hardware-software；默认 null = 沿用现链）：硬强制点 = req-command.ts:150-152 前插 `settingsType ??`；首启点 = bootstrap.ts:108-114（改 settings 不重播，only-fill）。【事实】消费面比姊妹清单更宽：product-definition SKILL.md:28-30 与三个 workflow skill 的 dispatch 头（sales-workflow:23-25 等）也按同链解析——软强制 section 必须同时压住这些 skill 的「问/猜」语义。
- **deliveryMode**（enum：productized / project-services / managed-service；默认 null = 回落 productized）：硬强制点 = req-command.ts:73-79 与 delivery-command.ts:51-57 的缺省回落改读 settings。【推论·交互警示】productized 在定价/运营/经济性 skill 里是**缺方法 fail-closed** 态（pricing/SKILL.md:14、ops-feasibility:19、project-economics:25）——用户强制 productized 又问定价，会撞「缺方法」闸；modal 应提示该组合的后果。
- **method**（`<pack>@<version>` string，默认 null）：软强制 = section 要求任务书点名；fail-closed 闸不变（producer:28 / verifier:26 / quality-loop SKILL.md:38）。【事实】作用域错配：方法包住 `<DSH_HOME>/company/methods/`（公司级，cordis.patch.yml:106-111），settings 住 workspace——引用可能不在本机（姊妹 §9.5 同判）。

### 2.5 collaborationMode —— 协作模式【建议·必选级新增】

- 【事实】现状 = 纯口头：「多人模式（开场由人声明『这场是多人模式』时启用）……没声明就是单操作者模式」（collaboration.md:16-18）。模式差异是硬的：多人模式 CEO 不 spawn 代劳、改落派活行任务书（:17-18）；审批由各自根会话发起而非升级 CEO（human-interface.md:26、collaboration.md:23-24）。
- 拟字段：`collaborationMode: 'single-operator' | 'multi-human'`，默认 `single-operator`（与现语义一致）。
- 强制点：**软**（section 注入「本 workspace 协作模式 = X，按 collaboration.md 对应节执行，不必等用户口头声明」）。【推论】无命令解析链可插——模式消费全在模型行为层，软强制即满强制；但要在 section 里显式覆盖「开场由人声明」句，否则模型仍等声明。
- 交互：与四字段正交；改变 HITL 路由与 CEO 组队行为，是「这次研究用这种套路」的最直接候选之一。

### 2.6 timeZone —— 工作时区【建议·必选级新增；先解双家】

- 【事实】三处现状：① 六角色 preset-clock 同钉 `timeZone: Asia/Shanghai`（ceo:28、cfo:27、cmo:26、coo:27、vp-eng:27、vp-sales:27），且 tests/presets/presets.spec.ts:343 把该钉值当不变量断言；② company.md frontmatter 已声明 `timeZone: Asia/Shanghai`（state/company.md:5），client 解析它（company-identity.ts:67）但**host/preset 无人消费**；③ pack README.md:155 明言「时区仍写死 Asia/Shanghai（未接 profile）」——文档自认缺口。
- 【事实】vendor 语义：time-context 的 config.timeZone 只是**回落**，浏览器时区解析成功时优先（vendor/dsh/packages/context/time-context/src/index.ts:205）；headless 无浏览器才吃钉值。
- 拟字段：`timeZone: <IANA string>`，默认 `Asia/Shanghai`（保持现行为）。
- 强制点：**软**先行（section 注入工作/落款时区）；**硬**需把 company.md/settings 的值接进 time-context——preset 行是 mount 期静态 config，workspace 级动态时区要新机制（host 侧覆盖或 per-session 注入），且须同改 presets.spec.ts:343 的钉值断言。【推论】v1 只做软 + 把 company.md 的 timeZone 立为唯一事实家（preset 钉值降为出厂回落），避免第三份数字。
- 交互：与四字段正交；影响 journal/交付物日期落款（work-handoff.md:12-13 的真日期纪律）。

### 2.7 qualityLoop —— 质量环开关与轮次【建议·可选】

- 【事实】用不用 = 模型判断：「复杂产出要独立复核时……先加载 quality-loop 再发工」（vp-eng persona:39）；轮次上限 = brief 字段，**默认 2**，超限升级不加轮（quality-loop SKILL.md:35,121-123）。
- 拟字段：`qualityLoop: { mode: 'auto' | 'always' | 'off', maxRounds: number }`，默认 `{ auto, 2 }`。
- 强制点：**软**（section 给定 mode 与轮次，brief 模板照写）；无命令链。`off` 不豁免对外件人类复核闸（review-protocol.md:7-8、quality-loop SKILL.md:15,158）——section 要写明这条边界。
- 交互：与 method 强耦合（method 包由质量环消费）；`mode: off` 时 method 字段失去主消费点，modal 应联动置灰或提示。

### 2.8 crossReview —— 互审强度【建议·可选】

- 【事实】现状默认 = 单审或 CEO 自审；互审是重仪式，每条链必须写明防哪个具体失效，写不出就不设（chairing SKILL.md:37-38）。
- 拟字段：`crossReview: 'auto' | 'always' | 'off'`，默认 `auto`（现语义）。
- 强制点：**软**（section 注入「本 workspace 互审 = always：每份职能稿必须有一条写明失效模式的交叉评审链」）。
- 交互：与 collaborationMode 弱相关（多人模式互审走各自根会话）；与 qualityLoop 互补（环内独立复核 ≠ 职能互审）。

### 2.9 defaultRequirementLayers —— 需求层默认深度【建议·可选】

- 【事实】meta 模板「需求层: ……不写 = 到 PRD 为止」（templates/meta.md:24）；checker 默认 DEFAULT_LAYERS = MRD/StRS/PRD（requirements-check.ts:34），类型包 defaultLayers 覆盖（check-rules.json:4，两类型今天同值）；解析链 = 声明 > 类型包 > 默认（requirements-check.ts:371）。
- 拟字段：`defaultRequirementLayers: string[] | null`，默认 null（沿用类型包）。
- 强制点：**软**（section 给定「本轮需求层到 SyRS/IRS」，CEO 写 meta 时照抄）；**硬**增量 = /req check 在 meta 未声明时读 settings 层（改 requirements-check 调用点 req-command.ts:264-270）。
- 交互：受 productType 约束——business-software 的 layers 只到 PRD（check-rules.json:3），声明更深层会被 /req 判红（req-command.ts:238-246）；modal 选项必须按所选 productType 过滤。

### 2.10 seedProfile —— 首启播种剖面【建议·缓做】

- 【事实】今天首启恒播样例公司事实（seed.json:4-73；state/company.md:6 `sample: true`），only-fill 不覆盖（bootstrap.ts:227-261）；类型相关 seed 缺 productType 时跳过 + warning，不猜（bootstrap.ts:202-215）。
- 拟字段：`seedProfile: 'sample' | 'minimal'`（首启一次性）。【推论】需要 pack 新增 minimal 内容变体与 seed 清单分支，改动面超出 settings 本身；且 only-fill 语义下「改 settings 不重播」，价值仅限全新盘。缓做，v1 用 productType 首启绑定（姊妹 §5.5）已覆盖最痛的播种选择。

## 3. B 类：已可配面（modal 反映/链接，不拥有）

**Host Config 基线（纠正任务锚点）**：【事实】公司 host **没有 schemastery Config schema、没有任何 `.volatile()` 字段**——`HostConfig = CultivationHostConfig & { handbookSkipPresets? }`（src/index.ts:63-66），运行时闸 validateHostConfig 只认 `cultivationRoot` / `handbookSkipPresets` 两键，未知键 fail-loud（config.ts:13-15；头注明言不为可选旋钮引 schemastery peer，config.ts:1-6）。tests/host/index/config.spec.ts:11-29 钉着该形状。⇒ 走 DSH settings 表单（方案 b）需要先新增 volatile 字段面，今天不存在。

**cordis.patch.yml 钉值基线**（逐项消费者见 §1 表 #11-25）：
- 【事实】locale preference zh（:28-31）——替换 web-app 行；用户 Settings 显式选择更高层优先，reset 回落此缺省（注释 :22-27）。语言桥 = 唯一源 locale.preference，缺省 zh、非 zh/en→en、settings/document-updated 实时跟随（company-language.ts:35-42,80-91,99）；company:language section order 1、每轮求值（language-policy.ts:59-64）。**这是启动 settings 注入的现成先例 pattern：活读 + section，勿另造语言字段。**
- 【事实】agent-preset-registry default ceo（:38-41）；agent-team 四阈值（:85-91，maxMembers 8 对齐官方并兼编制守卫，vendor 代码默认 16 = agent-team/src/index.ts:42，profile.md:59-60 明示「组合层调」）；tool-agent-team freshProvider: spawn / forkProvider: fork（:92-96，机制 wiring）；session-search path/openAt: first-search（:61-67，隔离组机制）；cultivationRoot !!js（:111）；handbookSkipPresets 注释覆盖例（:112-115）；ui-trajectory/ui-sidebar-terminal disabled（:15-20，产品收口定案）。
- 【事实】preset 层部署钉值：ask-user timed/120（ceo:135-136 等六处；vendor 默认 legacy，tool-ask-user/src/index.ts:24）、tool-web fetch/60000（ceo:146-147 等）、browser-use env 开关（ceo:162）、pruner 三值（ceo:116-118 等）。这些是**部署组合钉值**（防上游漂移，BUG-021 注释在案），用户可在 profile patch 覆盖，但不是 workspace 启动绑定。
- 【事实】DSH 侧现成用户面（本轮 vendor 定点确认）：locale volatile（vendor/dsh/packages/client/locale/src/index.ts:24）、权限 preset（interaction/permission-presets + client/ui-permission-presets）、模型选择（client/ui-model-selection、ui-settings-models）、Agent loop 并行上限（ui-settings-agent-loop README）、Web search API/key/endpoint（ui-settings-web-search README）、auto-continue（第三方，姊妹 §2）、plan 模式（会话模式）。凭据住 `<home>/.credentials.yaml`（environments.md:11-12）。
- 【建议】modal 对 B 类的姿态：只读反映 + 深链（如语言行跳 DSH Settings），不复制存储；避免两个事实家。

## 4. C 类：内容层选择 vs 规则正文（charter/company.md 划线）

划线判据（content-charter.md:44,69-73,83）：**选择（用哪份）可以是 settings；规则正文与政策数字永远住内容层/公司盘。**

- **章程**（#26）：今天不存在「选哪份 charter」——每角色一份默认（charters/<role>.md），首启 only-fill 成 kb/<role>/CHARTER.md，用户改的是实例（content/README.md:9-10）。【建议】不做 charter 选择字段；modal 提供「编辑章程」链接到 kb 实例即可。若未来要多章程变体，选择字段才成立。
- **手册/模板 override**（#27）：`.dsh-company/overrides/` 存在即优先（handbook.ts:34-40；提示级非文件强制，content/README.md:6-8）。文件存在就是选择，settings 再存一份 = 第二事实家。【建议】modal 显示 override 状态（有/无），不拥有。
- **政策线/费率/编制/归属**（#28/30/31/36）：policy-lines.md 是「报价、审批、预算与产能阈值的唯一家」（policy-lines.md:1-4），signoff 工具描述明言数值在部署 policy 文件（signoff-tool.ts:17）。【建议】settings.json 一个数字都不存；modal 可做**配置缺口清单**（owners/roster/rates 的 `<待填>` 计数，只读投影 kb 文件）——这是「指定」的入口而非存储。
- **公司身份**（#29）：company/productName/timeZone/sample 住 company.md frontmatter，client 已活读（company-identity.ts:52-68）。【建议】modal 可作 company.md 的编辑入口（写回同一文件），timeZone 字段与 #6 合流，不另立副本。
- **类型/模式/方法包内容**（#33/34/35）：选择 = 已知四字段；正文（check-rules/delivery-rules/SKILL.md）随包或住方法层，workspace 覆盖类型包今天不支持（product-definition SKILL.md:38）。
- **对外件闸门**（#32）：review-protocol 的 fail-closed 是政策规则正文；「要不要这么严」若将来成为选择，应表达为 kb/review-protocol.md 的公司层政策修订，不是 settings 开关（charter 四槽：政策住公司层）。

## 5. D 类：排除（一行理由，详见 §1 表 #37-58）

- 定价 3-4-3（#37）：方法规则正文。动议类型枚举（#38）：每动议选择，非 workspace 绑定。
- only-fill（#39）：用户数据安全的机制不变量。手册预算（#40）/压缩阈值（#41）/重试深度（#42）：机制钉值，parity/门禁守着。
- journal 窗口 3 篇（#43）/等待≤3min/effort 预算（#44）/fresh 默认（#45）：上下文装载与流程 guidance，属「模型怎么干活」非「用户指定」。
- client 常量族（#46）/日志容量（#47）/培养限额（#48）/archive 参数（#49）：UI/存储机制或人命令参数。
- tier 清单（#50）：运行时零消费者（§7.1），内容组织面。编号规则（#51）：已被 productType 驱动。日期/署名/A1（#52）：流程契约。
- persona 收紧注释开关（#53）：任务明示排除的智力旋钮。UI 收口行（#54）：已定案产品决定。session-search/freshProvider（#55）/workflowPresets（#56）：机制 wiring。
- dev/ops 族（#57）：双 home、沙箱探测、端口、构建期 DSH_CLIENT_TITLE——**开发者面，明确不进用户 settings**。部署形状（#58）：一安装一公司，换公司 = 换 DSH_HOME。

## 6. 「模型在猜/问/默认」行为清单（软强制的首要靶点）

> 注入 section 必须显式压住这些句子的「问/猜/默认」语义，否则模型照旧发挥（姊妹 §5.4 同判）。

**类型/模式轴（已知四字段的现行猜问处）**
1. 【事实】手册：产品类型「不要按习惯猜，用户没说就问一句或标假设」（content/AGENTS.md:16）。
2. 【事实】手册：交付模式按特征判——SOW/UAT/驻场/里程碑→project-services；SLA/值班/月报/续费→managed-service（content/AGENTS.md:17）。
3. 【事实】CEO 组队 skill 同款：「用户声明优先；没说就问一句，或按 company.md 默认并在任务书标假设」（assembling-the-team SKILL.md:56-58）；交付模式特征判（:59）。
4. 【事实】产品定义 skill 两轴解析：meta 优先→company.md 回落→「用户口头声明与默认不一致时以用户声明为准」（product-definition SKILL.md:28-30,45）。
5. 【事实】三个 workflow skill 的 Delivery-mode dispatch 头：读 meta 类型（回落 company.md）+ 模式（默认 productized）再分派方法（sales-workflow:23-25、ops-workflow:17-19、cfo-workflow:19-21）。
6. 【事实】命令解析层：parseDeliveryMode 缺省/占位→productized（req-command.ts:73-79、delivery-command.ts:51-57）；resolveProductType motion>company>五层默认（req-command.ts:150-154）。
7. 【事实】播种层：缺/未知 productType 跳过类型 seed + warning，不猜（bootstrap.ts:202-215；BUG-063）。
8. 【事实】meta 模板三处缺省语义：产品类型不写=回落 company.md（templates/meta.md:22）、交付模式不写=productized（:23）、需求层不写=到 PRD（:24）。

**组队/流程轴（新候选的猜问处）**
9. 【事实】协作模式等口头声明：「没声明就是单操作者模式」（collaboration.md:16-18）。
10. 【事实】最小在屋起步：单域动议默认恰好一个职能；范围菜单必含单 owner 推荐默认（assembling-the-team SKILL.md:18-26）。
11. 【事实】产品定义动议默认在屋 = CMO + VP-Eng，不默认叫全员（assembling-the-team SKILL.md:91-95；product-definition SKILL.md:14）。
12. 【事实】互审默认单审/自审，设链必须写明失效模式（chairing SKILL.md:37-38）。
13. 【事实】动议类型（决策/生产/诊断/口径问答）由模型按性质选（templates/meta.md:20）；编号体系新动议统一 identity、旧动议豁免（:21）。
14. 【事实】新成员默认 fresh+任务书，fork 要显式（chairing SKILL.md:69）；委派默认自己做、够证就收（delegation-policy SKILL.md:10-14）。

**HITL/方法轴**
15. 【事实】阻塞型选择必须 ask_user_question；非阻塞缺口带明示默认假设继续、轮末列待确认（chairing SKILL.md:64；human-interface.md:17,40；ceo persona:41）。
16. 【事实】问询节流：同批不追问、非阻塞不拦人（human-interface.md:49-50）。
17. 【事实】质量环：方法没点名就「问或停下」（vp-eng persona:39）；两侧 fail-closed 不自己挑方法（producer:28、verifier:26、quality-loop SKILL.md:19,38）；轮次上限默认 2 由调用方写 brief（SKILL.md:35）。
18. 【事实】取证通道次序与 HITL 兜底由模型按清单判断（fact-finding-playbook SKILL.md:11-34；手册 content/AGENTS.md:34）。

**fail-closed 不猜处（不是猜问，但是「默认行为」的边界，settings 不得静默绕过）**
19. 【事实】`<待填>` 不得编人名/费率（content/AGENTS.md:12；rates.md:5-6；roster.md:3-5；owners.md:12-17）。
20. 【事实】日期不许凭记忆猜，注入缺失 fail-closed「日期待核」（work-handoff.md:12-13；chairing SKILL.md:67）。
21. 【事实】productized 定价/运营/经济性缺方法 → 报缺不硬套 3-4-3（pricing SKILL.md:14、ops-feasibility:19、project-economics:25、managed-service-pricing:14）。

## 7. 负证据与限制

1. 【负证据】**manifest.json 的 tier 无运行时消费者**：`src/**` grep `manifest.json|tiers|t0|t1|t2` 0 命中；消费者只有 checks/gates/content-manifest.mjs（结构门禁）。⇒「tier 行为可配」今天没有机制落点，属内容组织面（#50）。
2. 【负证据·命名冲突】**`settings.json` 这个名字已被占用**：`<DSH_HOME>/company/settings.json` 是「最近 workspace 选择」便利文件（workspace-resolution.ts:47-53，v:1/workspace/updatedAt；runtime-guard.ts:91-97 写入；profile.md:23-24 合同在案）。拟议的 workspace 级 `.dsh-company/settings.json` 目录不同但**同名**——【建议】落地时要么改名（如 `startup.json`），要么在文档/诊断里显式区分两文件，防运维与代码混淆。
3. 【负证据·双家未接】company.md 的 `timeZone`（state/company.md:5）host/preset 零消费（grep 全 pack：仅 client company-identity.ts:67 解析显示）；README.md:155 自认「未接 profile」。preset 钉值与 company.md 声明今天是**两份独立事实**（#6）。
4. 【负证据·语言矛盾】support preset persona 硬编码「中文回答/回答用中文」（worker:29、worker-researcher:29、quality-loop-producer:33、verifier:30），而 company:language section 对 NON_ROLE_PRESETS 也注入（language-policy.ts:20）且随 locale 活切 en——locale=en 时 persona 与 section 互相矛盾。【推论】这是内容缺陷（改 persona 措辞即可），**不是新 settings 字段**；列此防 modal 误造「support 语言」旋钮。
5. 【负证据·品牌双家】构建期 `DSH_CLIENT_TITLE: 'DSH 梦之队'` 烤进 vendor client 产物（tools/setup.mjs:93，dev-only），运行时品牌另从 company.md productName 活读（Brand.tsx:10、company-identity.ts:52-68）——dev 构建面与运行面两个家，用户 settings 不应碰构建面。
6. 【负证据】公司 host 无 Config schema / 无 volatile 字段（§3 基线；config.ts:1-6 头注自述）——任务锚点「Config schema 哪些 `.volatile()`」的答案是**零个**。
7. 【观察·非候选】vp-eng persona 点名 starter 方法包 `system-architecture@1.0.0` / `vv-plan@1.0.0`（vp-eng:39）——与 charter 铁律 2「方法不进 persona」（content-charter.md:43）存在张力（措辞是「可用 starter」而非绑定）；属内容审查话题，不是 settings 候选，移交 parent 知悉。
8. 【限制】本轮零代码改动、未跑 pnpm test/verify（任务明示）；未做真页面/运行态验证——所有「活读/生效」判断引源码与姊妹材料，未端到端实跑。vendor 只读 grep 五处定点（locale/agent-team/time-context/tool-ask-user/设置面目录），未全量审计 vendor 设置面。
9. 【限制】dev workspace 的 kb/company.md 旧样例无 productType 一点沿用姊妹 §8.10 结论，本轮未重复实测；出厂值证据取 pack state/company.md。
10. 【限制】tests 只抽样钉值（presets.spec.ts:343,559；req-command.spec.ts:205-210；delivery-mode-scenarios.spec.ts:48-53；config.spec.ts:11-29；delegation-model.spec.ts:69；two-axis-applicability.spec.ts:7,57-59），未全读四区 spec。

## 8. 建议的 v1 字段集 + 开放问题

**v1 字段集（姊妹 §5.5 形状的超集；全部 workspace 级，住 `.dsh-company/`，只存选择不存正文）**：

| 字段 | 类型/枚举 | 默认 | 档位 | 强制点 |
|---|---|---|---|---|
| `wiki` | string 指针 \| null | null | **必选**（已知） | 软 section |
| `productType` | 盘上类型目录名 \| null | null（沿用现链） | **必选**（已知） | 软→硬（req 解析链）+首启 seed |
| `deliveryMode` | productized/project-services/managed-service \| null | null（回落 productized） | **必选**（已知） | 软→硬（req/delivery 缺省回落） |
| `method` | `<pack>@<version>` \| null | null | **必选**（已知） | 软 section + fail-closed 闸不变 |
| `collaborationMode` | single-operator/multi-human | single-operator | **必选级新增** | 软 section（压 collaboration.md:16-18 口头声明语义） |
| `timeZone` | IANA string | Asia/Shanghai | **必选级新增** | 软 section；硬接线缓做（先解双家） |
| `qualityLoop` | {mode: auto/always/off, maxRounds: int} | {auto, 2} | 可选 | 软 section + brief 模板 |
| `crossReview` | auto/always/off | auto | 可选 | 软 section |
| `defaultRequirementLayers` | string[] \| null（按 productType 过滤） | null | 可选 | 软→硬（/req 未声明时读 settings） |
| `seedProfile` | sample/minimal | sample | 缓做 | 首启一次性（需新内容变体） |

【建议】modal 另带两个**只读投影**（不是字段）：① kb 配置缺口清单（owners/roster/rates/policy-lines 的 `<待填>` 与缺件，guide.md:8-20 形状）；② B 类深链区（语言/权限/模型/auto-continue → DSH 现成面）。

**开放问题（需用户/后续拍板）**：
1. **timeZone 接线**：v1 软强制是否够？硬接（company.md→time-context）要动 preset 静态 config + presets.spec.ts:343 钉值，且浏览器时区仍优先（vendor time-context:205）——「强制时区」在 web 面到底强制的是什么，需定义。
2. **settings.json 命名**：与 `<DSH_HOME>/company/settings.json`（最近 workspace）同名冲突（§7.2）——改名还是共存？
3. **productized × 定价缺方法**：强制 productized 后定价类动议必撞 fail-closed（§6.21）——modal 要不要在选中时警示「该模式暂无定价/运营方法包」？
4. **collaborationMode 的作用域**：用户原话「这次的研究」偏会话级（姊妹 §9.1）；协作模式今天实为会话口头声明——workspace 默认 + 会话覆盖是否 v1 就要，还是先 workspace 一刀切？
5. **qualityLoop.off 与对外闸**：off 不豁免人类复核（review-protocol.md:7-8）——section 文案必须写明，防模型把 off 读成「不用复核」。
6. **support persona 语言矛盾**（§7.4）：归内容修复卡还是随本 feature 顺手修？（不属 settings 字段。）
7. **method 作用域错配**（姊妹 §9.5 同题）：workspace settings 引用的方法包不在本机时，fail-closed 回报是否足够，要不要 modal 做「本机方法包盘点」只读投影？
