'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Shield, Loader2 } from 'lucide-react';

interface OnChainIdentityBadgeProps {
  handle: string;
  tokenId?: number | null;
  registry?: string | null;
  domain?: string | null;
  compact?: boolean;
  className?: string;
}

export function OnChainIdentityBadge({
  handle,
  tokenId,
  registry,
  domain,
  compact = false,
  className = '',
}: OnChainIdentityBadgeProps) {
  const [onChainInfo, setOnChainInfo] = useState<{
    hasIdentity: boolean;
    tokenId: number | null;
    registry: string | null;
    domain: string | null;
    chainId: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(!tokenId && !registry);

  useEffect(() => {
    // Use provided props if available
    if (tokenId || registry) {
      setOnChainInfo({
        hasIdentity: !!(tokenId && registry),
        tokenId: tokenId || null,
        registry: registry || null,
        domain: domain || null,
        chainId: registry ? parseChainId(registry) : null,
      });
      setLoading(false);
      return;
    }

    // Otherwise fetch from API
    const fetchInfo = async () => {
      try {
        const res = await fetch(`/api/agents/${handle}/on-chain`);
        if (res.ok) {
          const data = await res.json();
          setOnChainInfo({
            hasIdentity: data.hasOnChainIdentity,
            tokenId: data.identity?.tokenId,
            registry: data.identity?.registry,
            domain: data.identity?.domain,
            chainId: data.chainId,
          });
        }
      } catch (error) {
        console.error('Error fetching on-chain info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [handle, tokenId, registry, domain]);

  if (loading) {
    return (
      <Badge variant="outline" className={`font-mono text-xs ${className}`}>
        <Loader2 className="w-3 h-3 animate-spin mr-1" />
        Loading...
      </Badge>
    );
  }

  if (!onChainInfo?.hasIdentity) {
    return null;
  }

  const explorerUrl = getExplorerUrl(onChainInfo.chainId, onChainInfo.registry);

  if (compact) {
    return (
      <Badge 
        variant="outline" 
        className={`font-mono text-xs bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 cursor-pointer ${className}`}
        title={`ERC-8004 ID: #${onChainInfo.tokenId}`}
        onClick={() => explorerUrl && window.open(explorerUrl, '_blank')}
      >
        <Shield className="w-3 h-3 mr-1" />
        8004
      </Badge>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 ${className}`}
    >
      <Shield className="w-4 h-4 text-blue-400" />
      <div className="flex flex-col">
        <span className="font-mono text-xs text-blue-400">
          ERC-8004 #{onChainInfo.tokenId}
        </span>
        {onChainInfo.domain && (
          <span className="font-mono text-[10px] text-zinc-500">
            {onChainInfo.domain}
          </span>
        )}
      </div>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 hover:text-blue-400 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </motion.div>
  );
}

// Helper functions
function parseChainId(registry: string): number | null {
  const parts = registry.split(':');
  if (parts.length !== 3) return null;
  return parseInt(parts[1]) || null;
}

function getExplorerUrl(chainId: number | null, registry: string | null): string | null {
  if (!chainId || !registry) return null;
  
  const parts = registry.split(':');
  if (parts.length !== 3) return null;
  const contractAddress = parts[2];
  
  // Base and Base Sepolia explorers
  if (chainId === 8453) {
    return `https://basescan.org/address/${contractAddress}`;
  }
  if (chainId === 84532) {
    return `https://sepolia.basescan.org/address/${contractAddress}`;
  }
  if (chainId === 1) {
    return `https://etherscan.io/address/${contractAddress}`;
  }
  
  return null;
}
