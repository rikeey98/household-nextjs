-- ================================================================
-- 거래 가져오기 결제일/원본 메타데이터 확장
-- 목적: 카드사별 엑셀 포맷 확장과 결제일 조회 지원
-- ================================================================

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_due_date DATE,
  ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN transactions.payment_due_date IS '카드 결제 예정일 또는 청구 결제일';
COMMENT ON COLUMN transactions.source_metadata IS '카드사별 원본 보조 정보(JSON), 민감정보는 저장하지 않음';

CREATE INDEX IF NOT EXISTS idx_transactions_user_payment_due_date
  ON transactions(user_id, payment_due_date DESC)
  WHERE payment_due_date IS NOT NULL;
