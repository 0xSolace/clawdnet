'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';

interface AgentIdDisplayProps {
  agentId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  copyable?: boolean;
  monospace?: boolean;
  showPrefix?: boolean;
  className?: string;
}

const sizeStyles = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-3 py-1.5',
  lg: 'text-base px-4 py-2',
};

export function AgentIdDisplay({
  agentId,
  size = 'sm',
  copyable = true,
  monospace = true,
  showPrefix = true,
  className = '',
}: AgentIdDisplayProps) {
  const [copied, setCopied] = useState(false);
  
  const displayId = showPrefix ? agentId : agentId.replace('CLW-', '');
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(agentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <motion.button
      onClick={copyable ? handleCopy : undefined}
      className={`
        inline-flex items-center gap-2 
        bg-zinc-900 border border-zinc-800 
        ${copyable ? 'hover:border-primary/40 cursor-pointer' : 'cursor-default'}
        transition-colors
        ${monospace ? 'font-mono' : ''}
        ${sizeStyles[size]}
        ${className}
      `}
      whileHover={copyable ? { scale: 1.02 } : undefined}
      whileTap={copyable ? { scale: 0.98 } : undefined}
    >
      <span className="text-zinc-300">{displayId}</span>
      
      {copyable && (
        <span className="text-zinc-600 hover:text-primary transition-colors">
          {copied ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </span>
      )}
    </motion.button>
  );
}

/**
 * Agent ID with full branding
 */
export function AgentIdBadge({
  agentId,
  name,
  isVerified,
  className = '',
}: {
  agentId: string;
  name?: string;
  isVerified?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(agentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  // Parse the ID segments
  const segments = agentId.split('-');
  const prefix = segments[0]; // CLW
  const seg1 = segments[1]; // XXXX
  const seg2 = segments[2]; // XXXX
  
  return (
    <motion.div
      onClick={handleCopy}
      className={`
        inline-flex flex-col items-center p-4 
        bg-gradient-to-b from-zinc-900 to-black 
        border border-zinc-700 
        hover:border-primary/40 cursor-pointer
        transition-colors
        ${className}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* ClawdNet branding */}
      <div className="text-[10px] font-mono text-zinc-600 tracking-widest mb-2">
        CLAWDNET IDENTITY
      </div>
      
      {/* Agent ID */}
      <div className="flex items-center gap-1 font-mono text-xl">
        <span className="text-primary">{prefix}</span>
        <span className="text-zinc-600">-</span>
        <span className="text-white">{seg1}</span>
        <span className="text-zinc-600">-</span>
        <span className="text-white">{seg2}</span>
      </div>
      
      {/* Name and verification */}
      {name && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-zinc-400">{name}</span>
          {isVerified && (
            <span className="text-primary text-xs">✓</span>
          )}
        </div>
      )}
      
      {/* Copy indicator */}
      <div className="flex items-center gap-1 mt-3 text-[10px] text-zinc-600">
        {copied ? (
          <>
            <Check className="w-3 h-3 text-green-500" />
            <span className="text-green-500">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" />
            <span>Click to copy</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Agent ID card for profile display
 */
export function AgentIdCard({
  agentId,
  handle,
  name,
  isVerified,
  createdAt,
  className = '',
}: {
  agentId: string;
  handle: string;
  name: string;
  isVerified?: boolean;
  createdAt?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(agentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const memberSince = createdAt 
    ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;
  
  return (
    <motion.div
      className={`
        relative overflow-hidden
        bg-gradient-to-br from-zinc-900 via-black to-zinc-900
        border border-zinc-700
        ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="card-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#22c55e" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#card-grid)" />
        </svg>
      </div>
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="font-mono text-[10px] text-zinc-500 tracking-widest">
            CLAWDNET AGENT ID
          </div>
          {isVerified && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-mono">
              <span>✓</span>
              <span>VERIFIED</span>
            </div>
          )}
        </div>
        
        {/* Main ID display */}
        <motion.button
          onClick={handleCopy}
          className="w-full text-left hover:opacity-90 transition-opacity"
          whileTap={{ scale: 0.99 }}
        >
          <div className="font-mono text-3xl tracking-wider text-white flex items-baseline gap-1">
            <span className="text-primary">CLW</span>
            <span className="text-zinc-600">-</span>
            <span>{agentId.split('-')[1]}</span>
            <span className="text-zinc-600">-</span>
            <span>{agentId.split('-')[2]}</span>
          </div>
          
          {copied && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-500 text-xs font-mono mt-2"
            >
              ✓ Copied to clipboard
            </motion.div>
          )}
        </motion.button>
        
        {/* Divider */}
        <div className="my-6 h-px bg-zinc-800" />
        
        {/* Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-mono text-[10px] text-zinc-600 mb-1">NAME</div>
            <div className="font-mono text-sm text-white">{name}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-zinc-600 mb-1">HANDLE</div>
            <div className="font-mono text-sm text-primary">@{handle}</div>
          </div>
        </div>
        
        {memberSince && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="font-mono text-[10px] text-zinc-600">
              Member since {memberSince}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
