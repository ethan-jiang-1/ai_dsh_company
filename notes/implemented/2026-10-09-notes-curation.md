# notes 存量清扫：日记和收据离场

状态：已消化（2026-10-09。用户令按 [notes/README](../README.md) 的记录判据打扫存量——定义早收紧了，库存没回扫。）

## 决定

`implemented/` 只留仍能阻止一个决定被重开的东西：有效约束、否决理由、可复用的验证。
删掉三类，历史在 git：

- 轮次收尾、会话日记、探针 / E2E 首跑收据、批次「已毕业」流水。
- 研究长文和 RFC，只要决定与仍有效的否决已经在留下的 Note 或现行合同里。
- intents 的月度冻结表。那是第三本账的尸体，不是决定。

吸收进留下的家，不另开第二本：D11 的否决进
[roadmap-retirement](../archived/2026-09-28-roadmap-retirement.md)；在场板「不自建 Remote / 不用 paceMs」进
[org-presence-board](../archived/2026-09-22-org-presence-board.md)；培养的三条否决进
[twin-cultivation](./2026-09-24-twin-cultivation.md)（「新会话才生效」已被该 Note 证伪，不带走）；
D15 压成短决定，文献不留；语料加强轮的「零增量」并进
[plugin-corpus-realignment](./2026-10-07-plugin-corpus-realignment.md)。
台账路由改到现行家（D10 → `docs/AGENTS.md`，D11/D23 → 退役 Note，D12 → dev-loop §4，D13 → 根 AGENTS.md）。

长度本身不是删除理由。合同已经接走权威的，后来移进 archived；否决留在那份冻结稿里。

`archived/` 用同一条判据再扫了一遍。留下 FAQ 04/05/11/15 的防重读判定，和现行 pin 的人审 JSON。
随后把已经落地、合同或代码才是权威、但否决仍能阻止重开的决定从 `implemented/` 移入 `archived/`。再严一档：轮次收据、界面交付日记、地图拆分、收割流水、被合同完整接走的戳，删掉。同一决定并进留下的家（在场板的进度面、语料第三轮的驾驶座翻案、公司视图不装社区看板）。`implemented/` 只留现在还会改事实、或合同没把否决写全的决定。
删掉实验记录、UX 证据与评审、收割台账、生态调查、十维记分卡、外部 UX 长表、升 pin 前的 delta 长文、上一代 pin 的人审 JSON，以及 0.1.7 逐页语料台账。不照搬清单收进
[plugin-corpus-realignment](./2026-10-07-plugin-corpus-realignment.md)（`.agents/skills/` 已由后续试点落地，移出清单）；registry 三态已在 release.md。多人实验的数字、版本穿透和「九个对象别收成一个 final」收进
[multi-human-ux](../archived/2026-09-26-multi-human-ux.md)。

## 输掉的方案

- **整批搬进 `archived/`**：目录换了，人还是会把日记当现行理由读。archived 与 implemented 同一条判据，失效即删。
- **只改 README、不动存量**：负例写上了，工作集继续被收据淹没。
- **连仍有效的否决一起删**：同一个问题会重开。吸收再删，不空删。

## 验证

- 第一跑 `pnpm verify` **红**：12 条 `link` / `notes-link`，目标是已删 Note（`_backlog/_archive` 与 `snapshots/README.md`）。把这些链接改成「已删」或改指留下的 Note 之后，再跑 `pnpm verify` → **ALL PASS**（`md-links ×1066`、`ledger-routing ×38`、`bare-path ×376`、`notes-liveness ×29`）。
- 未跑 `pnpm test`：本轮不改测试与产品代码。链接、台账路由和 Note 状态行由 `pnpm verify` 覆盖。
- archived 再扫：先改完活引用再跑，`pnpm verify` 一次 **ALL PASS**（`md-links ×1043` / 190 files、`ledger-routing ×38`、`bare-path ×375`、`notes-liveness ×29`、`doc-budget` index 143/143、dev-loop 387/395）。这次没有先造红：链接在跑门禁之前就改完了。
- 落地决定移入 archived：先改完活引用再跑，`pnpm verify` 一次 **ALL PASS**（`md-links ×920` / 135 files、`bare-path ×376`、`notes-liveness ×15`、`ledger-routing ×38`）。D26 的家改指 dev-loop，D27 的家改指现行升 pin Note。
- 再严一档删收据与被合同接走的稿：第一跑 `pnpm verify` **红**，`backlog-liveness` 三张归档卡的索引链接被误改成「已删」（卡文件名和 Note 同名）。恢复这三处卡链接后再跑 → **ALL PASS**（`md-links ×865` / 129 files、`bare-path ×375`、`notes-liveness ×13`）。
