'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2, Check, LogOut } from 'lucide-react';

interface ConnectWalletProps {
  onSuccess?: (user: any) => void;
  className?: string;
}

export function ConnectWallet({ onSuccess, className }: ConnectWalletProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConnectors, setShowConnectors] = useState(false);

  async function handleAuth() {
    if (!address) return;
    
    setIsAuthenticating(true);
    setError(null);

    try {
      // 1. Get challenge
      const challengeRes = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      
      if (!challengeRes.ok) {
        throw new Error('Failed to get challenge');
      }
      
      const { message } = await challengeRes.json();

      // 2. Sign message
      const signature = await signMessageAsync({ message });

      // 3. Verify and create session
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || 'Verification failed');
      }

      const { user } = await verifyRes.json();
      onSuccess?.(user);
      
      // Redirect to dashboard
      window.location.href = '/dashboard';

    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  }

  if (isConnected && address) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <Button
            size="sm"
            onClick={handleAuth}
            disabled={isAuthenticating}
            className="font-mono bg-primary text-black hover:bg-primary/90"
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Sign In
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => disconnect()}
            className="text-zinc-500 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-2">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {showConnectors ? (
        <div className="flex flex-col gap-2">
          {connectors.map((connector) => (
            <Button
              key={connector.uid}
              size="sm"
              variant="outline"
              onClick={() => {
                connect({ connector });
                setShowConnectors(false);
              }}
              disabled={isConnecting}
              className="font-mono border-zinc-800 hover:border-primary hover:text-primary justify-start"
            >
              {connector.name}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowConnectors(false)}
            className="text-zinc-500"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={() => setShowConnectors(true)}
          disabled={isConnecting}
          className="font-mono bg-primary text-black hover:bg-primary/90"
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Wallet className="w-4 h-4 mr-2" />
          )}
          Connect Wallet
        </Button>
      )}
    </div>
  );
}
