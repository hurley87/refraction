import { redirect } from 'next/navigation';

export default function Checkpoint1Redirect() {
  const now = new Date();

  // MST = UTC-7 (Feb is standard time, no DST)
  // Feb 19, 7PM MST = Feb 20, 02:00 UTC
  // Feb 20, midnight MST = Feb 20, 07:00 UTC
  const cutoff1 = new Date('2026-02-20T02:00:00Z'); // Feb 19, 7PM MST → switch to Denver
  const cutoff2 = new Date('2026-02-20T07:30:00Z'); // Feb 20, 12:30AM MST → switch back to checkpoint

  if (now < cutoff1) {
    redirect('/c/7b1da100d1');
  } else if (now >= cutoff1 && now < cutoff2) {
    redirect('/denver');
  } else {
    redirect('/c/7b1da100d1');
  }
}
