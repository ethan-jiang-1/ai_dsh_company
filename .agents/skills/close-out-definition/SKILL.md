---
name: close-out-definition
description: Use when finishing any non-trivial change before reporting it done, to run the close-out definition of done — prove every changed acceptance path, run the semantic review against the authorization's actual wording, harvest test assets from what really ran, leave the pointer set current, and emit the six-line receipt.
---

# 收尾的完成定义

适用：任何非平凡变更在**宣布完成之前**。**收尾次序与六行回执形状的唯一家 = 本 skill**；
去向规则住 [dev-loop §12](../../../docs/guides/dev-loop.md)（整片 revert / `_backlog` 离场 / Note 归属），
语义审四输入住 [policy.md §P5](../../../docs/policy.md)——两边都只链接，不复述本 skill 的步骤。

## 陷阱

机器绿灯只证机制面，**不证「做的是不是这件事」**。本 skill 存在的原因：
「机器通过 ≠ 语义通过」曾长期只有边界声明没有执行形状，导致 entry-probe 历次答卷全标
「语义审阅：未执行」（截至首例前 24 次，grep 实数）——**空转**。
所以收尾不是"跑完 verify 就报"，而是一串**有输出**的判断。

## 步骤

1. **对照授权原文。** 翻回用户/条目的原话读一遍，逐条问「这条做到了吗」。
   机器绿灯不覆盖这一问。范围外多做的东西也要点出来（不是功劳，是没被要求的东西）。
2. **证据四链点名**（挂得上 / 行为对 / 装得上〔适用时〕/ 批准）：每条点名**实跑的检查**；
   没跑的**如实标「未执行」**——不混入"应该跑了"的暗示。
   **发布类声明另加**：声称 READY/已发布，必须贴 `node tools/release.mjs --check` 的原始 READY 行 + commit SHA；
   没有输出行的 READY 不算证据（2026-11-03 0.8.2 A- 收口的实况：Note 写了 READY，`--check` 实际红）。
3. **语义审**（四输入 = [policy.md §P5](../../../docs/policy.md)）：带①授权/验收原文 ②该面合同文档（docs 只写 now，同 diff 更新了吗）
   ③证据选层（选的检查能证明承诺的性质吗）④Note（决定/备选/真证据齐吗），**重读当前 diff**，
   不沿用旧结论。输出 finding 带「缺陷/位置/影响/证据」，blocker 与建议分开；机器已可靠拒绝的不复报。
4. **收割三问**（资产从运行里长出来，不从想象里写）：这次运行——①抓到异常没——**材料性**的才立 BUG 卡 + 红绿修复
   （判据 = [_backlog 章程](../../../_backlog/README.md)「缺陷的通道」；这也是「手上有个 bug 先分诊」的入口）——
   非材料性当场修掉，commit 写根因与影响面，不建卡
   ②行为值得钉吗（判据「变了我们要不要知道」→ replay 场景 / keyless 断言 / 视觉夹具；钉之前反证一次：把被测函数改成返回 null，断言仍绿 = 这条没钉住）
   ③撞到运行态事实没（→ 调试阶梯 / Note / 升级 probe）。**三问全「无」也是合法答案，如实记。**
5. **指针收口。** 改过的路径/符号/默认值，在所有**活文档**里的引用是否都指到现行家
   （门禁 `bare-path` / `md-links` 查得到的部分交给门禁，查不到的——散文里的描述、表格里的行——自己过一遍）。
6. **改口检查。** 本轮若推翻/收窄了既有决定：旧 Note 是否已加「被…取代」指针（或 `git mv` 到
   archived）、新 Note 的「输掉的方案」是否载明旧决定？只有新文、没有旧文回链 = 未收口
   （规则 = notes/README §五）。机械面 = `pnpm notes:audit`（只读；硬项 = 取代缺回链 / 状态行）。
7. **反向检查**：被证伪的已落地切片**整片 revert**（实现+测试+docs+Note 同退），修正另起新条目。
   不做半 revert 的外科修补——半退留「文档说 A、代码是 B」的漂移态，结构门禁查 HEAD 不查语义一致，抓不住。
8. **跑门禁**：`pnpm verify` + `pnpm test`（`set -o pipefail` 链；裸 `cmd | tail` 取的是 tail 的
   退出码 = 假绿）。改动面涉类型/导入签名时加 `pnpm typecheck`；涉 `src` / `tools/lib` / `drivers` 时加
   `pnpm lint` + `pnpm dup`（pre-push 也强制）。提交体写 why / what / 验证行——本仓代码 commit 的现行形状，别只写标题。
9. **发轮次回执**（非平凡收尾必发——交接的标准形状，驾驶座可见面）。固定六行：
   ① 外部行为与影响面（含改动 owner）；
   ② 四链证据（挂得上 / 行为对 / 装得上〔适用时〕 / 批准：各点名**实跑**的检查，未跑如实标「未执行」）；
   ③ 语义审结论（四输入过了一遍、发现 N 条及处置）；
   ④ 资产增量（场景/夹具/门禁/语料涨了什么，没涨如实写）；
   ⑤ 未验证面与恢复所需环境线索；
   ⑥ 下一脚建议（给用户的最小动作，或「无事可做」）。

## 完成判据

- [ ] 授权原文逐条对照过，**范围外的多做也点出来了**。
- [ ] 四链证据每条点名实跑检查；未跑的显式标「未执行」（不写成绿）。
- [ ] 语义审**真跑过**并且**写出了结论**（审了什么、发现 N 条、怎么处置）——不是"已阅"。
- [ ] 收割三问逐问有答案（「无」也是答案，但必须回答）。
- [ ] 改口检查过：若推翻/收窄旧决定，旧文有回链或已归档；`pnpm notes:audit` 无「取代缺回链」。
- [ ] 被证伪的切片整片 revert（或明确说明为何不 revert）。
- [ ] `pnpm verify` + `pnpm test` 全绿，且命令链用了 `set -o pipefail`（涉类型面时 `typecheck`、涉源码面时 `lint` + `dup` 也跑过）。
- [ ] 发布类声明贴了 `release --check` 原始 READY 行 + commit SHA；没有就标「未发布/未执行」。
- [ ] 六行回执已发，且每行都有内容（「未执行」「无」也是内容）。

## 指针（别复述）

去向规则（整片 revert / `_backlog` 离场 / Note 归属）= [dev-loop §12](../../../docs/guides/dev-loop.md)；语义审四输入与拉人四件套 = [policy.md §P5](../../../docs/policy.md)；
**本 skill 是收尾次序与六行回执形状的唯一家**（§12 与 orient 只链接，不复述）；
Note 侧的完成定义 = [agent-note-definition](../agent-note-definition/SKILL.md)；
门禁侧 = [gate-change-definition](../gate-change-definition/SKILL.md)；
证据分层 = [testing.md](../../../docs/testing.md)。
