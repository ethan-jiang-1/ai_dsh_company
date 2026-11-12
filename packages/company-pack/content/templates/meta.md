# meta.md 模板（动议户口——开局 CEO 建档，收口/收敛回填）

> 机器可查的形状：核心字段**必须**是 `字段: 值` 平文本行——`类型` ∈ 决策 / 生产 / 诊断 / 口径问答；
> `结果` ∈ 进行中 / 已采纳 / 已否决 / 已搁置 / 已废弃 / 判不了 / 已完成；不合词表或缺行 = 成品页签标「meta 形状错」，操作员收口核对。逐字替换尖括号占位；「结果」开局可留空（观察项盯守），**收口时必标终态词**
> ——present 在而结果非终态 = 操作员收口判「结果未终态」。补充说明（模式/口径/风险
> 闸门等散文）写在核心字段**之后**：非字段行解析时忽略，不进判据，留作人读。
> `numbering` / `layers` 是**编号范围标记**（合同 = pack `content/product-types/<id>/requirements-model.md`，`<id>` = `productType`）：写 `identity` 才进
> `/req check` 的编号检查；旧动议不写 = 只读豁免（`skipped`）。`layers` 声明本轮要到的层，缺层按声明判红。
>
  > **入档前置检查**（曾经有入档件长期停在 `参与: CEO（待补）` / `一句话结论:（待补——见 final 正文）`）：本件从 `.dsh-company/deliverables/` 移入
> `.dsh-company/deliverables-archive/` **之前**，必须四步全过——① **G1 回填**：CEO 在**收口同一动作内**填齐
> `参与` / `一句话结论` / `result`（终态词）/ `closed`（真日期）；② **G2 `present` 前自查**：
> `grep -c "待补" .dsh-company/deliverables/<slug>/meta.md` ⇒ **必须 `0`**（非 0 ⇒ **不许 `present`**）；
> ③ **G3 入档前复核**：同一命令 ⇒ **必须 `0`**（非 0 ⇒ **不入档**）；④ **G4 异人抽核**：复核人
> 抽 1 件，核 `一句话结论` ↔ 本件 `final.md` 原句一致（不一致 ⇒ 报异常，不自行改）。**空值 ≠ 合格值**：
> `closed` 留空仅限**未收口**件，`未记` 仅限墙钟——`参与` / `一句话结论` **没有合法的空态**。

slug: <slug-短横线小写英文>
kickoff: <YYYY-MM-DD——会话注入的真日期，不猜>
type: <decision｜production｜diagnostic｜qa>
numbering: <identity（新动议统一写它）｜不写 = 旧动议只读豁免>
productType: <类型 id＝content/product-types/ 下的目录名（用户声明优先；不写 = 回落 company.md 的 productType）>
deliveryMode: <productized｜project-services｜managed-service（不写 = productized；有 SOW/UAT/驻场/里程碑验收 = project-services；有持续 SLA/值班/月报/续费 = managed-service；与 productType 正交）>
layers: <MRD, StRS, PRD, SyRS, IRS（本轮声明的层；不写 = 到 PRD 为止）>
参与: <CEO+参与角色，如 CEO+CFO+COO>（收口时由 CEO 回填，与 `present` 同一动作；须与 `.dsh-company/kb/motion-ledger.md` 对应行第 4 列**集合等价**；`（待补）` 占位不得入档）
result: <leave empty or "in-progress" at start; terminal: accepted｜rejected｜deferred｜obsolete｜undecidable｜completed>
closed: <YYYY-MM-DD 收口日；未收口留空>
墙钟: <X 分钟（真跑实测；未记写"未记"）>
一句话结论: <准确的业务结论——台账行逐字引用它；不设机械字数上限，不截断；机制名、门禁号和内部判据不作为常驻结论主体；需要完整[fact]/[assumption] 标注时放在 `final.md`，行内只保留必要的自然语言条件>（收口时由 CEO 从本件 `final.md` 结论压缩回填，**禁新判断**；**禁留任何占位括号/`待补` 字样**；占位不得入档）
落地事件: <谁 何时 做了什么（出处路径）——可重复多行>
