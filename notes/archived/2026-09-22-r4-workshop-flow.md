# 2026-09-22 · R4 成品流程（交付物三态判据机械化 + 共享盘卫生 + 模板即流程 + 关掉 subagent footgun）

## 本轮交付（外部可观察）

- **交付物三态有机器判据**：`scripts/lib/deliverables.mjs`（纯逻辑）+ `scripts/deliverables-check.mjs`
  （运行场入口）。规则：成品 `deliverables/<slug>/final.md` 必须能回溯到一次 **Lead（CEO）会话**的
  `deliverables/presented`；过程稿 `deliverables/<slug>/drafts/<角色>.md`；排练/探针产物不进
  `deliverables/`。合同家 = `company-workspace/AGENTS.md`「交付物三态」（随每个成员会话首帧注入）。
- **运行场已是三态形状**：25 份平铺 → **6 成品 / 12 过程稿 / 0 违规**。
- **模板即流程**：`templates/prd.md`、`templates/weekly-report.md` 从两行占位补齐；四个职能的
  preset 与全部 skill 的产出路径从 `deliverables/` 直落改到 `drafts/`（18 处）。
- **R3 的 footgun 关掉**：四个职能 preset 补 `tool-subagent-control` + `.../list-agents` 两行
  （恢复上游成对形状）；CEO preset 保持不放。
- **端到端写作流水线真跑通**并归档 `snapshots/r4-motion/`。

## 判据的三个设计决定（都不是随手定的）

1. **成品归 Lead**（agentPreset=`ceo` 且 `delegationDepth=0`）。依据 `company-workspace/AGENTS.md`
   承诺权"只有 CEO 能对外发布结论……CEO `present` 之前都只是草稿"。实测 R2 归档里 CFO `present`
   过 3 次、VP-Sales 1 次——不限归属则过程稿与定稿平级，"哪些是成品"仍答不上来。
2. **按交付物身份（`slug` + 角色）比对，不按字面路径**。这是给"三态迁移"留的桥：CEO 在 R1 声明的
   `deliverables/kb-rag-assessment.md` 搬家成 `deliverables/kb-rag-assessment/final.md` 后，
   那次声明依然成立。否则迁移一次就把历史证据全判成 dangling（假阳性，不是违规）。
   平铺旧形状的解析约定：名字中段的角色（`reconcile-package-cfo-review.md` → slug
   `reconcile-package` + 角色 `cfo-review`）与尾部 `-final`。
3. **反向检查只追 Lead 声明**，非 Lead 的成品声明只在**它此刻真躺在盘上**时判越权。历史行为不追着
   报——否则一次越权会永久污染此后每一轮审计（R2 的 VP 探针就制造了 15 份这种历史）。

## 实际跑过的验证（本轮门禁）

| 检查 | 结果 |
|---|---|
| `pnpm verify` | ALL PASS（含 vendor 铁律 SHA + 零改动；`preset-row-deps` ×12） |
| `pnpm test` | **38/38，171ms**（新增 deliverables 判据 13 条 + 三态合同/模板/职能路径守卫 3 条） |
| `node scripts/preset-smoke.mjs` | ALL PASS（5 preset 全可挂载、零 broken、skills 隔离仍在） |
| `node scripts/delegation-smoke.mjs` | ALL PASS（**边界未变**：CEO 会话三个控制名仍是团队版） |
| `node scripts/handbook-smoke.mjs` | ALL PASS（指令基线 = 公司手册，含新的三态一节） |
| `node scripts/deliverables-check.mjs` | 运行场 **6 成品 / 12 过程稿 / 0 违规** |
| R4 端到端动议 | 真 web + 真 team，**150 秒**（预算 6 分钟），无 `ask_user_question` |

**反证（D15：每条新守卫都要能变红）**：
- r1 归档 oracle：塞一份无 `present` 的成品即红；删掉被声明的成品即红（实测过）；
- 职能 skill 写回 `deliverables/` 直落 → 红；模板退回"占位" → 红；抽掉 `coo` 的续驶控制行 → 红；
  三处还原后均即绿。

## 关键实证：判据在真跑上闭合，且模型会自己守约定

R4 动议（写《客户支持 SLA 承诺页》，slug `support-sla-page`）里，prompt 只指定了
`drafts/vp-sales.md` 与 `drafts/coo.md`；**互审稿的路径 `drafts/review-coo.md` 是模型自己按三态
约定放的**，CEO 的 `present` 四条路径全在 `deliverables/support-sla-page/` 内。
⇒ 合同写进 prompt（`agent-instructions`）就会生效，不靠人盯。

## 修掉的一个真实缺口（`--only`）

审归档快照时，`workspace.expected/` 是**整盘拷贝**而 `sessions/` 只装本轮日志——不设作用域会把
历史成品误报成"无 Lead 背书"。那是**输入不成对**，不是违规。判据与脚本因此加 `--only <slug>`：
`snapshots/r4-motion` 配 `--only support-sla-page` 审计 = 1 成品 / 3 过程稿 / 0 违规（新形状口径）。

## 环境状态（下轮判断"什么已就绪"只读这里）

- `DSH_HOME=dev/harness-home`；pack 已**重装进 web profile**（`plugin --profile web remove + add`）。
  ⚠ **光改仓库不够**：profile 里 `dsh-company-pack` 是**真拷贝**，新增的 preset 行只有在 profile 的
  `node_modules` 里能解析才不 broken —— 本轮为此补了 pack 依赖
  `@deepseek-ai/dsh-tool-subagent-control@0.1.5-rc.2` 并记进 lockfile（`c810fae`）。
- 新增回归资产 **`snapshots/r4-motion/`**（lead 234 行 + vp-sales + coo + 期望态）。
- 回归层 38 条 / 秒级；认证档本轮跑过 5 个（见上表）。
- 模型凭据在开发 home；真实会话可用。
- 踩坑记录：**块注释里写 glob 路径**（`snapshots/` 加通配再加斜杠）会因 `*` 紧跟 `/` 提前闭合
  注释，报错位置离真因很远（已写进 `scripts/lib/deliverables.mjs` 模块头）。

## 自验（5 步，从快到慢——照着跑就能看到 R4 是否满足）

**第 0 步 · 先 source**（漏了会被脚本拒绝：在本仓的 coding 会话里 `DSH_HOME` 是**有值**的，
值是日用 home `~/.dsh`，所以"未设就报错"那道防线不触发——这是 R4 加守卫的原因）

```sh
cd <repo> && source dev/env.sh
```

**第 1 步 · 判据在运行场（秒级，无 key）**

```sh
node scripts/deliverables-check.mjs
```

期望：`成品 6 份 / 过程稿 12 份 / 违规 0 条 —— ALL PASS`。这一条直接回答 R4 的核心问题——
"哪些是成品"不再靠命名约定，而是每份 `final.md` 都能回溯到一次 CEO 的 `present`。

**第 2 步 · 验收判据点名的 oracle（R1 归档，验收判据 2 的原话）**

```sh
node scripts/deliverables-check.mjs \
  --workspace snapshots/r1-motion/workspace.expected --sessions snapshots/r1-motion --legacy-flat
```

期望：`成品 1 份：deliverables/kb-rag-assessment.md / 违规 0 条`。

**第 3 步 · 反证：判据真会红（这是"检查真的在检查"的证据）**

```sh
mkdir -p company-workspace/deliverables/rogue-demo
echo '# 我自己说我是成品' > company-workspace/deliverables/rogue-demo/final.md
node scripts/deliverables-check.mjs     # 退出码 1，点名 final-not-presented …/rogue-demo/final.md
rm -rf company-workspace/deliverables/rogue-demo
```

**第 4 步 · 回归层守卫（秒级）**

```sh
pnpm test    # 38 条；其中 tests/deliverables.spec.ts 13 条守判据本身（含两份反证）
```

**第 5 步 · 自己跑一场看真的（真模型，分钟级）**

按 `docs/demo.md` 场景 C 起观察窗（`pnpm dsh web -- --port 3086 --no-open`；**3080 是 GUI，别动**），
选 `wochen CEO`，跑那条写作动议，收场再跑第 1 步。期望 `deliverables/<slug>/` 出
`final.md` + `drafts/*.md`，判据 0 违规。

**四条容易踩的**：
1. 忘 `source dev/env.sh` → 脚本**拒绝执行**（不是静默跑错 home）；
2. `--workspace` 要给**含 `deliverables/` 的工作区根**，不是 `deliverables/` 本身（给错也拒绝执行）；
3. 审**归档快照**必须配 `--only <slug>`（快照是整盘 workspace + 本轮日志，不给作用域会把历史成品
   误报成"无背书"——输入不成对，不是违规）；
4. 改了 `packages/company-pack/presets/**` 后**必须重装进 profile**（profile 里是真拷贝），
   否则观察窗里还是旧行为。

## 未做 / 移出本轮

- **W3 journal 回溯压缩**：**规则已立**（`company-workspace/AGENTS.md`「轮末收敛」——已闭轮的
  journal 压成 CHARTER 一条附录，原文件随快照归档，只由人做），但**没有回溯压缩 R1/R2 的 38 篇**。
  理由：① 提案的「依据（实际查过）」对这条没给证据（只证了交付物↔present 与 workspace registry）；
  ② 实测结构异质（164 个 `## 动议` 节，只有 22/38 有 `## 结论`），机械压缩必然编造摘要，手工压
  1845 行换回的只是目录整洁；③ 它是 D8 唯一的跨会话角色记忆，R6「分身成长」回路正建立其上。
  **2026-09-22 用户拍板：就停在这——规则已立、不回溯压缩**（R1/R2 的记忆完整保留；增长从此有界）。
- **W7 轮次收尾的文档同步**：`docs/plans/roadmap.md`、`docs/index.md`、`notes/intents.md` 三处
  正被**另一个并行会话**修改（R5 拆轮 + 搁置池，D19），故暂停以免互踩。
  **2026-09-22 用户定次序：等并行会话提交后，R4 收尾一次做完**（含 roadmap 状态列、`AGENTS.md`
  当前状态、`demo.md` 定稿、`intents.md` 的 R4 行改 implemented）。
- **teammate / CEO 根会话里的 `subagent`(continuable) 仍与 team shadow 相冲**：职能 preset 的根会话
  已修好（控制行补齐），但 teammate 共享的是 CEO preset 的组合，那条张力属上游层，留 R5 与升 pin
  一起处理；本轮不扩面（见 `docs/delegation.md` §4.4）。
- **端到端真 UI（委派卡在对话流里渲染）** → R5 replay harness（R3 就留下的那笔）。
