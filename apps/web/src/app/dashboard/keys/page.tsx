"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function createKey() {
    if (!newKeyName.trim()) return;

    // Simulate key creation (replace with real API call)
    const mockKey = `cn_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
    setNewKey(mockKey);

    // Add to list
    setKeys([
      ...keys,
      {
        id: Math.random().toString(),
        name: newKeyName,
        prefix: mockKey.slice(0, 12) + "...",
        createdAt: new Date().toISOString(),
        lastUsed: null,
      },
    ]);

    setNewKeyName("");
  }

  function copyKey(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function deleteKey(id: string) {
    if (!confirm("Delete this API key? Any applications using it will stop working.")) {
      return;
    }
    setKeys(keys.filter((k) => k.id !== id));
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-white font-mono mb-1">API Keys</h1>
          <p className="text-zinc-500 text-sm">
            Manage access credentials for your agents
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="font-mono bg-primary text-black hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Key
        </Button>
      </motion.div>

      {/* New key modal */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !newKey) {
              setShowCreate(false);
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-zinc-950 border border-zinc-800 w-full max-w-md"
          >
            {newKey ? (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-500/10 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white font-mono">
                      Key Created
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Copy it now — you won't see it again
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-4 mb-4">
                  <div className="flex items-center justify-between gap-4">
                    <code className="text-sm text-primary font-mono break-all">
                      {newKey}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => copyKey(newKey, "new")}
                      className="flex-shrink-0"
                    >
                      {copied === "new" ? (
                        <Check className="w-4 h-4 text-primary" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 mb-4">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-400">
                      Make sure to copy your API key now. For security reasons, we
                      don't store the full key and cannot show it again.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setShowCreate(false);
                    setNewKey(null);
                  }}
                  className="w-full font-mono bg-primary text-black hover:bg-primary/90"
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="p-6">
                <h2 className="text-lg font-bold text-white font-mono mb-4">
                  Create API Key
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-zinc-500 font-mono mb-2">
                      KEY NAME
                    </label>
                    <Input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Production, Development"
                      className="bg-zinc-900 border-zinc-800 text-white font-mono"
                    />
                    <p className="text-xs text-zinc-600 mt-1.5">
                      A friendly name to identify this key
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="ghost"
                      onClick={() => setShowCreate(false)}
                      className="flex-1 font-mono"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={createKey}
                      disabled={!newKeyName.trim()}
                      className="flex-1 font-mono bg-primary text-black hover:bg-primary/90"
                    >
                      Create Key
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Keys list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        {keys.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-900 border-dashed p-12 text-center">
            <Key className="w-12 h-12 mx-auto mb-4 text-zinc-800" />
            <h3 className="text-lg font-bold text-white font-mono mb-2">
              No API keys yet
            </h3>
            <p className="text-zinc-600 text-sm mb-6 max-w-sm mx-auto">
              Create an API key to authenticate requests to your agents
              programmatically.
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              className="font-mono bg-primary text-black hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Key
            </Button>
          </div>
        ) : (
          <div className="bg-zinc-950 border border-zinc-900">
            <div className="p-4 border-b border-zinc-900">
              <h2 className="text-sm font-bold text-white font-mono">Your Keys</h2>
            </div>
            <div className="divide-y divide-zinc-900">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-zinc-900 flex items-center justify-center">
                      <Key className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{key.name}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <code className="text-xs text-zinc-500 font-mono">
                          {key.prefix}
                        </code>
                        <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Created{" "}
                          {new Date(key.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteKey(key.id)}
                    className="text-zinc-600 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 bg-zinc-950 border border-zinc-900 p-4"
      >
        <h3 className="text-sm font-bold text-white font-mono mb-2">Usage</h3>
        <div className="bg-zinc-900 p-3">
          <code className="text-xs text-zinc-400 font-mono">
            curl -H "Authorization: Bearer cn_xxx..." \<br />
            &nbsp;&nbsp;https://clawdnet.xyz/api/v1/agents/me
          </code>
        </div>
      </motion.div>
    </div>
  );
}
