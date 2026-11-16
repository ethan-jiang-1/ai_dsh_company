---
status: 修复就绪
severity: P2
opened: 2026-11-16
---

# BUG-193：覆盖率阈值守卫把目录当文件，阈值键仍可静默失效

> 严重级别：P2（次要）｜发现：2026-11-16｜状态：修复就绪
>
> **关联**：[探索卡 Round 93](../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；BUG-184 的守卫面（`tests/repo/budget/vitest-coverage-thresholds.spec.ts`）。
> **留痕**：Note（本批共用；落地同 diff 写 `notes/implemented/2026-11-16-guard-surfaces-not-samples.md`）。

## 症状

BUG-184 的新 spec 声称「每条阈值键都命中真实文件」，但实现只调用 `existsSync(join(ROOT, row.path))`；目录也返回 true。把任一 threshold 键改成目录（例如 `packages/company-pack/src/host`），spec 仍 3 passed，但 vitest 对目录键不会匹配任何文件，floor 依旧静默失效。

## 运行面

tooling / 覆盖率验证面（`vitest.config.ts` + `tests/repo/budget/vitest-coverage-thresholds.spec.ts`）；不是产品运行时。

## 复现

```sh
cp vitest.config.ts /tmp/vitest.config.ts.bak
python3 - <<'PY'
p='vitest.config.ts'; s=open(p).read()
s=s.replace("'packages/company-pack/src/client/wiring/context-wiring.ts': { statements: 90, branches: 85 }", "'packages/company-pack/src/host': { statements: 90, branches: 85 }")
open(p,'w').write(s)
PY
pnpm test tests/repo/budget/vitest-coverage-thresholds.spec.ts   # 期望红，实际 3 passed
cp /tmp/vitest.config.ts.bak vitest.config.ts
```

实跑日志 = `runtime/tmp/c11/mut-threshold-dir.log`（2026-11-16，spec exit 0）。目录键下的覆盖率运行不会有该文件的 ERROR（与 BUG-184 同一条机制）。

## 根因与证据

- **根因**：判据只查路径存在，不查 `statSync().isFile()`；且 `vitest.config.ts` 的阈值键是字符串，不会在类型面报错。
- **确认**：临时把阈值键改成目录 → spec 全绿；还原 → git diff 空。
- **为什么这是缺陷**：BUG-184 的修法把「键必须命中真实文件」写成判据；判据本身放过目录 = 同一失败类在修复里复发。

## 失败类与同类排查

**失败类 = 配置组合**（配置键的「命中」判据不完整）。

同类：`vitest-coverage-thresholds.spec.ts` 的另外两条判据（pack src 面、statements+branches）不涉及文件类型；`built-path-literals.spec.ts` 用 `existsSync` 判产物（产物是文件，未查类型）；`live-pointer-paths` 用 `existsSync` 判 spec（同理）。建议统一一个「路径是普通文件」原语。

## 修复方案与范围

- spec 加 `statSync(path).isFile()`（或 `lstat` 后 `isFile`）；负例 = 阈值键目录 → 红。
- 同 diff 检查 `built-path-literals` / `live-pointer-paths` 的 `existsSync` 是否也需要 `isFile`；若加，先补对应负例。
- 明确不改：阈值数值、include 面、vitest 配置格式。

## 已修判定

把阈值键改成 `packages/company-pack/src/host` → `pnpm test tests/repo/budget/vitest-coverage-thresholds.spec.ts` 红（点名不是普通文件）；还原 → 绿。`node runtime/tmp/c11/vitest-threshold-check.mjs` 在正常配置上仍 exit 0。
