# RFC：培养面板 GUI 行动面 v1（采纳 / 拒绝 / 验证 / 撤回 / 创作）

状态：proposed（待实施）
批准：2026-10-17 用户令「setup goal，按我们的研发流程推进直到完全结束」——六条待裁点均采推荐项，裁定记录 = [推敲卡 §裁定](../../_backlog/issues/2026-10-17-cultivation-gui-actions.md)

> 契约角色：本 RFC 拥有**实施与验收**；UX 推敲（时刻地图 / 输入清单把手审计 / 迭代框架 / 体验协议）的家 = 上述推敲卡，不在此复述。
> 机制核证（UI→host 通道、槽 scope、命令多行能力）= 推敲卡「机制核证」节，结论：`remote.commands.execute` 是平台原生人侧命令执行面，
> 无需 pack 自有 remote，且 host 一律记 `source: { kind: 'user' }`。

## 问题

培养回路的四类治理输入（采纳/拒绝/验证/撤回）与两类创作输入（纠正/建议）今天**只有命令行入口**；
培养面板是纯展示板，待处理行只渲染 `/cultivation adopt <id>` 这类文案，用户「看到建议不知道去哪操纵」。
2026-10-13 把按钮判死的理由（钉版无 UI→host 动作通道）已证伪（详见推敲卡）。

## 方案（六片，逐片红绿环）

| 片 | 交付 | 落点 |
|---|---|---|
| S1 动作面纯模块 | 六条命令的线构造 + host 结果折算 + 文案表一处 + 通道封装（`remote.commands.execute`，缺席即降级） | 新增 client 面模块（拟名 cultivation-actions，落 client 目录） |
| S2 面板治理动作 | 待办行「采纳/拒绝（内联理由）」；已采纳行「这条有用/没起作用」+「撤回…」（后果说明 + 两段确认）；飞行中禁用；成功刷新；失败出 host 原话；未注入即只读降级 | `CultivationBoard.tsx`、`cultivation-data.ts`（refresh + 动作面）、`CultivationTab.tsx`、`CompanyView.tsx`、`index.ts`、`company-tab-registration.ts`、`styles.ts` |
| S3 无困惑重排 | 待办置顶；journal 块改「素材（不用你操作）」；「我提交的」加「等对方处理，你无需操作」；赞踩降次要；「怎么养」改写为"点哪里"，命令语法收进折叠的「熟手命令行」 | `CultivationBoard.tsx`（结构与文案） |
| S4 判断材料 | 读模型带正文（修订 `recordBody` 那条"不暴露给客户端"的注记）+ 面板就地展开正文 | `src/lib/cultivation.ts`、`CultivationBoard.tsx` |
| S5 创作面 | 顶部「给你的角色留一条方法」/「给别的角色提建议」+ 表单（期望单行 + 正文多行 + 角色 Pill + 校验：非空、期望句不得含 `::`）+ 提交后刷新并高亮新行 | 新 `CultivationCompose.tsx` + `CultivationBoard.tsx` |
| S6 真机验收 | browser-visual 探针（采纳成功 / 跨角色失败出原话 / 创作提交落盘 + 截图）+ 体验协议执行记录 | `probes/browser-visual/`、`snapshots/visual/`、毕业 Note |

**范围外（需动 host 语义，列 v1.1+）**：记录加「出处」字段、拒绝理由可空、「记下来并采纳」、「撤回我提的建议」、批量采纳、
跨角色代判、自动采纳阈值、裸 `/cultivation` 弹窗装饰。

## 输掉的方案

完整清单与理由 = [推敲卡 §输掉的方案](../../_backlog/issues/2026-10-17-cultivation-gui-actions.md)（pack 自有 business Remote／只做剪贴板／
四动作平铺成同等按钮／一轮吞下四个时刻／用 `session.command()` 只拿 `matched` 而让人去会话翻失败原因）。

## 验收

> 分层判据唯一家 = [testing.md](../../docs/testing.md)；实施按 proposed 生命周期走**先红后绿**（每片先落判据并实跑见红，再写实现转绿）。

1. **机制（keyless，S1）**：`pnpm test tests/client`
   - 新增 keyless spec（拟名 cultivation-actions.spec）：六条线构造（含边界：期望句含 `::` 必须被拒；正文含换行与 `::` 必须原样保留；
     拒绝理由换行压平且非空）；`{ ok: true, value: undefined }`（命令名不匹配）⇒ 不可用文案；
     host `result.kind === 'error'` ⇒ 文案 = host 原话；`{ ok: false }` ⇒ 错误码文案；抽象面缺席 ⇒ 不可用文案。
   - 红证：spec 在模块存在前 import 即红（实跑留证）。
2. **面板行为（keyless，S2/S3/S4/S5）**：`pnpm test tests/client`
   - `cultivation-board.spec.ts` 增：待办行出「采纳」「拒绝」（桩动作面断言发出的线内容 = `/cultivation adopt <id>`）；
     已采纳行出「这条有用」「没起作用」「撤回…」；`viewerRole` 与目标角色不符 / viewer 缺席 ⇒ 不出按钮；
     不注入动作面 ⇒ 现状命令文本（只读降级）；撤回两步（先出后果说明，再出确认）；
     创作表单校验（空期望/含 `::` 报错）与线内容；正文（S4）与「素材（不用你操作）」（S3）文案在场。
   - 读模型（S4）：`pnpm test tests/company` 增 `parseRecord` 往返断言（正文在场、多行保真）。
3. **装配不许破**：`pnpm exec vitest run tests/client/company-client-composition.spec.ts` 绿（新 prop/闭包不改槽注册面）。
4. **真挂载**：`source run/env.sh && node checks/smoke/client-load-smoke.mjs` 零挂载失败（新注入面缺席时面板仍挂得上）。
5. **真行为（S6，browser-visual 探针）**：起真 web → 种一条 open 记录到排练盘 → 进培养面板 →
   ① 点「采纳」⇒ 记录翻 `adopted` 且带 `methodSlug`、方法 `SKILL.md` 落到 `<profile>/company-cultivation/<role>/method-<id>/`、
   该会话日志出现 `command/run` + `command/done`（name=cultivation、source=user）；
   ② 对一条跨角色记录点「采纳」⇒ 行内出现 host 原话（含目标角色名）；
   ③ 创作表单提交一条纠正 ⇒ 公司盘 `cultivation/records/` 新增该记录（`status: open`）；
   ④ 零挂载失败 + 截图入 snapshots/visual 下的新目录（拟名 cultivation-gui）。
6. **体验档（人机共评，不进 gates）**：按推敲卡「体验协议」跑 T1–T6，判据 = 推敲卡「v1 的 UX 完成定义」七条；观察记录进毕业 Note。
7. **结构**：`pnpm verify` 全绿。
