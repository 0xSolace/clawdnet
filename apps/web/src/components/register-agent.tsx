'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Loader2, Plus, X } from 'lucide-react';

interface RegisterAgentProps {
  userId: string;
  onSuccess?: (agent: any) => void;
  onCancel?: () => void;
}

export function RegisterAgent({ userId, onSuccess, onCancel }: RegisterAgentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    handle: '',
    name: '',
    description: '',
    endpoint: '',
    capabilities: [] as string[],
  });
  
  const [newCapability, setNewCapability] = useState('');

  function addCapability() {
    if (newCapability.trim() && !formData.capabilities.includes(newCapability.trim())) {
      setFormData(prev => ({
        ...prev,
        capabilities: [...prev.capabilities, newCapability.trim()],
      }));
      setNewCapability('');
    }
  }

  function removeCapability(cap: string) {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.filter(c => c !== cap),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ownerId: userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register agent');
      }

      onSuccess?.(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bot className="w-6 h-6 text-primary" />
        <h2 className="text-lg font-bold text-white font-mono">Register Agent</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-500 font-mono mb-1">Handle *</label>
          <Input
            value={formData.handle}
            onChange={(e) => setFormData(prev => ({ ...prev, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
            placeholder="my-agent"
            className="bg-zinc-950 border-zinc-800 text-white font-mono"
            required
          />
          <p className="text-xs text-zinc-600 mt-1">Lowercase letters, numbers, hyphens. 3-30 characters.</p>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 font-mono mb-1">Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="My Awesome Agent"
            className="bg-zinc-950 border-zinc-800 text-white font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 font-mono mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="What does your agent do?"
            className="w-full bg-zinc-950 border border-zinc-800 text-white font-mono text-sm rounded px-3 py-2 min-h-[80px]"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 font-mono mb-1">Endpoint URL *</label>
          <Input
            type="url"
            value={formData.endpoint}
            onChange={(e) => setFormData(prev => ({ ...prev, endpoint: e.target.value }))}
            placeholder="https://api.example.com/agent/invoke"
            className="bg-zinc-950 border-zinc-800 text-white font-mono"
            required
          />
          <p className="text-xs text-zinc-600 mt-1">The URL where your agent receives requests.</p>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 font-mono mb-1">Capabilities</label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newCapability}
              onChange={(e) => setNewCapability(e.target.value)}
              placeholder="e.g., text-generation"
              className="bg-zinc-950 border-zinc-800 text-white font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCapability();
                }
              }}
            />
            <Button type="button" onClick={addCapability} variant="outline" className="border-zinc-800">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.capabilities.map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded font-mono"
              >
                {cap}
                <button type="button" onClick={() => removeCapability(cap)} className="hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="font-mono bg-primary text-black hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 mr-2" />
                Register Agent
              </>
            )}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="font-mono border-zinc-800">
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
