# 🎉 Sonner Toast - Panduan Penggunaan

## Implementasi Dasar

Sonner sudah diimplementasikan di project ini. Untuk menggunakannya:

```tsx
import { toast } from "@/lib/toast";
```

## Contoh Penggunaan

### 1. Toast Sederhana

```tsx
// Success
toast.success("Data berhasil disimpan!");

// Error
toast.error("Gagal menyimpan data");

// Info
toast.info("Informasi penting");

// Warning
toast.warning("Peringatan!");
```

### 2. Toast dengan Deskripsi

```tsx
toast.success("Berhasil", "Batch produksi telah dibuat");

toast.error("Gagal menyimpan", "Terjadi kesalahan pada server");

toast.info("Update tersedia", "Versi baru aplikasi sudah tersedia");
```

### 3. Loading Toast

```tsx
// Tampilkan loading
const toastId = toast.loading("Menyimpan data...");

// Setelah selesai, dismiss dan tampilkan sukses
setTimeout(() => {
  toast.dismiss(toastId);
  toast.success("Data berhasil disimpan!");
}, 2000);
```

### 4. Promise Toast (Recommended untuk Async Operations)

```tsx
// Otomatis handling loading, success, error
toast.promise(
  fetch("/api/production-batches", {
    method: "POST",
    body: JSON.stringify(data),
  }).then((res) => res.json()),
  {
    loading: "Membuat batch produksi...",
    success: "Batch produksi berhasil dibuat!",
    error: "Gagal membuat batch produksi",
  }
);

// Dengan dynamic message
toast.promise(saveBatch(data), {
  loading: "Menyimpan...",
  success: (data) => `Batch ${data.batchSku} berhasil dibuat!`,
  error: (err) => `Error: ${err.message}`,
});
```

### 5. Toast dengan Action Button

```tsx
toast.custom("File berhasil dihapus", {
  description: "Anda dapat membatalkan aksi ini",
  action: {
    label: "Undo",
    onClick: () => {
      // Restore file logic
      console.log("Undo delete");
    },
  },
});
```

### 6. Custom Duration

```tsx
// Default: 4000ms (4 detik)
toast.success("Pesan singkat"); // 4s

// Custom duration
toast.custom("Pesan penting", {
  description: "Silakan baca dengan seksama",
  duration: 10000, // 10 detik
});

// Infinite duration (harus dismiss manual)
toast.custom("Pesan tidak hilang", {
  duration: Infinity,
});
```

## Migrasi dari alert() ke toast

### Before (Browser Alert)

```tsx
if (response.ok) {
  alert("Data berhasil disimpan!");
} else {
  alert("Gagal menyimpan data");
}
```

### After (Sonner Toast)

```tsx
if (response.ok) {
  toast.success("Berhasil!", "Data berhasil disimpan");
} else {
  toast.error("Gagal!", "Tidak dapat menyimpan data");
}
```

## Contoh Implementasi Real

### Form Submit dengan Loading

```tsx
const handleSubmit = async (data: FormData) => {
  const toastId = toast.loading("Menyimpan data...");

  try {
    const response = await fetch("/api/products", {
      method: "POST",
      body: JSON.stringify(data),
    });

    const result = await response.json();

    toast.dismiss(toastId);

    if (result.success) {
      toast.success("Berhasil!", `Produk ${data.name} telah ditambahkan`);
      router.push("/products");
    } else {
      toast.error("Gagal!", result.error || "Terjadi kesalahan");
    }
  } catch (error) {
    toast.dismiss(toastId);
    toast.error("Error", "Terjadi kesalahan pada server");
  }
};
```

### Delete dengan Konfirmasi (menggunakan AlertDialog + Toast)

```tsx
const handleDelete = async (id: string) => {
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      toast.success("Terhapus!", "Produk berhasil dihapus", {
        action: {
          label: "Undo",
          onClick: () => {
            // Restore logic
          },
        },
      });
      fetchProducts(); // Refresh list
    } else {
      toast.error("Gagal menghapus", result.error);
    }
  } catch (error) {
    toast.error("Error", "Terjadi kesalahan saat menghapus");
  }
};
```

### API Call dengan Promise Toast

```tsx
const createBatch = async (batchData: BatchFormData) => {
  toast.promise(
    fetch("/api/production-batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batchData),
    }).then(async (res) => {
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    }),
    {
      loading: "Membuat batch produksi...",
      success: (data) => {
        router.push(`/production/batch/${data.data.id}`);
        return `Batch ${data.data.batchSku} berhasil dibuat!`;
      },
      error: (err) => `Gagal: ${err.message}`,
    }
  );
};
```

## Tips & Best Practices

1. **Gunakan deskripsi** untuk memberikan konteks lebih
2. **Promise toast** untuk async operations - lebih clean dan otomatis
3. **Action buttons** untuk operasi yang bisa di-undo
4. **Loading toast** untuk proses yang memerlukan waktu
5. **Custom duration** untuk pesan penting yang perlu dibaca lebih lama

## Konfigurasi Global

Toaster sudah dikonfigurasi di `app/layout.tsx`:

```tsx
<Toaster
  position="top-right" // Posisi toast
  richColors // Warna lebih vibrant
  closeButton // Tombol close manual
/>
```

Posisi yang tersedia:

- `top-left`
- `top-right` ✅ (default)
- `top-center`
- `bottom-left`
- `bottom-right`
- `bottom-center`

## Dark Mode Support

Sonner otomatis mengikuti theme aplikasi. Tidak perlu konfigurasi tambahan! 🌙
