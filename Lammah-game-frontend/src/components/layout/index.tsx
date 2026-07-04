import { Header } from "./header";
import { ToastViewport } from "@/components/ui/toast";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <div className="container py-8 md:py-12">{children}</div>
      </main>
      <ToastViewport />
    </>
  );
}
