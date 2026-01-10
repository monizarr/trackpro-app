// // ============================================
// // 🎉 SONNER TOAST - Quick Reference
// // ============================================

// import { toast } from "@/lib/toast";

// // ============================================
// // BASIC USAGE
// // ============================================

// // Success
// toast.success("Berhasil disimpan!");
// toast.success("Berhasil", "Batch produksi telah dibuat");

// // Error
// toast.error("Gagal menyimpan!");
// toast.error("Error", "Terjadi kesalahan pada server");

// // Info
// toast.info("Informasi penting");

// // Warning
// toast.warning("Peringatan!");

// // ============================================
// // LOADING & PROMISES
// // ============================================

// // Loading manual
// const id = toast.loading("Menyimpan...");
// // ... setelah selesai
// toast.dismiss(id);
// toast.success("Selesai!");

// // Promise (RECOMMENDED)
// toast.promise(
//   fetch("/api/data").then((r) => r.json()),
//   {
//     loading: "Loading...",
//     success: "Berhasil!",
//     error: "Gagal!",
//   }
// );

// // ============================================
// // REAL WORLD EXAMPLES
// // ============================================

// // 1. Form Submit
// const handleSubmit = async (data: any) => {
//   toast.promise(saveData(data), {
//     loading: "Menyimpan data...",
//     success: (result: any) => `${result.name} berhasil dibuat!`,
//     error: (err: any) => err.message,
//   });
// };

// // 2. Delete Action
// const handleDelete = async (id: string) => {
//   const response = await fetch(`/api/items/${id}`, { method: "DELETE" });
//   const result = await response.json();

//   if (result.success) {
//     toast.success("Terhapus", "Item berhasil dihapus");
//   } else {
//     toast.error("Gagal", result.error);
//   }
// };

// // 3. With Undo Action
// const handleUndo = () => {
//   toast.custom("File dihapus", {
//     action: {
//       label: "Undo",
//       onClick: () => restoreFile(),
//     },
//   });
// };

// // 4. Long Duration for Important Messages
// const showImportantMessage = () => {
//   toast.custom("Baca dengan teliti", {
//     description: "Ini pesan penting",
//     duration: 10000, // 10 detik
//   });
// };

// // ============================================
// // REPLACE OLD ALERTS
// // ============================================

// // OLD ❌
// // alert("Data berhasil disimpan!");
// // if (error) alert(error.message);

// // NEW ✅
// // toast.success("Data berhasil disimpan!");
// // if (error) toast.error("Error", error.message);

// // ============================================
// // HELPER FUNCTIONS (for examples)
// // ============================================
// const saveData = async (data: any): Promise<any> => {
//   return new Promise((resolve) => {
//     setTimeout(() => resolve({ name: data.name }), 1000);
//   });
// };

// const restoreFile = () => {
//   console.log("File restored");
// };

// // ============================================
// // TIPS
// // ============================================
// // ✅ Gunakan promise toast untuk async ops
// // ✅ Tambahkan description untuk konteks
// // ✅ Action button untuk undo operations
// // ✅ Loading toast untuk proses lama
// // ✅ Dismiss manual dengan toast.dismiss(id)

// // Export examples untuk testing
// export { handleSubmit, handleDelete, handleUndo, showImportantMessage };
