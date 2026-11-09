# 腐化通道的机械面：禁写断言、命令引用、生成物同源、台账顺序

状态：implemented（2026-11-03 第六轮 D4 深挖）
上游 = [第六轮七维打扫卡](../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round6.md) ·
材料 = [D4 深挖](../../_backlog/_archive/research/repo-hygiene-round6/2026-11-03-context-rot-deep-dive.md)

## 决定

四条「文档/生成物与代码不一致、但任何门禁都不会红」的通道，各补一条机械面：

1. **`retired-claims`**：活跃文档里的**已证伪断言**禁写。只收"能被一句话说清替代事实"的句子，
   每条带证伪日期与现行事实；首批 3 条：`company profile 已退役`、`四条协作通道`、
   `CompanyView.tsx 未注册`。语义质量仍归人审——本门不做语义判断。
2. **`command-refs`**：文档反引号/代码围栏里的 `pnpm <script>` 必须是 `package.json` scripts 或
   pnpm 内建；`node <tools|checks|probes 路径>` 必须存在。上游 vendor 自己的两个脚本
   （`gen-client-catalog` / `build`）显式放行并注明来源。
3. **`dist-manual` 同源**：tracked 的 `_dist/安装手册.md` 必须**逐字等于**当前
   `tools/lib/install-manual.mjs` 用头部注入值渲染的产物；不同源即红，并给首处差异。
   渲染输入从手册自身读回（版本/包名/sha/日期）+ pin，fresh clone 无 manifest 也能复核。
4. **`ledger-routing` 顺序**：决策台账的 D 号必须非降序（取每行首号；合并行不拆）。
5. **`notes:audit` 双口径**：同时报「零 Note 入链」（note→note）与「零任何当前文档入链」
   （notes + docs + `_backlog` 活区）。单一数字曾被读成"N 篇孤立"，而分诊结论是"不批量迁"。

同时修掉现行腐化：`docs/design/architecture.md` 的「company profile 已退役」错句、`D19+D21` 的
台账顺序、以及两个已耗仪器（`cultivation-gui-probe` 710 行、`replay-ui`）从活树删除。

## 输掉的方案

- **只修错句、不立门**：上一轮已经只修了三处、漏了 architecture.md——同一类断言散布多份文档，
  人修必漏。禁写表是对"已证伪"这一小类的最小机械面。
- **用语义相似度/LLM 判设计层是否过时**：不可复现、会误报，且把门禁变成不可解释的评分。
  边界写进材料：设计层的"why 是否仍成立"仍归人审。
- **`command-refs` 扫描全部 `pnpm` 字样**：会把 "pnpm exit 0" 这类散文与上游命令当脚本。
  只认反引号/围栏里的命令引用，并给上游命令显式白名单。
- **`dist-manual` 只查版本/sha**（现状）：模板改了而手册没重生成时全绿——本轮实测就是这样。
- **重跑 `export-dist` 重打 0.8.7**：会把未 bump 版本的 tarball 换成新字节，等于悄悄改发布物。
  只按 manifest 的既有输入重渲染手册并更新 `manualSha256`（文档修正，不动产品字节）。
- **迁移/删除 80 篇零入链 Note**：上轮已定性为有效决策记忆；此处只修正指标口径。

## 后果

- 新门 3 条（`retired-claims` / `command-refs` / `dist-manual` 扩面），`ledger-routing` 扩一条；
  `verify` 门数 57。
- `_dist/安装手册.md` 重新生成（卸载清单与模板一致），`manualSha256` 同步；tarball 字节未动。
- 已耗仪器删除：`checks/README.md`、`replay-smoke` 注释、相关 implemented Note 的路径指针同 diff 更新
  （归档卡只改链接目标，不改正文）。
- `notes:audit` 输出多一行；JSON 多 `orphansAnyDoc` 字段（旧字段保留）。

## 验证

```text
# 1) 四条机制各自造红（原话）
#    command-refs：docs/orient.md 加围栏 pnpm nonexistent-script
FAIL command-refs: docs/orient.md:81 → pnpm nonexistent-script 不是本仓脚本…
#    command-refs：加 `node tools/nonexistent-tool.mjs`
FAIL command-refs: docs/orient.md:80 → node tools/nonexistent-tool.mjs 指向不存在的文件
#    retired-claims：加「`company` profile 已退役」
FAIL retired-claims: docs/orient.md:82 → 已证伪断言「company profile 已退役」…
#    ledger-routing：交换 D22 与 D23+D24
FAIL ledger-routing: 台账编号必须非降序（插行要放对位置）：第 30 行（D22 排在 D23 之后）
#    dist-manual：改模板一句话
FAIL dist-manual: 手册不是当前模板的产物…首处差异 @7345 模板=… 手册=…
#    全部还原 → verify ALL PASS（57 门 + 2 无对象）

# 2) 双口径
node tools/notes-audit.mjs --json | jq '.summary | {orphans: (.orphans|length), orphansAnyDoc: (.orphansAnyDoc|length)}'
#   { "orphans": 80, "orphansAnyDoc": 48 }

# 3) 全链
pnpm verify      # ALL PASS
pnpm typecheck   # exit 0
pnpm test        # 142 files / 1122 tests
```

未验：`release --check` 仍红（源码面在发布后变过，点态设计）；下次 `--prepare` 会连同手册一起再生产。
