---
company: Dream Team (sample)
productName: ''
productType: business-software
timeZone: Asia/Shanghai
sample: true
---
# Company identity (deployment config — factory sample)

> This is **deployment config**, not product source: after install, change `company` to your company; role sessions read this file.
> This is the state instance in your workspace; upgrades only fill gaps and do not overwrite what you changed.
> `productType` decides which product-type pack is loaded (requirements chain/terms/templates); factory = `business-software` (company business: software development / services / systems integration).
> The default is only a fallback: a motion's explicit product type in `meta.md` wins; project/integration delivery is not a reserved product type but the delivery mode
> `project-services` (see `content/delivery-modes/`) — write `deliveryMode: project-services` for such motions; do not guess from the default.
> The product name (sidebar brand) falls back to the locale's `brand.name` when `productName` is empty; the company name names this deployment; do not mix the two.
