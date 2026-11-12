---
status: 已定性
opened: 2026-11-12
---

# Wiki 知识地图：给虚拟团队一张可浏览的外部知识目录

> 问题：content/ 与 workspace kb 远远不够且「加不完」——如何用 wiki 组织的可浏览目录给每个虚拟团队补一张动态知识地图？AK（Karpathy）说的 LLM wiki / 知识库到底是什么（「预言语言」线索）？DSH 有无 wiki 组件？不重依赖的接入形状长什么样？「Google 出的 OKF 规范」是什么、能不能直接用？「靠语言模型能力更好地搜到信息」有哪些自建法子？wiki 能挂在 DSH 哪些现成载体上？
> 消费者：用户 2026-11-12 直接点名研究（本会话；暂无活卡）
> 产出的卡：[2026-11-12 Wiki 知识地图落地（M1）](../../_archive/settled_issues/2026-11-12-wiki-knowledge-map-landing.md)——目录模板（AK 三层 + OKF 最小 frontmatter）+ 协议 skill（index 先行 / 查询五技术 / 按位置分读写）+ 指针校验 + 注入分档。
> 结论：DSH 无 wiki 组件（负证据）+ OKF 确证 = Google Cloud Open Knowledge Format v0.2（官方自述「formalizes the LLM-wiki pattern」，纯文件约定、`type` 一键合规）+ 搜索不需外部件（L0 = DSH 随包 ripgrep；L1 = node:sqlite FTS5 + Intl.Segmenter 中文分词，本仓 404 文件实测 1.4s 建索引/毫秒查询，零新依赖；DeepSeek 无 embeddings 端点，向量路线暂缓）+ 载体够用（手册指针/skill 协议/kb seed/schedule lint/workflow 并行 ingest/client list 槽，全部零新 npm 依赖）+ **wiki 可住 workspace 外**（沙箱只限写不限读：agent 能 read/grep 外部树、写不进去；指针 v1 = 本地目录路径，允许绝对路径，不做 URL）。**推荐装配 = M1 最小挂载起步**（AK 三层目录 + OKF 最小 frontmatter + 手册指针 + 一份 SKILL 协议），按需升 M2/M3。指针机制已由[启动设置卡](../../_archive/settled_issues/2026-11-12-startup-settings-landing.md)落地；wiki 本体与协议 = 本页「产出的卡」。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-12-wiki-knowledge-map.md](2026-11-12-wiki-knowledge-map.md) | 外部一手来源综述（AK wiki / llms.txt / DeepWiki 等）+ 仓内知识现状与轻依赖接入点 | 2026-11-12 |
| [2026-11-12-parent-handoff.md](2026-11-12-parent-handoff.md) | 父会话一手锚点、合同层事实与跨题交接（供深度研究 agent 续作） | 2026-11-12 |
| [2026-11-12-okf-and-llm-knowledge-standards.md](2026-11-12-okf-and-llm-knowledge-standards.md) | 「Google OKF」核验 = Google Cloud Open Knowledge Format（SPEC v0.2 逐字）+ 候选景观边界 + 可借鉴字段清单 | 2026-11-12 |
| [2026-11-12-oss-search-landscape.md](2026-11-12-oss-search-landscape.md) | 开源搜索生态深挖（qmd / 纯 JS 库 / 向量件 / GraphRAG / agentic search）+ 比较表与 L0–L3 搜索阶梯 | 2026-11-12 |
| [2026-11-12-dsh-retrieval-inventory.md](2026-11-12-dsh-retrieval-inventory.md) | DSH 检索家底逐项源码盘点（rg 随包分发 / MCP 纯客户端 / web 工具 / session FTS5）+ 家底表与 7 项缺口 | 2026-11-12 |
| [2026-11-12-dsh-integration-carriers.md](2026-11-12-dsh-integration-carriers.md) | wiki 落入 DSH 的原生载体盘点（schedule / workflow / hooks / client UI / inspect / preset）+ 三档组合接入形状 | 2026-11-12 |
| [2026-11-12-selfbuilt-fts-probe.md](2026-11-12-selfbuilt-fts-probe.md) | 零新依赖中文全文搜索实跑探针（node:sqlite FTS5 + Intl.Segmenter，404 文件真实语料） | 2026-11-12 |
| [2026-11-12-wiki-in-dsh-possibility-space.md](2026-11-12-wiki-in-dsh-possibility-space.md) | **收口件**：三轴坐标系 + 四种端到端装配（M0–M3）对比 + 与 startup-settings 合流 + 待拍板决策清单 | 2026-11-12 |
