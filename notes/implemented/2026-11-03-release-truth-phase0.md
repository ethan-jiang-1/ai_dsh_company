# 2026-11-03 · Phase 0：发布真伪止血（0.8.2 READY、coverage 忽略、托管前 guard）

状态：implemented（2026-11-03；七维复评 Phase 0）

> 上游 = 2026-11-03 七维复评（fresh agent，用户委托；G1 发布真伪 / G2 market index / G4 coverage）。
> 关联 = [0.8.2 release Note](./2026-11-03-release-0.8.2.md)、[发布 runbook](../../docs/guides/release-runbook.md)。

## 决定

- **0.8.2 在发布 commit `258637d` 重验并钉住**：`release --verify --allow-stale-manifest` 用现有
  `_dist` tarball 跑完 7 项（verify / test / release-smoke / company-entry-smoke / client-load-smoke /
  preset-smoke / present-catalog-smoke）全 pass；`--stamp` 后 `--check` 输出
  `READY 0.8.2 @ 258637d6`。0.8.2 Note 原先的 READY 行没有实跑输出，已按本条读数改写。
- **READY 是点态，不是仓库不变量**：`release --check` 只对 `--stamp` 钉住的 commit 成立；之后再有提交，
  `gitSha` 落后、`--check` 变红是设计。语义落 [release.md §版本纪律](../../docs/release.md)，runbook 只留一行指针。
- **`coverage/` 进 .gitignore**：`vitest.config.ts` 教 `npx vitest run --coverage`，此前生成物未忽略，
  跑一次覆盖率就弄脏工作树并让 `release --check` 报“工作树不干净”。`gitignore-shape` 加规则与
  `check-ignore` 断言（负例：删 `.gitignore` 的 `coverage/` → `FAIL gitignore-shape: 缺规则 /^coverage\/$/m`）。
- **托管前 guard**：`node tools/market-index.mjs --check --hosted` 在 `market-index.staged.json` 仍标记
  `requiresPublish:true` 且 served index 列着该版本时 exit 1；publish-handoff §4 改为先跑 `--hosted`。
- **本轮不 publish**：`npm whoami` 返回 `need auth`（本机无 npm 登录），`npm view dsh-company-pack` 仍 404；
  served index 继续是 0.8.2 草稿，只在托管步骤被 `--hosted` 拦住。

## 输掉的方案

- **把 0.8.2 manifest `--stamp` 到本轮 hygiene commit。** 会让 manifest 指向一个不含发布字节的 commit；
  `sourceFingerprint` 虽仍匹配，但 provenance 变浑。保留 READY @258637d。
- **把 `release --check` 塞进 pre-push。** 发布后的正常开发提交都会因 `gitSha` 落后而红——那不是回归；
  点态语义已写进 release.md，靠 runbook/Note 纪律而不是假阳性门。
- **现在 publish 0.8.2。** 无 npm 认证；且 publish 不可逆，不应在发布真伪刚修好时抢跑。
- **把 served index 的 `versions` 清空。** 会改变 `--prepare`/staged 的现有合同；先加托管前 guard，
  真正的“served/staged 双文件”留给 Phase 1 评估。

## 验证（实跑，2026-11-03 08:4x +08）

```text
node tools/release.mjs --verify --allow-stale-manifest   # 7/7 pass
node tools/release.mjs --stamp                           # stamp 0.8.2 @ 258637d6
node tools/release.mjs --check                           # READY 0.8.2 @ 258637d6（127 条目；7 项 pass）
node tools/market-index.mjs --check --hosted             # exit 1（staged 0.8.2 未发布；预期红证）
npx vitest run tests/host/market-index.spec.ts        # 5 passed（含 hosted 纯函数）
pnpm verify                                              # ALL PASS 53 门 + 2 无对象
pnpm test                                                # 135 files / 1078 tests
```

本 Note 的提交是 post-release hygiene：提交后 `release --check` 会因 `gitSha` 落后而红，这是设计；
发布证据仍以 `258637d` 的 READY 行为准。
