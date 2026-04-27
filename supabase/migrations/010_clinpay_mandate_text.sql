-- ClinPay mandate column: JSONB → TEXT.
-- Reason: JSONB normalizes nested object key order. The PACT mandate signature
-- is HMAC-SHA256 over JSON.stringify({...,scope,...}), which is byte-sensitive.
-- After a JSONB roundtrip the scope sub-object's keys come back in normalized
-- order, the re-stringified bytes differ, and verifyPactMandate rejects with
-- "Invalid mandate signature". Storing the originally-signed JSON string as
-- TEXT preserves the bytes; verifier parses it and re-stringifies fields whose
-- order is fixed in code (insertion order survives JSON.parse).

ALTER TABLE "ClinPaySession" ALTER COLUMN mandate_json TYPE TEXT USING mandate_json::TEXT;
