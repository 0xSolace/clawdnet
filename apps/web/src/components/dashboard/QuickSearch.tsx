'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bot,
  BarChart3,
  Settings,
  Key,
  DollarSign,
  LayoutDashboard,
  FileText,
  ExternalLink,
  Command,
  ArrowRight,
} from 'lucide-react';

interface SearchItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  category: 'navigation' | 'agents' | 'actions';
  shortcut?: string;
}

const staticItems: SearchItem[] = [
  { id: 'dashboard', title: 'Dashboard', description: 'Overview and stats', icon: LayoutDashboard, href: '/dashboard', category: 'navigation', shortcut: 'G D' },
  { id: 'agents', title: 'My Agents', description: 'Manage your agents', icon: Bot, href: '/dashboard/agents', category: 'navigation', shortcut: 'G A' },
  { id: 'analytics', title: 'Analytics', description: 'Performance metrics', icon: BarChart3, href: '/dashboard/analytics', category: 'navigation', shortcut: 'G N' },
  { id: 'earnings', title: 'Earnings', description: 'Revenue and payouts', icon: DollarSign, href: '/dashboard/earnings', category: 'navigation', shortcut: 'G E' },
  { id: 'keys', title: 'API Keys', description: 'Manage credentials', icon: Key, href: '/dashboard/keys', category: 'navigation', shortcut: 'G K' },
  { id: 'settings', title: 'Settings', description: 'Account preferences', icon: Settings, href: '/dashboard/settings', category: 'navigation', shortcut: 'G S' },
  { id: 'docs', title: 'Documentation', description: 'API reference', icon: FileText, href: '/docs', category: 'navigation' },
  { id: 'explore', title: 'Explore Agents', description: 'Browse public agents', icon: ExternalLink, href: '/agents', category: 'navigation' },
];

interface Agent {
  handle: string;
  name: string;
}

export default function QuickSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [agents, setAgents] = useState<Agent[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Fetch agents for search
  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/v1/users/me/agents');
        const data = await res.json();
        setAgents(data.agents || []);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    }
    if (open) fetchAgents();
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      // Close with Escape
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Build search results
  const agentItems: SearchItem[] = agents.map((agent) => ({
    id: `agent-${agent.handle}`,
    title: agent.name,
    description: `@${agent.handle}`,
    icon: Bot,
    href: `/dashboard/agents/${agent.handle}`,
    category: 'agents' as const,
  }));

  const allItems = [...staticItems, ...agentItems];
  
  const filteredItems = query
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  const grouped = {
    navigation: filteredItems.filter((i) => i.category === 'navigation'),
    agents: filteredItems.filter((i) => i.category === 'agents'),
  };

  const flatFiltered = [...grouped.navigation, ...grouped.agents];

  const handleSelect = useCallback(
    (item: SearchItem) => {
      setOpen(false);
      router.push(item.href);
    },
    [router]
  );

  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatFiltered[selectedIndex]) {
        handleSelect(flatFiltered[selectedIndex]);
      }
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-colors text-sm font-mono"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] bg-zinc-800 px-1.5 py-0.5 text-zinc-500">
          <Command className="w-3 h-3" />K
        </kbd>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50"
              onClick={() => setOpen(false)}
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-lg z-50 p-4"
            >
              <div className="bg-zinc-950 border border-zinc-800 overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
                  <Search className="w-5 h-5 text-zinc-500" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedIndex(0);
                    }}
                    onKeyDown={handleKeyNavigation}
                    placeholder="Search pages, agents, actions..."
                    className="flex-1 bg-transparent text-white placeholder:text-zinc-600 outline-none font-mono text-sm"
                  />
                  <kbd className="text-[10px] bg-zinc-800 px-1.5 py-0.5 text-zinc-500 font-mono">
                    ESC
                  </kbd>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                  {flatFiltered.length === 0 ? (
                    <div className="p-6 text-center text-zinc-600 text-sm">
                      No results found
                    </div>
                  ) : (
                    <>
                      {grouped.navigation.length > 0 && (
                        <div className="p-2">
                          <div className="px-2 py-1 text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
                            Navigation
                          </div>
                          {grouped.navigation.map((item, i) => (
                            <SearchResult
                              key={item.id}
                              item={item}
                              isSelected={flatFiltered.indexOf(item) === selectedIndex}
                              onSelect={() => handleSelect(item)}
                            />
                          ))}
                        </div>
                      )}

                      {grouped.agents.length > 0 && (
                        <div className="p-2 border-t border-zinc-900">
                          <div className="px-2 py-1 text-[10px] text-zinc-600 font-mono uppercase tracking-wider">
                            Your Agents
                          </div>
                          {grouped.agents.map((item) => (
                            <SearchResult
                              key={item.id}
                              item={item}
                              isSelected={flatFiltered.indexOf(item) === selectedIndex}
                              onSelect={() => handleSelect(item)}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-zinc-900 flex items-center gap-4 text-[10px] text-zinc-600">
                  <span className="flex items-center gap-1">
                    <kbd className="bg-zinc-800 px-1 py-0.5">↑↓</kbd> navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="bg-zinc-800 px-1 py-0.5">↵</kbd> select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="bg-zinc-800 px-1 py-0.5">esc</kbd> close
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function SearchResult({
  item,
  isSelected,
  onSelect,
}: {
  item: SearchItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors ${
        isSelected
          ? 'bg-primary/10 text-primary'
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1 text-left">
        <div className="text-sm font-medium">{item.title}</div>
        {item.description && (
          <div className="text-[11px] text-zinc-600">{item.description}</div>
        )}
      </div>
      {item.shortcut && (
        <kbd className="text-[10px] bg-zinc-800 px-1.5 py-0.5 text-zinc-500 font-mono">
          {item.shortcut}
        </kbd>
      )}
      <ArrowRight className={`w-4 h-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
    </button>
  );
}
