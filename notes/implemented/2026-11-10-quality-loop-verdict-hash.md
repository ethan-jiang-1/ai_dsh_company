# 2026-11-10 · 质量环裁决头：哈希只走 pack 内工具，裁决后改产物要可见

状态：implemented（2026-11-10 落地；上游 = [BUG-056](../../_backlog/_archive/fixed_bugs/BUG-056-quality-loop-verdict-hash-trailing-newline.md)；
授权 = 用户 2026-11-10「你这两个半修好了之后，现在又有多余的一个新的bug了，你就继续修」）

## 问题

第一次真实质量环（VP-Eng → produce → verify）文本上跑通，audit 却判 `body-modified`：
verdict 头里的 `body-sha256` 是 `tail -n +2 verdict-r1.md | shasum` 算的（含文件尾随换行），
audit 的归一化口径是「正文去掉结尾空白」——两位哈希只差一个尾随换行。skill 与
[guide](../../docs/guides/quality-loop.md) 都写了 `printf '%s' "$(tail -n +2 ...)"`，模型仍选了
更自然的命令；**依赖手抄/手算的口径就是会漂**。同一轮还暴露相邻风险：裁决后 VP-Eng 订正了产物
（F1/F3），但没有开 R2，只在处置表写「未经复验」——audit 只核裁决原文，不会把这条状态显示出来。

## 决定

1. **哈希只走 pack 内工具，不手算**：新增
   `presets/_shared/skills/quality-loop/scripts/verdict-hash.mjs`（随 pack `presets/**` 分发）：
   `--fix <verdict-file>` 按 audit 同一口径重算并回填 `body-sha256`；`--body` 只取正文哈希；
   `--check` 核对。skill §3 与 guide §2 都改成这一条可复制命令，并明确「不要用 `tail -n +2 | shasum`」。
2. **audit 诊断说人话**：`body-modified` 的 detail 补一句「尾随换行会让它差一位；用
   `verdict-hash.mjs --fix` 重算」，让下一轮看到红的人知道先怀疑什么。
3. **裁决后改产物必须可见**：不能开 R2 时，dispositions 显式写「未复验」；audit 对最后一轮
   dispositions 的该标记给 `post-verdict-unverified` warning。**不新增 `artifact-sha256`**（见输掉的方案）。
4. **keyless 钉住**：`tests/harness/tools/quality-loop.spec.ts` 覆盖尾随换行/空白归一、`--fix` 回填、
   缺头 fail-loud、skill/guide 命令面、`未复验` warning；audit `--self-test` 保持七支红→还原→绿。

## 输掉的方案

- **改 audit 归一化去包含尾随换行**：让自然命令 `tail | shasum` 直接匹配。但「尾随换行不算改」是
  append-only 的契约意图；把文件书写细节变成哈希语义，会让任何换行/空白差异都成假红，且宽恕真正的
  尾部改动。否决。
- **只修文案（把 `printf` 写得更醒目）**：模型已经看过 `printf` 那行仍用了 `tail | shasum`；
  同一失败类在 BUG-056 现场已复现。文案不是机械保证，工具才是。
- **新增 host 命令 / UI 按钮生成裁决头**：需要碰 pack 公开命令面与会话日志读取，成本高；
  当前失败点是「一个已知正文的哈希」，pack 内脚本足够。等出现「需要从验证者会话自动取正文」的
  真实需求再升级。
- **强制 `artifact-sha256`**：能绑定产物版本，但需要解析 brief 的产物路径、定义 R2 后的预期值、
  处理「合法订正 + 未复验」与「非法篡改」的区分；证据不足时先做会让正常流程假红。先保留
  `未复验` 显式标记 + warning，等有第二次真实事故再升级。

## 后果

- 写/修裁决头不再依赖手算；`--fix` 只改头里的一个 token，正文一个字节不动。
- `--check` 可在收口前自检；audit 仍独立按同一归一化口径核，不信任头。
- 裁决后订正产物仍允许，但必须在 dispositions 里留「未复验」并接受 audit warning；不冒充已复验。
- pack 多一个 `presets/_shared/skills/quality-loop/scripts/` 入口；`preset-smoke`/`presets` spec 继续覆盖
  skill 目录与 pack 发布形状。

## 验证

- 红：`pnpm exec vitest run tests/harness/tools/quality-loop.spec.ts` → 修前 1 failed（导入的
  `verdict-hash.mjs` 不存在；补工具后 `未复验` warning 用例仍红）→ 修后 **39 passed**。
- 真盘红：`node probes/team/quality-loop-audit.mjs --deliverable
  runtime/rehearsal-workspace/.dsh-company/deliverables/2026-11-10-probe-qloop` → `body-modified`
  （`5738a1…` vs `d9d252…`）+ `post-verdict-unverified` warning；body-modified detail 已带尾随换行提示。
- 工具：对证据副本 `--check` → `MISMATCH`（exit 1）；`--fix` → `body-sha256=5738a1…`；再 `--check` → `OK`（exit 0）。
- `node probes/team/quality-loop-audit.mjs --self-test` → **ALL PASS**（7 支：基线绿 → 各破坏红 → 还原绿）。
- `pnpm verify` → **ALL PASS**（2 门无对象：replay-fixture-freshness / replay-ui-freshness）。
- `pnpm test` → **171 files / 1420 tests passed**；`pnpm typecheck` → 绿（无输出）。
- `preset-smoke` → **ALL PASS**（装当前 pack 后 6 角色 + 5 非角色全部可挂载；`presets/**` 含新脚本）。
- `pnpm lint` / `pnpm dup` → 0 warnings / 0 clones。
