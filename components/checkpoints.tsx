"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCheckins } from "@/hooks/useCheckins";
import Auth from "./auth";
import { SendEmailButton } from "./send-email-button";

export default function Checkpoints() {
  const { user } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;
  const { checkins } = useCheckins(address);

  if (address && !checkins) {
    return <div className="text-center text-black">Loading...</div>;
  }

  const allCheckedIn = checkins?.every((checkin: boolean) => checkin);
  if (allCheckedIn) {
    return (
      <div className="flex flex-col text-xl gap-3 text-black">
        <p>All checkpoints completed!</p>
        <div className="flex flex-col text-xl gap-3 text-black">
          {checkins?.map((checkin: boolean, index: number) => (
            <div key={index} className="flex gap-2 items-center">
              {!checkin ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 0 1 9 14.437V9.564Z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              )}
              <p>{`Checkpoint #${index + 1}`}</p>
            </div>
          ))}
        </div>
        <SendEmailButton />
      </div>
    );
  }

  return (
    <Auth>
      <div className="flex flex-col text-xl gap-3 text-black">
        {checkins?.map((checkin: boolean, index: number) => (
          <div key={index} className="flex gap-2 items-center">
            {!checkin ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 0 1 9 14.437V9.564Z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            )}
            <p>{`Checkpoint #${index + 1}`}</p>
          </div>
        ))}
      </div>
    </Auth>
  );
}
