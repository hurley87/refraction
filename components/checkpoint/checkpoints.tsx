"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCheckpointStatuses } from "@/hooks/useCheckpointStatuses";
import Auth from "@/components/auth/auth";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Checkpoints() {
  const { user, login, ready } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;
  const { data: checkpointStatuses, isLoading } =
    useCheckpointStatuses(address);

  if (!ready || isLoading || !checkpointStatuses) {
    return <div className="text-center text-black">Loading...</div>;
  }

  if (!user) {
    return (
      <Button
        className="bg-white text-[#F24405] rounded-lg hover:bg-white/80 w-full max-w-4xl text-xl font-inktrap"
        onClick={login}
      >
        Get Started
      </Button>
    );
  }

  // Calculate total points earned
  const totalPoints =
    checkpointStatuses.filter((cp) => cp.isCheckedIn).length * 100;

  return (
    <Auth>
      <div className="flex flex-col items-center justify-between min-h-screen py-8 px-4 w-full max-w-md mx-auto">
        {/* Header Section */}
        <div className="flex flex-col items-center justify-center flex-1 w-full">
          <div className="text-white text-sm font-inktrap uppercase tracking-wider mb-4">
            YOU EARNED
          </div>

          <h1 className="text-white text-6xl font-bold font-inktrap mb-8">
            YOU EARNED
            <br />
            POINTS
          </h1>

          {/* 3D Box Icon Placeholder */}
          <div className="mb-8">
            <svg
              width="180"
              height="180"
              viewBox="0 0 180 180"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="50"
                y="50"
                width="80"
                height="80"
                stroke="#FFE600"
                strokeWidth="2"
                fill="none"
              />
              <rect
                x="60"
                y="40"
                width="80"
                height="80"
                stroke="#FFE600"
                strokeWidth="2"
                fill="none"
              />
              <rect
                x="70"
                y="30"
                width="80"
                height="80"
                stroke="#FFE600"
                strokeWidth="2"
                fill="none"
              />
              <line
                x1="50"
                y1="50"
                x2="60"
                y2="40"
                stroke="#FFE600"
                strokeWidth="2"
              />
              <line
                x1="130"
                y1="50"
                x2="140"
                y2="40"
                stroke="#FFE600"
                strokeWidth="2"
              />
              <line
                x1="50"
                y1="130"
                x2="60"
                y2="120"
                stroke="#FFE600"
                strokeWidth="2"
              />
              <line
                x1="130"
                y1="130"
                x2="140"
                y2="120"
                stroke="#FFE600"
                strokeWidth="2"
              />
              <line
                x1="60"
                y1="40"
                x2="70"
                y2="30"
                stroke="#FFE600"
                strokeWidth="2"
              />
              <line
                x1="140"
                y1="40"
                x2="150"
                y2="30"
                stroke="#FFE600"
                strokeWidth="2"
              />
              <line
                x1="60"
                y1="120"
                x2="70"
                y2="110"
                stroke="#FFE600"
                strokeWidth="2"
              />
              <line
                x1="140"
                y1="120"
                x2="150"
                y2="110"
                stroke="#FFE600"
                strokeWidth="2"
              />
              <text
                x="90"
                y="95"
                fill="#FFE600"
                fontSize="16"
                fontFamily="monospace"
                textAnchor="middle"
              >
                TAP TO REVEAL
              </text>
            </svg>
          </div>

          {/* Points Display */}
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-white text-7xl font-bold font-inktrap">
              {totalPoints}
            </span>
            <span className="text-white text-2xl font-inktrap">PTS</span>
          </div>

          {/* Description Text */}
          <p className="text-white text-center text-sm leading-relaxed mb-8 max-w-sm">
            You&apos;ve just gained access to events, rewards and bespoke
            experiences. Sign Up to save these points and join a global network.
          </p>

          {/* CTA Button */}
          <Button className="bg-white text-black rounded-full hover:bg-white/90 w-full font-inktrap py-6 text-base flex items-center justify-between px-6">
            <span>Create Your Profile and Save</span>
            <Image
              src="/home/arrow-right.svg"
              alt="arrow-right"
              width={20}
              height={20}
              className="w-5 h-5"
            />
          </Button>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-2 mt-8 w-full">
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-xs font-inktrap uppercase">
              Powered by
            </span>
            <img
              src="/refraction.png"
              alt="Refraction"
              className="w-auto h-[14px]"
            />
          </div>
          <Link
            href="#"
            className="text-white text-xs font-inktrap uppercase underline"
          >
            Learn More
          </Link>
        </div>
      </div>
    </Auth>
  );
}
