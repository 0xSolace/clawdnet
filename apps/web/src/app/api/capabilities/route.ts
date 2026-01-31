import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';

// Standard capability definitions
const STANDARD_CAPABILITIES = [
  { id: 'text-generation', name: 'Text Generation', description: 'Generate text responses' },
  { id: 'code-generation', name: 'Code Generation', description: 'Write and analyze code' },
  { id: 'image-generation', name: 'Image Generation', description: 'Create images from prompts' },
  { id: 'translation', name: 'Translation', description: 'Translate between languages' },
  { id: 'web-search', name: 'Web Search', description: 'Search the internet' },
  { id: 'research', name: 'Research', description: 'Deep research and analysis' },
  { id: 'analysis', name: 'Analysis', description: 'Analyze data and content' },
  { id: 'summarization', name: 'Summarization', description: 'Summarize long content' },
  { id: 'fact-checking', name: 'Fact Checking', description: 'Verify claims and facts' },
  { id: 'creative-writing', name: 'Creative Writing', description: 'Stories and creative content' },
  { id: 'copywriting', name: 'Copywriting', description: 'Marketing and copy' },
  { id: 'data-extraction', name: 'Data Extraction', description: 'Extract structured data' },
  { id: 'file-processing', name: 'File Processing', description: 'Process documents and files' },
  { id: 'scheduling', name: 'Scheduling', description: 'Calendar and scheduling tasks' },
  { id: 'notifications', name: 'Notifications', description: 'Send notifications and alerts' },
];

// GET /api/capabilities - List available capabilities
export async function GET() {
  try {
    // Get capabilities currently in use by agents
    const { data: agents } = await supabase
      .from('agents')
      .select('capabilities')
      .eq('is_public', true);

    // Count usage of each capability
    const usageCounts: Record<string, number> = {};
    for (const agent of agents || []) {
      for (const cap of agent.capabilities || []) {
        usageCounts[cap] = (usageCounts[cap] || 0) + 1;
      }
    }

    // Combine standard with actual usage
    const capabilities = STANDARD_CAPABILITIES.map(cap => ({
      ...cap,
      agentCount: usageCounts[cap.id] || 0,
    }));

    // Add any custom capabilities not in standard list
    const customCaps = Object.keys(usageCounts)
      .filter(id => !STANDARD_CAPABILITIES.find(c => c.id === id))
      .map(id => ({
        id,
        name: id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        description: 'Custom capability',
        agentCount: usageCounts[id],
      }));

    // Sort by usage
    const allCapabilities = [...capabilities, ...customCaps]
      .sort((a, b) => b.agentCount - a.agentCount);

    return NextResponse.json({
      capabilities: allCapabilities,
      total: allCapabilities.length,
    });

  } catch (error) {
    console.error('Error fetching capabilities:', error);
    return NextResponse.json({ error: 'Failed to fetch capabilities' }, { status: 500 });
  }
}
