# 你的公司盘

这是梦之队角色会话的工作目录（会话 cwd）——角色读它、写它。它属于一个 **run bundle**：
**一次安装 = 一个 DSH home + 一个公司盘 + `bundle.json`**（bundle 身份与基部指纹）。
装好插件后**第一次启动会自动建立**本目录（`workspace/` 骨架落到这里）；已经建好就一个字节都不动，只补缺件。
bundle 不进 git；要给另一个 CEO 装，就新开一个 `DSH_HOME`（= 一个新 bundle），不要复用这个。

## 什么随插件升级，什么是你的

| 件 | 谁维护 | 说明 |
|---|---|---|
| `AGENTS.md`（公司手册） | **基部**（pack 内 `workspace/` 是唯一真源） | 每个成员会话的首个请求都会注入它；改它 = 改公司共识 |
| `kb/org.md`（编制）、`kb/<角色>/CHARTER.md`（岗位章程）、`templates/`（写作模板） | **基部** | 装完是副本；升级时**没改过的**基部文件随 pack 更新，**你改过的**保留并在升级日志里点名 |
| `kb/owners.md`（人侧归属与授权面） | **你的**（起动件已带骨架，**待填**） | 哪个物理人对应哪个角色、各自能答什么；问询与审批按它路由 |
| `kb/motion-ledger.md`（动议台账） | **你的** | 每场动议收口时追加一行（结论逐字取自该动议的 `meta.md`） |
| `kb/<角色>/journal/`（角色纪要） | **你的** | 当轮记忆；轮末收敛时清出 live（摘要进 CHARTER） |
| `deliverables/<日期>-<slug>/` | **你的** | 一场动议一个目录：`drafts/<角色>.md` 过程稿、`final.md` 成品（只有 CEO 能落，且必须来自一次 `present`）、`meta.md` 户口 |
| `deliverables-archive/` | **你的** | 已收敛的交付物（只读历史） |

**基部 vs 扩张（五角色同等）**：pack 的 persona / skills / 手册 / 章程 / 模板是基部；方法层
（`<DSH_HOME>/profiles/<profile>/company-cultivation/<role>/`）、journal、培养记录、交付物、台账、会话是扩张。
基部可以随产品升级；扩张只属于这个 bundle，升级不碰、也不会回流到产品。

## 开工前

1. 填 `kb/owners.md`（谁答什么）。
2. 把本目录作为工作区连到 DSH（Web：侧栏 `Workspaces` → 添加/打开本目录）。
3. 开 CEO 会话、选 `ceo` preset；动议怎么走见公司手册 `AGENTS.md`。

## 升级与备份

- **身份**：`<DSH_HOME>/bundle.json` 记录 `id` / `createdAt` / pack 版本 / 基部每个文件的 sha256。
  它只创建、不覆盖；首次启动写入，之后每次启动只做基部升级判定。
- **基部升级**：目标缺失 ⇒ 补建；你改过（哈希不等于上次基部哈希）⇒ 保留；没改过 ⇒ 用新版替换。
  扩张面（journal / 交付物 / 台账 / 方法层 / 会话）一个字节不动。
- **备份**：整个 bundle = 那个 `DSH_HOME`（含本目录）。拷走/归档时排除 `.credentials.yaml` 与
  含启动 token 的日志；需要迁移到另一台机器时，连 home 一起搬（sessions / 方法层 / 凭据都在里面）。

> 落点与开关（部署面）：默认 `<DSH_HOME>/company-workspace`；`DSH_COMPANY_HOME` 换落点，
> `DSH_COMPANY_BOOTSTRAP=off` 只关“复制骨架”（不关 `bundle.json` 身份）。第二个 CEO = 新 `DSH_HOME`。
