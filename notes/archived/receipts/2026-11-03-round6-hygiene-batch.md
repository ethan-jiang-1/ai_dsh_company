# 第六轮卫生批：腐化通道止血、首屏反馈、一次性资产清理

状态：implemented（2026-11-03，随第六轮七维打扫落地）
上游 = [第六轮七维打扫卡](../../../_backlog/_archive/settled_issues/2026-11-03-repo-hygiene-round6.md) ·
材料 = [第七维审计](../../../_backlog/_archive/research/repo-hygiene-round6/2026-11-03-seven-dimension-audit-round6.md)

## 决定

1. **`tests/lib/dag.spec.ts` 恢复原 DAG 判据，并给「重复 spec」立门。** `d6d1f92` 把该文件整体覆盖成
   `tests/lib/cultivation.spec.ts` 的字节副本——`lib/dag.ts`（261 行布局算法）失去唯一单测、
   套件多 21 条重复用例，而 `verify`/`test`/`typecheck` 全绿。恢复原 spec 时只差 `TaskRow.description`
   一个新必填字段（补 `description: ''`）。新增 `checks/gates/spec-duplicates.mjs`：`tests/**/*.spec.ts`
   归一化正文的 sha256 重复即红——只判「整文件同一」，不判语义相似（平行的跨面双守卫不误伤）。
2. **`tsconfig.test-harness.json` 从 51 行 include 清单改成 glob + 单条 exclude。** 同目录的
   `tests/client` / `tests/host` 早已是 glob+exclude；手工清单会静默漏新 spec，且它藏着一个真
   type error（`company-tab-catalog.spec.ts` 少传第二个参数——被排除所以从没进 tsc）。
   唯一排除项 `tests/repo/pack-exports.spec.ts` 是**混合面**：host 与 client 两半同文件，host 项目
   缺 jsx、client 项目缺 node `process` 全局，实测两向皆红，只能留在 tsc 外并在测试宪法里写清。
3. **首屏必须自己指到「真页面 / 失败现场」**，不靠三份文档接力。`pnpm orient` 新增
   「看到真页面 / 查失败现场」节（`ui-scene-smoke` 三种跑法、`diagnosis/` 证据目录、
   `company-client-errors.log`），并把 `pnpm diagnose` 提进便宜检查。
   `--scenario` 的「验证命令」按场景类型分派：replay → `replay-smoke`；visual → `ui-scene-smoke --isolated --golden`；
   归档证据 → 明确说「无通用复跑入口」。此前对所有场景都给 replay 命令，visual 场景照抄即 ENOENT。
4. **`orient` / `diagnose` 的未知参数 fail-loud，`--help` 真的打用法。** 旧行为是静默忽略——问用法的人
   会拿到一份真实摘要 + exit 0，这是最坏的假答案。
5. **文档按现役改口**：`ui-demo` 不再声称已删的 `CompanyView.tsx` 存在；`index`/`terminology` 的
   「四条协作通道」改口为「现役三条 + 通道 D 已退役」；「51 个不变量 spec（六个名字）」这类
   数字对、名单过期的枚举整段删掉（D28：枚举的家 = 实现自己）。
6. **安装 profile ≠ 启动 profile**（DSH 侧核对）：Plugins 页装的是**当前** profile，`company` 不是出厂
   profile（缺失时 DSH 报错，`dsh plugin --profile company` 会建出 base-only）。README / `profile.md` /
   安装手册模板统一成「装进哪个就启动哪个；固定 company profile 才走 CLI 三步」。
7. **卸载残留按 DSH 无清理钩子的事实精确披露**：lease 在 `<DSH_HOME>/company-pack.lock`（不在
   `company/` 下），补 workspace 登记行、客户端错误日志、浏览器 localStorage 键。
8. **删除 `runtime/` 里三个一次性探针**（`probe-drill` / `probe-schedule` / `probe-two-instances`）：
   头注自认「用完可删」、对应卡早已归档、无活引用；源码住「运行残留家」是分类错误。`.gitignore` 白名单
   5→2 件，`gitignore-shape` 门禁与 `gitignore-guards` spec 同步。

## 输掉的方案

- **只修 `dag.spec` 的 type error、保留重复副本**：`lib/dag.ts` 仍然没有单测，21 条重复用例继续稀释套件——
  等于用「绿」掩盖「丢了一半证据」。
- **`pack-exports` 挪进 client 项目做类型检查**：实测把 client entry 拉进 client 项目时，vendor loader 的
  严格检查报 TS7053（vendor 源码面），host 半则因 `client-build-environment` 的 `process` shim 报错。
  两个面的全局环境互斥，拆文件也绕不过——排除 + 写清原因是唯一诚实的解。
- **只在 docs 里补「真页面怎么跑」**：上一轮已经有三处文档写了，症状是 `orient` 首屏不提；文档不是
  首屏。修在首屏才有用。
- **三个一次性探针 `git mv` 到 `tools/archive/`**：archive 是「可复用的已耗仪器」，这些是一次性演练，
  证据在归档卡里，留代码只增加扫描面；git 历史足够。
- **把手册（`_dist/安装手册.md`）直接改掉**：手册是生成物，改模板 + 下次 `release --prepare` 再生；
  本轮只改模板，`_dist` 的 0.8.7 手册保持与 manifest 一致（`dist-freshness` 不看模板，故不红）。

## 后果

- `pnpm test`：139 文件 / **1109 例**（+2 条 orient 行为断言；dag 恢复 +20、去重 −21，净值 −1 后再 +2）。
- `tsconfig.test-harness.json` 51 行清单 → glob；harness 进 tsc 的 spec 从 51 → 52（除混合面）。
- `pnpm orient` 多两节输出；`--scenario` 的「验证命令」不再误导；`--help` 可用。
- `.gitignore` 的 runtime 白名单缩到 2 件；`runtime/` 不再承载源码。
- 未动：`docs/testing.md` 的「已知未覆盖面」条目已按新形状改写；`_dist` 手册与 market index 待发布轮再生。

## 验证

```text
# 1) dag 恢复：原 spec 20 例过 + 类型过（修复前 tsconfig.test-company 报 TaskRow.description 缺失）
node ./node_modules/typescript/bin/tsc -p tsconfig.test-company.json        # exit 0
npx vitest run tests/lib/dag.spec.ts                                    # 20 passed

# 2) 重复 spec 门禁：造红 → 还原 → 绿（原话）
cp tests/lib/dag.spec.ts tests/host/zz-copy.spec.ts
node checks/run-gates.mjs
# FAIL spec-duplicates: 2 份 spec 内容完全相同（sha256:fdbe9b51…）：tests/lib/dag.spec.ts；tests/host/zz-copy.spec.ts
rm tests/host/zz-copy.spec.ts
node checks/run-gates.mjs
# PASS spec-duplicates ×139（测试文件正文唯一；复制即红）

# 3) harness glob：company-tab-catalog 的隐藏 type error 现形并修好
node ./node_modules/typescript/bin/tsc -p tsconfig.test-harness.json        # 修复前 TS2554（Expected 2 arguments），修复后 exit 0

# 4) orient 首屏/分派：造红 → 还原 → 绿
#   删掉 LIVE_SURFACES 渲染节 → tests/session/orient.spec.ts 的「首屏带真页面与失败现场入口」红：
#   × 首屏带真页面与失败现场入口（页面 / 诊断 / 证据目录 / 客户端错误日志）
#   还原 → 21 passed
node tools/orient.mjs --scenario visual/company-shell
#   验证命令 = node checks/smoke/ui-scene-smoke.mjs --isolated --golden（刷新金样 = 加 --refresh-golden）
node tools/orient.mjs --help      # exit 0，打用法（旧行为：打一份真实摘要并 exit 0）
node tools/orient.mjs --bogus     # exit 2，orient: 未知参数 --bogus（--help 看用法）
node tools/diagnose.mjs --help    # exit 0，打用法
node tools/diagnose.mjs --bogus   # exit 2

# 5) 全套（本批最终读数）
pnpm verify       # ALL PASS（54 门 + 2 无对象；新门 spec-duplicates）
pnpm typecheck    # exit 0
pnpm test         # 139 files / 1109 tests
```

未验：`_dist` 手册的再生（需 `release --prepare`，属发布轮）；真页面三条跑法本轮只实跑
`ui-scene-smoke --isolated --golden`（PASS，9/9 页签金样一致）与 `--steps`（上一轮已有证据）。
