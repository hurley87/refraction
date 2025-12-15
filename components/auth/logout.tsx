"use client";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

export const LogoutButton = () => {
  const { logout, user } = usePrivy();

  if (!user) {
    return null;
  }

  return <Button onClick={logout}>Logout</Button>;
};
