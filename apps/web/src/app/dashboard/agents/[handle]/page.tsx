"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Bot, 
  Save, 
  Trash2, 
  ExternalLink,
  Copy,
  Check,
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
}

export default function AgentSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const handle = params?.handle as string;
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [status, setStatus] = useState("online");
  const [isPublic, setIsPublic] = useState(true);

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
      setIsPublic(data.isPublic !== false);
    } catch (err) {
      setError("Failed to load agent");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/agents/${handle}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          endpoint,
          capabilities: capabilities.split(",").map(c => c.trim()).filter(Boolean),
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      // Refresh agent data
      await fetchAgent();
    } catch (err) {
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this agent? This cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/agents/${handle}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        setError("Failed to delete agent");
      }
    } catch (err) {
      setError("Failed to delete agent");
    }
  }

  function copyHandle() {
    navigator.clipboard.writeText(`@${handle}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-primary font-mono animate-pulse">Loading...</div>
      </main>
    );
  }

  if (error && !agent) {
    return (
      <main className="min-h-screen bg-black">
        <div className="max-w-2xl mx-auto px-6 py-20">
          <div className="text-center">
            <Bot className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
            <h1 className="text-2xl font-bold text-white mb-2">Agent Not Found</h1>
            <p className="text-zinc-500 mb-6">{error}</p>
            <Link href="/dashboard">
              <Button className="font-mono">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-900 bg-black/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-500 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-mono text-sm">Dashboard</span>
          </Link>
          <Link href={`/agents/${handle}`} className="flex items-center gap-2 text-zinc-500 hover:text-white">
            <span className="font-mono text-sm">View Profile</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-zinc-900 rounded-lg flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{name || handle}</h1>
              <button
                onClick={copyHandle}
                className="flex items-center gap-2 text-zinc-500 hover:text-primary font-mono text-sm"
              >
                @{handle}
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 font-mono text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs text-zinc-500 font-mono mb-2">NAME</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white font-mono"
                placeholder="Agent name"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-500 font-mono mb-2">DESCRIPTION</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white font-mono text-sm resize-none h-24"
                placeholder="What does your agent do?"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-500 font-mono mb-2">ENDPOINT</label>
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white font-mono"
                placeholder="https://your-server.com/api/agent"
              />
              <p className="text-xs text-zinc-600 mt-1">
                URL where your agent receives invocation requests
              </p>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 font-mono mb-2">CAPABILITIES</label>
              <Input
                value={capabilities}
                onChange={(e) => setCapabilities(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white font-mono"
                placeholder="text-generation, code-generation, research"
              />
              <p className="text-xs text-zinc-600 mt-1">
                Comma-separated list of capabilities
              </p>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 font-mono mb-2">STATUS</label>
              <div className="flex gap-2">
                {["online", "busy", "offline"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`px-4 py-2 rounded-lg font-mono text-sm border transition-colors ${
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

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
              <Button
                variant="ghost"
                onClick={handleDelete}
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10 font-mono"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Agent
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-black hover:bg-primary/90 font-mono"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
