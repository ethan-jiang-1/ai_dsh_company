---
topic: DSH 测试策略的一手源码核对
intent: 用 vendor/dsh 钉住版核对 `_digested/test-strategy` 承载性主张，区分「成立」「口径偏差」「源码里没有」三类，供研究题的材料引用。
---

# vendor 源码核对（tag `dsh-v0.2.1-rc.5` = `b830ec950faba0a46dda564be3e2d854afed94f1`）

核对基线：`vendor/dsh` HEAD 实测 `b830ec950faba0a46dda564be3e2d854afed94f1`，`git describe --tags` = `dsh-v0.2.1-rc.5`，与簿记一致。下表「结果」列：**成立** = 数字/原文可复现；**偏差** = 内容成立但口径或归属不对；**未找到** = 源码无对应物。

| 主张（digest 出处） | 核对命令/文件 | 结果 | 原文或数字 |
|---|---|---|---|
| `docs/testing.md` 55 行（01） | `wc -l docs/testing.md` | 成立 | `55` |
| 9 节、中英双语（01） | `grep -c '^## ' docs/testing.md` | 成立 | 9 个 H2 + 标题；`testing.zh.md` 存在 |
| 七层 tier 名称（01/02） | `docs/testing.md:9-15` | 成立 | Unit / Coverage gate / Real-API e2e / Owner-local expected output / Performance benchmarks / Snapshot / Web browser snapshot |
| 词预算 1,350（01） | `scripts/doc-budgets.manifest.json:6` | 成立 | `"docs/testing.md": 1350`（但 `docs/AGENTS.md:59` 同一预算写 1,300，vendor 自相矛盾） |
| 根 vitest 配置 8 份 + shared（02/04） | `ls vitest*.config.*` | 成立 | `vitest.config.ts` + 7 份 `vitest.*.config.ts`；另 `vitest.shared.ts`（非运行配置） |
| 8 份配置统一解析到 `tsconfig.base.json`（02 教义7） | `grep -l tsconfig.base.json vitest*` | 成立 | 7 份显式；`vitest.web.perf.config.ts` 复用 `webConfig` 间接继承 |
| e2e 配置排除 `*.expected.e2e.ts`（02） | `vitest.e2e.config.ts:46-49` | 成立 | `'**/*.expected.e2e.ts'` + `packages/experimental/inspector/tests/client-browser.e2e.ts` |
| e2e `retry 2`、120s、workers 4、无 coverage（02） | `vitest.e2e.config.ts:45-60` | 成立 | `retry: 2`、`testTimeout: 120_000`、`hookTimeout: 30_000`、`DEFAULT_E2E_MAX_WORKERS = 4`、无 coverage 块 |
| unit include 四条（02 表） | `vitest.config.ts:128-133` | 成立 | `packages/*/*/tests/**/*.spec.{ts,tsx}`、`apps/*/tests/**/*.spec.{ts,tsx}`、`scripts/**/*.spec.ts`、`website/tests/**/*.spec.ts` |
| 8 个 process-bound 套件（02） | `vitest.config.ts:163-172` | 成立 | 8 条，名称与 digest 列举一致 |
| per-file 100% 四项阈值（02/03） | `vitest.config.ts:396-404` | 成立 | `perFile: true`、statements/branches/functions/lines 均 `100` |
| pwsh 探测与套件自跳过同源（02） | `vitest.config.ts:114-126` | 成立 | `spawnSync(resolvePwshPath(), ...)`，失败才排除两文件 |
| coverage exclude「每条带理由」（02「每条」/04「绝大多数」） | `vitest.config.ts:243-391` | 偏差 | 91 条 exclude 仅 23 个注释块；最长 27 条（`:348` 起 TODO(gui)）共用一条理由 |
| root `package.json` 39 个 test*/check* 脚本（02） | `node -e` 过滤 scripts | 成立 | test* 23 + check* 16 = **39**（总 scripts 200） |
| `all-checks-passed` 存在并收敛 9 个必需 job（04） | `.github/workflows/ci.yml:737-754` | 成立 | `needs: [node-24, node-24-coverage, node-24-bench, node-24-consumers, node-compat, python-sdk, python-runtime, windows-build, windows-native-tests]` = 9（ci.yml 共 14 个 job） |
| `skipped` 与 failure/cancelled 一起判失败（04 M6） | `ci.yml:757-758` | 成立 | `if: contains(needs.*.result, 'failure') \|\| contains(needs.*.result, 'cancelled') \|\| contains(needs.*.result, 'skipped')` → `exit 1` |
| `e2e.yml` 缺 key preflight 硬失败（04 M6） | `.github/workflows/e2e.yml:96-110` | 成立 | `if [ -z "${DEEPSEEK_API_KEY:-}" ]; then ... exit 1`；注释原话「a missing secret would otherwise make the self-skipping suite report a false green」 |
| `snapshots/AGENTS.md` 七条编号规则（06） | `wc -l` + `cat -n` | 偏差 | 17 行、**0 条编号**、8 个自然段；digest 的 1–7 是它的切分，且「input.json 禁令」与「角色/代际」同段 |
| 只有 owner 能 record/refresh（06 规则2） | `snapshots/AGENTS.md:7` | 成立 | "The owner alone records or refreshes the selected role." |
| `workspace.expected/` 永不被 refresh 改写（06 规则7） | `snapshots/AGENTS.md:15` | 成立 | "Record and refresh do not rewrite this independent oracle."（另 `:9` 对 Session fixture 同规定） |
| 「fix fixtures, not normalizers」（01/06） | `grep -rn` 全树 | 成立但不在 `snapshots/AGENTS.md` | 仅 `AGENTS.md:158`：「Fixtures replay on macOS/Linux; fix fixtures, not normalizers.」 |
| pre-push「no universal local baseline」（06） | `.agents/skills/dsh-pre-push-checks/SKILL.md:29` | 成立 | "There is no universal local baseline beyond the hooks. Every behavior change needs the narrowest available test or purpose-built check that would fail for its regression" |
| hooks 不跑测试/snapshot/文档/构建（06） | `grep -rn "intentionally do not run"` | 偏差（归属） | 原文在 `docs/development.md:147`，不在该 SKILL；SKILL 自己的说法是 "Git hooks are intentionally narrow: ... pre-push runs only the incremental repository typecheck." |
| `docs/postmortem/` 4 篇（01） | `ls docs/postmortem/` | 成立 | `0001`–`0004` + README（每篇另有 `.zh.md` + `.i18n.yaml`） |
| 0001 的 178 句（01/04） | `grep -n 178 docs/postmortem/0001-*.md` | 成立 | "The bridge was completely non-functional in production despite 178 green unit tests and 100% line coverage." |
| `.agents/notes/implemented/testing/` 18 篇（01） | `ls *.md` 去 `.zh.md` | 成立 | 18 篇英文 Note；目录 54 文件 = 18×3（en/zh/i18n） |
| `scripts/verify-*.ts` 46 个（问题单） | `find scripts -maxdepth 1 -name 'verify-*.ts' ! -name '*.spec.ts'` | 成立 | 46；含 spec 共 76（其中 30 个 `.spec.ts`） |
| `scripts/run-gates.ts` 行数（问题单） | `wc -l` | 成立 | `1697` |
| run-gates 聚合 mode 数（问题单） | `gatesForMode` switch + 报错串 | 18 个（digest 未给数） | ci-primary … node-compat、check-all、hygiene、doc-sync、doc-quick |
| `packages/test-support/` 包数（问题单） | `ls -d packages/test-support/*/` | 7 个（digest 未给数） | agent-loop-testkit、client-runtime、llm-mock-server、llm-replay、loader-smoke、remote-mock、session-snapshot |
| `(HMR safety)` 67 处（02） | `grep -rn "(HMR safety)" --include='*.spec.ts*'` | 成立 | 67（不限 spec 则 70） |
| `contract-regressions.spec.ts` 1522 行/14 describe（02） | `wc -l` + `grep -c` | 成立 | 1522 / 14 |
| 45 个 spec 含 `expect('default' in …)` 守卫（01） | `grep -rl` | 成立 | 45；`packages/lsp/tool-lsp/tests/load-path.spec.ts:14` 逐字命中 |
| e2e 车道 25 处 `skipIf`（packages 13 + apps 12）（02） | `grep -rn "describe.skipIf(!process.env.DEEPSEEK_API_KEY)"` | 偏差 | **22** 处（packages 12 + apps 10） |
| `built-bin.e2e.ts` 1330 行/30 用例（02） | `wc -l` + 声明行计数 | 部分偏差 | 1330 行成立；`it(`/`test(` 声明 **31** 行 |
| built-bin-smoke 聚合 16 个 built 消费者（02） | `scripts/run-gates.ts:884-909` | 成立 | 16 条固定清单（13 built 命名 + keyless-smoke + subagent-codex/claude-code） |
| `packages/examples/*` 已不存在、testing.md 过期（02） | `ls packages/examples` | 成立 | `No such file or directory`（`docs/testing.md:41` 仍引用它） |
| GUI PR 必须录 GIF，属 root AGENTS.md 常备条令（06） | `AGENTS.md:121` vs `.agents/skills/record-browser-gif/SKILL.md:14` | 偏差（归属） | MUST 原句在 SKILL："for every pull request that changes product-user-visible GUI behavior, which MUST include a GIF"；root AGENTS.md 只有 overlay 那行 |
| spec 文件两千多个（01） | `find … -name '*.spec.ts{,x}'` | 成立 | **2,150** |
| `it(`/`test(` 声明数（问题单） | `xargs grep -hE` 声明行 | 27,781 | 2,150 个 spec 文件合计 |
| `*.e2e.ts` 不含 expected（问题单） | `find … -name '*.e2e.ts' ! -name '*.expected.e2e.ts'` | 293 | 另 `*.expected.e2e.ts` = 29 |
| `snapshots/**/snapshot.yml`（问题单） | `find snapshots -name snapshot.yml` | 250 | session 150 / sdk 27 / acp 9 / web 64 |

## 偏差与风险

0. **两处"数字对不上"其实是范围不同，不是错。** ① `it`/`test` 声明：本文 27,781（正则含 `for`/反引号变体），[摘要](2026-11-13-dsh-strategy-digest.md) 的 27,757 来自更窄的 `^[[:space:]]*(it|test)(\.(skip|only|each|skipIf|runIf|concurrent|fails))?[({]`；我另跑同一窄判据得 **27,756**。三个数差在判据，不在仓库，引用时写"约 2.78 万"最稳。② `*.e2e.ts`：本文 293 = packages/apps/scripts/website **全树**；摘要的 110 = `packages/*/*/tests` + `apps/cli/tests` + `apps/desktop/tests` 且排除 expected/client-browser 的**车道口径**。两者都对，**不可相加或互换**。
1. **coverage 豁免不是「每条带理由」，而是「每组一条理由」。** 91 条 exclude 只有 23 个注释块；`:348` 起连续 27 条共用一条 "Slash/command/input round… TODO(gui)" 注释，`:352-372` 那 21 条逐文件条目本身无独立理由。02 篇「每条带平台条件或 `TODO(gui)` 注释」过强；04 篇「绝大多数条目都能读到理由」是有保留的正确说法。引用时按后者的口径。
2. **`snapshots/AGENTS.md` 没有编号规则。** 文件 17 行、8 个自然段，无 1./2./3. 列表；06 篇的「七条核心规则」是消化者的切分（且把同段的 `input.json` 禁令拆成独立一条）。内容可以逐句对上，但「七条」不可作为源码事实引用。
3. **e2e `skipIf` 计数对不上。** 逐字匹配 `describe.skipIf(!process.env.DEEPSEEK_API_KEY)` = 22 处（12 packages + 10 apps），digest 写 25（13+12，主道 24）。另有 325 处 `skipIf` 与 53 个 e2e 文件提及该 key——若 digest 用的是更宽的判据（含 `?.trim()`、`hasKey` 变量形式），应改写判据而不是数字。
4. **`built-bin.e2e.ts` 用例数 31 而非 30。** 行数 1330 精确；声明行计数为 31，差 1（可能 digest 排除了某个 fixture/嵌套声明）。
5. **两处「常备条令」归属错位。** 「fix fixtures, not normalizers」「hooks intentionally do not run tests…」「GUI PR 必须 GIF」三条都不在 digest 指定的文件里：分别在 `AGENTS.md:158`、`docs/development.md:147`、`.agents/skills/record-browser-gif/SKILL.md:14`。结论成立，家不对。
6. **`testing.md` 词预算 vendor 自相矛盾：** manifest 1350（被 `verify-doc-budgets` 强制）vs `docs/AGENTS.md:59` 写 1,300。digest 采信 manifest 是对的，但引用时应注明两个数字并存。
7. **e2e.yml 的「硬失败」有适用边界（digest 未提）。** 缺 key 的 preflight 只在该 job 真跑时生效；fork/Dependabot PR 由 job 级 `if:` 整 job 跳过，而 e2e.yml 自己的注释写明「A job skipped by a job-level `if:` reports as a SUCCESSFUL check」。因此 `ci.yml` 的 skipped=failure 语义并不覆盖 e2e.yml；04 篇把它当作 M6 的通用证据需要加限定。
8. **`(HMR safety)` 67 这个数只在 spec 过滤下成立**（全树含 support/helper 为 70）。数字可复现，但复现命令必须写明 `--include='*.spec.ts' --include='*.spec.tsx'`。
9. **`vitest.web.perf.config.ts` 不直接写 `tsconfig.base.json`**，靠 import `webConfig` 继承；「8 份配置全部指向 base」是传递成立，逐文件 grep 会得到 7。

## digest 没写、但读源码才知道的

- **真正把「改动 → 测试」接起来的是 `pnpm run change-scope`**（`package.json`: `tsx scripts/change-scope.ts`）。pre-push 技能第 2 步先跑它取 merge-base 范围再选命令；digest 06 只写了「选最小证据」的原则，没写这个选择器本身。
- **覆盖率门有两个环境变量，不是一个。** `DSH_COVERAGE_PARTITIONS`（分区数，`scripts/coverage-partitions.ts:15`）与 `DSH_COVERAGE_PARTITION_MODE`（`:18`）分工不同：分区模式下 `thresholds` 被设为 `undefined`（`vitest.config.ts:396`），本进程不判门，判定发生在合并报告那一步。
- **`ci.yml` 有 14 个 job，只有 9 个进 `needs`。** `windows-coverage` 不在必需列表里——「9 个必需 job」不等于「CI 全部 job」，Windows 覆盖面对 PR 结论没有否决权。
- **`built-bin-smoke` 是一张写在 `scripts/run-gates.ts` 里的 16 文件固定清单**，用 `pnpmExec` + `DSH_EXAMPLE_MODE=lib` 跑；它不靠后缀选中，改文件名不会自动进出该门。
- **重型套件的旁路是显式开关**：`COVERAGE_EXEMPT_ENV=1` 时 `coverageExemptHeavySuites` 的 exclude 才注入；该变量非 `'1'` 非空会直接 `throw`（`vitest.config.ts:138-144`），防止「设了但没生效」的静默降级。
- **豁免清单里混着四类机制，不是一类**：平台条件（`process.platform` 三分支）、pwsh 运行时探测、`TODO(gui)`/`TODO(webworker)`/`TODO(inspector)` 债务、以及「只在 lib 存在」的生成代码入口——最后一类的证据在 built-bin-smoke，不在单测。

## 复测命令

```sh
cd vendor/dsh   # 以下命令都在仓库根的 vendor/dsh 下执行
git describe --tags; git rev-parse HEAD
wc -l docs/testing.md; grep -c '^## ' docs/testing.md; sed -n '9,15p' docs/testing.md
ls -1 vitest*.config.*; wc -l vitest.config.ts
sed -n '128,133p;163,172p;243,391p;396,404p' vitest.config.ts
sed -n '45,60p' vitest.e2e.config.ts
node -e "const s=require('./package.json').scripts;const k=Object.keys(s);console.log(k.filter(x=>/^test/.test(x)).length,k.filter(x=>/^check/.test(x)).length)"
grep -n "all-checks-passed" -A 22 .github/workflows/ci.yml | sed -n '1,30p'
grep -n "Preflight" -A 12 .github/workflows/e2e.yml
cat -n snapshots/AGENTS.md
sed -n '27,31p' .agents/skills/dsh-pre-push-checks/SKILL.md
ls docs/postmortem/*.md | grep -v zh; grep -rn "178 green" docs/postmortem/
ls .agents/notes/implemented/testing/*.md | grep -v '\.zh\.md' | wc -l
find scripts -maxdepth 1 -name 'verify-*.ts' ! -name '*.spec.ts' | wc -l
wc -l scripts/run-gates.ts; sed -n '292,360p' scripts/run-gates.ts
ls -1d packages/test-support/*/
find packages apps scripts website -type d \( -name node_modules -o -name lib -o -name dist \) -prune -o -type f \( -name '*.spec.ts' -o -name '*.spec.tsx' \) -print | wc -l
find packages apps scripts website -type d \( -name node_modules -o -name lib -o -name dist \) -prune -o -type f \( -name '*.spec.ts' -o -name '*.spec.tsx' \) -print0 | xargs -0 grep -hE "^[[:space:]]*(it|test)(\.(each|skip|only|todo|concurrent|fails|skipIf|runIf|for))?[[:space:]]*[\(\`]" | wc -l
find packages apps scripts website -type d \( -name node_modules -o -name lib -o -name dist \) -prune -o -type f -name '*.e2e.ts' ! -name '*.expected.e2e.ts' -print | wc -l
find snapshots -name snapshot.yml | wc -l
grep -rl "expect('default' in" --include='*.ts' packages apps scripts | wc -l
grep -rn "(HMR safety)" --include='*.spec.ts' --include='*.spec.tsx' | wc -l
grep -rn "describe.skipIf(!process.env.DEEPSEEK_API_KEY)" --include='*.ts' packages apps | wc -l
sed -n '884,909p' scripts/run-gates.ts
```

计数说明：以上 `find`/`grep` 全量扫描实测各 <1s（spec 与 e2e 计数 0.8s，声明行计数 0.7s），可随时重跑；无估算值。唯一需要人工判读的是第 1 条偏差（注释块与豁免条目的分组），脚本用的是「连续无注释的条目串」判据，已给出最长串行号以便人工复核。
