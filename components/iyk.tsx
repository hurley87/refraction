"use client";
import { Button } from "./ui/button";

export const IYK = () => {
  const handleSetup = async () => {
    try {
      const res = await fetch("/api/iyk", {
        method: "PATCH",
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log(data);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return <Button onClick={handleSetup}>Setup</Button>;
};
