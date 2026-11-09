# 2026-11-06 · 产物 owner 唯一：缺角 = 补编制/报缺，禁止「能者代行」

状态：implemented（2026-11-06；用户实证：CEO 把 MRD 派给 VP-Sales「代行市场」，因为那个 workspace 的
`kb/org.md`/`owners.md` 没有 CMO 席位，且旧 CEO journal 写着「本部署无 CMO，VP-Sales 代行市场」）

## 决定

- CEO persona（`presets/ceo/agent.cordis.yml`）加一条硬规则：**产物 owner 唯一**——MRD 只归 CMO、
  PRD 只归 VP-Eng、现有客户/定价只归 VP-Sales、落地只归 COO、钱与合规只归 CFO；
  **查不到该角色 ≠ 换人代行**，先补编制或向用户报缺，用户点名才例外；旧 journal 的「本部署无 X」不作数。
- `assembling-the-team` skill 的「产品定义动议」节同规则一句话（persona 常驻、skill 按需，两处都要有）。
- `tests/presets` 加一条 keyless 断言钉住这两句（文案漂移即红）。

## 输掉的方案

- **只靠 persona 现有路由句**（「MRD 派 CMO」）：它假设编制里一定有 CMO；本次事故正是编制缺失 +
  旧 journal 把缺失固化成事实——判据必须覆盖「缺角」这一支，否则同一条规则在坏盘上仍然不成立。
- **让 VP-Sales 代行市场**（本次现场选择）：产物署名与责任链全错，MRD 的市场判断没有 veto 归属，
  后续 PRD/复核都建在错 owner 上（现场 T1–T4 四张任务全部继承这个错误）。
- **只修会话/只改这个 workspace**：不落规则，下一块旧盘再来一次；`persona + skill + 断言` 才是可复发的判据。

## 验证（实跑）

- `pnpm test tests/presets` ⇒ **33 passed**（新增「产物 owner 唯一：编制里查不到 ≠ 换人代行」）。
- 同轮数据修复：`runtime/lifecycle-lab/{local-registry-ws,ws-rc5,real-ws}` 与 `runtime/rehearsal-workspace`
  补齐 `kb/cmo/CHARTER.md` + `org.md` 的「市场与产品（CMO，3）」节（并 `五条线`→`六条线`）+ `owners.md`
  的 CMO 行；`real-ws` 里 4 篇含「本部署无 CMO / VP-Sales 代行市场」的旧 journal 顶部加作废声明。
  修后逐盘核对：五块盘的 `charter=Y org=2 owners=1` 全一致。

## 后果

- 编制缺角色时，CEO 的动作是「补编制 / 报缺 / 等用户点名」，不是换人；旧 journal 不再能当编制事实用。
- 机制侧（非默认 workspace 的编制漂移检查与补种）在后续提交补上——本 Note 只钉判断面。
