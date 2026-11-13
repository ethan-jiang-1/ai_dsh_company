---
status: 已修
severity: P2
opened: 2026-11-10
---

# BUG-056：quality-loop `verdict-r1.md` 的 body-sha256 口径易错——首次真跑 audit `body-modified`

> 严重级别：P2（次要）｜发现：2026-11-10｜状态：已修（2026-11-10：调查中 → 修复就绪 → 修复已落地 → 已修）
>
> 来源：第八轮 exploratory test（[问题卡](../settled_issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md)）；
> 证据 = `runtime/rehearsal-workspace/.dsh-company/deliverables/2026-11-10-probe-qloop/quality-loop/verdict-r1.md`
> 与 `quality-loop-audit --deliverable ...` 的 FAIL。
> 留痕：Note [2026-11-10-quality-loop-verdict-hash](../../../notes/implemented/2026-11-10-quality-loop-verdict-hash.md)。
> 修复 = pack 内 `verdict-hash.mjs`（`--fix`/`--check`/`--body`）+ skill/guide 只教工具 + audit 对
> `未复验` 给 `post-verdict-unverified` warning。
> 审查：agent — 对照「已修判定」逐条核过；红→绿、真盘 audit 与 self-test 见「修复落地」。

## 症状

第一次真实质量环（VP-Eng → produce → verify → verdict/处置）文本上跑通了：verdict 是 `pass`、7/7
check-id、4 条 advisory 已处置，但 `quality-loop-audit` 报：

`body-modified: verdict-r1.md：正文 sha256=5738a1fdbb12… ≠ 头里 d9d2520abad1…`

核对：

- 头行：`body-sha256=d9d2520abad1c382940eede2431671ab91070115accdca6ea5c50a276de66596`
- `tail -n +2 verdict-r1.md | shasum -a 256` = `d9d252…`（**含文件尾随换行**）
- `printf '%s' "$(tail -n +2 verdict-r1.md)" | shasum -a 256` = `5738a1…`（**去掉尾随空白**，audit 的口径）

VP-Eng 自己也在最终正文里写「`verdict-r1.md` 的 hash 对应订正前版本」——说明它把 hash 当“原文副本的
校验”而不是“audit 归一化口径”，没有按 `quality-loop` skill 的「正文去掉结尾空白」计算。

**隔离验证**：把同一交付目录复制到 `runtime/qloop-audit-fixed-2026-11-10`，只把头里的 hash 改成归一化
值 `5738a1fdbb12…`，`quality-loop-audit --deliverable` → **ALL PASS**。说明双 activation / preset / depth /
verifier 只读 / checklist 覆盖 / 处置 / 次序 / 方法配对都过，**唯一失败就是 hash 口径**。

## 根因（确认，2026-11-10）

`quality-loop` skill 写了「哈希口径 = 正文去掉结尾空白（文件尾随换行不算改了）」，`docs/guides/quality-loop.md`
也给了 `printf '%s' "$(tail -n +2 ...)" | shasum -a 256` 的示例；但模型仍用了更自然的
`tail -n +2 | shasum`（含尾随换行）。这是**指令面过于依赖手抄/手算**，不是 audit 判据错：
audit 的归一化是契约意图（尾随换行不算修改），hash 必须按同一口径算。

同一轮还暴露了第二个相邻风险：VP-Eng 在 verdict 之后改了产物（F1/F3 订正），但没有开 R2 复验，
只在处置表写「已修但未经复验」。这不是 hash 错，但说明 **“裁决原文 + 产物版本”没有被同一个机械锚绑定**：
audit 只核裁决原文，不核产物是否在裁决后被改。本轮不给产物体积加 `artifact-sha256`（见 Note 的
「输掉的方案」），先让「未复验」成为 audit 可见的 warning。

## 暴露的失败类

**“读起来对”的裁决，机械锚对不上**：质量环的价值在 append-only / 可复核；hash 口径一错，audit 红，
整轮证据包不可信。横切：所有需要手算 hash/摘要的流程（quality-loop、未来 verdict/评审包）是否都该
提供一条可复制的命令或工具，而不是散文里的“注意口径”。

## 复现

```sh
source run/env.sh
node probes/team/quality-loop-audit.mjs --deliverable \
  runtime/rehearsal-workspace/.dsh-company/deliverables/2026-11-10-probe-qloop
# 期望 FAIL body-modified；用 skill 的 verdict-hash.mjs --fix 重置头里的 hash 后应 PASS
# （但正文已是“订正前版本”的证据）；audit 同时给 post-verdict-unverified warning
```

## 修复关联（实际做法）

- 新增 pack 内 `presets/_shared/skills/quality-loop/scripts/verdict-hash.mjs`：
  `--fix <verdict-file>` 按 audit 同一归一化口径重算并回填 `body-sha256`；`--body` 只取正文哈希；
  `--check` 核对（随 `presets/**` 发布，模型不用手算）。
- `quality-loop` skill §3 / `docs/guides/quality-loop.md` §2 只教这一条可复制命令，明确
  「不要用 `tail -n +2 | shasum`（含尾随换行）」。
- audit 的 `body-modified` 诊断补「尾随换行会让它差一位；用 `verdict-hash.mjs --fix` 重算」。
- 裁决后改产物：不新增 `artifact-sha256`；dispositions 显式写「未复验」时，audit 对最后一轮给
  `post-verdict-unverified` warning（可见、不冒充原文一致）。
- keyless spec 覆盖尾随换行/空白归一、`--fix` 回填、缺头 fail-loud、skill/guide 命令面、
  `未复验` warning。

## 修复落地（2026-11-10）

- 红：`pnpm exec vitest run tests/tools/quality-loop.spec.ts` → 修前导入
  `verdict-hash.mjs` 不存在（1 failed）；补工具后 `未复验` warning 用例仍红。
- 绿：同一命令 → **39 passed**。
- 真盘红→工具修复：`node probes/team/quality-loop-audit.mjs --deliverable
  runtime/rehearsal-workspace/.dsh-company/deliverables/2026-11-10-probe-qloop` →
  `body-modified`（`5738a1…` vs `d9d252…`）+ `post-verdict-unverified` warning；
  对证据副本 `verdict-hash.mjs --check` → `MISMATCH`（exit 1），`--fix` → `body-sha256=5738a1…`，
  再 `--check` → `OK`（exit 0）。
- `node probes/team/quality-loop-audit.mjs --self-test` → **ALL PASS**（7 支：基线绿 → 各破坏红 → 还原绿）。
- 同 diff 记录：见 Note 链接（卡顶 `留痕`）。

## 已修判定

- 新一次真跑/夹具的 `verdict-r1.md` 头 hash == audit 归一化后的正文 hash，audit 不再 `body-modified`；
- skill/guide 的 hash 命令是单行可复制，且明确排除 `tail | shasum` 的尾随换行；
- 若保留“裁决后订正产物”，dispositions 显式「未复验」时 audit 给 `post-verdict-unverified` warning
  （不把它误报成原文一致）；
- keyless spec 覆盖「尾随换行/空白归一 / `--fix` 回填 / skill·guide 命令面」。
