import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "$IRL",
  description: "$IRL is your key to unlocking a new way to experience culture",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen">
      <div className="relative flex flex-col  bg-gradient-to-r from-green-600 from-10% via-blue-300 via-60% to-sky-500 to-90% p-6 text-BLACK dark:border-r justify-between font-sans">
        <div className="flex ">
          <div className="flex-none">
            <Image
              src="/images/$IRL_PRIMARY LOGO_BLACK.svg"
              alt="IRL"
              width={100}
              height={100}
            />
          </div>
          <div className="flex-auto wd-6 ">&nbsp;</div>

          <div className="flex flex-col w-64 gap-1 text-sm text-right text-black ">
            <Link
              href="https://x.com/RefractionDAO"
              target="_blank"
              className="nounderline"
            >
              TWITTER &#x2197;
            </Link>
            <Link
              href="https://www.instagram.com/refractionfestival"
              target="_blank"
              className="nounderline"
            >
              INSTAGRAM &#x2197;
            </Link>
            <Link
              href="https://warpcast.com/refraction"
              target="_blank"
              className="nounderline"
            >
              WARPCAST &#x2197;
            </Link>
            <Link
              href="https://orb.ac/@refraction"
              target="_blank"
              className="nounderline"
            >
              ORB &#x2197;
            </Link>
          </div>
        </div>
      </div>
      <div>{children}</div>

      <div className="relative flex flex-col  bg-gradient-to-r from-green-600 from-10% via-blue-300 via-60% to-sky-500 to-90% p-6 text-BLACK dark:border-r justify-between font-sans ">
        <div className="flex flex-col md:flex-row relative p-6">
          <div className="flex p-6 w-30 items-center">
            <div className="flex w-10">
              <Link
                href="https://www.instagram.com/refractionfestival"
                target="_blank"
                className="nounderline"
              >
                <Image
                  src="/images/icons8-instagram.svg"
                  alt="Instagram"
                  width={25}
                  height={25}
                />
              </Link>
            </div>
            <div className="flex w-10">
              <Link
                href="https://x.com/RefractionDAO"
                target="_blank"
                className="nounderline"
              >
                <Image
                  src="/images/icons8-twitterx.svg"
                  alt="TwitterX"
                  width={25}
                  height={25}
                />
              </Link>
            </div>
            <div className="flex w-10">
              <Link
                href="https://www.linkedin.com/company/refractiondao"
                target="_blank"
                className="nounderline"
              >
                <Image
                  src="/images/icons8-linkedin.svg"
                  alt="LinkedIn"
                  width={25}
                  height={25}
                />
              </Link>
            </div>
          </div>
          <div className="flex-auto w-2">&nbsp;</div>
          <div className="flex gap-3 text-center  w-50 text-black pt-5">
            <div className="flex">SUBSCRIBE OUR NEWSLETTER</div>
          </div>
          <div className="flex-auto w-2">&nbsp;</div>
          <div className="flex gap-3 text-center w-40 text-black pt-5">
            <div className="flex">PRIVACY POLICY</div>
          </div>
          <div className="flex-auto w-2">&nbsp;</div>
          <div className="flex items-center gap-2">
            <div className="flex-none">
              <Image
                src="/images/$IRL_PRIMARY LOGO_BLACK.svg"
                alt="IRL"
                width={50}
                height={50}
              />
            </div>

            <div className="flex-auto text-black text-sm  pad-3 text-right">
              2024
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
