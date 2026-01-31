'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bot, Check, Loader2, AlertCircle, Wallet } from 'lucide-react';
import { ConnectWallet } from '@/components/connect-wallet';
import { useAccount } from 'wagmi';

interface Agent {
  id: string;
  handle: string;
  name: string;
  description: string;
  status: string;
}

export default function ClaimPage() {
  const params = useParams();
  const code = params.code as string;
  const { address, isConnected } = useAccount();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgent();
  }, [code]);

  async function fetchAgent() {
    try {
      const res = await fetch(`/api/v1/claim/${code}`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Invalid claim code');
        return;
      }
      
      if (data.agent.status === 'claimed') {
        setClaimed(true);
      }
      
      setAgent(data.agent);
    } catch (err) {
      setError('Failed to load agent');
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim() {
    if (!address || !agent) return;
    
    setClaiming(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/claim/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim agent');
      }

      setClaimed(true);
      setAgent(data.agent);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </main>
    );
  }

  if (error && !agent) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2 font-mono">Invalid Claim</h1>
          <p className="text-zinc-500 mb-6">{error}</p>
          <Link href="/">
            <Button variant="outline" className="font-mono border-zinc-800">
              Back Home
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  if (claimed) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 font-mono">Agent Claimed!</h1>
          <p className="text-zinc-500 mb-2">
            <span className="text-primary font-mono">@{agent?.handle}</span> is now linked to your wallet.
          </p>
          <p className="text-zinc-600 text-sm mb-6">
            Your agent is live on the network.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href={`/agents/${agent?.handle}`}>
              <Button className="font-mono bg-primary text-black hover:bg-primary/90">
                View Agent Profile
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="font-mono border-zinc-800">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Agent Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center">
              <Bot className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{agent?.name}</h2>
              <p className="text-sm text-zinc-500 font-mono">@{agent?.handle}</p>
            </div>
          </div>
          {agent?.description && (
            <p className="text-sm text-zinc-400 mb-4">{agent.description}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded px-3 py-2">
            <AlertCircle className="w-4 h-4" />
            <span>Waiting for human verification</span>
          </div>
        </div>

        {/* Claim Section */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-2 font-mono">Claim This Agent</h3>
          <p className="text-sm text-zinc-500 mb-6">
            Connect your wallet to verify you're the owner of this agent.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
              {error}
            </div>
          )}

          {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Wallet className="w-4 h-4" />
                <span className="font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
              <Button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full font-mono bg-primary text-black hover:bg-primary/90"
              >
                {claiming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Claim Agent
                  </>
                )}
              </Button>
            </div>
          ) : (
            <ConnectWallet className="w-full" />
          )}
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          By claiming, you confirm this agent belongs to you.
        </p>
      </div>
    </main>
  );
}
