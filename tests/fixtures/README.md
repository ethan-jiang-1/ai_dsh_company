# tests/fixtures/ —— keyless 夹具的出处登记

> 每个夹具**必须**在这里有一行：来源性质（authored / derived）、生成方式、用途、更新触发。
> 本文件是出处唯一家；`tests/harness/fixture-provenance.spec.ts` 机械校验"盘上每个顶层夹具都有行"。
> 硬规矩：**真实部署数据不进本目录**（客户/动议/会话正文都不行）；只收合成或脱敏派生夹具。

| 夹具 | 来源 | 生成 / 更新方式 | 用途 |
|---|---|---|---|
| `bundle-manifest-v1.json` | authored（2026-10-27，数据模型 P1） | 手写 v1 形状；digest 为占位值（`aaaa…`/`bbbb…`），不作为真实哈希使用 | `tests/company/bundle-manifest.spec.ts`：v1 **输入**夹具（schema 迁移与未知版本边界）；不是任何期望输出 |
| `catalog.contract.json` | authored（2026-10-23，成品目录契约） | 由 host 生成器的输出形状手工固化为共享金样；同一份 INPUT 在 `tests/client/catalog-contract.spec.ts` 内复述 | 生成器（TS）↔ 解析器（client）的**契约**：双方读同一份形状；改 schema 时同 diff 更新该文件与两侧 |
| `deliverables-r1/session.jsonl` | authored（2026-10-27，合成 2 行；cwd = `/synthetic/company-workspace`） | 手写最小会话：`session` 头 + `deliverables/presented` 事件；不含任何真实会话内容 | `tests/company/deliverables-audit.spec.ts`：presented 事件 → 审计判据的输入 |
| `deliverables-r1/workspace.expected/` | authored（同上） | 与 `session.jsonl` 配套的期望工作区树（两份 final.md）；**不是**录制副本 | 同上：审计对工作区的期望态；与 session 分离，避免"同一录制既当输入又当期望" |

## 更新触发

- 改 `bundle.json`/成品目录/审计账本的**形状**：同 diff 更新对应夹具与本表。
- 夹具只收合成数据；真实证据归部署仓/run bundle（见 [snapshots/README](../../snapshots/README.md) 同款边界）。
- 新增夹具：先在本表登记来源与用途，再加 spec（`fixture-provenance` 会拦漏登记）。
