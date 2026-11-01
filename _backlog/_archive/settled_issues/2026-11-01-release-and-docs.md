---
status: 已结
opened: 2026-11-01
---

# 推敲：发布与文档真相——`_dist` 手册、README、docs 合同、CI 与验证矩阵

> 立卡：2026-11-01 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：已结（2026-11-01）。0.5.0 的发布面/文档面已落地：`_dist` 手册+sha+manifest、
> README/pack/workspace README、profile/runtime-map/data-model/release/project-map/guides、
> CHANGELOG、`dist-manual`/`doc-budget`/`md-links` 门禁；验收 = `release --verify` 全绿 + `pnpm verify`/
> `pnpm test`。registry 不启用、Windows/容器不承诺（明确登记，不是漏做）。去向 = 实施记录
> [v2 manifest Note](../../../notes/implemented/2026-11-01-plugin-as-product-v2-manifest.md)。

## 问题与期望结果

**问题**：产品形状改了，但收件人拿到的 `_dist/安装手册.md` 还在教“一个 home 一个 bundle、公司盘
在 home、侧栏手工加工作区、换盘用 `DSH_COMPANY_REBIND`”；根 README 的安装句还是
`plugin --profile <名> add link:…`；pack README 的 Data/Backup/Uninstall 还是旧盘；docs 合同
（profile/runtime-map/data-model/release/project-map）与 guides 也还是旧形状。`dist-manual` 门禁
把旧关键句钉成必含，`doc-budget` 余量又很小——实现改了、文档不改 = 对收件人撒谎；文档要改、
预算又不够 = 落地被门禁卡住。

**期望结果**：发布面与文档面同 diff 变成新形状，并且有门禁证明“发出去的字节 = 验过的字节、
手册教的是验过的路径”：
1. `_dist` 手册由 `export-dist` 重写，版本/日期/sha/条目数/新关键句注入，永不手改；
2. 根 README、pack README、workspace README、docs 合同/guides 写清 `company` profile /
   `--workspace` / `.dsh-company/bundle.json` / home 治理 / 备份/卸载；
3. `dist-manual`、`doc-budget`、`bare-path`、`md-links`、`export-dist` 清单同 diff 改；
4. CHANGELOG 写 0.5.0 破坏性与迁移；release runbook 写新 smoke；
5. 文档预算有明确处置（搬旧内容/压缩/按规则提额），不“先写超再提额”；
6. CI/验证矩阵写清谁证什么、哪些不承诺（Windows/registry/真模型）。

**本轮判断完成的标志**：伞卡 Q1–Q7 已拍板；本卡「未决问题」已答；候选验收定稿并转
RFC/实施。**本卡不是实施授权。**

## 当前情况

- 研究依据：[发布/文档/验证](../../research/plugin-as-product/2026-11-01-release-and-verification.md)；
  主稿 [§7.4 文档面/§10.7 技术设计](../../research/plugin-as-product/2026-11-01-plugin-as-product.md)。
- `_dist/安装手册.md` 是 tracked 生成物；`tools/export-dist.mjs` 内嵌旧手册模板；
  `checks/gates/dist-manual.mjs` required 含 `company-workspace`/`DSH_COMPANY_REBIND`/
  “一个 DSH_HOME 只对应一个 run bundle”（C）。
- `checks/gates/doc-budget.mjs` 对 active docs 是棘轮；`docs/data-model.md` 75/76、
  `docs/profile.md` 63/66、`docs/runtime-map.md` 83/88，几乎没有余量（C）。
- 根 `README.md`、pack README、workspace README 仍写旧形状；`docs/release.md` 的发布形状/
  smoke 矩阵需重写；`CHANGELOG` 需 0.5.0（C）。
- `export-dist` 清单没含 bin/第二 host entry（尚未有）；`release.mjs`/`release-manifest.json`
  需同步（C）。
- CI `fresh-clone` 只跑 install + bundle:init + verify；不跑全构建/真模型/浏览器；Windows 未验证
  （C）。

## 未决问题

1. **doc-budget 处置**：先搬旧形状到 `notes/archived` + 链接，还是按 docs/AGENTS 写 Note 提额？
   建议先搬/压；确需提额才写 Note，且只提被证明饱和的那几份。
2. **registry 是否在 0.5.0 开**？建议仍不开（第二消费者再定）；`private:true`/`UNLICENSED` 保留。
3. **Windows 声明**：继续“不承诺”，还是做一次最小验证？建议明确不承诺，避免半支持。
4. **手册是否内嵌启动器/脚本**？建议手册给命令 + bin 路径，不内嵌可执行文件（sha/信任复杂）。
5. **CI 是否加 `company-entry-smoke`/浏览器段**？建议本地认证档；CI 只跑 keyless + verify
   + fresh clone，避免预算/浏览器依赖。
6. **README 的“最短路径”**：是 `pnpm company`（源码）还是 `dsh-company`（安装）？建议根 README
   先给安装后的最短路径 + 源码开发路径，两行分明。

## 范围与排除项

**范围**
- `_dist/安装手册.md` + `tools/export-dist.mjs` 模板 + `dist-manual` 关键句 + sha/清单；
- 根 `README.md`、`packages/company-pack/README.md`、`packages/company-pack/workspace/README.md`；
- `docs/profile.md`、`runtime-map.md`、`data-model.md`、`release.md`、`project-map.md`、`index.md`、
  `decisions.md`、`external-research.md`、`orient.md`、`demo.md`、`guides/{bootstrap,environments,
  release-runbook}.md`；active docs 的 stale 引用清扫；
- `CHANGELOG.md`、`.agents/skills/web-window-ops/SKILL.md`、`tests/README.md`、`checks/README.md`；
- `tools/release.mjs`/`release-manifest.json` 的条目/版本；
- 文档预算处置与门禁红/绿。

**排除**
- registry 发布动作（未到触发）；
- Windows/容器验证；
- 真模型/浏览器进 `pnpm test`；
- 重写历史 Notes（只加取代 banner/改活指针）；
- 把手册做成应用内 UI/引导（另案）。

## 方案与取舍

| 选择 | 建议 | 输掉的方案 | 理由 |
|---|---|---|---|
| 手册生成 | 继续脚本生成、sha/版本注入 | 手写/半自动 | 手册与 tarball 不能漂 |
| 旧文档处置 | 搬旧形状到 notes/archived + 链接；active docs 只写 now | 在原处叠新旧两套 | docs 是合同，不是变更史 |
| doc-budget | 先搬后压，确需提额写 Note | 先提额再写 | 仓规棘轮；先提额是反序 |
| registry | 0.5.0 仍不开 | 现在就发 npm | 第二消费者未出现；内部交付 |
| Windows | 明确不承诺 | 半支持 | 未验证；不冒充 |
| CI | keyless + verify + fresh clone；认证档手动 | 把浏览器/真模型塞 CI | 预算/稳定性 |

## 候选验收（拍板后定稿为 `## 验收标准`）

1. **手册**：`node tools/export-dist.mjs` 产出新 tgz + 手册 + sha + manifest；手册表头版本/
   日期/sha 与 tarball 一致；含 `company`、`--workspace`、`.dsh-company/bundle.json`、
   `AGENTS.md`/`COMPANY.md`、`exports`、home 治理、备份/卸载/回退、pnpm 11/12、
   `DSH_COMPANY_BROWSER`、pin；不再把旧 rebind/“一个 home 一个 bundle”当产品主路径。
2. **清单**：tarball 含 bin/第二 host entry/workspace 骨架/presets/locale/icon；不含
   workspace 数据/会话/凭据/构建中间物；`release-manifest.json` 与 tarball 同源。
3. **README**：根 README / pack README / workspace README 的最短路径、数据三层、备份/卸载、
   `COMPANY.md` 碰撞、限制与兼容窗口写清；不再教旧主路径。
4. **docs**：profile/runtime-map/data-model/release/project-map/guides 改成新形状；active docs
   的 stale 引用清零；历史 Note 加取代 banner；`md-links`/`bare-path`/`doc-budget` 绿。
5. **门禁**：`dist-manual` 新关键句（去旧必含）；`dist-freshness`/`pack-files`/`pack-exports`
   含新条目；`export-dist` 清单断言新文件；每道新判据有红→还原→绿原话。
6. **CHANGELOG**：0.5.0 破坏性 + 迁移（v1 bundle/旧 web/rebind/手册碰撞）；不写流水账。
7. **CI/验证矩阵**：文档写清 keyless/release/lifecycle/entry/client-load/真模型/跨平台各证什么；
   CI 只跑 keyless + verify + fresh clone；认证档手动；Windows/registry 明确不承诺/未启用。
8. **发布字节 = 冒烟字节**：`export-dist` 产物与 `release-smoke` 验的 tarball 同一份；sha256
   旁文件与手册一致；不手改 `_dist`。

## 关闭条件

- 伞卡 Q1–Q7 已拍板；本卡「未决问题」已答；`## 验收标准` 定稿。
- 下游 RFC/实施申请已提交并记录去向（`rfc` / `implementation` / `用户（日期）`）。
- 满足后写 `可关闭：是`、卡顶补 `> **结论/去向**`，`git mv` 到
  [settled_issues](README.md)，更新两边清单。

## 关联

- 伞卡：[插件即产品](../../issues/2026-11-01-plugin-as-product.md)（S4/S5）
- 研究：[发布/验证](../../research/plugin-as-product/2026-11-01-release-and-verification.md)、
  [主稿 §7.4/§10.7](../../research/plugin-as-product/2026-11-01-plugin-as-product.md)
- 相邻卡：[产品生命周期](../../issues/2026-11-01-product-lifecycle.md)、
  [workspace 与数据安全](../../issues/2026-11-01-workspace-and-data-safety.md)
