---
topic: presets-delegation-architecture
intent: 用只读词频读数量化“委派/引擎合同”在 persona、角色 skills、docs 之间的分布，为 S4（合同散文散落）提供可复算证据
---

# 合同散文分布读数（只读）

> 方法：脚本 [contract-terms.mjs](contract-terms.mjs)（只读）对 9 个 preset 的 persona 正文、
> 19 个角色 SKILL.md + `_shared`、`docs/contracts/delegation.md`、`docs/contracts/presets.md` 统计 15 个委派/引擎词的出现次数；
> 输出 [contract-terms.json](contract-terms.json)。**词频只是代理指标**，不区分“规则/例子/叙述”，
> 也可能把域名叙述里的 workflow 计入；用它看**集中/分散**，不拿它当结论本身。

## 读数（事实）

按总词频排序（前 8）：

| 文件 | 类型 | 行数 | 命中 |
|---|---|---:|---:|
| `docs/contracts/delegation.md` | 合同 | 119 | 73 |
| `packages/company-pack/presets/vp-eng/skills/eng-teaming/SKILL.md` | 角色 skill | 93 | 64 |
| `docs/contracts/presets.md` | 合同 | 198 | 40 |
| `packages/company-pack/presets/ceo/skills/assembling-the-team/SKILL.md` | 角色 skill | 73 | 28 |
| `packages/company-pack/presets/ceo/agent.cordis.yml`（persona） | persona | — | 12 |
| `packages/company-pack/presets/vp-eng/agent.cordis.yml`（persona） | persona | — | 8 |
| `packages/company-pack/presets/ceo/skills/chairing-staff-meeting/SKILL.md` | 角色 skill | 73 | 8 |
| `packages/company-pack/presets/vp-eng/skills/eng-workflow/SKILL.md` | 角色 skill | 26 | 8 |

词的分散度（出现该词的文件数 / 总次数）：

| 词 | 文件数 | 总次数 | 观察 |
|---|---:|---:|---|
| `subagent` | 14 | 66 | 几乎每个角色都提，含义不一（工具/worker/角色） |
| `workflow` | 11 | 53 | vp-eng 之外的角色也有词（多为“我没有 workflow”的边界说明） |
| `team` | 9 | 83 | persona/skills/docs 三处重复 |
| `wait_agent` | 5 | 6 | 控制面规则分散在 5 个文件 |
| `send_message` | 6 | 14 | 同上 |
| `list_agents` | 4 | 6 | 同上 |
| `重启` | 5 | 12 | 生命周期规则分散 |
| `maxDepth` | 3 | 11 | 深度规则只在少数文件 |
| `structured_output` | 1 | 1 | **只在 eng-teaming** |
| `UNSUPPORTED_SCHEMA` | 1 | 1 | **只在 eng-teaming** |
| `spill` / `truncat` | 1 / 1 | 2 / 1 | **只在 eng-teaming** |
| `200k` | 1 | 1 | **只在 eng-teaming** |
| `interrupted` | 1 | 1 | **只在 eng-teaming** |

## 观察（事实 → 推论）

1. **F**：控制面/团队词（`wait_agent`/`send_message`/`list_agents`/`team`）散在 4–9 个文件；
   **I**：同一规则有多个副本，BUG-037 的“根不是成员”漂移是这种分布的可见后果。
2. **F**：引擎合同词（`structured_output`/`UNSUPPORTED_SCHEMA`/`spill`/`truncat`/`200k`/`interrupted`）
   **全部只出现在 `eng-teaming` 一个文件**；**I**：引擎合同的事实家其实是“vp-eng 的角色 skill”，
   但它是**角色局部**的——其他角色（以及继承其组合的 worker）不会自动看到这些规则。
3. **F**：`eng-teaming` 93 行里命中 64 个合同词，是 persona（8）的 8 倍；**I**：该 skill 同时承担
   “五档委派方法”和“引擎合同手册”，两种生命期不同（方法稳定、合同随 pin 变），导致“修 bug 就加句”。
4. **F**：`docs/contracts/delegation.md` 是词频最高的合同文件，但它不是模型面（模型不读 docs）；**I**：
   维护面合同与模型面合同是两套载体，规则需要人工搬运，天然漂移。

## 对结构选项的含义（I）

- **H3（合同单家）有直接证据支持**：把引擎合同从 `eng-teaming` 抽到一个**共享模型面**载体
  （共享 skill 或常驻 prompt section），角色 skill 只留五档方法与域内打法；否则其他角色的 worker
  永远拿不到合同。
- **H1（生成器）** 需要覆盖 persona/skills 的重复句吗？不需要——生成器解决 YAML 行重复；
  合同句的重复要靠 H3 的单一载体，而不是生成多份。
- 读数也提示一个**风险**：把合同做成共享 skill 后，它必须有明确的加载时机；否则“模型没加载”
  会重演 R14/`skill` 未加载的旧问题（见探索 Note）。常驻 prompt section 可能比 skill 更可靠，
  但会占每个会话的 token，需要预算。

## 复算

```sh
node _backlog/research/presets-delegation-architecture/contract-terms.mjs
```

脚本只读文件，不写盘；输出为 JSON（本次快照 = `contract-terms.json`）。
