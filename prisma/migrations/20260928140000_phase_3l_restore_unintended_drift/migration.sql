-- Forward-only repair for the successfully applied accidental migration
-- 20260927142208_phase_3l_disputes_risk_controls.
-- The current Prisma Refund.returnRequest relation requires this FK.
-- The two dropped standalone indexes are deliberately not recreated: their
-- canonical lookup prefixes remain covered by current schema indexes.
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_returnRequestId_fkey"
  FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
