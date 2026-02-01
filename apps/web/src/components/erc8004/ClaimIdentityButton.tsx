'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { base, baseSepolia } from 'viem/chains';
import { IDENTITY_REGISTRY_ABI, REGISTRY_ADDRESSES, formatAgentRegistry } from '@/lib/erc8004-onchain';

interface ClaimIdentityButtonProps {
  agentHandle: string;
  hasOnChainIdentity: boolean;
  existingTokenId?: number | null;
  existingRegistry?: string | null;
  onSuccess?: (tokenId: number, registry: string, txHash: string) => void;
  className?: string;
}

type ClaimStatus = 'idle' | 'checking' | 'ready' | 'signing' | 'pending' | 'success' | 'error';

export function ClaimIdentityButton({
  agentHandle,
  hasOnChainIdentity,
  existingTokenId,
  existingRegistry,
  onSuccess,
  className = '',
}: ClaimIdentityButtonProps) {
  const { address, isConnected, chain } = useAccount();
  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [claimInfo, setClaimInfo] = useState<{
    domain: string;
    chainId: number;
  } | null>(null);

  const { writeContract, data: txHash, isPending: isWritePending } = useWriteContract();
  
  const { isLoading: isTxPending, isSuccess: isTxSuccess, data: txReceipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Determine which chain to use
  const targetChainId = chain?.id === base.id ? base.id : baseSepolia.id;
  const registryAddress = REGISTRY_ADDRESSES[targetChainId]?.identity;

  const handleCheckStatus = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setStatus('checking');
    setError(null);

    try {
      const res = await fetch(`/api/agents/${agentHandle}/claim-identity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          chainId: targetChainId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to check status');
      }

      if (data.status === 'registry_not_deployed') {
        setError('ERC-8004 registry not yet deployed. Try Base Sepolia testnet.');
        setStatus('error');
        return;
      }

      if (data.status === 'ready_to_claim') {
        setClaimInfo({
          domain: data.domain,
          chainId: data.chainId,
        });
        setStatus('ready');
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleClaim = async () => {
    if (!claimInfo || !registryAddress || !address) {
      setError('Missing claim information');
      return;
    }

    setStatus('signing');
    setError(null);

    try {
      writeContract({
        address: registryAddress,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: 'newAgent',
        args: [claimInfo.domain, address],
        chainId: claimInfo.chainId as 1 | 8453 | 84532,
      });
      
      setStatus('pending');
    } catch (err: any) {
      console.error('Contract write error:', err);
      setError(err.message || 'Failed to submit transaction');
      setStatus('error');
    }
  };

  // Handle transaction success
  if (isTxSuccess && txHash && status === 'pending') {
    setStatus('success');
    
    // Call API to link the identity
    (async () => {
      try {
        const linkRes = await fetch(`/api/agents/${agentHandle}/claim-identity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: address,
            chainId: claimInfo?.chainId,
            txHash: txHash,
            tokenId: 1, // Will be parsed from event logs by API
          }),
        });
        
        if (linkRes.ok) {
          const linkData = await linkRes.json();
          onSuccess?.(linkData.tokenId, linkData.registry, txHash);
        }
      } catch (err) {
        console.error('Failed to link identity:', err);
      }
    })();
  }

  // Already has identity
  if (hasOnChainIdentity) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-md bg-green-500/10 border border-green-500/30 ${className}`}>
        <CheckCircle className="w-4 h-4 text-green-400" />
        <span className="font-mono text-sm text-green-400">
          On-Chain Identity Claimed
        </span>
        {existingTokenId && (
          <span className="font-mono text-xs text-zinc-500">
            #{existingTokenId}
          </span>
        )}
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <Button
        variant="outline"
        className={`font-mono border-blue-500/30 text-blue-400 hover:bg-blue-500/10 ${className}`}
        disabled
      >
        <Shield className="w-4 h-4 mr-2" />
        Connect Wallet to Claim
      </Button>
    );
  }

  // Registry not deployed
  if (!registryAddress) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 ${className}`}>
        <AlertCircle className="w-4 h-4 text-yellow-400" />
        <span className="font-mono text-sm text-yellow-400">
          Registry not deployed on {chain?.name || 'this network'}
        </span>
      </div>
    );
  }

  // Render based on status
  return (
    <div className={`space-y-2 ${className}`}>
      {status === 'idle' && (
        <Button
          onClick={handleCheckStatus}
          className="font-mono bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          <Shield className="w-4 h-4 mr-2" />
          Claim On-Chain Identity
        </Button>
      )}

      {status === 'checking' && (
        <Button disabled className="font-mono">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Checking status...
        </Button>
      )}

      {status === 'ready' && claimInfo && (
        <div className="space-y-3">
          <div className="p-4 rounded-md bg-zinc-900 border border-zinc-800">
            <div className="text-xs font-mono text-zinc-500 mb-1">DOMAIN</div>
            <div className="font-mono text-sm text-white">{claimInfo.domain}</div>
            <div className="text-xs font-mono text-zinc-500 mt-3 mb-1">CHAIN</div>
            <div className="font-mono text-sm text-white">
              {claimInfo.chainId === base.id ? 'Base' : 'Base Sepolia'}
            </div>
          </div>
          <Button
            onClick={handleClaim}
            className="w-full font-mono bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            <Shield className="w-4 h-4 mr-2" />
            Sign & Claim Identity
          </Button>
        </div>
      )}

      {(status === 'signing' || status === 'pending' || isWritePending || isTxPending) && (
        <Button disabled className="font-mono">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {isWritePending ? 'Sign in wallet...' : 'Transaction pending...'}
        </Button>
      )}

      {status === 'success' && txHash && (
        <div className="p-4 rounded-md bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="font-mono text-sm text-green-400">Identity Claimed!</span>
          </div>
          <a
            href={`https://${targetChainId === base.id ? '' : 'sepolia.'}basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-blue-400 hover:underline flex items-center gap-1"
          >
            View transaction <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {error && status === 'error' && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="font-mono text-xs text-red-400">{error}</span>
          </div>
          <Button
            onClick={() => setStatus('idle')}
            variant="ghost"
            size="sm"
            className="mt-2 text-xs"
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
