1. Modul dan Fitur Aplikasi
   1.1 Modul Owner
   Dashboard Owner

Ringkasan produksi harian/bulanan
Grafik performa produksi
Status stok bahan baku (alert jika di bawah minimum)
Laporan keuangan produksi

Manajemen Produk

Create: Tambah produk baru dengan SKU produk
Read: Lihat daftar produk
Update: Edit informasi produk
Delete: Hapus produk (soft delete)
Upload foto produk (multiple images)

Manajemen Bahan Baku

Tambah/edit/hapus bahan baku
Lihat daftar bahan baku
Set stok minimum
Notifikasi stok menipis

Laporan & Rekap

Rekap produksi per periode
Rekap penggunaan bahan baku
Export ke Excel/PDF
Grafik analisis produksi

1.2 Modul Kepala Gudang
Manajemen Stok Bahan Baku

Input stok masuk bahan baku
Update stok keluar (untuk produksi)
Monitoring stok real-time
Riwayat keluar-masuk bahan
Pencarian dan filter bahan

Alokasi Bahan untuk Batch Produksi

Lihat permintaan bahan dari Kepala Produksi
Alokasikan bahan sesuai kebutuhan batch
Konfirmasi ketersediaan bahan
Catat penggunaan bahan per batch

Rekap Bahan Baku

Laporan stok harian/bulanan
Laporan pemakaian bahan per produk
Notifikasi stok minimum
Rekap batch produksi

1.3 Modul Kepala Produksi
Manajemen Batch Produksi

Buat batch produksi baru dengan SKU batch otomatis
Format SKU: PROD-YYYYMMDD-XXX (contoh: PROD-20250129-001)
Tentukan produk dan jumlah target
Request alokasi bahan baku
Monitor status batch produksi

Penjadwalan Produksi

Assign batch ke Pemotong
Monitor progress setiap tahap
Update status produksi
Validasi hasil dari setiap tahap

Kontrol Kualitas

Verifikasi hasil pemotongan
Verifikasi hasil penjahitan
Verifikasi hasil finishing
Input jumlah reject dan alasannya

Dashboard Produksi

Status semua batch aktif
Timeline produksi
Bottleneck detection
Productivity metrics

1.4 Modul Pemotong
Proses Pemotongan

Lihat batch yang di-assign
Input bahan yang masuk untuk dipotong
Update progress pemotongan
Input jumlah potongan selesai
Catat bahan sisa/reject
Submit untuk verifikasi ke Kepala Produksi

Riwayat Kerja

Lihat riwayat batch yang dikerjakan
Statistik produktivitas pribadi

1.5 Modul Penjahit
Proses Penjahitan

Lihat batch yang sudah diverifikasi dari pemotongan
Update progress penjahitan
Input jumlah jahitan selesai
Catat potongan reject/rusak
Submit untuk verifikasi ke Kepala Produksi

Riwayat Kerja

Lihat riwayat batch yang dikerjakan
Statistik produktivitas pribadi

1.6 Modul Finishing
Proses Finishing

Lihat batch yang sudah diverifikasi dari penjahitan
Update progress finishing
Input jumlah produk selesai finishing
Catat produk reject
Submit untuk konfirmasi final

Quality Check Final

Pemeriksaan akhir produk
Update status batch menjadi "selesai"
Input ke rekap produksi final

2. Fitur Umum Sistem
   2.1 Authentication & Authorization

Login dengan username/password
Role-based access control (RBAC)
Session management
Logout
Password reset

2.2 Notifikasi

Notifikasi stok bahan baku menipis
Notifikasi batch baru untuk setiap role
Notifikasi verifikasi diperlukan
Notifikasi deadline produksi

2.3 Tracking & Traceability

Pelacakan SKU batch produksi di setiap tahap
History lengkap perjalanan batch
Tracking penggunaan bahan per batch
Audit trail semua aktivitas

2.4 Reporting

Export laporan ke PDF/Excel
Filter laporan berdasarkan tanggal, produk, batch
Grafik visualisasi data
Custom report generator

3. User Interface Requirements
   3.1 Responsive Design

Desktop (1920x1080 - 1366x768)
Tablet (iPad, Android tablet)
Mobile (optional, untuk monitoring)

3.2 Navigasi

Sidebar menu berdasarkan role
Breadcrumb navigation
Quick access dashboard
Search global

3.3 Dashboard Components

Card widgets untuk metrics
Chart/graph (Line, Bar, Pie)
Data tables dengan pagination, sorting, filtering
Alert/notification panel

4. Alur Kerja Sistem (Workflow)
   Alur Produksi Lengkap:

Owner membuat produk dengan SKU produk
Owner menambah/update bahan baku
Kepala Gudang input stok bahan baku
Kepala Produksi membuat batch produksi baru (SKU batch otomatis)
Kepala Produksi request alokasi bahan
Kepala Gudang alokasikan bahan untuk batch
Kepala Produksi assign batch ke Pemotong
Pemotong proses pemotongan dan submit hasil
Kepala Produksi verifikasi hasil pemotongan
Penjahit terima batch yang sudah diverifikasi
Penjahit proses penjahitan dan submit hasil
Kepala Produksi verifikasi hasil penjahitan
Finishing terima batch untuk proses akhir
Finishing proses finishing dan konfirmasi selesai
Kepala Produksi verifikasi final dan update rekap
Owner melihat rekap produksi final

5. Keamanan (Security)

Password hashing (bcrypt/argon2)
SQL injection prevention (prepared statements)
XSS protection
CSRF tokens
Input validation & sanitization
Rate limiting untuk API
HTTPS encryption
Backup database otomatis (daily)

6. Performance Requirements

Page load time: < 3 detik
API response time: < 500ms
Support minimal 50 concurrent users
Database indexing untuk query optimization
Caching untuk data yang sering diakses


## Database postgre
host : localhost
port : 5432
username : zar
password : iop
nama  db : trackpro-db
