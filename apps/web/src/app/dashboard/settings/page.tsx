"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings,
  User,
  Bell,
  Shield,
  Wallet,
  Save,
  Check,
  Copy,
  ExternalLink,
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "wallet">("profile");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Placeholder user data
  const [user, setUser] = useState({
    address: "0x1234...5678",
    fullAddress: "0x1234567890abcdef1234567890abcdef12345678",
    name: "",
    email: "",
    website: "",
    twitter: "",
  });

  function copyAddress() {
    navigator.clipboard.writeText(user.fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-white font-mono mb-1">Settings</h1>
        <p className="text-zinc-500 text-sm">
          Manage your account preferences
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-2 mb-6"
      >
        <TabButton
          active={activeTab === "profile"}
          onClick={() => setActiveTab("profile")}
          icon={User}
          label="Profile"
        />
        <TabButton
          active={activeTab === "notifications"}
          onClick={() => setActiveTab("notifications")}
          icon={Bell}
          label="Notifications"
        />
        <TabButton
          active={activeTab === "wallet"}
          onClick={() => setActiveTab("wallet")}
          icon={Wallet}
          label="Wallet"
        />
      </motion.div>

      {/* Success message */}
      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 mb-6 font-mono text-sm flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Settings saved successfully
        </motion.div>
      )}

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="bg-zinc-950 border border-zinc-900 p-6 space-y-6">
              <div>
                <label className="block text-xs text-zinc-500 font-mono mb-2">
                  DISPLAY NAME
                </label>
                <Input
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  placeholder="Anonymous"
                  className="bg-zinc-900 border-zinc-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 font-mono mb-2">
                  EMAIL (Optional)
                </label>
                <Input
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  placeholder="your@email.com"
                  className="bg-zinc-900 border-zinc-800 text-white font-mono"
                />
                <p className="text-xs text-zinc-600 mt-1.5">
                  Used for important notifications only
                </p>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 font-mono mb-2">
                  WEBSITE
                </label>
                <Input
                  value={user.website}
                  onChange={(e) => setUser({ ...user, website: e.target.value })}
                  placeholder="https://your-website.com"
                  className="bg-zinc-900 border-zinc-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 font-mono mb-2">
                  TWITTER / X
                </label>
                <div className="flex">
                  <span className="bg-zinc-900 border border-zinc-800 border-r-0 px-3 flex items-center text-zinc-500 font-mono text-sm">
                    @
                  </span>
                  <Input
                    value={user.twitter}
                    onChange={(e) => setUser({ ...user, twitter: e.target.value })}
                    placeholder="username"
                    className="bg-zinc-900 border-zinc-800 text-white font-mono flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                className="bg-primary text-black hover:bg-primary/90 font-mono"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="bg-zinc-950 border border-zinc-900 p-6 space-y-6">
            <NotificationToggle
              title="New transactions"
              description="Get notified when your agents receive payments"
              defaultChecked={true}
            />
            <NotificationToggle
              title="Agent status changes"
              description="Alerts when agents go offline or have errors"
              defaultChecked={true}
            />
            <NotificationToggle
              title="Weekly digest"
              description="Summary of your agent performance"
              defaultChecked={false}
            />
            <NotificationToggle
              title="Marketing emails"
              description="Product updates and announcements"
              defaultChecked={false}
            />
          </div>
        )}

        {activeTab === "wallet" && (
          <div className="space-y-6">
            <div className="bg-zinc-950 border border-zinc-900 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-zinc-900 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-zinc-500 font-mono mb-1">
                    Connected Wallet
                  </div>
                  <button
                    onClick={copyAddress}
                    className="flex items-center gap-2 text-white font-mono hover:text-primary transition-colors"
                  >
                    {user.address}
                    {copied ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900 p-4">
                  <div className="text-xs text-zinc-600 font-mono mb-1">BALANCE</div>
                  <div className="text-xl font-bold text-white font-mono">
                    0.00 ETH
                  </div>
                </div>
                <div className="bg-zinc-900 p-4">
                  <div className="text-xs text-zinc-600 font-mono mb-1">USDC</div>
                  <div className="text-xl font-bold text-white font-mono">
                    $0.00
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-6">
              <h3 className="text-sm font-bold text-white font-mono mb-4">
                Payment Settings
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
                All payments are processed directly to your connected wallet via the
                X402 protocol. No setup required.
              </p>
              <a
                href="https://x402.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-mono"
              >
                Learn about X402
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-mono border transition-colors ${
        active
          ? "bg-primary/10 border-primary text-primary"
          : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function NotificationToggle({
  title,
  description,
  defaultChecked,
}: {
  title: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-xs text-zinc-600">{description}</div>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={`w-10 h-6 flex items-center px-1 transition-colors ${
          checked ? "bg-primary" : "bg-zinc-800"
        }`}
      >
        <div
          className={`w-4 h-4 bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
