# Shop moderation data review

No existing `REJECTED` application is automatically converted to `SUSPENDED`.
Rejection historically represented both genuine onboarding decisions and the
incorrect admin “Suspend Store” action, so application status alone is not safe
evidence.

After deploying the additive moderation migration, administrators should review
linked applications whose audit history contains an approval followed by a
legacy rejection. A linked operational profile, an earlier `VENDOR_APPROVED`
audit event, and a later `VENDOR_REJECTED` event together identify records
affected by the old UI with the strongest available evidence. Confirm the
administrator's original intent before applying `SUSPEND` through the new
moderation action; do not edit product, inventory, order, or verification rows.

Suggested read-only report:

```sql
SELECT
  a."id" AS "applicationId",
  a."status" AS "applicationStatus",
  v."id" AS "vendorId",
  v."status" AS "operationalStatus",
  v."storeName",
  MAX(l."createdAt") FILTER (WHERE l."action" = 'VENDOR_APPROVED') AS "lastApprovedAt",
  MAX(l."createdAt") FILTER (WHERE l."action" = 'VENDOR_REJECTED') AS "lastLegacyRejectedAt"
FROM "VendorApplication" a
JOIN "VendorProfile" v ON v."id" = a."vendorProfileId"
LEFT JOIN "AuditLog" l ON l."entityId" = a."id"
WHERE a."status" = 'REJECTED'
GROUP BY a."id", v."id", v."storeName"
ORDER BY "lastLegacyRejectedAt" DESC NULLS LAST;
```
