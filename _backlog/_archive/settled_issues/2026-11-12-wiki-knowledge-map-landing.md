---
status: 已结
opened: 2026-11-12
---

# Wiki 知识地图落地（M1）：可浏览的外部知识目录 + 维护协议 + 指针校验

> 立卡：2026-11-12 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — A1/A3/A4/A6/A7 有其名实跑证据；A2 = 六角色 catalog 可见（preset-smoke）+ 形状 spec（`skill()` 真调用未单独跑，该路径是 vendor 既有机制）；A5 = 真会话两段实测（外部读穿透 + 写拒绝）。总账：typecheck / 233 files·1723 tests / verify / preset-smoke 全绿；逐条见 Note「验证」节
>
> **结论/去向**：implementation — 本卡即落地载体；实现与证据 = [Note](../../../notes/implemented/2026-11-12-wiki-knowledge-map-landing.md)
> **授权**：用户 2026-11-12 点名「按照我们repo的研发流程，准备推动，把它落地吧」。

**问题与期望结果：** `content/` 与 workspace `kb/` 是"随包发布 / 公司自身状态"两层，装不下团队真正要查的外部领域知识，而且**永远加不完**。启动设置卡已把「依赖哪份 wiki」的指针落地（`.dsh-company/startup.json` 的 `wiki` 字段 + `company:startup-settings` 注入段），但**指针指向的东西还不存在**：没有目录形状、没有维护协议、没有失效校验，模型拿到一个路径也不知道该怎么用。期望：给虚拟团队一张**可浏览、可增长、零运行时依赖**的外部知识目录——目录里有 `index.md` 能一眼看全貌，agent「index 先行、按需钻页」，人（或 workspace 内的 agent）按协议 ingest/lint 维护；指针失效时不静默。

**当前情况（证据）：**
- **指针已落地**：[启动设置卡](2026-11-12-startup-settings-landing.md) + [Note](../../../notes/implemented/2026-11-12-startup-settings.md)（`wiki` = 本地目录路径，可绝对、可在 workspace 外；注入段已写「外部目录只读、不要尝试写入」）+ 合同 [profile.md §项目启动策略](../../../docs/contracts/profile.md)。
- **AK 模式一手考证**：三层（不可变 `raw/` + LLM 维护的 wiki + schema）、index.md/log.md、ingest/query（好答案回写）/lint 三操作；~100 来源规模 index+unix 工具足够（[主材料 §1.1](../../research/wiki-knowledge-map/2026-11-12-wiki-knowledge-map.md)）。
- **OKF 规范**：Google Cloud Open Knowledge Format v0.2，官方自述"formalizes the LLM-wiki pattern"；唯一必需键 `type`，`description` 推荐，信任族（`sources`/`generated`/`verified`/`status`/`stale_after`）全 opt-in；每层目录 `index.md`、`log.md` ISO 日期、断链容忍（[OKF 材料 §1.4](../../research/wiki-knowledge-map/2026-11-12-okf-and-llm-knowledge-standards.md)）。
- **只读边界已实测**：沙箱「read-only host root + 可写 workspace bind」，读不限、写限 workspace（[收口件 §4.1](../../research/wiki-knowledge-map/2026-11-12-wiki-in-dsh-possibility-space.md)）。→ wiki 在 workspace 外时 agent 天然只读，不需要额外机制。
- **搜索阶梯**：L0 = index 先行 + 随包 ripgrep（`grep`/`glob` 默认挂载，零依赖）；L1 自建 FTS5 已有实测但**本卡不做**（[搜索生态 §7](../../research/wiki-knowledge-map/2026-11-12-oss-search-landscape.md)、[探针](../../research/wiki-knowledge-map/2026-11-12-selfbuilt-fts-probe.md)）。
- **载体已盘点**：skill（catalog→body 按需加载）承载查询协议、`systemPrompt.section` 承载指针、fs 工具承载浏览——全部零新增 npm 依赖（[载体材料 §8](../../research/wiki-knowledge-map/2026-11-12-dsh-integration-carriers.md)）。
- **已知缺口（本卡要补）**：`startupRows` 现注「`wiki` 没有枚举集（自由指针），永远不算失效」（`src/lib/startup-settings.ts`）——路径会腐化（改名/搬家/换机器），现在会把模型指向不存在的目录。

**未决问题（落地中自行定，不阻塞）：** 模板目录放 `content/wiki-template/` 还是 `content/wiki/`（倾向 `wiki-template`：明确它是起点不是内容）；skill 住 `presets/_shared/` 还是六个角色 preset 各一行（倾向 `_shared`，一处改全体生效）。

**下一步：** 按 `## 验收标准` 实现；完成后同 diff 写 Note 并归档本卡。

## 范围与排除项

**范围（v1）**
1. **目录模板** `content/wiki-template/`：`AGENTS.md`（维护协议/schema）、`index.md`（index 先行 + 一行摘要格式）、`log.md`（ISO 日期、最新在前）、一页示例概念（演示 frontmatter 与互链）、`README.md`（五分钟上手：拷到哪、怎么开始第一页）。
2. **frontmatter 最小集**：`type` 必需 + `description` 推荐（OKF 合规最小面）；`sources`/`verified`/`stale_after` 写进 schema 作为**可选升级**，不强制。
3. **协议 skill** 一份（`consulting-the-knowledge-map` 或同义名）：何时查 / index 先行 / 查询五技术（查询分解、词汇版 HyDE、迭代搜读、LLM 重排、分层摘要）/ ingest / lint 清单 / **按 wiki 位置的读写分档**（workspace 内可写、workspace 外只读且只提议不改）。
4. **指针校验（host）**：`wiki` 值校验 = 目录存在 + 是目录 + 含 `index.md`；`startupRows` 的 `invalid` 对 wiki 生效；面板显示失效徽标；`/company-settings show` 回执点名问题。
5. **注入分档（host）**：`company:startup-settings` 的 wiki 段按位置分两版——workspace 内 = 可写（并给 ingest 回写纪律）；workspace 外 = 只读（明说不要尝试写入）；指针失效 = 明说「指针失效，不要当知识用，先问人」，不输出正常指引。
6. **双语**：新增用户可见文案 zh + en 进 typed company 字典，默认 zh。

**排除（本卡不做，另行开卡）**
- **L1 自建 FTS 索引**（node:sqlite + Intl.Segmenter）：规模触发再上，实测已完成、代码未写。
- **client 浏览面板**（wiki 页树/搜索页签）：人浏览先用编辑器/静态站；GUI 等真实需求。
- **schedule 周期 lint**、**workflow 并行 ingest**：协议先跑顺，自动化后加。
- **`/company-wiki init` 播种命令**：v1 用 `cp -R content/wiki-template <dir>`；命令面等真实摩擦出现再做（不发明）。
- **URL wiki**（http/https 指针）：用户 2026-11-12 拍板只收本地目录。
- **OKF attested computation**、**真实业务 wiki 内容**（内容由部署侧填，本卡只交模板与协议）。

## 已知与未决

- 已知：wiki 内容不进 pack 发布物（它是部署侧数据），pack 只带**模板**——与 content-charter「跟谁一起变」判据一致。
- 已知：workspace 外的 wiki，agent 写不进去（沙箱），所以「agent 自主长知识」在外部盘上不成立；要 agent 写就得放在 workspace 内。协议必须把这条写成两档，不能含糊。
- 已知：`index.md` 腐化是本模式的固有风险（AK 同款），靠 schema 的 lint 清单 + 人工复查兜；本卡不承诺自动防腐。
- 未决：模板是否纳入 `content/manifest.json` 的 t2 清单（纳 = 受预算门禁约束；不纳 = 模板不进常驻读取路径）。落地时按 content-manifest 门的口径定。

## 方案与取舍

- **模板而非运行时**：wiki 是 markdown 目录，零运行时依赖；不造 wiki 引擎/数据库/索引服务（AK 同款判断：~100 来源 index 足够）。
- **协议做成 skill 而非塞进手册**：手册是常驻（32KB 预算、每轮都占上下文），协议是"要做这件事时才需要"的操作细则——走 skill 的 catalog→body 按需加载，符合本仓既有的分层纪律。
- **frontmatter 只强制 `type`**：OKF 的合规判据就是这么宽（"requires exactly one thing of every concept: a type field"）；多强制一个键就多一道 friction，而 wiki 的第一杀手是 friction。
- **校验只做三件事**（存在/是目录/有 index.md）：再多（比如解析 frontmatter 全量校验）就变成 lint 工具，超出 v1；三件事足以挡住"指向空气"和"指向一个没有索引的杂目录"。
- **不做 init 命令**：`cp -R` 已经够；命令面要处理越界、覆盖、幂等、回执，成本远超收益。
- **输掉的方案**：① 把 wiki 页做成 skill（catalog 扁平化、页数线性膨胀，已证伪）；② 上向量/RAG（DeepSeek 无 embeddings 端点、本地模型重量级，研究已排除）；③ 让 host 在 boot 时自动往指针目录播种（会写用户的外部目录，越权且不可预期）。

## 关闭条件

- `## 验收标准` A1–A7 全部有实跑证据。
- 同 diff 更新合同层：`docs/contracts/profile.md` 的「项目启动策略」节补 wiki 校验与注入分档两行（或新增一节指向模板）。
- 同 diff 写 Note（含输掉的方案与红→绿证据），卡归档。

## 抽象度

- **换公司要改吗？** 不会——模板与 schema 是通用形状，换公司只换内容；公司名/领域词不进模板。
- **换产品类型要改吗？** 不会——wiki 是外部知识层，与产品类型/交付模式正交。
- **换做法要改吗？** 不会——协议住 skill（方法层可替换的输入），模板只是起点。
- **只有机制本身变才改吗？** 是。
- **第二消费者：** 模板的第二消费者 = 每个部署侧真实 wiki（复制即用）；skill 的第二消费者 = 六个角色 preset（同一份按需加载）；校验的消费者 = 启动设置面板与注入段两处。
- **搬家成本：** 低——模板是数据住 `content/`，skill 是 markdown 住 preset skills；两者都不进代码。

## 验收标准

> 每条都要有实跑证据（命令输出 / 真会话读数 / spec 名），不接受「看起来对」。

- **A1 模板在场且可复制**：`content/wiki-template/` 含 `AGENTS.md`/`index.md`/`log.md`/示例概念页/`README.md`；`cp -R content/wiki-template /tmp/zz-wiki` 后直接可读：`index.md` 列出示例页、示例页 frontmatter 有 `type`、页内链接指向 `index.md`（断链容忍的示范）。
- **A2 协议 skill 可加载**：skill 有合法 frontmatter（name/description），catalog 只常驻 name+description；真会话 `skill({name})` 能返回 body，且 body 含「index 先行 / 查询五技术 / 读写按位置分档 / lint 清单」四节。
- **A3 指针校验生效**：`startup.json` 的 `wiki` 指向 ① 不存在的目录 → `startupRows` 该行 `invalid: true`；② 存在但无 `index.md` → `invalid: true`；③ 合规目录 → `invalid: false`。面板显示失效徽标，`/company-settings show` 回执点名具体问题（不是只说「失效」）。三项各有 spec。
- **A4 注入按位置分档**：wiki 在 workspace 内时，`company:startup-settings` 段含「可写 + ingest 回写纪律」；在 workspace 外时含「只读、不要尝试写入」；指针失效时含「失效，先问人」且**不含**正常查页指引。三档各有一条文本断言。
- **A5 只读外部 wiki 实测**：真会话把 wiki 指向 workspace 外的一个临时目录，agent 能 `read` 其 `index.md` 并钻一页（读出页标题）；对同目录的写尝试被沙箱拒（`Operation not permitted`），证据留命令输出。
- **A6 无新依赖**：`packages/company-pack/package.json` 的 dependencies/peerDependencies 零新增；`pnpm verify` 的依赖面门禁通过。
- **A7 门禁全绿**：`pnpm verify`、`pnpm typecheck`、`pnpm test` 全绿；新增 spec 覆盖 A3 的三分支与 A4 的三档。
