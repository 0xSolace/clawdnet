'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function ClaimErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'An unknown error occurred';

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2 font-mono">
          Authentication Failed
        </h1>
        
        <p className="text-zinc-500 mb-6">
          {error}
        </p>

        <div className="space-y-3">
          <Link href="/">
            <Button className="w-full font-mono bg-primary text-black hover:bg-primary/90">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          
          <p className="text-xs text-zinc-600">
            If you continue to experience issues, please{' '}
            <a 
              href="https://twitter.com/clawdnet" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              contact support
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
