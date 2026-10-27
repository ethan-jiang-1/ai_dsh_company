---
状态：implemented（2026-10-27/28，六维提分 D4：版本与产物收口）
---

# D4 提分：先把"同版本两份字节"杀掉，再让交付面有默认守卫

> 上游 = [六维提分卡](../../_backlog/issues/2026-10-27-six-dim-raise.md) 批二。

## 决定

1. **版本 0.3.15 就位**（`--bump patch`）：修三处交付记录不一致——tarball 0.3.14、manifest 0.3.10、
   package 0.3.14（`release --check` 实跑红）。CHANGELOG 写本版用户/收件人可见变化；`docs/release.md`
   版本字面量随 bump 更新；旧 0.3.14 tgz/sha 与 0.3.10 manifest 删除（gitignored，防同目录混两份字节）。
2. **`dist-freshness` 门禁（第 49 门）**：`_dist/release-manifest.json` 在场时校验
   `manifest.version == package.version`、`artifact.sha256` 与 tgz 一致、`manualSha256` 与手册一致；
   `_dist` 不在 → `skip`（登记进 `EXPECTED_SKIPS`：CI/fresh clone 常态）。
   **不校验 `dirty`**：`--prepare`/`--verify` 阶段工作树本来就是脏的，干净树由 `release --check` 把关。
3. **交付流程实跑**：`--prepare`（tsc + tsdown + export-dist + npm pack + manifest）
   → `--verify`（verify / test / release-smoke / lifecycle-smoke / standalone-smoke /
   client-load-smoke / preset-smoke / present-catalog-smoke 全绿）→ 提交 → `--stamp` → `--check`。
4. **重复工具收家**（同批 R3-22 的便宜项）：`canonicalPath` 5 份 → `host/paths.ts`（node:fs 归 host）；
   `isRecord` 3 份 → `lib/guards.ts`（纯逻辑，双面可编译）。

## 输掉的方案

- **只改 manifest 让 check 变绿**：tarball 仍是旧代码的字节；改记录 = 让交付面继续撒谎。
- **同版本重打 tarball**（`--prepare --force`）：`npm pack` 带 mtime，同版本会产生不同 sha，
  违反"发布字节 = 冒烟字节"；bump 是唯一正路。
- **dist-freshness 校验 `dirty`**：prepare/verify 期间必脏，会把正常发布流程自己拦红；干净树归 `--check`。
- **把 probe-source 切片 spec 一并改掉**：四个探针的 verdict 逻辑内联且各带证据数组，抽 lib 是独立一刀；
  本轮先做零风险的两个收家，probe-source 留待下一轮（不假装做了）。

## 后果

- 交付面从"三处记录互相矛盾"变成"单一版本 + 单一 sha + 门禁自洽"；`release --check` 恢复可用。
- 新增第 49 门：有 `_dist` 时 PASS，无 `_dist` 时计入 `SKIP`（fresh clone 输出 3 门无对象，本机交付态 2 门）。
- `canonicalPath` / `isRecord` 各只剩一份；host 的路径工具不再散落五个文件。

## 验证（真跑）

```text
node tools/release.mjs --check        # 改造前：FAIL manifest 0.3.10 ≠ package 0.3.14
pnpm release --bump patch             # 0.3.15 就位
node tools/release.mjs --prepare      # build + pack + manual + manifest（tarball 0.3.15，116 条目）
node tools/release.mjs --verify       # 8 项检查全 pass：
  # verify / test / release-smoke / lifecycle-smoke / standalone-smoke /
  # client-load-smoke / preset-smoke / present-catalog-smoke
node checks/run-gates.mjs             # PASS dist-freshness（0.3.15；sha 与 manifest 一致）
pnpm typecheck                        # 0 错
npx vitest run                        # 104 files / 947 tests
```

红证（dist-freshness）：把 manifest 的 `version` 临时改回 `0.3.10` → 门禁红并点名
"manifest 版本 0.3.10 ≠ package 0.3.15"；还原 → 绿。删除 `_dist/release-manifest.json` → `SKIP`（已登记白名单）。

未验：`--stamp`/`--check` 在本提交之后跑（manifest gitSha 需钉到最终 HEAD）；结果记在提分卡收尾。
