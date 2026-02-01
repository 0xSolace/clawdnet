'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, ArrowUpRight, Loader2, ExternalLink, Wallet, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StripeBalance {
  available: { amount: number; currency: string }[];
  pending: { amount: number; currency: string }[];
}

interface X402Balance {
  usdc: number;
  formatted: string;
}

interface X402Wallet {
  address: string;
  network: string;
  asset: string;
}

interface Transfer {
  from: string;
  to: string;
  amount: number;
  txHash: string;
  explorerUrl: string;
}

interface EarningsDisplayProps {
  agentHandle: string;
  showSetupButton?: boolean;
}

export default function EarningsDisplay({
  agentHandle,
  showSetupButton = true,
}: EarningsDisplayProps) {
  const [loading, setLoading] = useState(true);
  // Stripe state
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false);
  const [stripeBalance, setStripeBalance] = useState<StripeBalance | null>(null);
  const [stripeDashboardUrl, setStripeDashboardUrl] = useState<string | null>(null);
  // x402 state
  const [x402Enabled, setX402Enabled] = useState(false);
  const [x402Wallet, setX402Wallet] = useState<X402Wallet | null>(null);
  const [x402Balance, setX402Balance] = useState<X402Balance | null>(null);
  const [recentTransfers, setRecentTransfers] = useState<Transfer[]>([]);
  // UI state
  const [setupLoading, setSetupLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'crypto' | 'stripe'>('crypto');

  useEffect(() => {
    fetchEarnings();
  }, [agentHandle]);

  async function fetchEarnings() {
    setLoading(true);
    try {
      // Fetch both Stripe and x402 balances in parallel
      const [stripeRes, x402Res] = await Promise.all([
        fetch(`/api/payments/connect?agent=${agentHandle}`),
        fetch(`/api/payments/balance?agent=${agentHandle}&transfers=true`),
      ]);

      // Process Stripe response
      if (stripeRes.ok) {
        const stripeData = await stripeRes.json();
        setStripeConnected(stripeData.connected);
        setStripeOnboardingComplete(stripeData.onboardingComplete);
        setStripeBalance(stripeData.balance);
        setStripeDashboardUrl(stripeData.dashboardUrl);
      }

      // Process x402 response
      if (x402Res.ok) {
        const x402Data = await x402Res.json();
        setX402Enabled(x402Data.x402Enabled);
        setX402Wallet(x402Data.wallet);
        setX402Balance(x402Data.balance);
        setRecentTransfers(x402Data.transfers || []);
      }

      // Set default tab based on what's available
      if (x402Enabled) {
        setActiveTab('crypto');
      } else if (stripeConnected && stripeOnboardingComplete) {
        setActiveTab('stripe');
      }
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetupStripe() {
    setSetupLoading(true);
    try {
      const res = await fetch('/api/payments/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentHandle }),
      });

      const data = await res.json();

      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      }
    } catch (error) {
      console.error('Failed to start onboarding:', error);
    } finally {
      setSetupLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-zinc-950 border border-zinc-900">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  // Neither method connected
  const hasNoPayments = !x402Enabled && (!stripeConnected || !stripeOnboardingComplete);
  
  if (hasNoPayments) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-zinc-950 border border-zinc-900"
      >
        <div className="text-center py-4">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
          <h3 className="text-lg font-bold text-white font-mono mb-2">
            Set Up Payments
          </h3>
          <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
            Enable crypto or card payments to receive earnings from users.
          </p>
          {showSetupButton && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleSetupStripe}
                disabled={setupLoading}
                variant="outline"
                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
              >
                {setupLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Connect Stripe
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                onClick={() => window.location.href = `/dashboard/agents/${agentHandle}/settings`}
              >
                <Wallet className="w-4 h-4 mr-2" />
                Add Wallet (x402)
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Calculate totals
  const stripeAvailable = stripeBalance?.available.find(b => b.currency === 'usd')?.amount || 0;
  const stripePending = stripeBalance?.pending.find(b => b.currency === 'usd')?.amount || 0;
  const cryptoBalance = x402Balance?.usdc || 0;
  const totalBalance = stripeAvailable + stripePending + cryptoBalance;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-950 border border-zinc-900"
    >
      {/* Header with tabs */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-400" />
          EARNINGS
        </h3>
        
        {/* Tab buttons */}
        {(x402Enabled || (stripeConnected && stripeOnboardingComplete)) && (
          <div className="flex gap-1 bg-zinc-900 p-0.5 rounded">
            {x402Enabled && (
              <button
                onClick={() => setActiveTab('crypto')}
                className={`px-3 py-1 text-xs font-mono transition-colors rounded ${
                  activeTab === 'crypto'
                    ? 'bg-blue-500 text-white'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                Crypto
              </button>
            )}
            {stripeConnected && stripeOnboardingComplete && (
              <button
                onClick={() => setActiveTab('stripe')}
                className={`px-3 py-1 text-xs font-mono transition-colors rounded ${
                  activeTab === 'stripe'
                    ? 'bg-purple-500 text-white'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                Stripe
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Crypto Tab */}
        {activeTab === 'crypto' && x402Enabled && (
          <div className="space-y-4">
            {/* Balance */}
            <div className="p-4 bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-zinc-500 font-mono">USDC BALANCE</div>
                {x402Wallet && (
                  <a
                    href={`https://basescan.org/address/${x402Wallet.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  >
                    {x402Wallet.address.slice(0, 6)}...{x402Wallet.address.slice(-4)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="text-3xl font-bold font-mono text-blue-400">
                ${cryptoBalance.toFixed(2)}
              </div>
              <div className="text-[10px] text-zinc-600 font-mono mt-1">
                Base Network • USDC
              </div>
            </div>

            {/* Recent Transfers */}
            {recentTransfers.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 font-mono mb-2">RECENT TRANSFERS</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recentTransfers.slice(0, 5).map((tx) => (
                    <a
                      key={tx.txHash}
                      href={tx.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-zinc-400 font-mono">
                          {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-green-400">
                        +${tx.amount.toFixed(2)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stripe Tab */}
        {activeTab === 'stripe' && stripeConnected && stripeOnboardingComplete && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Available */}
              <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                <div className="text-xs text-zinc-500 font-mono mb-1">AVAILABLE</div>
                <div className="text-2xl font-bold font-mono text-green-400">
                  ${stripeAvailable.toFixed(2)}
                </div>
                <div className="text-[10px] text-zinc-600 font-mono mt-1">
                  Ready to withdraw
                </div>
              </div>

              {/* Pending */}
              <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                <div className="text-xs text-zinc-500 font-mono mb-1">PENDING</div>
                <div className="text-2xl font-bold font-mono text-yellow-400">
                  ${stripePending.toFixed(2)}
                </div>
                <div className="text-[10px] text-zinc-600 font-mono mt-1">
                  Processing
                </div>
              </div>
            </div>

            {stripeDashboardUrl && (
              <a
                href={stripeDashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-2 text-sm text-purple-400 hover:text-purple-300 font-mono border border-purple-500/30 hover:bg-purple-500/10 transition-colors"
              >
                Open Stripe Dashboard →
              </a>
            )}
          </div>
        )}

        {/* Total Balance */}
        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-zinc-500 font-mono">TOTAL BALANCE</div>
          <div className="text-lg font-bold font-mono text-white flex items-center gap-2">
            ${totalBalance.toFixed(2)}
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
