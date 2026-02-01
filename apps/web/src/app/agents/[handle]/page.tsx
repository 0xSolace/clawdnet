import { redirect } from 'next/navigation';

// Redirect old /agents/[handle] path to new /agent/[name]
export default function AgentHandleRedirect({ params }: { params: { handle: string } }) {
  redirect(`/agent/${params.handle}`);
}
