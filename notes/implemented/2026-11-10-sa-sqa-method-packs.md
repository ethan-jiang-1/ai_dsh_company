# 2026-11-10 · SA/SQA 方法包：系统架构 + V&V 两侧，starter 随 pack

状态：implemented（2026-11-10 落地；验证见下）

上游 = [SA/SQA 方法包卡](../../_backlog/_archive/settled_issues/2026-11-10-sa-sqa-method-packs.md)；
证据 = [SA/SQA 方法包研究](../../_backlog/research/org-coordination-topology/2026-11-10-sa-sqa-method-packs.md)。

## 问题

SA/SQA 退役后，VP-Eng 只剩质量环骨架：没有默认方法包，verifier 只读、写不了 `vv-plan.md`，
也没有旧 SQA 的直达 CEO 否决。硬软一体的 SyRS/IRS/V&V 没有可执行方法。恢复旧 persona 会把方法
重新写回身份，退役理由仍在。

## 决定

1. **两个方法包**，各含 producer/verifier 两侧，同 method/version、check-id 同批：
   - `system-architecture@1.0.0`：五学科域判定 → SyRS/IRS/架构稿/验证点；验证侧审计域表、接口、追溯、验证点。
   - `vv-plan@1.0.0`：V 模型左→右映射、TC/covers/L1–L4/判据；验证侧审计覆盖、可复现性、层级缺口、超额声明。
2. **starter 随 pack 发布**：`content/methods/<side>/<pack>/SKILL.md`；`pnpm methods:init` 复制到
   `<DSH_HOME>/company/methods/`，已存在跳过、不覆盖人的版本。方法仍由任务书点名 `<pack>@<version>`，
   不装/不点名 = fail-closed。
3. **V&V 作者**：由通用 `quality_loop_produce` 按 `vv-plan` 写；`quality_loop_verify` 只读复核。
   不加薄 `system-qa` 作者档（研究建议：先方法包，真实出现“自己审自己”再加）。
4. **blocker 升级**：两侧方法包与 VP-Eng persona 写死——blocker 原样进裁决/final/升级 CEO，
   不得以“接受”结案；质量环 skill 的 blocker 规则继续有效。
5. **不恢复旧 SA/SQA persona**；旧 skill 留在 git 历史作方法来源。

## 输掉的方案

- **恢复 `system-architect` / `system-qa`**：方法又写回 persona；换公司要改包；退役理由没消失。
- **只发一个 `system-engineering` 大包**：架构与 V&V 两套产物、两套检查表混在一次裁决，失焦。
- **不装 starter，只写文档**：开箱仍不可用；用户要自己找/写方法。
- **让 verifier 带 bash 跑测试**：v1 只读边界会被打破；动态证据仍由 producer 跑。
- **把方法写进 quality-loop preset**：方法槽合同失效；换公司/换方法要改包。

## 后果

- 硬软动议可以按需跑 `system-architecture` / `vv-plan` 质量环；纯软不需要系统层。
- 验证者仍跑不了测试/仿真；动态证据由 producer 交原始输出，拿不到标“未验证”。
- 方法层是人拥有的副本：`methods:init` 幂等、不覆盖；升级 starter 需要人手动替换。
- 旧 SQA 的“直达 CEO 否决”不是运行时强制；blocker 升级靠合同/VP-Eng 转呈，审计能核 blocker 不得接受。

## 验证

- 已跑：`pnpm vitest run tests/harness/tools/methods-init.spec.ts` → **4 tests passed**
  （两包两侧同 method/version + check-id 同批；seed 复制/幂等/不覆盖/源缺失）。
- 已跑：`source run/env.sh && pnpm methods:init` → **copied 4 / skipped 0**（dev home；
  已安装 `system-architecture` / `vv-plan` 两侧）。
- 已跑：`pnpm verify` → **ALL PASS**（含 doc-budget / script-index / content-manifest / backlog-liveness）。
- 已跑：`pnpm test` → **170 files / 1409 tests passed**；`pnpm typecheck` → 绿；
  `preset-smoke` → **ALL PASS**（6 角色 + 5 support）。
- 红形态：把 verifier 的 `version` 改成 `1.2.0` → 配对 spec 红；预置目标文件再 seed →
  内容不变（覆盖即红）；删一侧 `SKILL.md` → seed 报 `source-missing`。
