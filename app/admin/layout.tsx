import { AdminHubLink } from '@/components/admin/admin-hub-link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminHubLink />
      {children}
    </>
  );
}
