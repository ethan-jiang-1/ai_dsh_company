# 闸门件运行说明（T1 · ai-coding-security-2026-v2）

> 出稿：VP-Eng｜版本 v2｜任务书 = `deliverables/2026-10-12-ai-coding-security-2026-v2/drafts/ceo.md`
> 本目录 = **两族闸门的可执行件 + fixtures + 负向测试 + 实跑证据**。设计与判据在主稿 `../vp-eng.md`。
> **本场不挂任何钩子、不改 `company-workspace` 里任何既有文件、不改父仓库**——这是"做出件 + 证明它能跑"，不是"上线它"。


> ## ⚠ 挂载状态（v3 增补，2026-10-15）
> **本目录已作为挂载副本装到父仓库 `checks/lib/ci-security-gates/`**，由门禁模块 `checks/gates/security-scan.mjs`
> 经 `pnpm verify` 在 **push 与 pull_request** 上跑（`ci.yml` 零改动）。
> ⚠ 下面第 5 行那句「**本场不挂任何钩子**」是 **v2 场次**的事实陈述，**对当前挂载副本已不成立**——
> 保留原文是为了让 v2 记录与本文档同源可核；**当前状态以本横幅与文末 §8 为准**。

> 件的家与漂移判据：副本指纹 = 同目录 `MANIFEST.json`（`git hash-object` 逐件比对，漂移即红）。
> 原文归 v2（`deliverables/2026-10-12-ai-coding-security-2026-v2/drafts/vp-eng/gates/`），随 v2 归档。

## 0. 一条命令跑全部

```bash
cd deliverables/2026-10-12-ai-coding-security-2026-v2/drafts/vp-eng/gates
./run-gates.sh --target fixtures/clean            # 期望退出码 0
GATE_TARGET=fixtures/violations/b3-taint-trace ./run-gates.sh   # 期望退出码 2
node run-gates.mjs --target <目录> [选项]          # 等价；env 与 --target 二者取其一即可
```

**退出码四态（契约要求）**：

| 码 | 含义 | 何时出现 |
|---|---|---|
| **0** | **通过**：有输入面且无违规 | 所有在册闸门都找到输入面、且无一命中 |
| **2** | **发现违规** | 任一闸门给出 VIOLATION（命中数见 `hits=`） |
| **3** | **无法判定** | 目标不存在 / **无输入面**（该闸门对被扫面零覆盖）/ 动作迹有未解析行 / 需跟踪面但不可判 |
| **4** | **用法错** | 缺 `--target`、阈值非法、**未知参数**（不许静默忽略） |

**聚合退出码优先级（装到载体上跑的是这个码，务必记牢）**：

```
违反(2)  >  不可判(3)  >  通过(0)
```

即：只要有一个闸门报违规 ⇒ **2**；全部门都不违规但至少一个不可判 ⇒ **3**；全部通过 ⇒ **0**。
实测四格：全通过 `0`｜含违规 `2`｜只有不可判 `3`｜**违规+不可判混合 ⇒ `2`**（`negative-tests.sh` CF-5/CF-6/NC-1/NC-2）。
⚠ **`3` 不是绿**：它是"这次没覆盖到"，不是"这次没问题"——不同载体会把同一次运行读成不同颜色，别把 3 当 0 用。

> ⚠ **3 与 0 不许混**：无输入面 = 3，**不得读作安全**（CEO 契约 §4① 点名的坑）。
> 单一目标目录通常只有一部分闸门有输入面（例如只有 `commands.txt`）⇒ 聚合结果常为 3，这是**覆盖度如实**，不是失败。

**3 / 4 的分界规则（v2 补注，避免同一现象两种读法）**：

- **4 = 参数面错误**（调用方给错了参数）：缺 `--target`、**未知参数**、阈值非法、策略值非法 —— 闸门自己知道参数面有错。
- **3 = 输入面不可判**（参数形式没错，但没有可判的东西）：target **不存在** / target **不是目录**（给了一个文件）/ 该闸门**无输入面** / 动作迹有未解析行 / 需跟踪面但不可判。
- 实测锚点：`node run-gates.mjs` → **4**｜`--target <不存在>` → **3**｜`--target <一个文件>` → **3**（`reason=target-not-a-directory`）｜`--target <空目录>` → **3**｜`--target fixtures/clean` → **0**｜`--target fixtures/violations/*` → **2**。

## 1. 五个闸门与调用

| 闸 | 判什么 | 单跑命令 | 输入面 |
|---|---|---|---|
| **a1** `g-a1-cred-reach.mjs` | **凭据可达性**（K2a 效果层）：同用户下 agent 进程能否**真的打开并读出**私钥材料（真 `open()+read()` 探针，不是权限位推断） | `node g-a1-cred-reach.mjs --live-creds` 或 `--cred-root <目录>` | `~/.ssh`（`--live-creds`）或 `<target>/home/.ssh` |
| **a2** `g-a2-secret-scan.mjs` | **密钥材料与高熵凭据串入面**（M4）：私钥头 / 名形状件 / 已知前缀 / 高熵赋值 | `node g-a2-secret-scan.mjs --target <目录>` | `<target>` 下全部文本文件 |
| **b1** `g-b1-artifact.mjs` | **不可信件引入前闸**（K5）：登记 / 版本 / 许可 / 注入特征 / 未声明出网 | `node g-b1-artifact.mjs --target <目录>` | `<target>/register.jsonl` + `<target>/artifacts/<件>/` |
| **b2** `g-b2-preexec.mjs` | **命令执行前闸**（M1 执行环节 · K4）：DENY / CONFIRM / ALLOW 三档 | `node g-b2-preexec.mjs --target <目录>`（读 `commands.txt` 与 `commands/*.txt`）或 `--command "<cmd>"` | 命令行文本 |
| **b3** `g-b3-trace.mjs` | **动作迹闸**（M1 行为面）：读不可信内容 → 出网/执行/读凭据 | `node g-b3-trace.mjs --target <目录>` | `<target>/traces/*.jsonl` |

**常用参数**：`--sources-policy report|block`（取证面，默认 **report**）｜`--fixture-policy report|block`（夹具/测试物料面，默认 **block**）｜`--entropy 3.5` `--minlen 16`（高熵阈值）｜`--tracked-only --tracked-list <文件>`（只在跟踪面内判违规）｜`--workspace <目录>`（b2 判"写区外"）｜`--taint-window N`（b3 污点窗口）｜`--only a1,a2`（子集）。**未知参数一律退出 4**（带已知参数清单回显）。

**面分类规则（v2 修正后 + 2026-10-17 补形态）**：面分类 = **锚点 ∪ 形态**——
① **锚点**（绝对路径，锚在闸门自身安装目录）：`<gates>/fixtures/**` 与 `<gates>/evidence/**` = `fixture` 面（默认 block）；
② **形态**（2026-10-17 补，判"**副本**"）：任一路径段**作为目录名**是 `gates`、或以 `-gates` 结尾（如 `ci-security-gates`），其后（**任意层**）出现 `fixtures` 段 ⇒ 同样归 `fixture` 面。正则 = `/(^|\/)(?:[^/]*-)?gates\/(?:[^/]+\/)*fixtures\//`。
路径含 `drafts/**/sources/**` = `sources` 面（默认 report）；其余 = `self` 面（block）。**类别优先级 = `fixture` 先于 `sources`**（该顺序是原件既有次序，本次未动；两种面都 `report` 时 verdict 无差，要改须另批）。
⇒ **与当前工作目录、与 `--target` 写法无关**（v1 用"相对 target 根的路径"判定，曾导致同一输入在两种 target 写法下给出不同的面与策略——已修，见 §3-3）。
⇒ **为什么补形态（2026-10-17，实跑留证）**：同批**合成夹具**被**复制**到 v2 归档家（`…-v2/drafts/vp-eng/gates/fixtures/**`）与 v3 载体（`…/carrier/checks/lib/ci-security-gates/fixtures/**`）后，**锚点认不出它们**（锚点锚的是"位置"，不是"身份"）⇒ 面从 `fixture`(report) 掉进 `self`(block) ⇒ 本机盘恒红 **11 条假红**。修后那 12 条如实归 `fixture`，**每一次跑都仍被打印**（`ADVISORY … surface=fixture`），只是不再拦提交。
⇒ **有意让路（副作用，必须与主稿同读）**：今后任何合法仓库里出现 `gates/**/fixtures/**` 形状的路径 ⇒ 判 `fixture` 面、默认 **advisory、不拦提交**；想让它拦就显式 `--fixture-policy=block`。**这是有意让路，不是新开的洞**（与锚点树原有的同一类让路同源）。**边界实测**：同一条高熵串放 `…/qa-gates/fixtures/…` ⇒ `ADVISORY`/退出 0；放 `config/secrets.env` ⇒ `HIT`/退出 2 ⇒ 让路**有界**。

**输出**：人可读行 + 机器可读行，均可 `grep` 取数：
`HIT <闸> class=… path=… line=…` ｜ `ADVISORY <闸> …` ｜ `GATE <闸> verdict=PASS|VIOLATION|UNDECIDABLE hits=<n> …` ｜ `SUMMARY … pass=<n> violation=<n> undecidable=<n> hits_total=<n>`

## 2. 复跑剧本（四组 + 参数决策；判据 = 同一件在两个输入下给出相反退出码）

| 组 | 命令 | 期望 | 读法 |
|---|---|---|---|
| **R0 真盘面·上线参数组** | `node run-gates.mjs --target "$PWD/company-workspace" --live-creds --sources-policy=report --fixture-policy=report` | **2** | a1 = 真机凭据面 **5 命中**；a2 = **0 blocking / 14 advisory**（取证面 7 + 夹具面 7）；b1/b2/b3 无输入面 ⇒ 3 |
| **R0-b 真盘面·默认参数组** | 同上，去掉两个策略开关 | **2** | a2 变 **7 blocking**（全部落在自家 `gates/fixtures/**`）——**这就是"不指定参数组"的后果** |
| **R1 阴性对照（有面干净）** | `./run-gates.sh --target fixtures/clean` | **0** | 五个闸门都有输入面、全部 PASS |
| **R2 阳性对照（真违规）** | `for t in a1-cred-reachable a2-key-in-tracked-path a2-high-entropy-secret b1-unregistered-untrusted b2-dangerous-commands b3-taint-trace; do node run-gates.mjs --target fixtures/violations/$t; done` | 每条 **2** | 6 个真违规面逐个非 0 |
| **R3 空目录** | `./run-gates.sh --target fixtures/boundary/no-surface` | **3**（不是 0、也不是 2） | 无输入面 = 不可判；**请勿按"期望 0"判假阳** |
| **R4 策略开关** | `node g-a2-secret-scan.mjs --target <金丝雀副本>` → **0**；同命令加 `--sources-policy=block` → **2** | 0 / 2 | 取证面默认不淹门，开关可证（金丝雀落 /tmp，因树内路径现一律锚为夹具面） |
| **R5 参数决策最小复现** | `node run-gates.mjs --target . --only a2` → **2（7 hits）**；加 `--fixture-policy=report` → **0** | 2 / 0 | **同输入、只差一个参数 ⇒ 相反退出码** |

**恒过反查（本场自跑，5/5 有区分度）**：`bash negative-tests.sh` ⇒
`ALWAYS-PASS-CHECK gate=a1 clean=0 violation=2 discriminating=yes`（a1/a2/b1/b2/b3 全 yes）。

### 2-1 装到载体上**必须**指定的参数组（v2 新增 · 不指定即出事）

| 载体 | 应指定的参数组 | 不指定时的后果 |
|---|---|---|
| **首选：把扫描面收窄到产物面**（推荐） | `--target <公司盘>/deliverables`（或 `kb`/`templates` 逐面跑）——**把 `gates/` 子树排除在扫描面之外**，其余参数全默认（`fixture` 面 block、`sources` 面 report 自动生效） | 若扫全盘：第一天就红，且**红在自家测试样本上**（实跑 = 7 blocking，全部 `surface=fixture`） |
| **次选：必须扫全盘** | 追加 `--sources-policy=report --fixture-policy=report` | 同上：7 条 blocking 假红，门第一天被淹（误报淹门 = 门死） |
| **次选的代价（必须记账）** | 被降级的 `fixture` 面里若**真掉进一份真凭据**，它只会是 `ADVISORY` 而不阻断 ⇒ **这条残余洞要写成"接受的风险"**（建议同时把 `gates/fixtures/` 从真凭据的合理落点里排除：那里只放合成件） | — |
| **b2 接入 agent 时** | 每次执行前调 `--command "<cmd>"`；判定 `DENY` 硬拒、`CONFIRM` 转人工 | 不接入 ⇒ b2 只是"能跑的件"，不改变任何执行行为（本场**未接入**） |

## 3. 恒过与误漏申报（**我自己找的漏，逐条报**）

### 3-1 漏检（未修，如实申报）

1. **a2 漏检-1**：低于默认熵阈值的长密码（`password=PasswordPassword1`，熵 3.0 < 3.5）⇒ **PASS（漏）**，证据 `fixtures/evasion/a2-low-entropy`。
2. **a2 漏检-2**：**无 armor 头的裸 base64 私钥体**（`blob.dat`）⇒ **PASS（漏）**，证据 `fixtures/evasion/a2-headerless`。
3. **b2 漏检-3**：变量拼接命令名 `c=cur;r=l; $c$r … | bash` ⇒ **ALLOW（漏）**；同批 `base64 -d | sh` 与 `printf 'cat ~/.ssh/id_rsa'` 被拦（3 条中漏 1）。
4. **射程（边界，不是恒过）**：a2 只看 `--target` 之内（目标之外零覆盖，由 a1 承接）；b2 是**字符串分类器**、b1 是**静态文本判定**——都可被编码/拆分绕过；b3 是**事后判定器**，不能让 agent 停下来。三者都只**提高成本 + 留痕**，**不宣称防住 M1/K5**。
5. **今天无输入面的闸**：b1/b2/b3 在公司盘上确无对象（0 第三方件 / 0 命令行注册 / 0 动作迹）⇒ 真盘面跑出 **3**。这不叫"能跑通"，叫**有件、待接面**。

### 3-2 已修（本场实跑暴露 + CEO 独立复跑暴露；**留痕不隐**）

| # | 症状 | 根因 | 处置与回归 |
|---|---|---|---|
| FP-1 | `templates/prd.md` 被判 `KEY-LIKE-FILE` | 站点模式子串匹配，"prd" 命中"prd.md" | 改为分隔符定界 `(^\|[._-])(jumper\|prod\|prd)([._-]\|$)`；3 个真私钥名仍命中 |
| FP-2 | 闸门自己的 `evidence/*.txt` 被判 `PRIVATE-KEY-MATERIAL` | 输出**回显密钥头字面量** ⇒ 证据文件成下一轮命中源（自指） | 改回显**类别标签**（`RSA-PRIVATE-KEY`）；复查证据文件字面量 = 0 |
| FP-3 | **本稿（散文）引用密钥头 ⇒ 自己成为 self 面命中** | FP-2 的同族第二形态：**引用发现的文档**也会变成命中源；且旧版只看文件**前 4KB**，把 v1 稿第 212 行的字面量漏掉了（双重掩盖） | ①全文判形（`fixtures/evasion/a2-header-deep` 实证：头埋在 7736 字节处，旧窗口漏、新实现中）②稿件引用一律改为标签/占位（`<KEY-HEADER-REDACTED>`） |
| FP-4/5 | 未知参数被静默忽略（`--bogus-flag`、`--fixture-policyy` ⇒ 走默认策略、exit 2） | 参数解析无白名单，"缺参数=4 / 错参数=静默"不一致 | 引入**参数白名单**：未知参数一律 **4** 并回显已知清单（`negative-tests.sh` CF-1/CF-2） |
| FP-6 | 面分类依赖 cwd / `--target` 写法（同一输入两种面、两种策略） | 夹具面用"相对 target 根的路径"判定 | 锚点改到**闸门自身安装目录的绝对路径**（`negative-tests.sh` CF-3/CF-4） |
| FP-7 | 跨 cwd 输出不一致（我自己的用例） | **我的用例缺陷**：切 cwd 后用相对路径调入口 ⇒ `MODULE_NOT_FOUND` | 用例改为入口与 target 都用绝对路径 ⇒ `identical=yes`。**这是测试缺陷不是闸门缺陷**，登记在此 |
| FP-8 | 驱动 NC-4 预期写错（把 a2 级预期套在聚合级） | **我的用例缺陷**：聚合不把"未覆盖"读成通过 | 拆成 NC-4/NC-5（a2 级）+ CF-5/CF-6（聚合级），修后 `mismatches=0` |

前后对照（机械复现）= `evidence/tuning-before-after.txt`。

## 4. 口径纪律（**三个数不可合并**）

| 数 | 口径（逐字） | 出处 |
|---|---|---|
| **4** | `find ~/.ssh -maxdepth 1 -type f \( -name 'id_*' -o -name '*jumper*' -o -name '*prod*' \) \| wc -l` —— **含 `id_rsa.pub`**（公钥！） | v1 C6 命令；本场复核 4 |
| **12** | `~/.ssh` 下**常规文件（不含 `*.pub`）**数 —— 含 `config`/`known_hosts*` 等非密钥件 | CEO 2026-10-12 实测；本场复核 12 |
| **5** | **名形状或内容含 `BEGIN … PRIVATE KEY` 头、且本进程真能读**的凭据材料数 | 本闸门 a1 口径；`id_rsa, azure_jumper, azure_prod_ubuntu, oceanus-prd.pem, test.pem` |

**⇒ v1 的"agent 可达 4 个私钥"这句应修正**：那 4 个里有一个是 `id_rsa.pub`（公钥）；真私钥材料是 **5** 个。三个数各自都对，**不是一个数的三种说法**。

## 5. 写盘与只读声明（可核）

- **闸门脚本本身：零写盘**（只打印 stdout）；**不改被扫目录**。负向测试驱动只写 `evidence/`（本目录内）；另用 `mktemp -d` 造 /tmp 金丝雀副本（跑完即删，与 CEO 复跑同法）。
- **不依赖网络、不读时钟**：无 `fetch`/无 `Date`；同输入两次运行输出**逐字节相同**（3 组 `identical=yes`），**跨 cwd 亦相同**（入口与 target 用绝对路径时）。
- **fixtures/violations 含合成密钥形状件**（body = `SYNTHETIC-FIXTURE-NOT-A-REAL-KEY` 的 base64，**非可用密钥**）：它们存在的目的就是被检出 ⇒ 默认 `--fixture-policy=block` 即判**违规**，不靠白名单放行。

## 6. 本目录清单

```
run-gates.sh / run-gates.mjs     入口（契约件）
lib.mjs                          共用工具（遍历/熵/可读探针/退出码/参数白名单）
g-a1-cred-reach.mjs a1           g-a2-secret-scan.mjs a2
g-b1-artifact.mjs    b1          g-b2-preexec.mjs     b2
g-b3-trace.mjs       b3
negative-tests.sh                负向测试驱动（22 例 + 恒过反查 + 确定性 + 跨 cwd + 参数决策）
fixtures/{clean,violations,boundary,evasion}/   输入面（含深埋头 canary：evasion/a2-header-deep）
evidence/                        实跑输出（negative-tests.txt / real-workspace-run.txt / tuning-before-after.txt）
```

## 7. 未验证（不当已跑用）

1. **包名存在性检查**（K5 的第 7 项）：需外部接口（`pypi.org` / `registry.npmjs.org`）⇒ 只出 `NOTE … PKG-EXISTENCE_DEFERRED`，**本场未跑**（v1 互审 §4 R-2 已给命令，仍属"未实跑"）。
2. **"agent 试建公开仓库必须失败"**（K1 效果层）：需 GitHub 组织实际形态与账号档位（本盘无出处）⇒ **不可机械落地**，本场不给命令。
3. **闸门挂载**：本场**不挂** pre-commit / pre-push / CI ⇒ "某次提交是否被拦"**未验证**（也没跑）。
4. **b3 的真实动作迹**：真盘 0 份 trace ⇒ 证据全部来自 fixtures 的**演练判定**，不是真实会话审计。
5. **参数组未定案**：§2-1 的"首选/次选"是技术建议，**落地选哪条归 COO/CEO**（含残余洞是否接受）。

## 8. v3 增补（挂载，2026-10-15 · 出稿：VP-Eng｜版本 v3a）

- **本目录 = 挂载副本**（父仓库 `checks/lib/ci-security-gates/`），不是唯一原件；**唯一运行面**是它（原文随 v2 归档）。
- **跑法**：`pnpm verify` → `checks/run-gates.mjs` → `checks/gates/security-scan.mjs` → 本目录 `run-gates.mjs`。
- **两条通道的参数组不同，不许混用**：
  - **CI（push/PR）**：`--target <检出>/company-workspace`、**不带 `--live-creds`**、`--sources-policy=report --fixture-policy=report --entropy=3.5 --minlen=16`、`--only=a2,b1,b2,b3`；a1 单跑 `--max-reachable=0`。
  - **每日/本机**：`--target <公司盘> --live-creds --sources-policy=report --fixture-policy=report`（真凭据面读数只在这条通道里）。
- **判据逐道，不读总码**（总码会把两个世界读成同一个数，见 §2 的 R0/R0-b 对照）。
- **`3` 不许读成通过**：本副本在 CI 通道上 a1/b1/b2/b3 常态为 3（无输入面），a2 有面。
- **证据/ 未随迁**：`evidence/` 是 v2 的历史运行输出，随 v2 归档；本副本不含它（也就不会把 v2 样本字面量带进新命中源）。
- **未核实**：本副本在 GitHub Actions 上是否真跑过 = **未核实**（本轮不 push 真仓库；无 CI 运行记录可查）。
