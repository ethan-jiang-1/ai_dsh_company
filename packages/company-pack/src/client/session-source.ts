/** 公司包自己的 Session 引用来源标签（培养主视图的独立培养会话）。 */
import type {} from '@deepseek-ai/dsh-api-session-controller/client'

declare module '@deepseek-ai/dsh-api-session-controller/client' {
  interface SessionReferenceSourceMap {
    companyCultivation: unknown
  }
}

export {}
