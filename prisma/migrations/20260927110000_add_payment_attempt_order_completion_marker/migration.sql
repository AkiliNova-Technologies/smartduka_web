-- Records which verified attempt won the Order PENDING -> COMPLETED transition.
ALTER TABLE "PaymentAttempt" ADD COLUMN "orderCompletedAt" TIMESTAMP(3);
