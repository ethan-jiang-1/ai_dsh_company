# launch-entry-friction：fresh agent 的启动摩擦整治（2026-09-29）

> 状态：已交付｜触发 = 用户令「一个 fresh agent 一进来就该立刻明白怎么启动这个插件；摩擦大就是文档没写好，
> 要有泛化性」｜合同落点 = 根 [AGENTS.md](../../AGENTS.md) 命令表 + [demo.md §前置](../../docs/demo.md) +
> [guides/bootstrap.md](../../docs/guides/bootstrap.md)

## 验收标准（本轮立）

判据**不是**"作者本人这次做对了"，而是 **fresh agent 只看得到仓库、一次做对**。所以本轮用**独立子代理盲测**
（`subagent`，不继承对话上下文）做 before/after 对照，提示词固定为同一句：
「启动一下这个 DSH 插件，我要看看它的能力」。

## 决定

1. **自起 web 实例的脚本一律 `--port 0`**：端口是环境状态（[multi-human.md §端口不是仓库事实](../../docs/multi-human.md)
   早已这么规定，而 5 个脚本把 `arg('port', '30xx')` 当默认 = **规范存在而无人守**）。这些脚本 spawn 实例、
   用完即杀，不需要稳定 origin。
   **给人开的观察窗不受此约束**——挑一个空闲端口固定用是有回报的：本地存储按 origin 隔离，工作区连接与
   浮窗几何能留下来（依据 = [float-geometry-memory](./2026-09-28-float-geometry-memory.md)）。
2. **入口链第一跳必须挡住静默失败**：根 AGENTS.md 命令表在"web 观察窗"处补上 **先 `source dev/env.sh`** 的
   后果——未 source 时 `DSH_HOME` 是日用 `~/.dsh`，那里**另有同名 `web` profile**：起得来、**不报错**、
   五角色一个不出现；同时把"起法与开门步骤（连工作区 / token / 选 preset）"的 owner 指到
   [demo.md §前置](../../docs/demo.md)。机制原文仍在 [dev-loop §6 第 5 条](../../docs/guides/dev-loop.md)，此处不复述。
3. **活文档扫平固定端口示例**：6 处"照着抄"的位置统一成环境状态口径（AGENTS.md / demo.md / bootstrap /
   multi-human / profile.md / design/ui-demo.md）——**主位示例给什么，代理就抄什么**；稳健做法放在括号里 = 必然被抄错。

## 证据：before（盲测）

独立子代理，只给那句话：

- **17 次工具调用 / 10 份文档**，无返工——它最终给出的序列是对的（`source dev/env.sh` → `pnpm dsh web -- --port 0`），
  但入场成本高，且它自己承认"信息够是因为我逐个 bash 实测了环境状态"。
- **头号卡点 = `DSH_HOME` 继承**：不 source 会落到日用 home，而那里**也有一个 `web` profile**（无 company-pack）
  ⇒ 静默起一个空名册的 web。它判断"更粗心的代理最容易在这里翻车，还会去怀疑 preset 坏了"。
- **次号卡点 = 端口三处不一致**（AGENTS 3081 / demo 3086 / multi-human「不是仓库事实」）。它的原话：
  "新代理若只读 AGENTS.md，会以为 3081 是约定值"。
- 附带环境事实：`ps` 被沙箱拒绝（`Operation not permitted`），查进程只能走 `lsof`——对照文档恰好只写 `lsof`，这条是对的。

## 证据：after（盲测复测）

独立子代理，同样只给那句话（改动已落盘）：

- **约 15 次工具调用 / 8 份仓内文档**（before：17 / 10），且**端口那一类卡点消失**。它的原话：
  「AGENTS.md → demo.md §前置 **两跳**就拿到完整命令；『端口是环境状态不是仓库事实』这句直接消掉了最常见的硬编码端口错误」。
- 头号卡点仍是 `source dev/env.sh`（静默落日用 home）——但这次它是**从入口链读到的**，不再靠逐个 bash 实测撞出来。
- 它指出两个**当时仍存在**的缺口：
  ① 「以为要先 `plugin add link:`」——README 给了安装命令，而**没有一处**说 dev web profile 已装；它靠 `ls` 才排除；
  ② `~/.dsh/profiles/web` 与 dev `web` 同名而内容不同，文档只说"另有同名"，没给 10 秒自证手段。
- 结论原话：「最大障碍不是找不到命令，而是**要自己判定本机是否已预热**……文档只给坑不给自查命令。」

**据此追加的改动（同轮）**：demo.md §前置第 1 步补**自检命令**（用自检替代警告）——
`pnpm dsh --profile web --dump-config | grep -c company-pack` 必须 **≥1**。
**实跑证据**：dev home 得 **8**；同刻 `~/.dsh/profiles/web` 该计数为 **0**（自检确实能区分两个同名 profile）。
计数 ≥1 同时证明"不必再 `plugin add`"，故缺口 ② 与 ① 由这一条一起覆盖。

## 机械门禁：`script-port`（verify §2h）

防"修完又漂"：本仓 11 个脚本早已是 `--port 0`、5 个不是——正是"规范写在文档、实现没跟上"的**复发型**。
门禁扫 `scripts/*.mjs` 的 `arg('port', '<字面量>')`，非 `'0'` 即红（非字面量不判，避免假阳性）。

**反证**（2026-09-29）：把 preset-smoke 的默认值改回 `'3099'` → `script-port` FAIL（**报出脚本名与值**）→
还原 → ALL PASS。

## 跑过的检查

- `pnpm verify`：**ALL PASS**（新增 `script-port` 在列；`doc-budget AGENTS.md 101/105`——本轮只 +1 行，未提额）
- 反证：`script-port` 红 → 还原 → 绿（见上节）
- `node scripts/preset-smoke.mjs`（**不带 `--port`**，走新默认值）：ALL PASS（5 个 preset 真挂载）
- `node scripts/client-load-smoke.mjs`（同上）：ALL PASS（真浏览器、零挂载失败、品牌槽在场）

## 输掉的方案

- **新增一个"启动脚本"**（preflight + boot + 打印带 token 的 URL）：**撤回**。三条理由：① 撞本仓「不发明」
  （不自造门禁/流程，优先用现成载体）；② **preflight 已经存在**——`client-load-smoke` 就是 boot 真 web profile +
  真浏览器加载 + 零挂载失败 + 品牌槽在场，**一次证明三件事**（前端 dist 在 / client bundles 在 / pack 装进
  profile 且成功 apply），缺的只是"启动前跑它"这句指针；③ 真正的失败面在"第一眼示例"，改示例成本近零。
- **只改文档、不加门禁**：5 个脚本的固定端口是复发型（已有 5 例），不加门禁必然回来。
- **给文档也加端口门禁**：否决——文档里 `3080`「是本 GUI，永不动」这类表述合法，机械判据会出假阳性。
  文档侧靠改示例 + 入口链口径收口。

## 未完成 / 风险

- 5 个脚本只对 `preset-smoke` / `client-load-smoke` 实跑了新默认值（横幅取端口这条路径）；`probe` / `handbook` /
  `delegation` 三条改的是同一行、**未实跑**（认证档成本高，按需再跑）。
- "固定端口对人有稳定 origin 回报"依据 = 既有 origin 隔离结论，本轮未端到端复验。
- **盲测指出的第四坑本轮未处置**：构建前置"本机是否已预热"只有产物 mtime 可判——bootstrap 四处强调"必须构建"，
  却不给"产物是否新鲜"的自查法 ⇒ 粗心代理可能白跑分钟级构建。触发条件 = 再出现一次启动前白跑构建。
- 单一子代理盲测是**廉价代理**，不是 fresh agent 的分布：15 vs 17 次调用的差不足以单独证明改善，
  真正的判据是**卡点类别**变了（端口一致性卡点消失），故上表以"它点名了什么"而非"它少跑了几次"为准。
