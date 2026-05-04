import { Link, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Package,
  CreditCard,
  BarChart3,
  LogOut,
  Menu,
  X,
  Scissors,
  Settings,
  ArrowDownToLine,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { cn } from "@/lib/utils";

const sidebarLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/tailors", label: "Tailor Approvals", icon: ShieldCheck },
  { to: "/admin/orders", label: "Orders", icon: Package },
  { to: "/admin/shipments", label: "Shipments", icon: Truck },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const AdminLayout = () => {
  const { signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) =>
    path === "/admin/dashboard"
      ? location.pathname === path
      : location.pathname.startsWith(path) && path !== "/admin/dashboard";

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-primary transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <div className="h-9 w-9 rounded-xl accent-gradient flex items-center justify-center">
            <Scissors className="h-5 w-5 text-accent-foreground" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-white">ZyloFit</span>
          <span className="ml-auto text-xs font-medium text-red-300 bg-red-500/20 px-2 py-0.5 rounded-md">
            Admin
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {sidebarLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setSidebarOpen(false)}>
              <button
                className={cn(
                  "sidebar-nav-item w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium",
                  isActive(to)
                    ? "active bg-accent text-white shadow-md"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-primary/20 bg-background/95 backdrop-blur-md px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <h1 className="text-lg font-bold text-foreground">
            {sidebarLinks.find(l => isActive(l.to))?.label ?? "Admin Panel"}
          </h1>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
