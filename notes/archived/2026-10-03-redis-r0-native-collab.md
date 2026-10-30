# 2026-10-03 · Redis 卡 R0 落地：满载原生 + 门禁补强（四条全落地）

状态：已交付（用户 2026-10-03 点头 R0 四条清单，对话在案；四条同 diff 落地，判据与证据见下；R1/R2/R3 触发条件以本 Note 为归属家——已判断的待触发项不另立卡）

## 问题（压卡的事实，全摘要见推敲卡）

多人形态下"一个文件同一时刻一个写者"只是流程政策：P1 同文件并发写、P4 感知、P6 状态回写滞后。
E1/E2（调研卡，已实测）钉死了地基：**会话内守卫真实生效但管新鲜度不管独占；跨进程连守卫都不闭合**。

## 四条落地（对应 Redis 卡 R0 清单）

1. **守卫边界进手册**（R0-1）：[公司手册](../../company-workspace/AGENTS.md)「协作规矩」新增**写盘守卫**
   条（先读再写/盲写拒/stale 拒/会话记账进程重启清零/**管新鲜度不管独占**）；
   [multi-human.md §3](../../docs/multi-human.md)「机制实况」刷新为 E1/E2 实测版（原"read-before-write
   是可选插件的按会话观察"改判：base bundle 常驻 + 行为实测 4/4 绿）。
2. **占位=认领**（R0-2(a)）：抢注语义 = 开场先落 `drafts/<角色>.md`，**首行一字不差**
   「占位=认领，非出稿」——合同家 = multi-human §3 **纪律 5**（"文件已存在≠认领"的唯一例外）+
   手册同句；门禁 = `deliverables-check` 观察项 **`PLACEHOLDER_CLAIMS`**（判据纯逻辑
   `isPlaceholderClaim` 进 lib + spec ×3，keyless）。**(b) meta 建档抢注待布局卡 B1 毕业**（已登记不失落）。
3. **版本一致性交叉核对**（R0-3）：`authorship-audit` 新增——final 依据所引稿版号 vs 稿面署名行当前
   版号（判据纯逻辑 `crossCheckVersions` / `citedVersionsOf` / `currentVersionOf` 进 lib + spec ×6，
   **quote-z fixture 红绿**：锚 v2、盘面 v3 ⇒ stale ×2 精确命中）。**真盘首轮 = 88 处引用、✗5 处过期**
   （quote-z v2/v3 ×2、sh-mz-agent ceo v3/v1 ×2、token-cn-idc cfo v1/v4）——这些"版号待对齐"状态
   原先只活在 final 散文里，首次机器可见。红不是仪器错：每处都是 final 自己承认的未决项，
   收敛路径 = 各场版号重新对齐（quote-z D3④ 等，维护者收敛动作）。
   **〔2026-10-04 维护轮对齐完毕，✗5→0、audit ALL PASS〕**三场手法各按其性质：
   - **quote-z ×2（真承继）**：执行 D3④ 预授权的收敛——v2→v3 承继确认，证据 = v3 变更行自述 +
     final 全部经济数字（κ/垫资门/峰值/3-4-3/38.40%）对 v3 稿面逐一复核一致；CFO 稿一字未动，
     final 引用行改锚 v3，历史审批锚 v2 保留在审批表 prose 里（"旧版号签字不对新版号生效"的
     承继由维护者确认，**只解复核锚、不解毛利线**，不落价约束原样保留）。
   - **sh-mz ×2（错标订正）**：final 引「任务书 v3」实为**成本天花板口径的定稿标签**，非文件版号——
     稿首自创建即 v1（git c517811→归档 blob diff 零改动实证）。改引"文件版号 v1 + 口径 v3 定稿（§1 D7）"。
   - **token-cn-idc ×1（引文去歧义）**：final 转录 cfo.md:264 自己的错引「取 `drafts/cfo.md`（v1）」——
     引号内 backtick 使他人稿的错被版号核对读成本件自己的引用；去 backtick（引文内容逐字不变），
     版本引用计数 93→92 即此一处。
   教训：三处过期三种性质（真承继待确认 / 标签误作版号 / 引文格式歧义）——仪器报红后**逐处读原文
   定性再动手**，不存在统一的"改数对齐"手法。
4. **出厂 changed-files 卡实测**（R0-4）：P4 四成分对照表逐格填——

| P4 成分 | 出厂卡覆盖 | 证据 |
|---|---|---|
| 稿件已存在 / 已更新 | ✅ 覆盖（按 turn 列变更文件 + diff） | `workspace/changes` announce 事件在 **3/3 真角色会话**日志（ed1f4b1a / 95ac49a7 / cf26ffbe，每 turn 一条）；UI 实测 = 收割轮 cdp-probe 交互 + 手册「出厂两个人机面」教行（AGENTS.md:191） |
| 谁认领了什么 / 状态到哪了 | ❌ 不覆盖（无数据源） | announce 只载 turn 号、摘要按 turn 载文件 diff；认领语义 = 本轮 R0-2 占位（已落地）；结构化状态 = 布局卡 B1 meta（待 RFC） |
| 轮内实时在场感 | ❌ 不覆盖 | 插件按 **turn 粒度**事后汇总（recorder 围绕文件工具捕获、turn/end 发 announce，vendor `workspace-changes/src/index.ts:143-156`）；无流式在场面 |
| **结论** | 缺口 = 认领/状态（B1 落地后大半解决）+ 实时感（demo 需求才值得） | **增量面板不立项**，维持卡上既定："有真实需求再 spike（client 面红线先例）" |

   观察项：会话 A（ed1f4b1a）turn 2 有成功写但未 announce（turn 1 有）——异步窗口或空 diff 判定，
   不影响对照表结论，登记备查。

## 输掉的方案（防复犯）

- **Redis R2 单机实验**（SET NX EX + Streams）：触发条件两条（R0 出真洞 + 用户批，缺一不进）随本
  Note 登记；E1 全绿后无触发证据——Redis 线维持关门，Q3（框架先例深扫）继续条件触发不跑。
- **对角色"包一层" atomic-write**：角色走进程内 fs 工具面、无执行位——R1(b) 幻觉撤回维持；
  atomic-write 归 R1(a) 维护者/脚本侧，触发 = 跨进程互斥需求成立即上（不依赖命中率论证）。

## 验收核对（本轮实跑记录）

- `pnpm test` 260 全绿（+6 R0-3 spec、+3 R0-2 spec）；`pnpm verify` ALL PASS。
- `authorship-audit` 真盘：88 引用 / ✗5 过期（如上，真实信号非误报）。
- `deliverables-check` 真盘：观察项正常（真盘暂无占位抢注 ⇒ 无 `PLACEHOLDER_CLAIMS` 行，形状正确）。
- 推敲卡去向：Redis 卡毕业迁 `_done/_closed_plans/`（本 Note = 去向指针的家）。
