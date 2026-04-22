"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { Lock, Delete } from "lucide-react";
import { SalesComparisonPanel, ComparisonType } from "@/components/dashboard/SalesComparisonPanel";
import { OrderNotificationListener } from "./OrderNotificationListener";
import { GlobalOrderNotification } from "./GlobalOrderNotification";
import "@/app/dashboard/dashboard.css";

export function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState("");

  useEffect(() => {
    try {
      if (sessionStorage.getItem("bloom_unlocked") === "true") setIsLocked(false);
    } catch {
      /* ignore */
    }
  }, []);
  const [unlockError, setUnlockError] = useState("");
  const [comparisonPanel, setComparisonPanel] = useState<ComparisonType | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "F1" && e.key !== "F2") return;
      if (document.querySelector('[data-ordersheet="active"]')) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      e.preventDefault();
      const key = e.key.toLowerCase() as "f1" | "f2";
      const stored = localStorage.getItem(`bloom_${key}_action`) as ComparisonType | null;
      const action: ComparisonType = stored ?? (key === "f1" ? "yesterday" : "last_week");
      setComparisonPanel(action);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLocked]);

  function handlePinPress(digit: string) {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setUnlockError("");
    if (next.length === 4) {
      if (next === "1234") {
        try {
          sessionStorage.setItem("bloom_unlocked", "true");
        } catch {
          /* ignore */
        }
        setIsLocked(false);
      } else {
        setUnlockError("PIN incorrecto");
        setTimeout(() => {
          setPin("");
          setUnlockError("");
        }, 800);
      }
    }
  }

  if (isLocked) {
    const pinKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F5F7] p-4">
        <div className="w-full max-w-xs rounded-[3rem] border border-gray-100 bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-black text-[#FFD60A] shadow-xl">
            <Lock size={32} strokeWidth={2.5} />
          </div>
          <h2 className="mb-1 text-2xl font-black uppercase tracking-tighter text-gray-900">Bloom</h2>
          <p className="mb-6 text-xs font-bold uppercase tracking-widest text-gray-400">Ingresá el PIN</p>

          <div className="mb-6 flex justify-center gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-4 w-4 rounded-full border-2 transition-all ${i < pin.length ? "border-black bg-black" : "border-gray-300 bg-transparent"}`}
              />
            ))}
          </div>

          {unlockError && <p className="mb-3 text-xs font-black uppercase tracking-widest text-red-500">{unlockError}</p>}

          <div className="grid grid-cols-3 gap-3">
            {pinKeys.map((k, idx) => {
              if (k === "") return <div key={idx} />;
              if (k === "⌫")
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPin((p) => p.slice(0, -1));
                      setUnlockError("");
                    }}
                    className="flex h-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 transition-all hover:bg-gray-200 active:scale-95"
                  >
                    <Delete size={20} />
                  </button>
                );
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePinPress(k)}
                  className="h-16 rounded-2xl bg-gray-100 text-xl font-black text-gray-900 transition-all hover:bg-gray-200 active:scale-95"
                >
                  {k}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen w-full overflow-hidden bg-[#F5F5F7]"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      <div className="dashboard-scope flex h-screen w-full">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="relative h-full flex-1 overflow-y-auto">
          <div className="mx-auto h-full max-w-7xl p-4 pb-20 md:p-8 md:pb-8">{children}</div>
        </main>
        <MobileBottomNav onMoreClick={() => setSidebarOpen(true)} />
      </div>

      {comparisonPanel && (
        <SalesComparisonPanel comparisonType={comparisonPanel} onClose={() => setComparisonPanel(null)} />
      )}
      <OrderNotificationListener />
      <GlobalOrderNotification />
    </div>
  );
}
