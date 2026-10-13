# 你的公司盘

这是梦之队角色会话的工作目录（会话 cwd）——角色读它、写它。装好插件后**第一次启动会自动建立**本目录
（`workspace/` 骨架落到这里）；已经建好就一个字节都不动，只补缺件。

## 什么随插件升级，什么是你的

| 件 | 谁维护 | 说明 |
|---|---|---|
| `AGENTS.md`（公司手册） | **随插件**（pack 内 `workspace/` 是唯一真源） | 每个成员会话的首个请求都会注入它；改它 = 改公司共识 |
| `kb/org.md`（编制）、`kb/<角色>/CHARTER.md`（岗位章程）、`templates/`（写作模板） | **随插件** | 升级插件即拿到新版 |
| `kb/owners.md`（人侧归属与授权面） | **你的**（起动件已带骨架，**待填**） | 哪个物理人对应哪个角色、各自能答什么；问询与审批按它路由 |
| `kb/motion-ledger.md`（动议台账） | **你的** | 每场动议收口时追加一行（结论逐字取自该动议的 `meta.md`） |
| `kb/<角色>/journal/`（角色纪要） | **你的** | 当轮记忆；轮末收敛时清出 live（摘要进 CHARTER） |
| `deliverables/<日期>-<slug>/` | **你的** | 一场动议一个目录：`drafts/<角色>.md` 过程稿、`final.md` 成品（只有 CEO 能落，且必须来自一次 `present`）、`meta.md` 户口 |
| `deliverables-archive/` | **你的** | 已收敛的交付物（只读历史） |

## 开工前

1. 填 `kb/owners.md`（谁答什么）。
2. 把本目录作为工作区连到 DSH（Web：侧栏 `Workspaces` → 添加/打开本目录）。
3. 开 CEO 会话、选 `ceo` preset；动议怎么走见公司手册 `AGENTS.md`。

> 落点与开关（部署面）：默认 `<DSH_HOME>/company-workspace`；`DSH_COMPANY_HOME` 换落点，
> `DSH_COMPANY_BOOTSTRAP=off` 关掉自举（自管盘的部署用）。
