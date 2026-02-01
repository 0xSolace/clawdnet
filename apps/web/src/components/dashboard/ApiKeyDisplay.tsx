'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface ApiKeyDisplayProps {
  apiKey?: string;
  keyPrefix?: string;
  onRegenerate?: () => Promise<string | void>;
  className?: string;
}

export default function ApiKeyDisplay({
  apiKey,
  keyPrefix = 'cn_',
  onRegenerate,
  className = '',
}: ApiKeyDisplayProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const displayKey = newKey || apiKey;
  const maskedKey = displayKey
    ? `${keyPrefix}${'•'.repeat(20)}...${displayKey.slice(-4)}`
    : 'No API key generated';

  async function handleCopy() {
    if (!displayKey) return;
    await navigator.clipboard.writeText(displayKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerate() {
    if (!onRegenerate) return;
    setRegenerating(true);
    try {
      const key = await onRegenerate();
      if (key) {
        setNewKey(key);
        setVisible(true);
      }
    } finally {
      setRegenerating(false);
      setShowConfirm(false);
    }
  }

  return (
    <div className={`bg-zinc-950 border border-zinc-900 ${className}`}>
      <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-primary" />
          <span className="text-sm font-mono text-white">API Key</span>
        </div>
        <span className="text-[10px] text-zinc-600 font-mono">
          For programmatic access
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Key display */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-zinc-900 border border-zinc-800 px-4 py-3 font-mono text-sm overflow-hidden">
            {visible && displayKey ? (
              <span className="text-primary break-all">{displayKey}</span>
            ) : (
              <span className="text-zinc-500">{maskedKey}</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setVisible(!visible)}
              className="text-zinc-500 hover:text-white"
              title={visible ? 'Hide' : 'Show'}
              disabled={!displayKey}
            >
              {visible ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCopy}
              className="text-zinc-500 hover:text-white"
              title="Copy"
              disabled={!displayKey}
            >
              {copied ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* New key warning */}
        <AnimatePresence>
          {newKey && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-yellow-500/10 border border-yellow-500/30 p-3"
            >
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-yellow-400 font-medium">
                    Copy your new API key now!
                  </p>
                  <p className="text-[10px] text-yellow-400/70 mt-0.5">
                    For security, we won't show it again after you leave this page.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Regenerate section */}
        {onRegenerate && (
          <div className="pt-2 border-t border-zinc-900">
            <AnimatePresence mode="wait">
              {showConfirm ? (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between gap-4"
                >
                  <p className="text-xs text-zinc-500">
                    This will invalidate your current key. Continue?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowConfirm(false)}
                      className="font-mono text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleRegenerate}
                      disabled={regenerating}
                      className="bg-red-500/20 text-red-400 hover:bg-red-500/30 font-mono text-xs"
                    >
                      {regenerating ? (
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      ) : null}
                      Confirm
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirm(true)}
                    className="text-zinc-500 hover:text-white font-mono text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Regenerate Key
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
