-- FASE 1 VERIFICATION QUERIES
-- Run these queries to verify products and their BOM are stored correctly

-- 1. Check products created
SELECT 
  id,
  sku,
  name,
  price,
  description,
  status,
  "createdAt"
FROM products 
WHERE sku IN ('PROD-001', 'PROD-002')
ORDER BY sku;

-- Expected: 2 rows (Kemeja and Celana)

-- 2. Check product materials (BOM) for Kemeja (PROD-001)
SELECT 
  p.sku as product_sku,
  p.name as product_name,
  m.code as material_code,
  m.name as material_name,
  pm.quantity,
  pm.unit
FROM product_materials pm
JOIN products p ON pm."productId" = p.id
JOIN materials m ON pm."materialId" = m.id
WHERE p.sku = 'PROD-001'
ORDER BY m.code;

-- Expected: 4 rows
-- - Kain Katun: 2 METER
-- - Benang: 0.5 ROLL
-- - Kancing: 8 PIECE
-- - Label: 2 PIECE

-- 3. Check product materials (BOM) for Celana (PROD-002)
SELECT 
  p.sku as product_sku,
  p.name as product_name,
  m.code as material_code,
  m.name as material_name,
  pm.quantity,
  pm.unit
FROM product_materials pm
JOIN products p ON pm."productId" = p.id
JOIN materials m ON pm."materialId" = m.id
WHERE p.sku = 'PROD-002'
ORDER BY m.code;

-- Expected: 4 rows
-- - Kain Drill: 2.5 METER
-- - Benang: 0.3 ROLL
-- - Resleting: 1 PIECE
-- - Kancing: 2 PIECE

-- 4. Complete view: All products with their materials
SELECT 
  p.sku,
  p.name as product,
  p.price,
  COUNT(pm.id) as material_count,
  STRING_AGG(
    m.name || ' (' || pm.quantity || ' ' || pm.unit || ')', 
    ', ' 
    ORDER BY m.name
  ) as materials_list
FROM products p
LEFT JOIN product_materials pm ON p.id = pm."productId"
LEFT JOIN materials m ON pm."materialId" = m.id
WHERE p.sku IN ('PROD-001', 'PROD-002')
GROUP BY p.id, p.sku, p.name, p.price
ORDER BY p.sku;

-- Expected: 2 rows with material_count = 4 for each

-- 5. Verify material IDs exist
SELECT 
  code,
  name,
  unit,
  "currentStock"
FROM materials
WHERE code IN (
  'MAT-KAIN-001',  -- Kain Katun
  'MAT-KAIN-002',  -- Kain Drill
  'MAT-BENANG-001', -- Benang
  'MAT-KANCING-001', -- Kancing
  'MAT-LABEL-001',  -- Label
  'MAT-RESLETING-001' -- Resleting
)
ORDER BY code;

-- Expected: 6 materials

-- SUCCESS CRITERIA:
-- ✓ 2 products created (PROD-001, PROD-002)
-- ✓ 8 product_material records (4 for each product)
-- ✓ All materials referenced exist
-- ✓ Quantities match specification
-- ✓ Units match material units
