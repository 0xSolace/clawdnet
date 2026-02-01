'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, DollarSign, Loader2, CheckCircle, AlertCircle, Wallet, CreditCard } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentHandle: string;
  agentName: string;
  defaultAmount?: number;
  paymentType?: 'tip' | 'task' | 'subscription';
  description?: string;
  taskId?: string;
}

interface PaymentMethods {
  x402: boolean;
  stripe: boolean;
  preferred: 'x402' | 'stripe' | 'both';
}

interface X402Info {
  walletAddress: string;
  network: string;
  asset: string;
}

const PRESET_AMOUNTS = [5, 10, 25, 50, 100];

// Base USDC contract
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export default function PaymentModal({
  isOpen,
  onClose,
  agentHandle,
  agentName,
  defaultAmount = 10,
  paymentType = 'tip',
  description,
  taskId,
}: PaymentModalProps) {
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [customDescription, setCustomDescription] = useState(description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods | null>(null);
  const [x402Info, setX402Info] = useState<X402Info | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'x402' | 'stripe'>('stripe');
  const [txSuccess, setTxSuccess] = useState(false);

  // Wagmi hooks for x402 payments
  const { address: walletAddress, isConnected } = useAccount();
  const { data: txHash, writeContract, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isTxPending, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Fetch payment methods on mount
  useEffect(() => {
    if (isOpen && agentHandle) {
      fetchPaymentMethods();
    }
  }, [isOpen, agentHandle]);

  // Handle transaction success
  useEffect(() => {
    if (isTxSuccess && txHash) {
      handleX402Success(txHash);
    }
  }, [isTxSuccess, txHash]);

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      setError(writeError.message || 'Transaction failed');
      setLoading(false);
    }
  }, [writeError]);

  async function fetchPaymentMethods() {
    try {
      const res = await fetch(`/api/payments/x402?agent=${agentHandle}`);
      if (res.ok) {
        const data = await res.json();
        setPaymentMethods(data.paymentMethods);
        setX402Info(data.x402);
        
        // Auto-select preferred method
        if (data.paymentMethods.preferred === 'x402' && isConnected) {
          setSelectedMethod('x402');
        } else if (data.paymentMethods.stripe) {
          setSelectedMethod('stripe');
        } else if (data.paymentMethods.x402) {
          setSelectedMethod('x402');
        }
      }
    } catch (err) {
      console.error('Failed to fetch payment methods:', err);
    }
  }

  async function handleX402Success(txHash: string) {
    setTxSuccess(true);
    setLoading(false);
    
    // Record the payment
    try {
      await fetch('/api/payments/x402', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Payment': JSON.stringify({
            txHash,
            payer: walletAddress,
            amount: amount,
          }),
        },
        body: JSON.stringify({
          agentHandle,
          amount: parseFloat(amount),
          paymentType,
          description: customDescription || `${paymentType === 'tip' ? 'Tip' : 'Payment'} to @${agentHandle}`,
        }),
      });
    } catch (err) {
      console.error('Failed to record payment:', err);
    }
  }

  async function handleX402Payment() {
    if (!isConnected || !walletAddress || !x402Info) {
      setError('Please connect your wallet first');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert to USDC units (6 decimals)
      const usdcAmount = parseUnits(numAmount.toString(), 6);

      // Send USDC directly to agent's wallet
      writeContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [x402Info.walletAddress as `0x${string}`, usdcAmount],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setLoading(false);
    }
  }

  async function handleStripePayment() {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentHandle,
          amount: numAmount,
          paymentType,
          description: customDescription || `${paymentType === 'tip' ? 'Tip' : 'Payment'} to @${agentHandle}`,
          taskId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  const handleSubmit = () => {
    if (selectedMethod === 'x402') {
      handleX402Payment();
    } else {
      handleStripePayment();
    }
  };

  if (!isOpen) return null;

  const numAmount = parseFloat(amount || '0');
  const platformFee = numAmount * 0.05;
  const agentReceives = numAmount * 0.95;
  const isX402Loading = loading || isWritePending || isTxPending;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative z-10 w-full max-w-md mx-4 bg-zinc-950 border border-zinc-800"
        >
          {/* Success State */}
          {txSuccess ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
              <h2 className="text-xl font-bold text-white font-mono mb-2">
                Payment Sent!
              </h2>
              <p className="text-zinc-400 mb-4">
                ${numAmount.toFixed(2)} USDC sent to @{agentHandle}
              </p>
              {txHash && (
                <a
                  href={`https://basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline font-mono"
                >
                  View on BaseScan →
                </a>
              )}
              <Button
                onClick={onClose}
                className="mt-6 w-full bg-zinc-800 text-white"
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div>
                  <h2 className="text-lg font-bold text-white font-mono">
                    Pay @{agentHandle}
                  </h2>
                  <p className="text-sm text-zinc-500">{agentName}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Payment Method Selection */}
                {paymentMethods && (paymentMethods.x402 || paymentMethods.stripe) && (
                  <div>
                    <label className="block text-sm font-mono text-zinc-500 mb-2">
                      PAYMENT METHOD
                    </label>
                    <div className="flex gap-2">
                      {paymentMethods.x402 && (
                        <button
                          onClick={() => setSelectedMethod('x402')}
                          className={`flex-1 p-3 border transition-colors flex items-center justify-center gap-2 ${
                            selectedMethod === 'x402'
                              ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <Wallet className="w-4 h-4" />
                          <span className="font-mono text-sm">Crypto</span>
                        </button>
                      )}
                      {paymentMethods.stripe && (
                        <button
                          onClick={() => setSelectedMethod('stripe')}
                          className={`flex-1 p-3 border transition-colors flex items-center justify-center gap-2 ${
                            selectedMethod === 'stripe'
                              ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <CreditCard className="w-4 h-4" />
                          <span className="font-mono text-sm">Card</span>
                        </button>
                      )}
                    </div>
                    {selectedMethod === 'x402' && !isConnected && (
                      <p className="mt-2 text-xs text-yellow-400 font-mono">
                        ⚠ Connect wallet to pay with crypto
                      </p>
                    )}
                  </div>
                )}

                {/* Amount input */}
                <div>
                  <label className="block text-sm font-mono text-zinc-500 mb-2">
                    AMOUNT ({selectedMethod === 'x402' ? 'USDC' : 'USD'})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                      $
                    </span>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-8 text-xl font-mono h-14 bg-zinc-900 border-zinc-800 text-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Preset amounts */}
                <div className="flex gap-2 flex-wrap">
                  {PRESET_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset.toString())}
                      className={`px-4 py-2 font-mono text-sm border transition-colors ${
                        parseFloat(amount) === preset
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>

                {/* Description */}
                {paymentType !== 'tip' && (
                  <div>
                    <label className="block text-sm font-mono text-zinc-500 mb-2">
                      NOTE (OPTIONAL)
                    </label>
                    <Input
                      type="text"
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-white"
                      placeholder="Add a message..."
                    />
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Fee info */}
                <div className="text-xs text-zinc-600 font-mono">
                  <div className="flex justify-between">
                    <span>Platform fee (5%)</span>
                    <span>${platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Agent receives</span>
                    <span className="text-zinc-400">
                      ${agentReceives.toFixed(2)} {selectedMethod === 'x402' ? 'USDC' : 'USD'}
                    </span>
                  </div>
                  {selectedMethod === 'x402' && x402Info && (
                    <div className="flex justify-between mt-1 text-blue-400">
                      <span>Network</span>
                      <span>Base (USDC)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-4 border-t border-zinc-800">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-zinc-800 text-zinc-400 hover:text-white"
                  disabled={isX402Loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  className={`flex-1 font-mono ${
                    selectedMethod === 'x402'
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-primary text-black hover:bg-primary/90'
                  }`}
                  disabled={isX402Loading || !amount || numAmount <= 0 || (selectedMethod === 'x402' && !isConnected)}
                >
                  {isX402Loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isTxPending ? 'Confirming...' : 'Processing...'}
                    </>
                  ) : selectedMethod === 'x402' ? (
                    <>
                      <Wallet className="w-4 h-4 mr-2" />
                      Pay ${numAmount.toFixed(2)} USDC
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Pay ${numAmount.toFixed(2)}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
