# R6 · 内容诊治（内容腐化诊治 + 流程对齐审计 + 转型落盘）

> 状态：implemented（2026-09-23 收尾）
> 条目：内容诊治（R6——本仓**最后一个轮号**；此后迭代单位 = 队列条目，见 D23）
> 章程 = 维护规则 D21 + D23；验收 = 两份清单逐条销账 + 防回堆门禁带反证 + 入口链探针 + 转型落盘。

## Motivation

五轮堆叠后内容腐化有实证（D21 四证据），且流程对齐审计（D23 前置研究 =
[research/2026-09-23-dsh-inround-task-surface.md](../research/2026-09-23-dsh-inround-task-surface.md)）
证实本仓对 D13"整套继承"实为**部分继承**——轮号制、roadmap 历史沉积、todo/plan 反馈面零使用、
纪律表凭记忆写，均为走样。目标 = **让今后的开发更舒适**（信噪比持续提高）。

## 交付

1. **审计先行（两份诊断件，已兑现生命周期后删除）**：腐化点清单 64 条（线 A 五面，三路盘点合并）
   + 流程偏离清单（7 项证实偏离 + 28 待审聚类 + 弹性边界结论）。处置：**修 47 / 转待办 5（入队列）
   / 随文件归档 4 / 不动+理由 3**。全文见 git（本提交链；文件已按"诊断件销账后删除"删除）。
2. **销账（净减少结算见下）**：r5-plus-readiness 删除（活残余 §7.4 迁队列）；AGENTS.md 当前状态
   214→152 行（五轮沉积 → 八行指针）；roadmap 202→134 行（轮次表退役 → 纯队列、完成即离队）；
   00-index Q1–Q8 压缩 + release.md 补登 + 出生地图清✅行；guides/60 与 50 过期陈述全修（计数
   去 R2 时代值、四人残影 → 五角色、R5 → R5a ×7、合同层"未做"改已交付）；design/10·30·40 对齐
   五角色与搁置池；profile 行清单对齐 bundle 实物；delegation/demo/presets 现在时化；
   org.md/COO CHARTER 指针与流程载体修正；notes 两条断链 + intents 补 3 行 backfill。
3. **防回堆门禁 ×2 进 `scripts/verify.mjs`（均带反证）**：`notes-links`（md 链接核验扩到 notes/
   全树——上线当天抓出 4 条存量断链，全修复）；`doc-budget`（AGENTS.md 165 / 00-index 145 /
   guides/60 440 行上限；红证 = 造 21 行垃圾即红）。plans 层禁 ✅ 残留档随队列化由结构自然承担
   （纯队列里没有历史行可腐化），未设独立门禁。
4. **入口链探针**（`scripts/entry-probe-smoke.mjs`，认证档）：全新上下文只读入口链答 8 个"现在"
   问题，token 断言 8/8 + 归档 `snapshots/entry-probe/2026-09-23/answer.md`。反证实测：植入过期
   后探针 Agent **主动显式报告矛盾**（"AGENTS.md 写 R5b 与 roadmap R6 相矛盾——入口链里的过期
   状态"），还原复绿 8/8——矛盾检测属语义层（归档可查），token 层不红为设计内边界。
5. **转型落盘（D23）**：plans 层队列化（本文件同 diff）；guides/60 §0/§0.5 条目生命周期 +
   §1 实施期 todo_write 纪律 + **§12 条目收尾（收尾程序自 roadmap 迁家）+ 流程合同**
   （偏离注册表 7 条 + 防再犯五件套 + 卫生铁律"删>并>修>记"）；AGENTS.md 纪律表替换
   （记忆版 → 枚举提炼版，新增过程反馈面/预算/slop/偏离登记/升 pin 重校/卫生铁律各行）；
   两合同**落现有家出生，零新增文件**（文档卫生 → 00-index；流程 → guides/60 §12）。
6. **R6 = 最后轮号**：此后队列条目按主题命名，完成后从队列删除。

## 净减少结算（方向铁律的度量）

| 指标 | 开工前（2743b05） | 收尾后 | Δ |
|---|---|---|---|
| docs/ 文件数 | 14 | 13 | **−1**（r5-plus 删除；诊断件已按生命周期删除） |
| docs/ 总行数 | 2267 | ~1940 | **≈ −327** |
| AGENTS.md | 214 行 | 152 | **−62**（沉积 → 指针；纪律表替换净 +3） |
| docs/plans/roadmap.md | 192 | 134 | **−58**（纯队列形态） |
| guides/60 | 399 | 435 | +36（条目环 + 收尾程序迁家 + 流程合同——signal 增项） |
| 00-index | 148 | 131 | −17（Q1–Q8 压一行 + 出生地图清✅） |

## 实际跑过的验证

- `pnpm verify`：每个批次收尾各跑一次，全绿；两新门禁红证（人造断链红 ×1；00-index 造 21 行
  → doc-budget 红）→ 还原复绿；绿证常态化通过。
- `pnpm test`：53 条全绿（本轮未动代码面，仅末次复核）。
- `node scripts/entry-probe-smoke.mjs`：**8/8 PASS**（真模型；standard preset + 排练场 cwd）+
  归档；反证（植入过期 → Agent 主动报矛盾；还原 8/8 复绿）。
- 三路审计代理产出亲验后折并（假阳性防护：承重条目逐条抽验）。

## 环境状态（下条会话判断"哪些已就绪"只读这里）

- `DSH_HOME=dev/harness-home`（凭据在位；每个新 shell 先 `source dev/env.sh`）。
- **git push 需走 `ssh.github.com:443` 通道**：22 端口 banner 超时（解析到非 GitHub IP 4.225.11.194）。
  单次 push 命令：
  `GIT_SSH_COMMAND='ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10' git push ssh://git@ssh.github.com:443/ethan-jiang-1/ai_dsh_company.git master:master`
  用户已指示**本轮暂不 push**（GitHub 网络抖动）；积压提交待网络稳后由人推。
- 观察窗 / dev profile / 凭据：与 R5b Note 状态一致（link: 安装在位）。
- 一次性文件已清（dev/ 回到开工前四项）；探针端口 3098 曾留孤儿进程已清（EADDRINUSE 教训同前）。
- 未尽事项（转队列，见 roadmap §队列"整治转待办"）：归档层评估（原 r5-plus §7.4）、COO 模板
  指认改齐（W3）、invest-mobile journal 补记（W8）、互审稿命名钉系列（W9）、CHARTER 收工动作
  措辞（W11）、编号方案（N1，随卫生合同）。
- **审计覆盖缺口**（本轮未扫的角落，留给下次"磨"；来源 = 诊断件销账前的覆盖缺口节，git 留史）：
  presets.md ↔ CHARTER ↔ persona 三方逐字比对；notes/research 三篇正文即时性（是否存在被推翻
  未标注段）；postmortem 0001/0003 深读；guides/50 其余旋钮默认值对 vendor 复校；journal 行号
  引用全量核；snapshots 与 live 盘差异逐项。
- **登记的噪声残留**（判断：暂留，非本轮处置）：roadmap 维护规则 ~90 行带日期历史住计划层
  （D21"历史不重写"先例；若要迁 notes/ 是一次独立小条目）；guides/60 §2/§7 的 R1 时代坑注
  （判断：**非噪声**——它们是"环境查不到、只有踩过才知道"的 trap 文档，正是指南层的本职）。
