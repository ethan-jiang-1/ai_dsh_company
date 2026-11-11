# 2026-11-11 · 第三轮收口：pre-publish READY 闸、config 未知键与 READY 边界

状态：implemented（2026-11-11 落地；验证见下）

上游 = 用户 2026-11-11 第三轮评估后的指令（“出现的问题都得修”）。
相关 = [第二轮门禁/配置](2026-11-11-second-layer-gates.md)（本 Note 只记第三轮差异）。

## 决定

1. **pre-publish index 不再默认给 READY。** `market-index.staged.json` 与根
   `market-index.json` 同时在场时，`release --check` 直接失败；要拿 READY 必须显式
   `--allow-pre-publish-index`，在命令里承认“不会托管”。根 index 仍 tracked（移动会破坏
   `market-index.spec` 与 bump 流程），但默认 READY 不再放行。
2. **READY 的适用面写进输出与合同。** `release --check` 打印
   `SCOPE READY = 当前工作树（暖 lib/_dist）；干净 clone 的验收边界 = fresh-clone CI 的
   install + bundle:init + verify`；`release.md` 同文。干净 clone 的 release 重放是已知缺口，
   不冒充 READY 承诺。
3. **host config 拒绝未知键。** 除类型/空值外，`validateHostConfig` 只允许
   `cultivationRoot` / `handbookSkipPresets`；`cultivationroot` 这类键名 typo 直接 throw。
4. **file-size 只扫索引面（tracked + staged）。** 本地未提交大件不再让 `pnpm verify` 误红；
   安全（token/secrets）与 portability 仍扫 working-tree，因为要看“可能误提交”的内容。
5. **旧 Note 的 READY 标历史点。** 0.11.0 的 READY 行加“(0.11.0 历史点)”，当前版本以
   本 Note / `_dist/release-manifest.json` 为准。

## 输掉的方案

- **把根 market index 移到 `_dist`。** 会破坏 `market-index.spec`、`release --bump` 与
  `release-ready` 的现有形状；本轮用默认拒绝 + 显式 flag 收口，物理迁移另起条目。
- **让 `release --check` 在 staged 时永远 READY、只打 WARN。** 上一轮已证明 WARN 会被
  “只看 READY 行”的自动化忽略；默认失败才能逼出确认。
- **为 config 加 schemastery `Config`。** 两个可选旋钮不值得新增运行时 peer；白名单 +
  fail-loud 足够挡住键名/类型错误。
- **file-size 也扫 working-tree。** 会把本地未提交截图/导出件当仓库资产，制造与提交无关的
  误红；索引面才是“会被发布/提交”的边界。
- **在 Note 里重复最终 READY SHA。** Note 每次提交都会改变 HEAD；当前 SHA 以
  `release --check` 的输出与 manifest 为准。

## 后果

- 版本：`0.11.2`；tarball 259 entries。
- release：pre-publish 默认红；显式 flag 才 READY；READY 输出带 SCOPE 行。
- config：未知键/错类型/空值都在 `apply` 前 throw。
- 门禁：file-size 索引面；token/secrets/portability working-tree。

## 验证

实测 2026-11-11：

- T1 默认红（原话）：
  `release: market-index.staged.json 在场且根 index 可托管：默认拒绝 READY；发布后删 staged，或显式 --allow-pre-publish-index 确认不会托管`，exit 1。
- T1 显式确认后：
  `release: SCOPE READY = 当前工作树（暖 lib/_dist）；干净 clone 的验收边界 = fresh-clone CI 的 install + bundle:init + verify`
  `release: READY 0.11.2 @ 3506f2c1（tgz 259 条目；7 项检查 pass）`
  + staged WARN，exit 0。
- T2：`cultivationroot` / `handbookSkippresets` / 额外键 → `未知 host config 键`；config spec 4 例绿。
- T4：3MB **untracked** 文件 → `PASS tracked-file-size ×…（索引面 tracked + staged）`；
  同一文件 `git add` 后 → `FAIL tracked-file-size: 1 件超过 2MB: …`；删除后绿。
- `pnpm release --verify` → 全绿（release-smoke / company-entry / client-load / preset /
  present-catalog 全 PASS）。
- `pnpm verify` → ALL PASS；`pnpm test` → 187 files / 1545 tests；typecheck/lint/dup 绿。

## 未验证

- `npm publish` 未执行；0.11.2 仍是 pre-publish。
- 干净 clone 上重放 `release --verify` 未跑；READY 的暖工作树边界已在输出/合同写明。
- Desktop/其他 OS、真模型会话未跑。
- dev home 的 3 profile / 2 条失效 workspace 登记未清。 
