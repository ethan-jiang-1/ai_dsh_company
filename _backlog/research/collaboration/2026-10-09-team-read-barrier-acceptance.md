---
topic: 协作
intent: "记录BUG-007双成员真实入口的共同read放行、freshness拒写与败者恢复证据。"
---

# 双成员同轮read放行与冲突恢复

消费者：[BUG-007](../../_archive/fixed_bugs/BUG-007-collaboration-probe-false-positives.md)、[协作安全issue](../../issues/2026-10-09-collaboration-safety-acceptance.md)。本工作按用户批准的BUG-007收口goal完成；不改生产协作协议、preset或vendor。

## 结论与仪器

在保留原双成员真实入口 `probes/team/team-concurrency-probe.mjs` 上增加仅该探针挂载的临时overlay插件 `probes/team/read-barrier/index.mjs`。插件在fs read body已成功、工具 post-execute hook调用链接受原结果后，为首次精确目标read写入arrival记录并等驱动release；两个成员各自还处于同轮read调用内，驱动确认两份arrival的成员身份、路径、callId与对应read call后共同放行；最终成功read result在放行后核验。信号取消、scope disposal和120秒等待上限会中止等待；实际模型结果不被改写、不注入失败。

受支持API与限制见[同轮read barrier源研究](2026-10-09-team-read-barrier-seam.md)。`wait_agent`/`send_message`不是工具read后的暂停点；post-execute不是磁盘原子屏障，本地插件的临时ready文件不是Durable Team event。本实验只控制read结果返给模型前的释放时序，不声称跨重启存活。

## 一次真实入口结果

命令：`source run/env.sh && node probes/team/team-concurrency-probe.mjs`，退出码0。web临时实例端口58971；lead `session-a4e88e57-1782-48d3-9232-61d212061299`。w1=`635195ae-ca9f-40f1-935c-bc7ee9db4485`，w2=`571a2f0b-af88-4d19-8fce-e2ca17310a4a`。驱动确认双read已到后一次release。

| required | 实际结论 |
|---|---|
| C1a 两成员各自发布且文件精确 | w1/w2各有成功目标write，其content各为本人成员行；盘上正好两行，各一次。Lead没有目标write/edit。 |
| C1b 同轮读后freshness拒写与恢复 | w1首次旧观察write确切收到 `FS_STALE_VERSION`；之后完整read到w2行，再成功write精确两行合并。 |
| C2a claim CAS | w1/w2首次claim同task同revision 1，一成功、一 `TEAM_TASK_STALE_REVISION`，任务owner与胜者一致。失败者遵指令让位；此行为不是文件拒写证据。 |
| C2b 消息投递 | w1/w2均有真实queued + delivered到Lead。 |
| C2c 结束 | lead与两成员最后turn均completed。 |

结果：`team-concurrency-probe: ALL PASS（5/5）`，终态 `w2 was here\nw1 was here\n`。事件、arrival/release marker和证据摘要保留在本机gitignored `runtime/harness-home/team-read-barrier-BLS4rk/`。独立读取日志后用当前最终helper重放结果：barrierReads、publications、recovery、noLeadWrites、finalExact五项全true；日志回放不是第二次模型运行。完整evidence JSON含session/member/call ID，叶日志为lead.json、w1.json、w2.json。随后在最终驱动版本再次真实运行：Lead `session-1ed110bf-2b18-468a-89a7-4f4f02f65264`，证据目录 `runtime/harness-home/team-read-barrier-lEXMRd/`，仍为5/5、exit0，五项最终helper检查全true；本次运行确认了放行条件调整后没有死锁。

## 判据与反证回归

[纯判据](../../../tools/lib/team-barrier-evidence.mjs)把marker的成员ID、path、read callId与该成员配对的成功全文read结果关联，要求初始target全文为空、read后first write前同turn且无另一目标read；每成员要成功发布本行或成为唯一stale败者；stale后完整读到对方行、同turn成功发布精确合并；Lead无目标write/edit，独立终态精确。驱动也在release前核对marker身份、路径、callId确实是member event中的成功read，结束时需要matching released record。

- `pnpm test tests/harness/team-barrier-evidence.spec.ts tests/harness/collaboration-probe-verdict.spec.ts`：27/27通过，覆盖callId不匹配、失败read、跨turn读/恢复、首写前额外read、错误路径、缺失winner成功write、败者未成功恢复、合并载荷错误、partial read、Lead代写、各required判据单独缺失后的exit1与全真exit0。
- 收紧后的helper对上述真实成员/Lead event logs回放：exit0，五项全true。
- 曾有一条新增反例先红：败者在first write前插入额外read仍通过。修正为拒绝该事件顺序后，最终focused tests绿。
- 真实入口首个启动失败在Lead工具动作前结束为 `REQUEST_EXTENSION`，非成员场景失败；定位为experiment plugin loose path被官方DeepSeek plugin inventory要求声明包身份。本插件移入带本地manifest的独立probe目录后重新启动，双成员真实入口成功。启动错误现在包含child输出。失败启动日志未作为场景失败/绿证。

## 语义审与界限

授权要求按真实read后共同放行和文件stale来验证，并保留历史4/5不冒充全绿。本次同一入口已有完整5/5证据，所以旧4/5是修订前的工具无法控同一read窗口，不是当前入口仍未触发。把研究结论局限于这一次使用pinned provider、两个teammate、一个Lead、同一演示盘与同一provider instance的受控运行；不推出所有文件操作时序、不同process跨根仲裁、reader原子快照、任意运行概率或任意模型遵循性保证。

收割：①前次C1b未触发/工具假绿是已由新链实际复核的问题；②逐事件marker/callId关联和loser recovery顺序值得永久回归；③真实运行显示post-execute gate可暂停工具结果交付并由host driver共同release，但此local marker并非durable protocol。无生产缺陷触发生产修改；teamagent认领失败者是否仍写产物，仍由独立协作issue行为实验决定。
