-- FASE 2 VERIFICATION QUERIES
-- Run these queries to verify material stock input is stored correctly

-- 1. Check material IN transactions from today
SELECT 
  mt.id,
  m.code as material_code,
  m.name as material_name,
  mt.type,
  mt.quantity,
  mt.unit,
  mt.notes,
  u.name as created_by,
  mt."createdAt"
FROM material_transactions mt
JOIN materials m ON mt."materialId" = m.id
JOIN users u ON mt."userId" = u.id
WHERE mt.type = 'IN'
  AND mt."createdAt" >= CURRENT_DATE
ORDER BY m.code;

-- Expected: 6 rows
-- MAT-BENANG-001: 50 ROLL
-- MAT-KAIN-001: 100 METER
-- MAT-KAIN-002: 80 METER
-- MAT-KANCING-001: 500 PIECE
-- MAT-LABEL-001: 300 PIECE
-- MAT-RESLETING-001: 200 PIECE

-- 2. Check current stock levels
SELECT 
  code,
  name,
  "currentStock",
  unit,
  "minimumStock",
  CASE 
    WHEN "currentStock" < "minimumStock" THEN '⚠️ LOW STOCK'
    ELSE '✅ OK'
  END as status
FROM materials
WHERE code IN (
  'MAT-KAIN-001',
  'MAT-KAIN-002',
  'MAT-BENANG-001',
  'MAT-KANCING-001',
  'MAT-LABEL-001',
  'MAT-RESLETING-001'
)
ORDER BY code;

-- Expected stock levels:
-- MAT-BENANG-001: 90 roll (40 + 50)
-- MAT-KAIN-001: 600 meter (500 + 100)
-- MAT-KAIN-002: 80 meter (0 + 80)
-- MAT-KANCING-001: 1500 piece (1000 + 500)
-- MAT-LABEL-001: 300 piece (0 + 300)
-- MAT-RESLETING-001: 200 piece (0 + 200)

-- 3. Verify stock calculation (initial + transactions = current)
SELECT 
  m.code,
  m.name,
  COALESCE(SUM(CASE WHEN mt.type = 'IN' THEN mt.quantity ELSE 0 END), 0) as total_in,
  COALESCE(SUM(CASE WHEN mt.type = 'OUT' THEN mt.quantity ELSE 0 END), 0) as total_out,
  m."currentStock" as current_stock
FROM materials m
LEFT JOIN material_transactions mt ON m.id = mt."materialId"
WHERE m.code IN (
  'MAT-KAIN-001',
  'MAT-KAIN-002',
  'MAT-BENANG-001',
  'MAT-KANCING-001',
  'MAT-LABEL-001',
  'MAT-RESLETING-001'
)
GROUP BY m.id, m.code, m.name, m."currentStock"
ORDER BY m.code;

-- Verify: For each material, check that calculation is correct

-- 4. Count transactions by type
SELECT 
  type,
  COUNT(*) as transaction_count,
  SUM(quantity) as total_quantity
FROM material_transactions
WHERE "createdAt" >= CURRENT_DATE
GROUP BY type;

-- Expected: 
-- IN: 6 transactions

-- 5. Transaction details with notes
SELECT 
  m.name as material,
  mt.quantity,
  mt.unit,
  mt.notes,
  mt."createdAt"
FROM material_transactions mt
JOIN materials m ON mt."materialId" = m.id
WHERE mt.type = 'IN'
  AND mt."createdAt" >= CURRENT_DATE
ORDER BY mt."createdAt";

-- Verify each transaction has:
-- - Correct quantity
-- - Correct unit matching material unit
-- - Descriptive notes

-- 6. Check stock availability for batch production
-- (This prepares for Fase 3)
SELECT 
  m.code,
  m.name,
  m."currentStock",
  m.unit,
  m."minimumStock",
  CASE 
    WHEN m."currentStock" >= 100 AND m.unit = 'METER' THEN '✅ Ready for Kemeja batch (50 units)'
    WHEN m."currentStock" >= 80 AND m.unit = 'METER' AND m.code = 'MAT-KAIN-002' THEN '✅ Ready for Celana batch (30 units)'
    WHEN m."currentStock" >= 25 AND m.unit = 'ROLL' THEN '✅ Sufficient'
    WHEN m."currentStock" >= 400 AND m.unit = 'PIECE' AND m.code = 'MAT-KANCING-001' THEN '✅ Sufficient'
    WHEN m."currentStock" >= 100 AND m.unit = 'PIECE' AND m.code = 'MAT-LABEL-001' THEN '✅ Sufficient'
    WHEN m."currentStock" >= 30 AND m.unit = 'PIECE' AND m.code = 'MAT-RESLETING-001' THEN '✅ Sufficient'
    ELSE '⚠️ Check availability'
  END as batch_readiness
FROM materials m
WHERE m.code IN (
  'MAT-KAIN-001',
  'MAT-KAIN-002',
  'MAT-BENANG-001',
  'MAT-KANCING-001',
  'MAT-LABEL-001',
  'MAT-RESLETING-001'
)
ORDER BY m.code;

-- SUCCESS CRITERIA:
-- ✓ 6 material IN transactions created today
-- ✓ All transactions have correct quantities and units
-- ✓ All transactions have descriptive notes
-- ✓ All transactions linked to Kepala Gudang user
-- ✓ Current stock = initial stock + IN transactions
-- ✓ Stock levels match expected values
-- ✓ All materials ready for Fase 3 batch creation
