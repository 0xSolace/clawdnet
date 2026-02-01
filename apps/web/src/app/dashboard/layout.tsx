"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ConnectWallet } from "@/components/connect-wallet";
import QuickSearch from "@/components/dashboard/QuickSearch";
import {
  LayoutDashboard,
  Bot,
  Key,
  BarChart3,
  Settings,
  LogOut,
  Wallet,
  Menu,
  X,
  ChevronRight,
  Zap,
  DollarSign,
} from "lucide-react";

interface User {
  id: string;
  handle: string;
  name?: string;
  avatarUrl?: string;
  address?: string;
}

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "My Agents", href: "/dashboard/agents", icon: Bot },
  { name: "Earnings", href: "/dashboard/earnings", icon: DollarSign },
  { name: "API Keys", href: "/dashboard/keys", icon: Key },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setAuthError(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (!data.authenticated) {
        setAuthError(true);
        setLoading(false);
        return;
      }
      setUser(data.user);
    } catch (error) {
      console.error("Auth check failed:", error);
      setAuthError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-zinc-500 font-mono text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (authError || !user) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-lg mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Wallet className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3 font-mono">
              Connect to Continue
            </h1>
            <p className="text-zinc-500 mb-8 text-sm">
              Connect your wallet to access the dashboard, manage agents, and track earnings.
            </p>
            <div className="flex flex-col gap-4 items-center">
              <ConnectWallet className="flex flex-col items-center" />
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-mono text-zinc-500 hover:text-white"
                >
                  ← Back Home
                </Button>
              </Link>
            </div>
            <div className="mt-8 pt-6 border-t border-zinc-900">
              <p className="text-xs text-zinc-600 font-mono">
                Supported: MetaMask • Coinbase • WalletConnect
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-zinc-900 transform transition-transform lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-900">
            <Link href="/" className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <span className="font-mono font-bold text-white text-sm">CLAWDNET</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary border-l-2 border-primary -ml-px"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-zinc-900">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-zinc-800 flex items-center justify-center text-primary font-mono text-sm font-bold">
                {user.address?.slice(2, 4).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.name || user.handle || "Anon"}
                </p>
                <p className="text-xs text-zinc-500 font-mono truncate">
                  {user.address
                    ? `${user.address.slice(0, 6)}...${user.address.slice(-4)}`
                    : user.handle}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-zinc-500 hover:text-white hover:bg-zinc-900 font-mono text-xs"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-zinc-900 bg-black/50 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-zinc-500 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <Link href="/dashboard" className="text-zinc-500 hover:text-white font-mono">
                Dashboard
              </Link>
              {pathname !== "/dashboard" && (
                <>
                  <ChevronRight className="w-4 h-4 text-zinc-700" />
                  <span className="text-zinc-300 font-mono">
                    {pathname?.split("/").pop()?.charAt(0).toUpperCase() +
                      (pathname?.split("/").pop()?.slice(1) || "")}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <QuickSearch />
            <Link href="/agents" className="hidden sm:block">
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-500 hover:text-white font-mono text-xs"
              >
                Explore
              </Button>
            </Link>
            <Link href="/docs" className="hidden sm:block">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-800 text-zinc-400 hover:text-white font-mono text-xs"
              >
                Docs
              </Button>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
