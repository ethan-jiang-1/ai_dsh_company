---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-202：refactor-drift 的 `--hashes` 只证标题，`--compare` 又用集合差掩盖重复测试的删除

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：已修｜修复：2026-11-17｜审查：agent（独立盲审）— 3 blocker 已修（归档同批 / Note 一致 / 红证配方），S1–S4 已处置
>
> **关联**：[C12 归属波次探索卡](../settled_issues/2026-11-17-ownership-wave-exploratory.md)（C12-3 / N1）。
> **留痕**：批次 Note [2026-11-17-c12-ownership-wave-repairs](../../../notes/implemented/2026-11-17-c12-ownership-wave-repairs.md)（本批共用）。

## 症状

`checks/audit/refactor-drift-audit.mjs` 是 C11 指定的「纯搬移等价 oracle」，头注声称 `--hashes`
能拦「测试体被改」（删断言、`toBe→toContain`、fixture 调包）。实际有两处判别力缺口：

1. `bodyHash()` 的输入是 `assertion.titlePath`（describe + 测试标题），不是测试体。vitest JSON
   本身不含函数体；改断言而标题不变时指纹不变，`--compare` 仍打印「零测试体改动」。
2. `--compare` 用 `a.filter(x => !b.includes(x))` 做集合差，不是多重集差。拆前两条同名同指纹、
   拆后一条，两个副本都在 `b` 里找得到 → `ALL PASS 零删除`。

## 复现

标题指纹（合成样本；`runtime/tmp/c12-pre/` 为本地证据目录）：

```sh
mkdir -p runtime/tmp/c12-pre
node -e 'const fs=require("fs");const mk=(m)=>({numTotalTests:1,testResults:[{name:"/r/tests/x.spec.ts",assertionResults:[{fullName:"suite one > does a thing",titlePath:["suite one","does a thing"],status:"passed",failureMessages:[m]}]}]});fs.writeFileSync("runtime/tmp/c12-pre/before.json",JSON.stringify(mk("none")));fs.writeFileSync("runtime/tmp/c12-pre/after.json",JSON.stringify(mk("ASSERTION WEAKENED")));'
node checks/audit/refactor-drift-audit.mjs --hashes runtime/tmp/c12-pre/before.json > runtime/tmp/c12-pre/before.hashes
node checks/audit/refactor-drift-audit.mjs --hashes runtime/tmp/c12-pre/after.json > runtime/tmp/c12-pre/after.hashes
node checks/audit/refactor-drift-audit.mjs --compare runtime/tmp/c12-pre/before.hashes runtime/tmp/c12-pre/after.hashes
```

实测 `exit=0`、输出 `ALL PASS 规范化后逐行一致：…零测试体改动`；两份指纹行逐字节相同。

重复行掩盖删除：

```sh
printf 'tests/x.spec.ts :: a > b\tdeadbeef\ntests/x.spec.ts :: a > b\tdeadbeef\n' > runtime/tmp/c12-pre/dup-before.hashes
printf 'tests/x.spec.ts :: a > b\tdeadbeef\n' > runtime/tmp/c12-pre/dup-after.hashes
node checks/audit/refactor-drift-audit.mjs --compare runtime/tmp/c12-pre/dup-before.hashes runtime/tmp/c12-pre/dup-after.hashes
```

实测 `拆前 2 条 / 拆后 1 条` 后仍 `exit=0`、`零删除`。

## 根因与证据

- 根因 1：[refactor-drift-audit.mjs](../../../checks/audit/refactor-drift-audit.mjs) 的 `bodyHash(entry)`
  只做 `sha256(entry.body)`，而 `namesFrom()` 把 `body` 设为 `titlePath.join('\0')`；文件名与
  `titlePath` 之外没有任何测试体信息。头注「测试体指纹」与实现不符。
- 根因 2：`--compare` 的 `onlyA`/`onlyB` 用 `Array.includes` 做成员判断；重复行不会被计数消耗。
- 确认：上两条复现命令均在 2026-11-17 实跑，输出与退出码如上。
- 影响：C11 的「搬移等价」和后续任何纯搬移的零漂移裁决都可能把「删了一个重复测试」或
  「只改断言」判成 PASS；`--names` 档只比名字，更弱。

## 失败类与同类排查

**失败类 = 验证面 / oracle 名 > 面**（与 BUG-192、BUG-199 的「判据名大于判据面」同族）。

同类排查：

- `--names` 档：只比归一全名，明确不证测试体；不受本卡影响。
- `coverage-ratchet` 的改名/地板问题 = [BUG-203](BUG-203-coverage-ratchet-rename-resets-floor.md)。
- 真实搬移历史：三批 C11 搬移未实跑 `--hashes`；本卡修复前不能把「零漂移」写成已证。

## 已修判定

修成什么算修好：

1. `--hashes` 输出 `<归一全名>\t<sha256(测试体 AST 归一化)>`；标题是字面量时用**测试体**，参数化/非字面量标题退回标题指纹并在 stderr 点名条数，`--compare` 的判别档如实写「含测试体指纹（N 条退回标题）」。
2. `--compare` 用**多重集**差：重复行拆前 2 条、拆后 1 条必须 `exit=1`；同标题 `toBe→toContain` 必须 `exit=1`；真搬移（仅文件/describe 搬家）`exit=0`。
3. 最小负例（同一条命令）：`pnpm test tests/tools/refactor-drift.spec.ts`——旧实现红（标题指纹相等 / 集合差吞重复）；修复后绿。

## 修复方向（不授权，仅记录）

- 若保留标题档：把输出改为「标题指纹」，并在 [deep-surface 方法] 与 C12 卡里撤回「测试体」措辞。
- 若要真测试体：在 `namesFrom` 里读源文件、按 AST 取 `it/test` 回调文本做归一化哈希；这会把
  「文件搬家」与「测试体改动」分开，但实现成本更高。

## 修复证据

- 改动面：`checks/lib/refactor-drift.mjs`、`checks/audit/refactor-drift-audit.mjs`、`tests/tools/refactor-drift.spec.ts`
- 红：`pnpm test tests/tools/refactor-drift.spec.ts`（同一条命令；红证注入配方见下一行）
- 红证（注入配方，非证据命令）：隐藏 checks/lib/refactor-drift.mjs（旧 CLI 无纯逻辑可 import）→ 同一条 spec 红；旧实现的假绿复现 = `node checks/audit/refactor-drift-audit.mjs --compare runtime/tmp/c12-pre/dup-before.hashes runtime/tmp/c12-pre/dup-after.hashes` → exit 0「ALL PASS」
- 红输出：`AssertionError / Cannot find module ...refactor-drift.mjs（修复前）；修复后同一注入下的 202-red.log 为判据级红`
- 绿：`pnpm test tests/tools/refactor-drift.spec.ts`（修复后绿；日志 = `runtime/tmp/c12-fix/evidence/202-green.log`）
- 提交：commit eccd5f16
