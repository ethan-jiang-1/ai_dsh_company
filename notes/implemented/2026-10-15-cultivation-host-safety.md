# 培养命令采纳正文修复与 Host 文件安全加固

状态：implemented（2026-10-15；授权 = 用户对重构轮 5aad5dd 的后续质询：「git commit 然后你再review一下所有的这一通的提交的质量, 同时验证一下我们的质量是没问题的」——review 抓出行为 bug 与测试缺口后同轮修复。前一轮局部化决定的 owner = [2026-10-14-client-host-replay-locality](./2026-10-14-client-host-replay-locality.md)，本文只记新增决定。）

## 决定

1. **adopt 部署持久化正文**：`host/cultivation.ts` 采纳建议时，方法 `SKILL.md` 正文改取记录文件里的提案正文（[lib/cultivation.ts](../../packages/company-pack/src/lib/cultivation.ts) 新增 `recordBody`，`parseRecord` 复用同一 frontmatter 解析），不再取命令行局部 body——`adopt <id>` 不带 `::` 正文，旧实现部署出空正文方法（review 抓出的行为 bug：红 = 期望含提案正文、收到空串）。
2. **存储适配器路径安全**（单进程威胁模型：无对抗性并发改动，check-then-use 竞态不声称免疫）：
   - 记录 id 只拒绝路径语义——`/`、`\`、NUL、`:`、绝对路径/盘符、`.`/`..`、超 128 字符；任意非路径 legacy id（如 `r1`）继续可读。
   - 培养目录 / 记录目录 / 方法层根 / 角色方法目录 / 方法目录逐组件 `lstat`，symlink 或非目录即拒（配置的 profile 根之上视为信任锚）。记录文件本体读写同样拒 symlink，清单枚举跳过并计入 broken。
   - 新建文件（记录、SKILL.md）用同目录 temp + `link` 独占发布——既有文件零覆盖；记录改写用 sibling-temp + `rename` 原子替换，失败清理 temp。
   - 方法目录用独占 `mkdir` 占位；碰撞返回未安装且**不改动**既有文件、记录保持 open；安装中途失败只回收自己刚建的空目录。
3. **revoke 顺序**：先校验 slug、先 `loadRecords` 再删方法目录，然后逐条给 adopted 记录标注 `revokedAt`（记录保留，不删）。目录删除与记录标注仍非事务——标注失败会留下「目录已删、记录未标」中间态，如实声明，不做补偿性重装。
4. **不安全路径的命令面语义**：自有 `UnsafeCultivationPathError` 在 adopt/revoke 分支转成 `kind: 'error'` 结果；普通 IO 故障（权限等）保持抛出，不吞。
5. **Client 探活清理挂 fiber**：`client/index.ts` 的 `startInstanceGuard(document)` 改为 `ctx.effect(() => startInstanceGuard(document))`——卸载/重载时清心跳、横幅与两枚定时器，不再丢弃 disposer（Cordis「注册即 effect」惯例，同文件 `installStyles` 同款）。

## 输掉的方案

- **正则把记录 id 钉成时间戳形状**：被否——legacy 任意 id 必须继续可读；只拒路径语义，不猜格式。
- **只校验叶子路径**：被否——角色目录/方法层根/记录目录任一为 symlink 都能绕过叶子检查；改为逐组件校验。
- **命令层宽泛 catch 一切 fs 异常**：被否——权限类故障的抛出语义是可观察行为，吞掉等于掩盖；只捕自有路径错误类型。
- **保留原 revoke 顺序（先删后读）**：被否——先读快照再删，标注至少基于删除前的记录集合；但非事务边界保留并明说。
- **本轮补全量 TestClient 组合测试**：未做——需引入 `@deepseek-ai/dsh-client-test-runtime` devDependency 且 `bundleRoster` 要从本仓锚点解析公司包行，成本超本轮；Client 装配证据维持 client-load-smoke（真浏览器）+ 真实 Context/SlotRegistry 页签注册测试，guard disposer 契约已 keyless 钉住（未验项如实登记，不写成绿）。

## 后果与覆盖边界

- 命令族 keyless 覆盖从 3 条路径扩到：提案写盘、跨角色采纳拒绝、目标角色采纳（部署持久化正文）、reject/verify（frontmatter 更新且正文保留）、revoke（非法 slug 拒、目录删除 + 记录标注）、记录 id 路径穿越拒绝、记录/方法碰撞不覆盖不落 adopted、symlink 记录与方法不被跟随且外部目标原样。**不证明**：完整 Host Loader/profile 装配（→ preset-smoke / [cultivation-method-layer-probe](../../probes/session-context/cultivation-method-layer-probe.mjs)）、对抗性并发竞态、Windows 保留名。
- guard 卸载：keyless 钉的是 disposer 自身契约；`apply`→`ctx.effect` 接线由类型检查 + client-load-smoke 装载证据覆盖，整 fiber 卸载/重载仍属浏览器档。

## 验证（实际执行）

| 命令 / 试验 | 断言 | 红 / 绿形态 |
|---|---|---|
| `pnpm exec vitest run tests/company/cultivation.spec.ts` | 命令族 + 文件安全 24 用例 | 修复前穿越用例红：`expected 'success' to be 'error'`（tests/company/cultivation.spec.ts:343）；修复后 24/24 PASS |
| `pnpm exec vitest run tests/client/instance-guard.spec.ts` | 判据纯函数 3 例 + disposer 契约（横幅随他人心跳出现；dispose 清心跳/横幅/定时器；停表后 20s 不续写） | 4/4 PASS |
| 临时去掉 instance-guard 清理里的两枚 `clearInterval` 后重跑上一条 | disposer 测试有牙齿 | 红：dispose 后泄漏的 beat 定时器续写自身心跳，`expected {...tab-other, tab-self…} to deeply equal {tab-other}`；还原后绿 4/4 |
| `pnpm exec tsc -b packages/company-pack --pretty false` | host/client 两面类型 | 通过（无输出） |
| `cd packages/company-pack && ../../node_modules/.bin/tsdown` | 两面产物构建 | Host/Client build complete（仅既有 `external` deprecation warning） |
| `source run/env.sh && node checks/smoke/client-load-smoke.mjs` | 真浏览器装载 client 面（guard 挂 fiber 后挂载零失败） | ALL PASS：无 banner、零 loader 错误、品牌槽在场 |
| `source run/env.sh && node probes/session-context/cultivation-method-layer-probe.mjs` | 真 boot web 的方法层机制六判据 + 角色闸反例；判据⑤（adopt 部署方法 + 记录翻 adopted）正是本轮正文修复路径 | ALL PASS；另观察到运行中 cfo 会话 watcher 已刷新 catalog |
| `set -o pipefail && pnpm verify && pnpm test` | 全门禁 + 全量 keyless | verify ALL PASS（含 md-links/bare-path/doc-budget/notes-liveness 对新 Note）；59 文件 / 556 测试 PASS |
| replay-smoke | 会话级回归 | **未执行**（本轮改动面非会话级行为，最小证据档 = 上表命令族探针 + client 冒烟；已知基线失败签名见前轮 Note，未刷新夹具） |

## 指针

- 前一轮 seam 局部化决定（保留原文）：[2026-10-14-client-host-replay-locality](./2026-10-14-client-host-replay-locality.md)
- 源码面导航：[company-pack src README](../../packages/company-pack/src/README.md)
- 测试分区与改动面路由：[tests README](../../tests/README.md)
- 方法层机制探针（host 命令族改动的完成定义）：[cultivation-method-layer-probe](../../probes/session-context/cultivation-method-layer-probe.mjs)
