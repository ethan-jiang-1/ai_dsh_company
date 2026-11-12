# Enterprise software · glossary

> Layer: product type · Load: on demand (T2). Terms change with product type; the generic layer must not use these words.

## General

| Term | Meaning (within this type) |
|---|---|
| enterprise software | Software sold to an organization and deployed/used by it; not the same as SaaS |
| private deployment | Deployed in the customer's own environment; upgrade, compatibility, and rollback are the acceptance focus |
| perpetual license | One-time license + maintenance/upgrade; the version-support matrix is the acceptance focus |
| seat / usage | Billing units for subscription or metering; pricing belongs to VP-Sales/CFO |

## SaaS delivery mode (subclass)

| Term | Meaning (within this type) |
|---|---|
| tenant | A tenant; the basic unit of data isolation and quota |
| SLA | Service-level commitment; availability, response, and compensation basis |
| activation | Activation: a new tenant completes its first value action |
| retention | Retention; weekly/monthly continued use and churn |
| release train | A fixed-cadence release train; canary and rollback |
| feature flag | A feature flag; rollout by tenant/percentage |

SaaS is a delivery mode of this type, not a separate product type; do not treat tenant/SLA as mandatory fields for all enterprise software.
