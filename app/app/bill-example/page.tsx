import { redirect } from 'next/navigation';

// Keep old bookmarks working through the standard usage and export flow.
export default function Page() {
  redirect('/app/usage?range=custom&from=2026-09-01&to=2026-09-07');
}
