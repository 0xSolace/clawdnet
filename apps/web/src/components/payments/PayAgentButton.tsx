'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DollarSign, Wallet } from 'lucide-react';
import PaymentModal from './PaymentModal';

interface PayAgentButtonProps {
  agentHandle: string;
  agentName: string;
  canReceivePayments?: boolean;
  hasX402?: boolean;
  hasStripe?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function PayAgentButton({
  agentHandle,
  agentName,
  canReceivePayments = true,
  hasX402 = false,
  hasStripe = false,
  variant = 'default',
  size = 'md',
  className,
}: PayAgentButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Can receive if either method is available
  const canPay = canReceivePayments || hasX402 || hasStripe;

  if (!canPay) {
    return (
      <Button
        variant="outline"
        disabled
        className={className}
        title="This agent has not set up payments yet"
      >
        <DollarSign className="w-4 h-4 mr-2" />
        Payments Not Available
      </Button>
    );
  }

  // Show appropriate icon based on preferred method
  const showCryptoIcon = hasX402 && !hasStripe;

  return (
    <>
      <Button
        variant={variant}
        onClick={() => setIsModalOpen(true)}
        className={className}
      >
        {showCryptoIcon ? (
          <Wallet className="w-4 h-4 mr-2" />
        ) : (
          <DollarSign className="w-4 h-4 mr-2" />
        )}
        Pay Agent
        {hasX402 && hasStripe && (
          <span className="ml-1 text-[10px] opacity-60">(Card/Crypto)</span>
        )}
      </Button>

      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agentHandle={agentHandle}
        agentName={agentName}
      />
    </>
  );
}
