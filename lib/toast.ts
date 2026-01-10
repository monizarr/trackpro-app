import { toast as sonnerToast } from "sonner";

/**
 * Custom toast utilities menggunakan Sonner
 * Wrapper untuk memudahkan penggunaan dan konsistensi di seluruh aplikasi
 */

export const toast = {
  /**
   * Tampilkan toast sukses
   * @param message - Pesan utama
   * @param description - Deskripsi opsional
   */
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Tampilkan toast error
   * @param message - Pesan utama
   * @param description - Deskripsi opsional
   */
  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      duration: 5000,
    });
  },

  /**
   * Tampilkan toast info
   * @param message - Pesan utama
   * @param description - Deskripsi opsional
   */
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Tampilkan toast warning
   * @param message - Pesan utama
   * @param description - Deskripsi opsional
   */
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Tampilkan toast loading
   * @param message - Pesan loading
   * @returns ID toast yang bisa digunakan untuk update/dismiss
   */
  loading: (message: string) => {
    return sonnerToast.loading(message);
  },

  /**
   * Promise toast - otomatis update berdasarkan promise result
   * @param promise - Promise function
   * @param messages - Object berisi loading, success, error messages
   */
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },

  /**
   * Dismiss toast by ID
   * @param toastId - ID toast yang akan di-dismiss
   */
  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },

  /**
   * Custom toast dengan action button
   * @param message - Pesan utama
   * @param options - Konfigurasi toast dengan action
   */
  custom: (
    message: string,
    options?: {
      description?: string;
      action?: {
        label: string;
        onClick: () => void;
      };
      duration?: number;
    }
  ) => {
    sonnerToast(message, {
      description: options?.description,
      action: options?.action,
      duration: options?.duration ?? 4000,
    });
  },
};

/**
 * Contoh penggunaan:
 *
 * // Simple success
 * toast.success("Data berhasil disimpan!");
 *
 * // With description
 * toast.error("Gagal menyimpan", "Terjadi kesalahan pada server");
 *
 * // Promise toast
 * toast.promise(
 *   fetch('/api/data').then(res => res.json()),
 *   {
 *     loading: "Menyimpan data...",
 *     success: "Data berhasil disimpan!",
 *     error: "Gagal menyimpan data"
 *   }
 * );
 *
 * // Loading dengan manual dismiss
 * const toastId = toast.loading("Uploading file...");
 * // ... after upload complete
 * toast.dismiss(toastId);
 * toast.success("Upload complete!");
 *
 * // With action button
 * toast.custom("File deleted", {
 *   action: {
 *     label: "Undo",
 *     onClick: () => console.log("Undo clicked")
 *   }
 * });
 */
