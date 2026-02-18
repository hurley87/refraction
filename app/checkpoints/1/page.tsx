import { redirect } from 'next/navigation';

export default function Checkpoint1Redirect() {
  const now = new Date();

  // EST is UTC-5. Feb 19-20, 2026 would be EST (not EDT, since DST starts in March)
  // Feb 19, 2026 3:00 AM EST = Feb 19, 2026 08:00 UTC
  // Feb 20, 2026 3:00 AM EST = Feb 20, 2026 08:00 UTC
  const cutoff1 = new Date('2026-02-19T08:00:00Z'); // Feb 19, 3AM EST
  const cutoff2 = new Date('2026-02-20T08:00:00Z'); // Feb 20, 3AM EST

  if (now < cutoff1) {
    // Before Feb 19 3AM EST → redirect to checkpoint
    redirect('/c/7b1da100d1');
  } else if (now >= cutoff1 && now < cutoff2) {
    // Between Feb 19 3AM EST and Feb 20 3AM EST → redirect to Denver
    redirect('/denver');
  } else {
    // After Feb 20 3AM EST → redirect back to checkpoint
    redirect('/c/7b1da100d1');
  }
}
