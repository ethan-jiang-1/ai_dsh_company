import { useSyncExternalStore } from 'react'
import { companyIdentity, subscribeCompanyIdentity } from '../data/company-identity.ts'
import type { CompanyT } from '../locales.ts'

/** Sidebar brand occupants for the deployment (company skin, first stroke). */

/**
 * Render the sidebar brand name.
 *
 * 2026-11-09：从部署身份读 `productName`；读不到用 `company` 字典的出厂词标（zh/en）。
 * @param props - 槽注入的 `company` translator。
 * @returns the deployment wordmark.
 */
export function DreamTeamBrandName({ t }: { readonly t: CompanyT }) {
  const identity = useSyncExternalStore(subscribeCompanyIdentity, companyIdentity, companyIdentity)
  return <span>{identity.productName || t('brand.name')}</span>
}
