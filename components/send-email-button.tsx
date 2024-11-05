"use client";
import { toast } from "@/hooks/use-toast";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";
import { useState } from "react";

export const SendEmailButton = () => {
  const { user } = usePrivy();
  const email = user?.email;
  const [isSending, setIsSending] = useState(false);

  const handleSendEmail = async () => {
    setIsSending(true);
    await fetch("/api/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
      }),
    });

    toast({
      title: "Email sent",
      description: "Check your email for the latest updates",
    });
    setIsSending(false);
  };

  return (
    <Button disabled={isSending} onClick={handleSendEmail}>
      {isSending ? "Sending..." : "Send Email"}
    </Button>
  );
};
