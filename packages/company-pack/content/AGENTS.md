# 公司手册

> 公司名 / 产品名见 `.dsh-company/kb/company.md`（出厂是样例；装后改成你的公司）。

本文件是公司级共识，由 host 在每个成员 agent 创建时注入 system prompt。它是**公司 run bundle 的说明书 + 协作边界**，
不是岗位说明书——岗位细节在你自己的 CHARTER 里。CEO 的动议编排细则（任务板落法、派活行格式、
对账回合、补料与复算锚、HITL 前排空、present 顺序）住 CEO skill「chairing-staff-meeting」——
主持动议时加载；本手册只留**全体成员都要遵守的规矩**。

## 事实的家（别在别处复述数字）

- **组织与编制**（人数、条线、岗位与预算上限）：`.dsh-company/kb/org.md` —— **唯一事实家**。
- **你的岗位**：`.dsh-company/kb/<你的角色>/CHARTER.md`；**你的历史纪要**：`.dsh-company/kb/<你的角色>/journal/`。
- **动议台账**（历史动议一览 + 一句话结论；「台账」页签数据源）：`.dsh-company/kb/motion-ledger.md`。
- **编号合同**（需求层 / 退役词 / 范围豁免 / 并发口径）：pack `content/product-types/<id>/requirements-model.md`（`<id>` = `productType`）；workspace 的 `kb/process-docs.md` 只是播种副本。
- **动议的产品类型**：写在 `.dsh-company/deliverables/<slug>/meta.md` 的 `产品类型`；缺省回落 `company.md` 的 `productType`。具体类型 id 见产品类型包；不要按习惯猜，用户没说就问一句或标假设。
- **交付物**：落 `.dsh-company/deliverables/<日期>-<slug>/`（A1 命名；三态见 `generic/deliverable-states.md`）；**写作模板**：`<company-content>/templates/`。

## 细则（按需读，不进常驻上下文）

本手册只留每个成员开场必须知道的规矩；操作细则按需读（路径相对 pack content）：

- 交付物三态 / 命名 / 署名行 / meta：`<company-content>/generic/deliverable-states.md`
- 职责边界 / 承诺权：`<company-content>/generic/role-boundary.md`
- 路由与冲突升级：`<company-content>/generic/routing.md`
- 协作规矩（派活、打回、问询、任务板）：`<company-content>/generic/collaboration.md`
- 派活行 / 署名行 / 收工 / 日期 / 轮末：`<company-content>/generic/work-handoff.md`
- 人机接口（待办 / 审批 / 节流）：`<company-content>/generic/human-interface.md`


## 工作纪律

- 可写范围是公司共享盘；改共享盘文件前先读一遍。**排练会话不写本盘**（在独立目录/独立会话里排练）。
- **取证能力边界**：`web_fetch` 对一切域名被 DNS 检查拦截；**shell 出网不受限**（`bash` + `curl` + 浏览器 UA 直取可达）⇒ 外部取证首选 bash 直取，打法清单 = CEO skill「fact-finding-playbook」；穷尽通道仍拿不到才准 HITL。
- 说"完成"之前，先跑过能证明它的检查；跑不了就说"未验证"。
- **出厂两个人机面**：每轮结束的**文件变更审阅卡**（收工前自查改动）；present 后可点**「在侧边栏打开」**预览（Open in app 再调本机应用——两个连续但不同的动作）。
- **文件以单个换行结尾**：不空行、不缺行（共享盘产物的统一形状）。
