/**
 * boot 时把公司 workspace 登记进 DSH Workspace（2026-11-01 产品化新增）。
 *
 * 为什么独立 row：登记必须发生在 Web readiness 之前；主 `company-client` 的 apply 里用
 * `ctx.inject` 会引入时序竞态（Client 可能在登记前请求 workspace 列表）。独立 row 声明
 * `inject: ['workspaceRegistry']`，loader 等 registry 就绪后执行 async apply；2026-11-01 探针
 * 已验证 `[probe] registered` 出现在 `dsh web:` 之前，`storages/workspace.json` 含该 path。
 *
 * 边界：只登记，不创建目录、不 seed、不写 manifest、不授予模型权限。失败只 warn，不连累 boot。
 */
import type { Context } from '@deepseek-ai/cordis'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { existsSync, lstatSync } from 'node:fs'
import { resolve } from 'node:path'
import { expandHomePath } from '@deepseek-ai/dsh-home-paths'
import { validateCompanyHome } from './bootstrap.ts'

export const inject = ['workspaceRegistry']

const env = (name: string): string | undefined => (process.env as Record<string, string | undefined>)[name]

export async function apply(ctx: Context): Promise<void> {
  const raw = env('DSH_COMPANY_HOME')?.trim()
  if (raw === undefined || raw === '') {
    ctx.logger?.info?.('company-pack：未设置 DSH_COMPANY_HOME，跳过 Workspace 登记')
    return
  }
  const workspace = resolve(expandHomePath(raw))
  if (!existsSync(workspace) || !lstatSync(workspace).isDirectory()) {
    ctx.logger?.warn?.(`company-pack：workspace 不存在或不是目录，跳过 Workspace 登记：${workspace}`)
    return
  }
  const check = validateCompanyHome(resolveDshHome(), workspace)
  if (!check.ok) {
    ctx.logger?.warn?.(`company-pack：workspace 落点不安全，跳过 Workspace 登记（${check.error}）`)
    return
  }
  try {
    // SAFETY: cordis 的 Context 无静态 service 索引签名；`inject: ['workspaceRegistry']` 已由 loader
    // 保证该服务在 apply 前就绪，DSH 的 workspaceRegistry.create(path) 是唯一被调用的成员。
    const registry = (ctx as unknown as {
      readonly workspaceRegistry: { create(path: string): Promise<{ id: string; path: string }> }
    }).workspaceRegistry
    const registered = await registry.create(workspace)
    ctx.logger?.info?.(`company-pack：workspace 已登记 ${registered.id} @ ${registered.path}`)
  } catch (error) {
    // 登记失败不是 boot 失败：Client 仍可用 picker/手工加；不要连累应用。
    ctx.logger?.warn?.(`company-pack：Workspace 登记失败（不影响启动）：${(error as Error).message}`)
  }
}
