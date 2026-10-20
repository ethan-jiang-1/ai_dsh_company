# tracked-token 类级守卫：观察窗 token 不再随日志入库（2026-10-20）

状态：implemented（2026-10-20；BUG-029 修复；用户授权全部修复；`pnpm verify` + `pnpm test` 全绿）

> 现场、复现与已修判定 = [BUG-029 卡（已归档）](../../_backlog/_archive/fixed_bugs/BUG-029-committed-web-token-recurrence.md)。
> 上一同类 = [BUG-013](../../_backlog/_archive/fixed_bugs/BUG-013-e2e-driver-token-committed.md)（2026-10-12，路径级修复）。

## 决定

**修法 = 路径规则 + 类级窄扫 + 两层测试，不做历史重写。**

1. runtime/web-logs/ 进 `.gitignore`；已 tracked 的两件 `git rm --cached` 后删除本地文件。
   根 `AGENTS.md` 与 `runtime/README.md` 的 tracked/ignored 说明同步。
2. 纯逻辑 = `tools/lib/tracked-token.mjs`：只认 `https?://...?token=<20+ 字符>` 的 URL 查询串，
   返回行号与 token 长度，**不回传 token 值**。
3. 门禁 = `checks/gates/tracked-token.mjs`：扫 `git ls-files` 的 tracked 面（跳过只读 `vendor/`），
   装配进 `checks/run-gates.mjs`。`checks/README.md` 与 `security-scan.mjs` 头注补范围声明：
   company-workspace 真扫仍归 security-scan，跨仓 token URL 窄扫归 tracked-token。
4. 测试 = `tests/harness/tracked-token.spec.ts`（真 token URL 命中；动态 token 参数、占位 secret、
   非 URL 赋值不命中）+ `tests/harness/gitignore-guards.spec.ts` 的 `.gitignore` 规则断言。

## 输掉的方案

- **直接复用 a2 高熵扫描全 tracked**：会命中 `probes/session-context/human-exits-nonblocking-probe.mjs`
  的 `token: url.searchParams.get('token')` 与 `tests/harness/orient.spec.ts` 的
  `secret = 'never-render-this-placeholder'` 两处测试替身；要么加 fixture 分类，要么窄化正则。
  窄正则更小、更准，故选窄正则。
- **只修路径（BUG-013 同款）**：7 天内复发一次，证明路径级不足以覆盖「任何 tracked 文本」这一类。
- **历史重写**：token 是本地观察窗按进程生成的会话 token，进程结束即失效；和 BUG-013 同一裁定，
  只 untrack + 轮换，不 `filter-repo`。
- **把日志留在本地**：已删除两件本地日志；规则与门禁保证下次不再入库。需要启动证据时从新进程横幅读。

## 后果

- `pnpm verify` 多一道门禁：扫 1740 个 tracked 文件，跳过 5 个 >2MB/非普通文件；
  新增/移动日志、探针输出、文档或快照说明时都会经过它。
- 门禁扫 `snapshots/`（历史证据）但跳过 `vendor/`；若未来快照里出现真实 token URL，会红，
  按证据政策决定是清洗还是登记豁免，不静默放行。
- 测试替身若写真实 URL 形状的 token，会被判红；这是有意的——测试里用短占位或动态参数。
- 真实 token 值不进入卡、报告、测试输出或本 Note。

## 实跑证据（2026-10-20）

```text
红（临时 tracked 文件写合成 token URL）：
FAIL tracked-token tracked 文件含 token URL（值不打印）：runtime/audit-token-red.log（line 1 tokenLen=30）

绿（移除后）：
PASS tracked-token ×1740（tracked 面零 token URL；跳过 5 个 >2MB 或非普通文件）

.gitignore 红/绿：
临时删 runtime/web-logs/ 规则 → tests/harness/gitignore-guards.spec.ts 1 failed
还原 → 3 passed

git ls-files runtime/web-logs        # 0
git check-ignore -v runtime/web-logs/example.log
  .gitignore:23:runtime/web-logs/    runtime/web-logs/example.log

pnpm verify                          # ALL PASS
pnpm test                            # 71 files / 699 tests 全绿
```
