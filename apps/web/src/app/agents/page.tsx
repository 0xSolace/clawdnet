import { redirect } from 'next/navigation';

// Redirect old /agents path to new /explore
export default function AgentsRedirect() {
  redirect('/explore');
}
