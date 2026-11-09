import { useSyncExternalStore } from 'react'
import { companyIdentity, subscribeCompanyIdentity } from '../data/company-identity.ts'

/** Sidebar brand occupants for the deployment (company skin, first stroke). */

/**
 * Render the sidebar brand name.
 *
 * 2026-11-09：从部署身份读 `productName`；读不到保持出厂词标 `DSH 梦之队`。
 * @returns the deployment wordmark.
 */
export function DreamTeamBrandName() {
  const identity = useSyncExternalStore(subscribeCompanyIdentity, companyIdentity, companyIdentity)
  return <span>{identity.productName || 'DSH 梦之队'}</span>
}
