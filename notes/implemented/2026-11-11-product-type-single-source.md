# 2026-11-11 · 产品类型轴单一来源：允许值 / 默认值 / 播种

状态：implemented（2026-11-11 落地；验证见下）

> **后续（2026-11-11）**：`project-services` 已从“未来产品类型”改为**交付模式**，
> `references/project-services.md` 已删除；见 [delivery-mode-axis Note](2026-11-11-delivery-mode-axis.md) 与
> [已结卡](../../_backlog/_archive/settled_issues/2026-11-11-delivery-mode-axis.md)。本 Note 第 2 条关于“保持未来类型”的决定已被取代。

上游 = [BUG-061](../../_backlog/_archive/fixed_bugs/BUG-061-product-type-allowed-values-drift.md) ·
[BUG-062](../../_backlog/_archive/fixed_bugs/BUG-062-default-product-type-contradicts-business.md) ·
[BUG-063](../../_backlog/_archive/fixed_bugs/BUG-063-bootstrap-process-docs-always-hardware.md)；
证据 = [两产品结构审计](../../_backlog/_archive/research/two-product-structure-audit/README.md) E1–E4。

## 问题

同一套六角色要在不同产品类型下跑，但“产品类型”这条轴有三份独立事实：允许值（skill / CMO 章程 /
模板 / docs 各自手写）、默认值（`company.md` 写死 `hardware-software`）、播种（`seed.json` 写死
`hardware-software` 的编号合同）。结果：agent 面承诺 `project-services` 而 checker 不认；默认类型与
公司主业相反；business-software 部署拿到五层硬软合同。三张卡同根因（2026-11-11 根因组 A），本 Note
记录一次收口。

## 决定

1. **允许值的唯一来源 = `content/product-types/<id>/` 目录**。`product-definition` 的品类表是唯一
   agent 可见枚举，与目录一一对应；CMO 章程 / meta+mrd 模板 / CEO skill / 产品定义指南改成指针，
   不再手写第二套。新增门禁 `product-type-sources`：品类表 ↔ 类型包双向对账；`company.md` 默认类型
   必须可解析；选值面出现的类型 id（`references/<id>.md`、`product-types/<id>/`、字段值、`改用`、
   反引号 id）必须解析；孤儿 reference 必须自报「未来类型」。
2. **`project-services` 保持未来类型**（沿用 2026-11-10 用户决定：服务/集成没有真实动议，不硬塞）。
   从可选表移出，playbook 文件保留但头部标「未来类型（未随包发布）」；`/req check` 对它仍报未知类型。
3. **部署默认 = `business-software`**。`company.md` 是部署级默认，不是常量；样例公司主业是软件 / 服务 /
   系统集成，hardware-software 是 CMO 的“新机会方向”而不是当前业务。默认只兜底：动议在 `meta.md`
   显式声明优先；`/req check` 的回落回执点名 `company.md 默认，未在 meta 声明`，不再静默。
   不推翻 2026-11-10 的「可选 + 回落」决定（旧动议仍绿）。
4. **播种随类型**：`seed.json` 的 process-docs source 用 `{productType}` 占位；bootstrap 先读
   workspace `kb/company.md`（没有则读 pack `state/company.md`），解析后选
   `product-types/<id>/requirements-model.md`。缺/未知类型 **fail-closed**：跳过 process-docs、
   `plan.warnings` 点名缺什么，其余 seed 照常；既有文件仍 only-fill 不覆盖。旁路
   `tools/lib/kb-seeds.mjs` 共用同一占位语义（缺/未知直接抛错）。
5. **守卫**：`seed-integrity` 增三条——process-docs 的 source 必须含 `{productType}`；每个类型包
   都能解析到该 source；`company.md` 默认类型在盘上。
6. **YAML 标量口径**（red-team E16 反馈，同轮修）：`/req check`、bootstrap、`kb-seeds` 与两道门禁
   统一经 `packages/company-pack/src/lib/yaml-scalar.ts` 的 `yamlScalar` 解析产品类型字段（去成对引号、
   去行尾 ` #` 注释）；`productType: "business-software" # 默认` 不再被误判。E16 的 C2/C3 由 RED 转
   GREEN；回归 = `tests/lib/yaml-scalar.spec.ts` + 三处调用面 spec。

## 输掉的方案

- **本轮补 `content/product-types/project-services/`**：能消掉幽灵类型，但 2026-11-10 已定“没有真实
  服务动议，先留第三类”；为假想消费者造一整套类型包违反内容宪章「两个消费者」。
- **保留 hardware-software 默认、改 org.md / CMO 业务叙事**：会把“软件 / 服务 / 系统集成”的公司
  改成硬件公司，代价更大，且与编制（无硬件 / 认证 / 试产席位）冲突。
- **取消 company.md 默认、要求 meta 必填类型**：2026-11-10 已比较过——旧动议 / 模板迁移成本高、
  小动议被挡；本轮改为“回落可见”，不推翻原决定。
- **bootstrap 硬错误（整个 plan 失败）**：一个坏类型会连坐所有 kb seed（连 company.md / org.md 都不补），
  错得比 bug 本身更重；改成“只跳过类型相关条目 + warning”。
- **bootstrap 只读 pack 类型（不读 workspace）**：workspace 的 `company.md` 才是部署配置；只读 pack
  会让用户改过的类型失效。旁路工具只读 pack 是维护面语义（fresh `bundle:init` / 排练场），
  已由 parity spec 钉住。
- **为 `project-services` 保留一张“可选但会报错”的表行**：宣告面 / 执行面分裂正是 BUG-061 的失败类。

## 后果

- 新增 `checks/gates/product-type-sources.mjs`；`seed-integrity` 扩判据；`pnpm verify` 多一道门。
- `content/state/company.md` 默认 `business-software`；`/req check` 回执多来源括注。
- `content/kb-setup/seed.json` 的 process-docs source 变成
  `product-types/{productType}/requirements-model.md`；`bootstrap.ts` 新增
  `resolveCompanyProductType` 与 `BootstrapPlan.warnings`；`tools/lib/kb-seeds.mjs` 接受 `productType`。
- `project-services` playbook 不再是可选值；有真实动议时随类型包发布再接入。
- 新增 `packages/company-pack/src/lib/yaml-scalar.ts`（共享 YAML 标量解析）；`req-command` / `bootstrap`
  改调它，避免两份实现漂移（`pnpm dup` 从 1 clone 回到 0）。
- 旧部署（only-fill）不受影响：已有 `process-docs.md` 不被覆盖；缺 process-docs 但 `company.md`
  无类型的部署会拿到 warning，而不是猜测。

## 归位

- **允许值 / 默认值 / 播种**都是“换产品类型会变”的内容或机制：枚举住 `content/product-types/`
  （类型层），默认住 `content/state/company.md`（公司层），播种机制住 host（换类型不换流程）。
- 未把类型清单放进 preset persona 或 docs 散文（那会重新长成第二套）；docs 只留指针。
- 未来项目制类型来临时，只需新增 `content/product-types/project-services/` 包 + 去掉 reference 的
  “未来类型”标记 + 品类表加一行；新门禁会逼这三步同做。

## 验证

实测 2026-11-11；全部在本轮工作树跑过。

- `pnpm verify`：修前新门 `product-type-sources` 红，原话含
  `品类表指向 project-services，但 .../project-services/ 不存在`、`孤儿 playbook 会被当成可选类型`、
  `CMO 章程:10 类型 id「project-services」解析不到`、`docs/guides/product-definition.md:52 ...`；
  修后 `PASS product-type-sources ×2（...；未来类型 1 个已标注）`、`verify: ALL PASS`。
- 门禁反证（改真文件 → 跑 → 还原）：① 把 project-services 行放回品类表 → 红
  （`SKILL.md:36 ... 不存在`）；② `company.md` 默认改 `nope` → 红（`productType「nope」解析不到`）；
  ③ 删未来类型标记 → 红（`孤儿 playbook ...`）；还原 → PASS。`seed-integrity` 反证：
  process-docs 写死 hardware-software → 红（`类型包 source 必须用 {productType} 占位；
  process-docs.md 的 source 必须含 {productType}`）；删 business-software 的 requirements-model → 红
  （`类型包 business-software 解析不到 ...`）；默认改 `nope` → 红；还原 → PASS。
- `pnpm test`：**174 files / 1455 tests passed**（含 `tests/host/run-bundle/bootstrap.spec.ts`
  13 项、`tests/tools/kb-seeds.spec.ts` 8 项、`tests/presets/presets.spec.ts` 43 项、
  `tests/host/commands/req-command.spec.ts` 17 项、`tests/lib/yaml-scalar.spec.ts` 2 项）。
- `pnpm typecheck`：绿（pack + tests/client + tests/company + tests/harness）。
- `pnpm lint`：0 warnings / 0 errors；`pnpm dup`：0 clones。
- `source run/env.sh && node checks/smoke/preset-smoke.mjs`：
  `preset-smoke: ALL PASS（6 个角色 + 5 个非角色 preset 全部可挂载）`。
- E1/E2/E4 复跑：
  - E1：`project-services` 在 skill / CMO / meta / mrd / CEO / docs 全是 `—`；类型目录 = 2。
  - E2：`business-software` → `kind: success`；`project-services` → `kind: error`，可用类型 2 类。
  - E4：`business == hardware: false`（修前 `true`）；process-docs sha 不同
    （business `fbbb32d3…` / hardware `7502db26…`）。
  - E16 red-team 复跑：C2/C3（引号 / 行尾注释）由 RED 转 GREEN；C0 因真树已修而 GREEN；
    C4/C5/C6 是已定边界（不抓裸散文 / 未来类型不进表 / 指针面不判完整性）。
- bootstrap spec 覆盖：business 默认 → 三层合同；workspace 指定 hardware → 五层合同；
  缺 / 未知类型 → 不播 process-docs + warning；既有 process-docs 不覆盖。
- 未执行 / 未验：真模型会话是否稳定按新指针选类型（需 key；本轮凭 keyless + 真挂载）；
  真实部署的 only-fill 升级（有既有 process-docs 的盘）未做真盘迁移演练。
