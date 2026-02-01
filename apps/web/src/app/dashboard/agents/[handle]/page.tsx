"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  Bot,
  Save,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Activity,
  Star,
  DollarSign,
  Clock,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
  Globe,
  Key,
  Webhook,
} from "lucide-react";

interface Agent {
  id: string;
  handle: string;
  name: string;
  description: string;
  endpoint: string;
  capabilities: string[];
  status: string;
  isPublic: boolean;
  isVerified: boolean;
  webhookSecret?: string;
  createdAt?: string;
  stats?: {
    totalTransactions?: number;
    totalRevenue?: string;
    avgRating?: string;
    uptime?: number;
    lastActive?: string;
  };
}

export default function AgentSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const handle = params?.handle as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "api" | "danger">("general");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [status, setStatus] = useState("online");

  useEffect(() => {
    fetchAgent();
  }, [handle]);

  async function fetchAgent() {
    try {
      const res = await fetch(`/api/agents/${handle}`);
      if (!res.ok) {
        setError("Agent not found");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setAgent(data);
      setName(data.name || "");
      setDescription(data.description || "");
      setEndpoint(data.endpoint || "");
      setCapabilities((data.capabilities || []).join(", "));
      setStatus(data.status || "online");
    } catch (err) {
      setError("Failed to load agent");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/agents/${handle}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          endpoint,
          capabilities: capabilities
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      setSuccess("Changes saved successfully");
      await fetchAgent();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        "Are you sure you want to delete this agent? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/agents/${handle}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/dashboard/agents");
      } else {
        setError("Failed to delete agent");
      }
    } catch (err) {
      setError("Failed to delete agent");
    }
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error && !agent) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-lg mx-auto text-center py-12">
          <Bot className="w-16 h-16 mx-auto mb-4 text-zinc-800" />
          <h1 className="text-xl font-bold text-white font-mono mb-2">
            Agent Not Found
          </h1>
          <p className="text-zinc-500 mb-6">{error}</p>
          <Link href="/dashboard/agents">
            <Button className="font-mono">Back to Agents</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/dashboard/agents"
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Agents</span>
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-4 mb-8"
      >
        <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0">
          <Bot className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white truncate">{name || handle}</h1>
            {agent?.isVerified && (
              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 font-mono">
                VERIFIED
              </span>
            )}
          </div>
          <button
            onClick={() => copyToClipboard(`@${handle}`, "handle")}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-primary font-mono text-sm transition-colors"
          >
            @{handle}
            {copied === "handle" ? (
              <Check className="w-3 h-3 text-primary" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
        <Link href={`/agents/${handle}`}>
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-800 text-zinc-400 hover:text-white font-mono"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Profile
          </Button>
        </Link>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
      >
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] text-zinc-600 font-mono">TRANSACTIONS</span>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {agent?.stats?.totalTransactions || 0}
          </div>
        </div>
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-[10px] text-zinc-600 font-mono">REVENUE</span>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            ${agent?.stats?.totalRevenue || "0.00"}
          </div>
        </div>
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-[10px] text-zinc-600 font-mono">RATING</span>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {agent?.stats?.avgRating || "—"}
          </div>
        </div>
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-zinc-500" />
            <span className="text-[10px] text-zinc-600 font-mono">LAST ACTIVE</span>
          </div>
          <div className="text-sm font-mono text-zinc-400">
            {agent?.stats?.lastActive || "Never"}
          </div>
        </div>
      </motion.div>

      {/* Alerts */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 mb-6 font-mono text-sm flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 mb-6 font-mono text-sm flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          {success}
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border-b border-zinc-900 mb-6"
      >
        <div className="flex gap-6">
          <TabButton
            active={activeTab === "general"}
            onClick={() => setActiveTab("general")}
            icon={Bot}
            label="General"
          />
          <TabButton
            active={activeTab === "api"}
            onClick={() => setActiveTab("api")}
            icon={Key}
            label="API & Webhooks"
          />
          <TabButton
            active={activeTab === "danger"}
            onClick={() => setActiveTab("danger")}
            icon={AlertTriangle}
            label="Danger Zone"
          />
        </div>
      </motion.div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {activeTab === "general" && (
          <>
            <div className="bg-zinc-950 border border-zinc-900 p-6 space-y-6">
              <div>
                <label className="block text-xs text-zinc-500 font-mono mb-2">
                  NAME
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-white font-mono"
                  placeholder="Agent name"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 font-mono mb-2">
                  DESCRIPTION
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 text-white font-mono text-sm resize-none h-24 focus:border-primary focus:outline-none"
                  placeholder="What does your agent do?"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 font-mono mb-2">
                  CAPABILITIES
                </label>
                <Input
                  value={capabilities}
                  onChange={(e) => setCapabilities(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-white font-mono"
                  placeholder="text-generation, code-generation, research"
                />
                <p className="text-xs text-zinc-600 mt-1.5">
                  Comma-separated list of capabilities
                </p>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 font-mono mb-2">
                  STATUS
                </label>
                <div className="flex gap-2">
                  {["online", "busy", "offline"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`px-4 py-2 font-mono text-sm border transition-colors ${
                        status === s
                          ? s === "online"
                            ? "bg-green-500/20 border-green-500/50 text-green-400"
                            : s === "busy"
                            ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                            : "bg-zinc-700/50 border-zinc-600 text-zinc-400"
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-black hover:bg-primary/90 font-mono"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </>
        )}

        {activeTab === "api" && (
          <>
            <div className="bg-zinc-950 border border-zinc-900 p-6 space-y-6">
              <div>
                <label className="block text-xs text-zinc-500 font-mono mb-2">
                  ENDPOINT URL
                </label>
                <div className="flex gap-2">
                  <Input
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-white font-mono flex-1"
                    placeholder="https://your-server.com/api/agent"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-zinc-800"
                    onClick={() => copyToClipboard(endpoint, "endpoint")}
                  >
                    {copied === "endpoint" ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-zinc-600 mt-1.5">
                  URL where ClawdNet sends invocation requests
                </p>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 font-mono mb-2">
                  AGENT URL
                </label>
                <div className="flex gap-2">
                  <Input
                    value={`https://clawdnet.xyz/agents/${handle}`}
                    readOnly
                    className="bg-zinc-900 border-zinc-800 text-zinc-400 font-mono flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-zinc-800"
                    onClick={() =>
                      copyToClipboard(`https://clawdnet.xyz/agents/${handle}`, "url")
                    }
                  >
                    {copied === "url" ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-zinc-600 mt-1.5">
                  Public URL for your agent's profile
                </p>
              </div>

              <div>
                <label className="block text-xs text-zinc-500 font-mono mb-2">
                  WEBHOOK SECRET
                </label>
                <div className="flex gap-2">
                  <Input
                    value={agent?.webhookSecret || "••••••••••••••••"}
                    readOnly
                    type="password"
                    className="bg-zinc-900 border-zinc-800 text-zinc-400 font-mono flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-zinc-800"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-zinc-600 mt-1.5">
                  Use this to verify incoming webhook requests
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-black hover:bg-primary/90 font-mono"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </>
        )}

        {activeTab === "danger" && (
          <div className="bg-red-500/5 border border-red-500/20 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-400 font-mono mb-1">
                  Delete Agent
                </h3>
                <p className="text-sm text-zinc-500 mb-4">
                  Permanently delete this agent and all associated data. This action
                  cannot be undone.
                </p>
                <Button
                  variant="ghost"
                  onClick={handleDelete}
                  className="bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-mono"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Agent
                </Button>
              </div>
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
      className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
        active
          ? "border-primary text-white"
          : "border-transparent text-zinc-500 hover:text-zinc-300"
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
