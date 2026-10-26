# Open product decisions

## Decisions resolved by `MWEZORA_REVENUE_V1`

- Trial duration: 14 days for new activations; preserve stored legacy expiry.
- Trial resources: 25 active products, one branch, owner only, basic plus limited advanced analytics preview, standard inventory.
- Paid quotas: Starter 100/1/2, Growth 1,000/5/10, Premium fair-use unlimited/20/30 for products/branches/staff.
- Premium fair-use metadata includes a 10,000-product safety ceiling; enforcement is deferred.
- Grace period: seven days.
- Legacy transition: 30 days after future notification; R2A does not start it.
- Advertising: access metadata only; no automatic credits, reservations or vendor-controlled push.

## Decisions still open

| ID | Decision | Recommended default | Why it matters |
| --- | --- | --- | --- |
| D-02 | Trial activation trigger | Explicit mutation after approval/verification | R2A intentionally adds no activation endpoint |
| D-03 | Trial real orders | Decide in coordinated enforcement phase | R2A does not alter checkout/catalogue behavior |
| D-05 | Verification prerequisite | Define exact shop/KYC/payment threshold | Controls fraud and legal exposure |
| D-10 | Post-expiry public behavior | Decide in coordinated enforcement phase | R2A resolves metadata only |
| D-11 | Upgrade effective date | Next period initially; later consider prorated immediate upgrades | Avoids unsafe proration/refund complexity |
| D-12 | Downgrade effective date | Next period only | Prevents mid-period benefit removal |
| D-13 | Cancellation | Access through paid period end | Standard non-destructive treatment |
| D-14 | Auto-renewal | Manual renewal until provider mandate/legal approval | Provider capability and consent are not established |
| D-15 | Advertising credit amounts | No grant until economics approved | Amounts affect margin and campaign demand |
| D-16 | Credit expiry/rollover | Expire with period plus short window; no rollover | Controls liability and ledger semantics |
| D-17 | Campaign allowances | Leave unset until capacity/economics analysis | Allowance cannot imply placement availability |
| D-18 | Support benefits/SLA | Labels only until operations approve measurable SLA | Avoids unsupported promises |
| D-19 | Premium forecasting | Transparent moving average, minimum history, advisory only | Current data cannot justify black-box predictions |
| D-20 | Cost/profit analytics | Exclude until vendors supply reliable cost data | Revenue is not profit |
| D-21 | Legacy over-limit window | Approve duration and communications | Required before quota enforcement |
| D-22 | Administrative override roles | Billing plus constrained super-admin, dual review for financial benefits | Limits abuse and improves auditability |
| D-23 | Refund handling after consumed credits | Define deductible/non-refundable policy | Needed for ledger and customer-support decisions |
| D-24 | Trial extension maximum | One bounded extension with reason; exceptions dual-approved | Abuse and support consistency |

## Provider-dependent decisions

- Whether MTN supports reusable payer mandates/automatic renewal.
- Production settlement, callback and reconciliation SLAs.
- Reversal/refund mechanics and evidence.
- Whether alternative platform collection providers are needed.

These cannot be inferred from sandbox success. Platform MTN production is currently disabled/unverified (`.env.example:73-109`; `docs/audits/MWEZORA-PRODUCTION-READINESS.md`).

## Approval record recommendation

Resolve each item with decision, approver, effective date and policy version. Published plan versions and trial policies reference that approval record. A changed decision creates a new version; it does not silently rewrite historical subscription periods.
