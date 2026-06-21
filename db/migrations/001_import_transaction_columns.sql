-- ================================================================
-- 거래 내역 테이블 확장 마이그레이션
-- 목적: 카드 엑셀/SMS 자동 입력 기능 지원
-- ================================================================

-- 1. 새 컬럼 추가
ALTER TABLE transactions
  -- 할부 및 통화 정보
  ADD COLUMN IF NOT EXISTS installment_months INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_currency VARCHAR(3) DEFAULT 'KRW',
  ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12, 2),

  -- 원본 추적 (어떤 파일/row에서 왔는지)
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_provider TEXT,
  ADD COLUMN IF NOT EXISTS source_file_id TEXT,
  ADD COLUMN IF NOT EXISTS source_row_index INT,

  -- 중복 방지 핵심
  ADD COLUMN IF NOT EXISTS import_fingerprint TEXT,

  -- 시간 정보 (기존 date는 유지, occurred_at은 시간 포함)
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMP;

-- 2. 컬럼 설명 추가
COMMENT ON COLUMN transactions.installment_months IS '할부 개월 수 (0=일시불, NULL=정보없음)';
COMMENT ON COLUMN transactions.original_currency IS '원래 통화 (KRW, USD, EUR 등)';
COMMENT ON COLUMN transactions.original_amount IS '원래 금액 (외화인 경우)';
COMMENT ON COLUMN transactions.source_type IS '출처 타입: manual, card_excel, sms, bank_excel 등';
COMMENT ON COLUMN transactions.source_provider IS '제공자: samsung, shinhan 등';
COMMENT ON COLUMN transactions.source_file_id IS '업로드 파일 고유 ID (UUID)';
COMMENT ON COLUMN transactions.source_row_index IS '파일 내 row 번호 (0-based)';
COMMENT ON COLUMN transactions.import_fingerprint IS '중복 방지용 해시 (승인번호 또는 휴리스틱 기반 SHA-256)';
COMMENT ON COLUMN transactions.occurred_at IS '거래 발생 시각 (시간 포함, 시간 없으면 00:00:00)';

-- 3. 중복 방지: 같은 사용자가 같은 fingerprint로 저장 불가
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_user_fingerprint
  ON transactions(user_id, import_fingerprint)
  WHERE import_fingerprint IS NOT NULL;

-- 4. 검증 쿼리 (마이그레이션 후 실행하여 확인)
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'transactions'
-- ORDER BY ordinal_position;
