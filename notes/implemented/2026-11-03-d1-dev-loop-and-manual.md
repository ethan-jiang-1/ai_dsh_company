# 2026-11-03 · Phase 3a：dev-loop 瘦身、安装手册纠错、Note 取代 banner

状态：implemented（2026-11-03；七维复评 Phase 3a）

> 上游 = [第五轮打扫卡](../../_backlog/issues/2026-11-03-repo-hygiene-round5.md) 的 fresh 复评（D1/D4）。
> 关联 = [Phase 1 语义腐化](./2026-11-03-d4-semantic-drift.md)。

## 决定

- **删 dev-loop 的 9 个空壳节**（§2/§4–§8/§9.1/§10–§11/§13）：它们只指向别处，且全仓**无锚点入站**；
  §0 导航表直接给现行家（debugging / bootstrap / release / environments / web-rpc / tests README / policy），
  正文 5 处 `§9.1` 改为 `tests/README.md`，`runtime-map` / `project-map` / `policy` 的旧节引用同步改指目标。
  行预算随内容下调 165→120（157→113 行；反向棘轮要求）。
- **安装手册纠正**：模板 `tools/lib/install-manual.mjs` 的“包内内容”从 `src/**` 改为
  `lib/**`（runtime 两半 + 类型）+ `presets/**` + `content/**` + `locale/` + `icon.svg` + `cordis.patch.yml`。
  用 `renderInstallManual` 以 0.8.2 现有 digest/date **只重生成手册**（不重打 tgz、不改发布字节），
  并更新 gitignored manifest 的 `manualSha256`，`dist-manual` / `dist-freshness` 保持绿。
- **三篇旧 Note 加 v3 取代 banner**：`company-workspace-skeleton-shipped` / `first-run-bootstrap` /
  `faq24-alignment` 的 `workspace/**`、符号链接、`<DSH_HOME>/company-workspace` 叙述统一指向
  [v3 native entry](./2026-11-01-plugin-as-product-v3-native-entry.md)；`presence-status-seam` 的
  `files` 列表就地改新（决定正文不动，只改事实落点）。
- **tests/README 四区表补 support / fixtures 两行**：它们是**支撑**不是新 zone；spec 清单仍是目录本身。

## 输掉的方案

- **保留空壳节做锚点兼容。** 全仓 0 条锚点入站；保留只让每次读 §N 多一跳。删掉并把正文引用改到现行家，
  断链风险由 `pnpm verify`（md-links）兜。
- **等下一次 release 再修安装手册。** 收件人现在拿到的 0.8.2 手册会教错包内容（去找不存在的 `src/`）。
  只重生成手册、不动 tgz，是发布字节与收件人手册都诚实的唯一窄口径。
- **重写旧 Note 的决定正文。** 决定冻结；v3 是新决定，旧文只加 banner 与事实落点，不改当时的取舍。

## 验证（实跑，2026-11-03 09:1x +08）

```text
wc -l docs/guides/dev-loop.md                      # 113（预算 120）
rg -n "§9\.1|## 2\. 调试|## 4\. 插拔|## 13\." docs/guides/dev-loop.md   # 0 个活节
node tools/release.mjs --check                     # 在 258637d 上仍 READY（本次 HEAD 之后红是点态，见 release.md）
pnpm verify                                        # ALL PASS（dist-manual / dist-freshness 绿；nav-enumeration 四区节名保持）
```

## 未做

- `docs/index.md` 的“何时读”列（32 行表，P2）。
- 67/106 implemented Note 零入链的分类（需 `notes-consistency-audit` 分诊，独立轮）。
- `_dist` 手册的历史 0.8.2 tag 仍带旧表（tag 不重写；master 上的手册已是新版）。
