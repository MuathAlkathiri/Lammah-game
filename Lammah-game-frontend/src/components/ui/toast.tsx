"use client";

import { useEffect, useState } from "react";

type ToastPayload = {
  type?: "success" | "error";
  message: string;
};

type ToastState = ToastPayload & {
  id: number;
};

export function showToast(payload: ToastPayload) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<ToastPayload>("lammah-toast", { detail: payload }),
  );
}

export function ToastViewport() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>).detail;
      setToast({
        id: Date.now(),
        type: detail.type ?? "success",
        message: detail.message,
      });
    };

    window.addEventListener("lammah-toast", handleToast);

    return () => window.removeEventListener("lammah-toast", handleToast);
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => setToast(null), 3200);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
      <div
        className={
          toast.type === "error"
            ? "rounded-2xl border border-destructive/30 bg-[#2a1020]/95 p-4 text-sm font-semibold text-destructive shadow-2xl backdrop-blur"
            : "rounded-2xl border border-primary/30 bg-[#10261d]/95 p-4 text-sm font-semibold text-primary shadow-2xl backdrop-blur"
        }
      >
        {toast.message}
      </div>
    </div>
  );
}
