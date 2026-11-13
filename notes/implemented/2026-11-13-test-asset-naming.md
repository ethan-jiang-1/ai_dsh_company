# 2026-11-13 · 测试资产命名清扫：Phase 1 目标树（tests/harness 拆分）

状态：implemented（Phase 1 2026-11-13 落地；Phase 2 见同卡）

上游 = 用户 2026-11-13「命名是长期受益的事：人和 agent 只看文件名就知道是什么资产」+「策略调整期，做对最重要、别短视」；
问题卡 = [test-asset-naming-contract](../../_backlog/issues/2026-11-13-test-asset-naming-contract.md)。

## 决定

1. **`tests/harness/` 拆成它实际在测的六个面**：`repo/`（仓库合同：结构/导航/发布/包形状）、`contract/`（引擎合同与真值表）、
   `tools/`（tools/lib 纯逻辑）、`session/`（会话日志/诊断/探针驱动）、`evidence/`（协作与证据判据）、`ui/`（页签目录/金样）。
   原来六种主题挤在一个 meta 桶里，目录名不说明测什么；且 `harness` 与 DSH 的共享夹具文件 tests/harness.ts **同名不同义**。
2. **先树后名**：同一文件只搬一次（`ui-golden.spec.ts` 先到 `tests/ui/`，Phase 2 再改名）；门禁在**最终树**上落地，
   不为过渡态写例外。两阶段各自可停。
3. **导航节 `## 四区` → `## 分区`**，`nav-enumeration` 的整行锚同步（`^## 分区$`）。理由：十来个面叫「四区」是名字撒谎，
   而「名字不撒谎」正是本卡的前提。
4. **相对导入规则**：目录少一层，所有相对 specifier 去掉一个前导 `../`；只按导入语法改，不做全局字符串替换。
   唯一例外是 `tests/session/entry-probe.spec.ts` 用 `import.meta.url` 算根（`../../..` → `../..`），由 test 红抓出来。

## 输掉的方案

- **保留 `tests/harness/` 只写 README 解释**：零成本，但名字继续撒谎；策略期"长期正确"否掉了它。
- **只改名成 `tests/repo/`**：桶里还有 contract/tools/session/evidence/ui，改名后仍然名不副实。
- **按「产品面 vs meta 面」二分**（tests/product/ + tests/meta/）：多一层无信息量的分类，且 meta 仍是桶。
- **一次性连 Phase 2 的资产改名一起做**：同一文件会搬两次（`ui-golden.spec.ts`），diff 不可审；拆两阶段。
- **为旧路径留兼容桩/门禁例外**：会造出第二套路径事实；改为修活引用 + 归档链接一并修（见未覆盖轴）。

## 验证（实跑原话，2026-11-13）

| 判据 | 命令 | 原话 |
|---|---|---|
| 搬迁完整 | `git mv tests/harness/{repo,contract,tools,session,evidence,ui} tests/` | 77 个文件迁移；`tests/harness/` 不再存在 |
| 导入面 | 脚本：所有相对 specifier 去一层 `../` | `moved files 77 rewritten 77` |
| 类型面 | `pnpm -s typecheck` | exit 0（tsconfig.test-harness 改成六个 glob + contract 排除） |
| 回归 | `pnpm -s test` | `Tests 2017 passed (2017)`（首跑抓出 `entry-probe` 的深度根错误，修后全绿） |
| 结构门 | `pnpm verify` | 首跑红在归档链接；批量修 91 个归档文件的旧路径后 `ALL PASS` |
| 导航改名（红） | `tests/README.md` 的 `## 分区` 临时改回 `## 四区` | `FAIL nav-enumeration: tests/README.md 缺「## 分区」节——导航骨架被破坏` |
| 还原（绿） | 还原后重跑 | `verify: ALL PASS` |
| 静态质量 | lint / dup / coverage-ratchet | 0 / 0 clones / `PASS（191 文件；5 豁免）` |

## 状态事实与载体

- 事实：测试树按**被测面**分区（product 五面 + 仓库六面 + support/fixtures）；不再有 meta 桶 `tests/harness`。
- 唯一入口：`tests/README.md` 的「分区」表（导航）+ 各目录本身（无集中清单）。
- 类型面：`tsconfig.test-harness.json` 的 include = 六个面 + `tests/support/temp-env.ts`；exclude = `tests/repo/pack-exports.spec.ts`、`tests/contract/**`。
- 门禁：`nav-enumeration` 的锚改为 `## 分区`；`navigation-assets.spec` 点名的领域列表同步为新六面。
- 环境坏法：相对导入按"少一层"机械改，嵌套目录同样成立；`import.meta.url` 深度根不在导入语法内，靠 test 红抓。

## 未覆盖轴

- **Phase 2 未开工**：`golden → expected`、runner `*-lane`、工具出 smoke、审计归位、探针正名、fixture 摘出 census、`naming-contract` 门禁。
- **归档链接**：91 个归档文件里的旧路径已批量修为现行家（tests/harness/x → tests/x），这是**链接修复**不是内容改写；
  archived Note 正文未动。
- **`_backlog/issues/2026-11-13-test-asset-naming-contract.md`** 仍保留旧树映射（它是本次搬迁的计划文本，归档时再统一）。
- **docs/ 里对外部研究树 `_digested` 的引用**不在本仓指针面，未动。
