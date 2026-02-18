import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import Image from 'next/image';
import Link from 'next/link';
import AuthWrapper from '@/components/auth/auth-wrapper';
import Header from '@/components/ikaro-header';

export const metadata: Metadata = {
  title: 'IRL',
  description: 'IRL is your key to unlocking a new way to experience culture',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen">
      <div
        className={`flex flex-col gap-6 lg:p-6 p-2  bg-[linear-gradient(to_bottom,#EC9DC6_0%,#5FBECC_25%,#FFE600_50%,#F24508_100%)]`}
      >
        <div className="flex justify-between items-center px-2 lg:px-4">
          <Link href="/">
            <Image
              src="/images/ikaro/irl-logo.png"
              alt="IRL"
              width={40}
              height={40}
              className="w-10 h-10"
            />
          </Link>
          <Header />
        </div>
        <AuthWrapper unauthenticatedUI="minimal">{children}</AuthWrapper>
      </div>
      <Toaster />
    </div>
  );
}
