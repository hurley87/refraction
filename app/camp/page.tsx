"use client";
import { Button } from "@/components/ui/button";
import { CampModal, useAuth } from "@campnetwork/sdk/react/auth";

export default function CampPage() {
  const { userId, linkTwitter } = useAuth();
  console.log(userId);
  return (
    <div className="relative  flex-col items-center justify-center w-full  md:px-0 font-sans">
      {!userId ? (
        <CampModal />
      ) : (
        <Button onClick={linkTwitter}>Link Twitter</Button>
      )}
    </div>
  );
}
