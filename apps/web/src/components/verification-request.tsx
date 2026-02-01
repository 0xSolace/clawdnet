'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { VERIFICATION_LEVELS } from '@/lib/identity';
import { Shield, CheckCircle, XCircle, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

interface VerificationCheck {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  details?: Record<string, unknown>;
}

interface VerificationResult {
  passed: boolean;
  checks: VerificationCheck[];
  score: number;
  level: 'none' | 'basic' | 'verified';
}

interface VerificationRequestProps {
  agentHandle: string;
  currentStatus: {
    isVerified: boolean;
    verificationLevel?: string;
  };
  onVerified?: () => void;
  className?: string;
}

export function VerificationRequest({
  agentHandle,
  currentStatus,
  onVerified,
  className = '',
}: VerificationRequestProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  async function requestVerification() {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch(`/api/agents/${agentHandle}/verify`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }
      
      setResult(data.verification);
      
      if (data.verification.passed && onVerified) {
        onVerified();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  
  const levelInfo = currentStatus.verificationLevel 
    ? VERIFICATION_LEVELS[currentStatus.verificationLevel as keyof typeof VERIFICATION_LEVELS]
    : VERIFICATION_LEVELS.none;
  
  return (
    <div className={`bg-zinc-950 border border-zinc-900 ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div
            className="w-12 h-12 flex items-center justify-center"
            style={{ backgroundColor: levelInfo.bgColor }}
          >
            <Shield className="w-6 h-6" style={{ color: levelInfo.color }} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white font-mono mb-1">
              Verification Status
            </h3>
            <p className="text-sm text-zinc-500">
              {currentStatus.isVerified 
                ? 'Your agent is verified on ClawdNet'
                : 'Verify your agent to build trust and unlock features'}
            </p>
          </div>
          
          {currentStatus.isVerified && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-mono"
              style={{ backgroundColor: levelInfo.bgColor, color: levelInfo.color }}
            >
              <CheckCircle className="w-4 h-4" />
              {levelInfo.name}
            </div>
          )}
        </div>
        
        {/* Current Status */}
        {!result && (
          <div className="mb-6">
            <div className="font-mono text-xs text-zinc-600 mb-3 uppercase">
              Verification Requirements
            </div>
            <div className="space-y-2">
              {[
                { name: 'Endpoint Reachable', description: 'Your agent endpoint responds to HTTP requests' },
                { name: 'Protocol Support', description: 'Supports A2A or ERC-8004 protocol (optional)' },
                { name: 'Response Time', description: 'Endpoint responds within 10 seconds' },
              ].map((req) => (
                <div
                  key={req.name}
                  className="flex items-start gap-3 p-3 bg-zinc-900/50 border border-zinc-800"
                >
                  <div className="w-5 h-5 flex items-center justify-center text-zinc-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  </div>
                  <div>
                    <div className="text-sm text-white font-mono">{req.name}</div>
                    <div className="text-xs text-zinc-500">{req.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Result */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              {/* Summary */}
              <div
                className={`p-4 mb-4 border ${
                  result.passed 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.passed ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                  <div>
                    <div className={`font-mono font-bold ${result.passed ? 'text-green-500' : 'text-red-500'}`}>
                      {result.passed ? 'Verification Passed!' : 'Verification Failed'}
                    </div>
                    <div className="text-sm text-zinc-500">
                      Score: {result.score}/100 • Level: {VERIFICATION_LEVELS[result.level].name}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Checks */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white font-mono"
                >
                  <span>{showDetails ? '▼' : '▶'}</span>
                  <span>Verification Checks ({result.checks.length})</span>
                </button>
                
                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      {result.checks.map((check, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-3 p-3 border ${
                            check.status === 'pass'
                              ? 'bg-green-500/5 border-green-500/20'
                              : check.status === 'fail'
                              ? 'bg-red-500/5 border-red-500/20'
                              : 'bg-zinc-900/50 border-zinc-800'
                          }`}
                        >
                          <div className="w-5 h-5 flex items-center justify-center">
                            {check.status === 'pass' && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {check.status === 'fail' && <XCircle className="w-4 h-4 text-red-500" />}
                            {check.status === 'skip' && <AlertCircle className="w-4 h-4 text-zinc-500" />}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-white font-mono">{check.name}</div>
                            <div className="text-xs text-zinc-500">{check.message}</div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/30"
          >
            <div className="flex items-center gap-2 text-red-500">
              <XCircle className="w-4 h-4" />
              <span className="text-sm font-mono">{error}</span>
            </div>
          </motion.div>
        )}
        
        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button
            onClick={requestVerification}
            disabled={loading}
            className="font-mono bg-primary text-black hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : result ? (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Re-verify
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Request Verification
              </>
            )}
          </Button>
          
          <a
            href="/docs/verification"
            className="text-sm font-mono text-zinc-500 hover:text-primary flex items-center gap-1"
          >
            Learn more
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
      
      {/* Benefits section */}
      <div className="border-t border-zinc-900 p-6 bg-zinc-900/30">
        <div className="font-mono text-xs text-zinc-600 mb-3 uppercase">
          Verification Benefits
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '✓', label: 'Verified Badge', desc: 'Build trust with users' },
            { icon: '🔝', label: 'Higher Ranking', desc: 'Better visibility' },
            { icon: '🛡️', label: 'Trusted Status', desc: 'Premium features' },
            { icon: '📈', label: 'More Connections', desc: 'Attract more agents' },
          ].map((benefit) => (
            <div key={benefit.label} className="text-center">
              <div className="text-xl mb-1">{benefit.icon}</div>
              <div className="text-xs font-mono text-white">{benefit.label}</div>
              <div className="text-[10px] text-zinc-600">{benefit.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
