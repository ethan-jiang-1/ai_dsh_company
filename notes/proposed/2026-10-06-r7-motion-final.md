# 2026-10-06 · r7 动议完整终局：r6 同题真模型重跑到 final + 真盘语料收割

状态：proposed（批准：用户 2026-10-06 两项范围裁决——①内容 = r6 同题完整重跑；②通道 = headless + orient 走查。授权链 = 用户「A 后接 B」方向确认；前包 = [orient-scan-view](../implemented/2026-10-06-orient-scan-view.md)——扫描节已入 orient，本包用走查它的实战价值；前包 = [test-asset-harvest](../implemented/2026-10-06-test-asset-harvest.md)——r6-baseline（mid-flight）录制机制与运行态事实的家）

## 问题

语料至今没有一份**完整终局**的真盘 case（r6-baseline = mid-flight，无 final）；登记债「r6 无 final」的另一条清偿路径（人工 demo / lead 轮机制变化）未走。仪器面（扫描/打分/三态判据）全部就绪但没有新真数据进来——仪器该去看真运行了。

## 方案

1. **录制**：`replay-smoke --record`（真模型认证档，r6 同任务源——对账/票据产品化）`--wall 7200`（r6 运行态事实：60 分钟未到 final、wall 是唯一停止条件 ⇒ 预算按 2h 封顶；**wall 切尾则如实登记 mid-flight 并停下呈批**，不假装修完）。归档 = `snapshot-motion.mjs` 新场景 `snapshots/replay/r7-motion-final/`（代码锚、cwd 如实、raw tar.zst）。
2. **预算触发**：新归档若致 snapshots-budget 红（现 50.9/64M + r6 fixtures 15.8M）——按 snapshots/README 政策对 r6 大件外置冷存（登记债「增长时」触发条件兑现），红→处置→绿。
3. **走查切片**：`orient --workspace <dir>` 扩展（keyless 小切片，红绿环）——让扫描节可指向录制工作区/快照 workspace.actual，A 包边界登记的「扩 CLI 入口待 B 包另立」兑现。
4. **审计**：`deliverables-check`（交付物三态机器判据：final = Lead present、agentPreset=ceo、depth=0）跑在归档快照上。
5. **语料收割**：final 场景收真盘 case 16 入 labels.md——**判据先行**（先立标注判据再跑打分腿）；机器标注后**呈批待人复核**（用户裁决口径，镜像 case 14/15 收口）；打分腿 `--labels --variants` 全表重跑（真盘行 2→3）。
6. **收割三问**（dev-loop §12 首条）按实答，异常→BUG 卡、运行态事实→场景 README/Note。

## 输掉的方案（备选必载，留尸）

- 人工 demo 跑 r6 终局——清偿但不可机器复现，且依赖用户在场；headless 授权链已具备（D29）。
- 新题（demo 场景 C/D/E）——无 mid-flight 基线对比，丢掉「同题重跑看组合演进」的对照价值。
- 续跑 r6 mid-flight 盘面——replay 资格已如实声明不可回放；半途盘面续跑 = 非受控状态，另案再议。
- wall 3600 重试——r6 已证伪（60 分钟无 final），重复交学费。
- case 16 标注跳过人复核直接当金标准——case 14/15 惯例：机器标注必须待人复核，否则 delta 假全。

## 验收

1. **录制收据**：`replay-smoke --record --wall 7200` 真模型完成；final.md 在盘（或切尾如实呈批）；`snapshot-motion` 归档完成、snapshot.yml 全量元数据（代码锚 = 录制时 HEAD）。
2. **预算**：`pnpm verify` 含 snapshots-budget ALL PASS（触发外置冷存则记录红→处置→绿）。
3. **走查切片**：`orient --workspace` 先红（spec：CLI 参数缺失即红）后绿；实跑指向归档 workspace.actual，扫描节显示 r7 动议（已关闭/final 在场 ⇒ 「已关闭不报」——这是扫描器在完整终局上的首个活体验证）。
4. **审计**：`deliverables-check --only <slug>` 在归档快照上 PASS（或红→根因→处置记录）。
5. **语料**：case 16 行入 labels.md（判据先行 + 机器标注），呈批用户复核；复核通过后打分腿全表重跑 exit 0、真盘行数 3。
6. **门禁**：全程 verify + vitest 全绿；毕业 Note 带红/绿收据与资产增量行。
