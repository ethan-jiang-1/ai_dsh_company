# 2026-11-11 · 声明↔载体门禁：pack 路径 / tier / 政策数字 / 委派真值

状态：implemented（2026-11-11 落地；验证见下）

上游 = [BUG-067](../../_backlog/_archive/fixed_bugs/BUG-067-process-docs-dead-pointers.md) ·
[BUG-068](../../_backlog/_archive/fixed_bugs/BUG-068-base-clean-deployment-case-language.md) ·
[BUG-069](../../_backlog/_archive/fixed_bugs/BUG-069-tier-policy-gate-coverage.md) ·
[BUG-070](../../_backlog/_archive/fixed_bugs/BUG-070-delegation-maxdepth-example-wrong.md)；
证据 = [两产品结构审计](../../_backlog/_archive/research/two-product-structure-audit/README.md) E8–E11。

## 问题

四张卡同型：一句声明（路径 / tier 标签 / 政策数字 / `maxDepth` 例子）与它真正的载体没有对账，
而门禁只覆盖了部分语法形状：

- **067**：编号合同从 `content/state/process-docs.md` 搬到类型包后，4 处反引号路径仍指旧家；
  `bare-path` 把路径当仓库根，看不见 pack-relative 的 `content/...`。
- **068**：章程写着“出厂版本不含任何部署历史”，正文却留着“公司财务 agent 案 / 日期待核 /
  公司内部动议”；`base-clean` 只查日期前缀与归档引用。
- **069**：overview 头写“加载：T1 摘要”，manifest 登记 t2；10% 服务信用写在 charter 里，
  `content-single-home` 只查四条硬编码政策线。
- **070**：delegation.md 说 `maxDepth` 是绝对上限，例子却把 depth 1 + maxDepth 1 说成“子代落 2 可行”；
  没有真值表测试。

## 决定

1. **pack 内路径必须有守卫**：新增 `pack-content-paths` 门禁——`packages/company-pack/**/*.md` 里
   反引号 `content/...` 路径必须解析到 pack 根下真实文件/目录（跳过 `<...>`/`{...}`/`*`/`...`）。
   4 处 process-docs 指针改成 `content/product-types/<id>/requirements-model.md`（`<id>` = `productType`）；
   workspace 的 `kb/process-docs.md` 明确为播种副本，pack 权威 = 类型包。
2. **tier 声明与 manifest 对账**：`content-manifest` 解析文件头 `加载：`（T0/T1/T2/legacy，读到 `；`/`。`
   为止），与 `manifest.json` 的 tier 比对；两份 overview 头改成 `按需（T2）`（T1 总预算 4096B
   装不下两份 overview，T2 才是真实加载档）。
3. **政策数字从唯一家派生**：`content-single-home` 不再硬编码四条正则，而是从
   `policy-lines.md` 的 `- **Key**：...` 行派生数字 token（%、$、个、折、区间），扫描
   content + presets + src；新增政策数字不用再改门禁。
   “服务类附赠 / 服务信用”整块从 CFO 章程搬进 `policy-lines.md`（10% 有了唯一家）；
   `vp-eng.md` 的 `$200`、`org.md` 的 `$2,000`、CFO 章程的 `10%` 指针、`src/lib/text.ts` 的
   `30%` 注释改为指针 / 中性措辞。
4. **章程个案语言进 denylist**：`base-clean` 在 charter 的 `## 历史纪要` 之前扫描
   `公司/客户…agent…案`、`内部…动议`、`日期待核`；页脚“本部署的动议纪要…”与 CMO 章程的
   “本部署以 KB 事实为准”是合法通用语，不列入（避免假阳性）。
5. **委派深度用真值表钉**：`docs/contracts/delegation.md` 改成绝对语义 + 5 行真值
   （`0/1→1 ALLOW`、`1/1→2 THROW`、`1/2→2 ALLOW`、`2/3→3 ALLOW`、`2/2→3 THROW`），
   并新增 `tests/harness/contract/delegation-depth-truth-table.spec.ts` 直引 vendor
   `resolveChildDepth`，钉住 `1/1` 必须抛 `SubagentDepthError`。

## 输掉的方案

- **在旧的四条硬编码里加一条 10%**：下一个阈值还会漏；这正是 069 的失败类。
- **把 10% 放进新的 policy 文件**：政策数字唯一家已经是 `policy-lines.md`，再开一家是第二本账。
- **只 grep 旧 `content/state/process-docs.md`**：窄规则只能防这一条；下次搬别的文件还会漏。
- **把两份 overview 移进 t1**：t1 总预算 4096B 装不下；它们的真实加载档是 T2，头部写错了，不是
  manifest 写错了。
- **禁止 charter 出现任何数字**：会误伤编制人数、客户数、3-4-3 等非政策数字；只禁政策词表里的
  数字 token。
- **把 `maxDepth` 改成相对层级语义**：会与 vendor `resolveChildDepth` 相反；错的是文档例子，
  不是引擎合同。
- **给 `pack-content-paths` 开 4 条旧路径白名单**：等于把死指针合法化。

## 后果

- 新门禁 `checks/gates/pack-content-paths.mjs`；`content-manifest` / `content-single-home` /
  `base-clean` 扩判据；`pnpm verify` 多一道。
- `docs/contracts/delegation.md` 补绝对语义真值（行数压到 114/120，保住 5% headroom）。
- `content/charters/cfo.md` 的服务类附赠块、10%、个案语言移出；`vp-eng.md` / `org.md` 的政策数字
  改成指针；`policy-lines.md` 增加服务类附赠 / 服务信用节。
- 新增 keyless 合同钉子 `delegation-depth-truth-table.spec.ts`（tests/harness/contract 属
  typecheck 已知未覆盖面，运行面走 vitest vendor paths）。
- 旧部署 only-fill 不受影响：这些是 pack 内容 / 文档 / 门禁，不改 workspace 状态。

## 归位

- **政策数字**住 `policy-lines.md`；**加载档**由 manifest 拥有、文件头只是声明（必须与 manifest 同）；
  **pack 路径**以 pack 根解析；**委派语义**以 vendor 合同 + 本仓合同文档为准。
- 门禁只做机械可判的对账；判断（哪条是政策、哪个数字是政策数字）由 `policy-lines.md` 的
  `- **Key**：` 结构承载。

## 验证

实测 2026-11-11；全部在本轮工作树跑过。

- `pnpm verify`：`PASS pack-content-paths ×9`、`PASS content-manifest（30 份；T0 1 / T1 2 / T2 23）`、
  `PASS content-single-home（policy-lines 9 个政策数字；49 份 Markdown + 代码面零复述）`、
  `PASS base-clean 只读内容零部署历史（CHARTER ×6 + 手册/模板/状态）`、`verify: ALL PASS`。
- 门禁反证（改真文件 → 跑 → 还原）：
  - 067：把 `meta.md` 的合同指针改回 `content/state/process-docs.md` → 红
    （`死指针 ...（.../content/state/process-docs.md 不存在）`）；还原 → 绿。
  - 069a：把 business overview 头写回 `加载：T1 摘要`（manifest 仍 t2）→ 红
    （`tier 声明不一致`）；还原 → 绿。
  - 069b：把 `毛利底线 30%` 写回 vp-eng 章程 → 红（`复述政策数字「30%」`）；从 policy-lines 删
    `并行交付上限` → 红（`缺政策线`）；还原 → 绿。
  - 068：往 CFO 章程正文加“客户 X 的财务 agent 案：日期待核；内部动议” → 红（三条个案语言）；
    还原 → 绿。
  - 070：把真值表的 `1/1` 期望改成 allow → spec 红（`1 failed`）；还原 → 5 passed。
- `pnpm test`：**175 files / 1463 tests passed**（含新 `delegation-depth-truth-table.spec.ts` 5 项）。
- `pnpm typecheck`：绿；`pnpm lint`：0 warnings / 0 errors。
- `source run/env.sh && node checks/smoke/preset-smoke.mjs`：`preset-smoke: ALL PASS`（本组未改
  preset；沿用经营组收口时的真挂载结果）。
- 未执行 / 未验：真模型是否按新合同文档配行（需 key）；`pack-content-paths` 只覆盖
  `packages/company-pack/**/*.md`，不覆盖 `docs/` 的 pack-relative 路径；policy 词表只抓数字型
  政策，非数字政策（如“出纳不做账”）仍靠内容审查。
