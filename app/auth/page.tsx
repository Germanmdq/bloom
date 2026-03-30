import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthPageClient } from "./AuthPageClient";

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
          <Loader2 className="h-10 w-10 animate-spin text-[#2d4a3e]" aria-hidden />
        </div>
      }
    >
      <AuthPageClient />
    </Suspense>
  );
}
