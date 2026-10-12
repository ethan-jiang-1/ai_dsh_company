---
status: 已消化
---

# RFC：组队健壮性三层防御（最小在屋起步 + 成员打回权）落地
状态：已消化（2026-10-12 落地，见文末验证）
批准：用户 2026-10-12「那就setup goal 来推动整个落地吧，步步为营，问题自己解决……我回来就希望看你都做完」
（组队健壮性三层防御诉求的三段原话与负例、验收标准全貌见
[_backlog/issues/2026-10-12-ceo-minimal-assembly](../../_backlog/_archive/settled_issues/2026-10-12-ceo-minimal-assembly.md)；
证据基线见 [research/ceo-minimal-assembly/2026-10-12-assembly-evidence](../../_backlog/_archive/research/ceo-minimal-assembly/2026-10-12-assembly-evidence.md)）。

## 问题

17 场主会话 ~15 场四职起手（系统性偏置）；负例场失败链 F1-F4（推荐项非最小、菜单算术矛盾、
成员无打回、验收字段预订全职能）。第三层缺失：手册打回规范零命中，通道在、义务无。

## 方案（三层，落点与规则以卡为准）

1. **第一层（CEO 组队，assembling-the-team + chairing）**：R1 范围菜单必含单 owner 起步项且为
   推荐默认；R2 菜单算术一致性（spawn ⊆ 选中名单，超扩须回用户）；R3 验收字段 ≠ 入屋理由
   （跨域字段初稿 + 待确认）；R4 互审 = 重仪式（写明防哪个失效才设）。
2. **第二层（framing）**：guidance 有执行方差是前提——纠错通道（第三层）比预防条款更健壮，同落。
3. **第三层（成员打回 + CEO 收打回，手册协作规矩 + assembling-the-team）**：R5 域内核对义务
   （两问）+ 打回三件套（为什么不是我/缺什么/建议谁接）走【待澄清】；整任务错配才打回，
   半域执行标待确认；R6 CEO 收打回 = 纠错信号，响应三选一明说、不追责；R7 机制零改动
   （vendor release 现成）。andon 三原则（人人可拉/标准响应/不追责）进规范文本。

## 输掉的方案

- 只硬化第一层不加第三层：探针证明 guidance 有方差（旧文案也能碰巧最小），预防条款会漂——
  纠错通道是结构性的。
- persona 承载组队方法：违背 role-content-plan §0 分工（persona 管身份，skills 管方法）。
- 拆分 dev-loop/新增机制：§N 交叉引用图级联断；vendor release 语义现成，不自造。
- 打回无边界：会被滥用成推活（用户点名）——三件套门槛 + 半域不打回条款内置。

## 验收（可执行；红 = 对现行文案/现行行为）

- **B1**（模型行为）：ceo-assembly-probe 升级——`--session` 模式判 live 实录
  session-6cce7fb4（现行行为红：F2 spawn ⊄ 选中名单）；真跑模式判新行为（菜单含单 owner 推荐
  + spawn ⊆ 名单）。owner = probes/session-context/ceo-assembly-probe.mjs。
- **B2**（模型行为）：成员打回 probe（新，排练场）——超域分派下断言打回三件套；
  红 = 旧规范下出稿不打回（live T5 实录即红证）。owner = probes/session-context/。
- **B3**（确定性）：tests/presets 内容锚——assembling-the-team 结构条款关键句 +
  手册打回句在场。owner = tests/presets/presets.spec.ts。
- **B4**（编排）：preset-smoke 五角色零 broken。owner = checks/smoke/preset-smoke.mjs。

## 交付形状

同 diff：skill/手册改动 + B3 锚 + B2 probe + RFC 毕业到 implemented（状态行「已消化」）；
卡随之留验收记录并按关闭条件收口。


## 验证（实跑收据，2026-10-12）

- **B3 红→绿**：`pnpm test tests/presets` ——红（两断言：缺「最小在屋起步」、缺「域内核对」）→ 改文案 → 绿（16/16）。
- **B1 红→绿**：`node probes/session-context/ceo-assembly-probe.mjs --session <live 负例目录>` → exit 1
  （session-6cce7fb4：spawns=4, verdict=over-assembly——live 实录真红）；真跑一场（新 skill）→ exit 0
  （session-dacbb0a5：spawns=0, routed, minimal-assembly）。
- **B2 绿**：`node probes/session-context/member-bounceback-probe.mjs` → exit 0（session-cfe1d55f：
  bounced=true, deliveredTechPlan=false, bounce-back——VP-Sales 域内核对 + 打回三件套 + 只读实况路由建议，
  journal 按名引用新条款；产物留排练场）。红证 = live T5（旧规范下零质疑出稿，见卡）。
  过程修正两处：探针场景未钉排练场路径致一次 live 盘污染（两文件已删，场景改钉绝对路径后复跑零污染）；
  judge 首版把打回件/journal 误计为技术稿交付（改为只认请求件本体）。
- **B4**：preset-smoke ALL PASS（5 角色）。全量：`pnpm verify` ALL PASS；`pnpm test` 含新 B3 锚两条。
