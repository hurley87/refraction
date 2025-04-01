"use client";
import React, { useEffect, useState } from "react";

type CreatorProps = {
  creator: `0x${string}`;
};

export default function Creator({ creator }: CreatorProps) {
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address?.slice(0, 6)}...${address?.slice(-4)}`;
  };

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/user?address=${creator}`);
      const data = await response.json();
      setUsername(data.username);

      const image = `https://ipfs.io/ipfs/${data.avatar.replace(
        "ipfs://",
        ""
      )}`;
      setAvatar(image);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  useEffect(() => {
    if (creator) {
      fetchData();
    }
  }, [creator]);

  return (
    <span className="text-black flex items-center gap-2">
      {avatar && (
        <img src={avatar} alt={username} className="w-4 h-4 rounded-full" />
      )}
      {username.toUpperCase() || formatAddress(creator)}
    </span>
  );
}
