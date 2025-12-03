import { useState } from "react";

interface Toast {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = ({ title, description, variant = "default" }: Toast) => {
    // Simple implementation - could be enhanced with a proper toast UI component
    console.log(`[${variant.toUpperCase()}] ${title}`, description);

    // Show browser alert for now
    if (variant === "destructive") {
      alert(`Error: ${title}\n${description || ""}`);
    } else {
      alert(`${title}\n${description || ""}`);
    }

    setToasts([...toasts, { title, description, variant }]);
  };

  return { toast };
}
