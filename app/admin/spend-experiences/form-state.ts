import type { SpendExperience, SpendExperienceStatus } from '@/lib/types';

export type SpendExperienceFormState = {
  title: string;
  description: string;
  event_id: string;
  status: SpendExperienceStatus;
  points_to_usdc_rate: string;
  max_usdc_per_user: string;
  treasury_wallet_address: string;
  receiving_wallet_address: string;
  start_time_local: string;
  end_time_local: string;
};

export function isoToDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(value: string): string {
  return new Date(value).toISOString();
}

function defaultWindow(): { start: string; end: string } {
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function experienceToForm(e: SpendExperience): SpendExperienceFormState {
  return {
    title: e.title,
    description: e.description ?? '',
    event_id: e.event_id ?? '',
    status: e.status,
    points_to_usdc_rate: String(e.points_to_usdc_rate),
    max_usdc_per_user: String(e.max_usdc_per_user),
    treasury_wallet_address: e.treasury_wallet_address,
    receiving_wallet_address: e.receiving_wallet_address,
    start_time_local: isoToDatetimeLocalValue(e.start_time),
    end_time_local: isoToDatetimeLocalValue(e.end_time),
  };
}

export function emptySpendExperienceForm(): SpendExperienceFormState {
  const { start, end } = defaultWindow();
  return {
    title: '',
    description: '',
    event_id: '',
    status: 'draft',
    points_to_usdc_rate: '1000',
    max_usdc_per_user: '5',
    treasury_wallet_address: '',
    receiving_wallet_address: '',
    start_time_local: isoToDatetimeLocalValue(start),
    end_time_local: isoToDatetimeLocalValue(end),
  };
}
