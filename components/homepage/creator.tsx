"use client";
import React, { useEffect, useState } from "react";

type BoostProps = {
  creator: `0x${string}`;
};

export default function Creator({ creator }: BoostProps) {
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
      setAvatar(data.avatar.replace("ipfs://", ""));
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  useEffect(() => {
    if (creator) {
      fetchData();
    }
  }, [creator]);

  console.log("avatar", avatar);

  return (
    <span className="text-black flex items-center gap-2">
      <img
        src={`https://ipfs.decentralized-content.com/ipfs/${avatar}`}
        alt={username}
        className="w-4 h-4 rounded-full"
      />
      {username || formatAddress(creator)}
    </span>
  );
}
