# Test Scenario: Barcode Scanning Flow

## Scenario 1: User Belum Login → Scan Barcode → Auto Redirect

### Preconditions:
- User **belum login** (no active session)
- Ada batch produksi dengan ID: `abc123`
- QR code sudah di-generate dengan URL: `https://yourdomain.com/batch/abc123`

### Test Steps:

1. **User Scan Barcode**
   ```
   Action: User scan QR code menggunakan Google Lens/Camera app
   Expected: Browser terbuka dengan URL: https://yourdomain.com/batch/abc123
   ```

2. **Middleware Intercept**
   ```
   System Action: 
   - Middleware detect user belum login (no token)
   - Middleware detect pathname = "/batch/abc123"
   - Middleware redirect ke: /login?callbackUrl=https://yourdomain.com/batch/abc123
   
   Expected Result:
   - User melihat halaman login
   - Ada info box biru: "📱 Scan Barcode Terdeteksi"
   - Message: "Setelah login, Anda akan diarahkan ke halaman batch produksi."
   ```

3. **User Login**
   ```
   Action:
   - User input username: "pemotong01"
   - User input password: "password123"
   - User klik "Masuk"
   
   Expected:
   - Login berhasil
   - NextAuth create session
   - Router.push(callbackUrl) → /batch/abc123
   ```

4. **Redirect ke Batch Page**
   ```
   Expected Result:
   - User langsung masuk ke halaman: /batch/abc123
   - Halaman menampilkan detail batch sesuai role user
   - Jika role = PEMOTONG → Show cutting task actions
   - Jika role = PENJAHIT → Show sewing task actions
   - dst...
   ```

### ✅ Success Criteria:
- User tidak perlu manually navigate ke batch
- Setelah login, langsung redirect ke `/batch/abc123`
- User bisa langsung melakukan aksi sesuai role

---

## Scenario 2: User Sudah Login → Scan Barcode → Direct Access

### Preconditions:
- User **sudah login** (active session exists)
- Role: PEMOTONG
- Ada batch produksi dengan ID: `xyz789`

### Test Steps:

1. **User Scan Barcode**
   ```
   Action: User scan QR code
   Expected: Browser terbuka dengan URL: https://yourdomain.com/batch/xyz789
   ```

2. **Middleware Check**
   ```
   System Action:
   - Middleware detect user sudah login (token exists)
   - Middleware detect pathname = "/batch/xyz789"
   - Middleware allow access → NextResponse.next()
   
   Expected Result:
   - User langsung masuk ke halaman batch
   - NO redirect ke login
   - Langsung show batch detail page
   ```

3. **Batch Page Render**
   ```
   Expected Result:
   - Fetch batch detail via API
   - Show batch info (SKU, Product, Target Qty, etc)
   - Show cutting task actions:
     * Button "Mulai Pemotongan" (if status = PENDING)
     * Form input (if status = IN_PROGRESS)
     * Status info (if status = COMPLETED/VERIFIED)
   ```

### ✅ Success Criteria:
- Tidak ada login screen
- Direct access ke batch detail
- User bisa langsung melakukan aksi

---

## Scenario 3: Different Roles → Different Actions

### Test Case 3.1: PEMOTONG
```
Given: User logged in as PEMOTONG
When: Scan barcode batch ABC-001
Then: 
  - Show "Tugas Pemotongan" card
  - If PENDING → Show "Mulai Pemotongan" button
  - If IN_PROGRESS → Show form (Potongan selesai, Reject, Waste, Notes)
  - If COMPLETED → Show "Menunggu verifikasi" message
```

### Test Case 3.2: PENJAHIT
```
Given: User logged in as PENJAHIT
When: Scan barcode batch ABC-001
Then:
  - Show "Tugas Penjahitan" card
  - If PENDING → Show "Mulai Penjahitan" button
  - If IN_PROGRESS → Show form (Jahitan selesai, Reject, Notes)
  - If COMPLETED → Show "Menunggu verifikasi" message
```

### Test Case 3.3: FINISHING
```
Given: User logged in as FINISHING
When: Scan barcode batch ABC-001
Then:
  - Show "Tugas Finishing" card
  - If PENDING → Show "Mulai Finishing" button
  - If IN_PROGRESS → Show form (Produk selesai, Reject, Notes)
  - If COMPLETED → Show "Menunggu verifikasi" message
```

### Test Case 3.4: KEPALA_PRODUKSI
```
Given: User logged in as KEPALA_PRODUKSI
When: Scan barcode batch ABC-001
Then:
  - Show full batch detail
  - Show verification options (if applicable)
  - Show approve/reject buttons for completed tasks
```

---

## Scenario 4: Error Handling

### Test Case 4.1: Invalid Batch ID
```
Given: User scan QR with invalid batch ID
When: Access /batch/invalid-id-123
Then:
  - API returns 404 or success: false
  - Show error message: "Batch tidak ditemukan"
  - Show button: "Kembali ke Beranda"
```

### Test Case 4.2: No Task Assigned
```
Given: User logged in as PEMOTONG
      But no cutting task assigned to this user for this batch
When: Access batch detail
Then:
  - Show message: "Tidak ada aksi yang tersedia untuk role Anda pada batch ini"
```

### Test Case 4.3: Network Error
```
Given: No internet connection
When: Try to fetch batch detail
Then:
  - Show loading spinner
  - After timeout, show error toast: "Gagal memuat detail batch"
```

---

## Integration Test Flow

### Full End-to-End Test:

```
1. Setup:
   - Create batch: B-001
   - Generate QR code
   - Print QR code
   - Assign to PEMOTONG: "budi"

2. Test Start Task:
   a. Budi scan QR code (belum login)
   b. Redirect ke login page
   c. Budi login dengan credentials
   d. Auto redirect ke /batch/B-001
   e. Budi klik "Mulai Pemotongan"
   f. Status batch → IN_CUTTING
   g. Task status → IN_PROGRESS

3. Test Complete Task:
   a. Budi scan QR code lagi (atau dari history)
   b. Langsung masuk (sudah login)
   c. Input form:
      - Potongan selesai: 95
      - Reject: 5
      - Waste: 2.5
      - Notes: "Material bagus"
   d. Klik "Selesaikan Pemotongan"
   e. Status → CUTTING_COMPLETED
   f. Show message: "Menunggu verifikasi"

4. Test Verify (Kepala Produksi):
   a. Kepala produksi scan QR yang sama
   b. Langsung masuk ke batch detail
   c. Lihat hasil pemotongan
   d. Klik "Approve"
   e. Status → CUTTING_VERIFIED
   f. Batch ready for next stage
```

---

## Manual Testing Checklist

### Prerequisites:
- [ ] QR code generator working
- [ ] Middleware configured
- [ ] NextAuth configured
- [ ] Database seeded with test users
- [ ] Test batches created

### Test Execution:
- [ ] Test dengan user belum login
- [ ] Test dengan user sudah login
- [ ] Test dengan PEMOTONG role
- [ ] Test dengan PENJAHIT role
- [ ] Test dengan FINISHING role
- [ ] Test dengan KEPALA_PRODUKSI role
- [ ] Test error handling (invalid batch ID)
- [ ] Test on mobile browser
- [ ] Test dengan Google Lens
- [ ] Test dengan native Camera app

### Performance:
- [ ] QR scan → Login → Redirect < 3 seconds
- [ ] Direct access (already logged in) < 1 second
- [ ] API response time < 500ms

### Security:
- [ ] Unauthenticated user tidak bisa akses /batch/*
- [ ] User hanya bisa update task yang assigned to them
- [ ] Role-based access control working
- [ ] HTTPS only in production

---

## Expected Results Summary

| Scenario | User State | Action | Expected Result |
|----------|-----------|--------|-----------------|
| 1 | Not logged in | Scan barcode | Redirect to login → Auto redirect to batch after login |
| 2 | Logged in | Scan barcode | Direct access to batch detail |
| 3 | PEMOTONG | Access batch | Show cutting task actions |
| 4 | PENJAHIT | Access batch | Show sewing task actions |
| 5 | FINISHING | Access batch | Show finishing task actions |
| 6 | KEPALA_PRODUKSI | Access batch | Show verification options |
| 7 | Invalid batch ID | Access batch | Show error message |
| 8 | No task assigned | Access batch | Show "no action available" message |

---

## Bug Tracking

### Known Issues:
- [ ] None

### Fixed Issues:
- [x] Middleware not redirecting to correct URL
- [x] Login page not using callbackUrl parameter
- [x] QR code generating JSON instead of URL

---

## Additional Notes

### Browser Compatibility:
- Chrome/Edge: ✅ Tested
- Firefox: ✅ Tested
- Safari (iOS): ⏳ Pending
- Samsung Internet: ⏳ Pending

### QR Scanner Apps Tested:
- Google Lens: ✅ Working
- Native Camera (Android): ⏳ Pending
- Native Camera (iOS): ⏳ Pending
- Third-party QR scanner apps: ⏳ Pending
