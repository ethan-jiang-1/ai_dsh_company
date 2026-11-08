# 2026-11-08 · SA/SQA 能力组织：按场景取用学科域（A+C）

状态：已交付（2026-11-08；用户裁定 A+C：单 skill 域路由 + 任务书声明域 + SA 五学科判定）

## 决定

1. **SA 的 `systems-architecture` 顶部加「先判域」**：五学科**固定五行**（软件 / 固件 / 电气 / 机械 / 系统测试），
   每行写 `学科 | 在/不在 | 依据`；依据必须可被反驳（任务书边界 / 元件清单 / 现场条件 / 产物用途），
   只写"不涉及"不算；缺一行 = 没做域判定。
2. **两条边界**：纯软件（无物理执行器 / 无市电 / 无承力件）只用软件自己的判断——状态机、并发、契约、
   可观测性、迁移回滚，**不许硬凑**采样/供电/耐受包络；含物理件时电气与机械必须在，**不得以"不是我的专业"缺席**；
   判不准按最坏物理边界判在，并写触发改判的条件。
3. **SQA 的 `vv-playbook` 顶部加「域审计」**：SA 排除某域要举证；文档出现该域**特征词**却判「不在」→
   **不通过**（市电/通流/采样/隔离⇒电气；承力/密封/散热/壳体⇒机械；MCU/RTOS/固件升级⇒固件）；
   纯软件出现无依据的硬件条目 → 判「超域」；「在」的域必须在 V&V 有验证项；结论写进 `sqa-review.md` 摘要。
4. **上游声明 = VP-Eng 任务书**（住 `eng-teaming` 硬规则）：给 SA/SQA 的任务书必须写 ① 现场边界
   （室内/现场/机柜/移动）；② 是否含物理执行器 / 市电 / 承力件（没有写"无"）；③ 产物用途
   （记录是否要用于事后举证/对外验收）。冲突以任务书边界为准，SA 判定偏差由 SQA 点名。
5. **形状 = A（单 skill 域路由）**，不拆 skill；`sa-sqa-quality-audit.mjs` 的 Q8–Q11 保持窄判据；
   **不改 `content/AGENTS.md`**（避免 replay 新鲜度义务与手册字节预算）。

## 输掉的方案

- **B 拆域 skill（`software-*` / `hardware-electrical-*` / `mechanical-*`）**：选择本身要判断力，漏选/错选
  没有守卫；组合与挂载面变复杂。收益（每域清单更深）不值。
- **只由任务书声明域（C-only）**：VP-Eng 判错会放大到两侧；纯软件仍没有「只用软件思考」的下游指令，
  SA 只是照单取清单。
- **只 SA 自判**：没有上游边界，SA 自说自话，SQA 也缺对照。
- **D 维持现状 + 窄判据**：BUG-034/035 的两条条件判据只覆盖「记录可举证 / 故障路径耐受」，
  纯软件场景仍无显式指令，跨域漏项靠运气。
- **把域判定塞进公司手册**：改 `content/AGENTS.md` 注入面 → 触发 replay 新鲜度义务与手册预算；
  任务书是每次动议的输入，住 `eng-teaming` 更轻、责任也更靠上游。
- **把 Q8–Q11 升级成可配置「域 → 必备判据」表**：那会造第二套判据系统，与 `/req check` 抢 owner；
  窄判据 + skill 域路由已覆盖。

## 落地

- `packages/company-pack/presets/system-architect/skills/systems-architecture/SKILL.md`：
  「先判域」五学科固定表 + 纯软件/含物理件两条边界 + description。
- `packages/company-pack/presets/system-qa/skills/vv-playbook/SKILL.md`：「域审计」节（举证 / 矛盾即不通过 /
  纯软件不硬凑 / 在域要落地）+ description。
- `packages/company-pack/presets/vp-eng/skills/eng-teaming/SKILL.md`：任务书「域边界」硬规则。
- `tests/presets/presets.spec.ts`：4 条 keyless 断言（SA 五学科 + 两条边界；SQA 域审计；任务书三声明）。
- `probes/team/sa-sqa-domain-routing-probe.mjs`：真跑 + `--audit <dir>` 零模型审计，共用 R0–R6。

## 验证（实跑；红证与绿证都留）

- **keyless**：`pnpm vitest run tests/presets` 首跑 4 failed（文案未落）→ 补三份 skill 后 **54 passed**。
- **真挂载/连通**：`preset-smoke` ALL PASS；`probe-smoke` ALL PASS（6/6 快速档）。
- **真跑（三次，如实记录差异）**：
  1. 08:48–08:54（v4 目录）：探针停表条件只看前 3 份稿 → SQA 还没写就收表；R2–R4 红、R5 绿。
  2. 08:57 起：API transport 失败（root 与子会话都报 `DeepSeek Messages transport failed`）→ 无新产物。
     健康检查（一次最短 web 轮次）通过后再跑。
  3. 09:21–09:39：模型**接着 v4 动议**往下写（新目录没出现），只认新目录的探针读不到；改为
     `--audit <v4>` 对产物跑同一组 R0–R6 → **ALL PASS**（五份产物齐；SA 五学科表；软件=在、电气/机械=不在；
     SQA 域审计在场；任务书三声明；无 final.md）。
- **行为证据（v4 产物）**：SA 的 `system-architecture.md` §0 以**任务书五行**为准，并**显式声明**与 skill
  默认五行（软件/固件/电气/机械/系统测试）的差异（固件并入控制与执行、系统测试归 SQA），四个「不在」域
  各给三条依据 + 改判触发；SQA 做了独立域审计并原样保留结论（域审计通过 + 总评不通过 1 条 + 待验 1 条）。
  这正是 A+C 的设计：**上游声明边界、下游判定并显式解释差异、SQA 独立核**。
- **全量门禁**：`pnpm test` **150 files / 1222 tests**；`typecheck` / `lint`（0/0）/ `dup`（0 clones）/ `verify` 全绿
  （`verify` 首跑 2 红：Note 未建 + 待落地卡缺验收标准 → 补齐后绿）。

## 剩余风险

- 单轮样本；域判定的**依据质量**仍是人的判断，探针只判「有没有逐域写、方向对不对」。
- 含物理件方向（EE/ME 判「在」）本轮未真跑；电气场景仍由既有 `sa-sqa-delegation-probe.mjs` 承担（本轮未跑）。
- 探针真跑模式的「接着既有动议写」分支已修（候选目录 = 新目录或启动后有改动），但本轮用 `--audit`
  取证据、没有再跑一轮验证该分支；`--audit` 与真跑共用同一组断言，行为证据不受影响。
- `probe-smoke` 与 `preset-smoke` 连跑时首次启动失败（未复现，输出只有 Node 版本行）；单独重跑 ALL PASS，
  按环境争用记录，不写成产品红。

## 上游卡

- [SA/SQA 能力组织卡](../../_backlog/_archive/settled_issues/2026-11-07-sa-sqa-capability-organization.md)（已结归档）。
- 前序：[SA/SQA 子人格 Note](./2026-11-06-sa-sqa-subpersonas.md)、
  [BUG-034/035 证据链 Note](./2026-11-07-sa-sqa-evidence-chain.md)。
