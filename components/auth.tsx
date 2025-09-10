"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";


const show_newsletter = false;
interface AuthProps {
  children: React.ReactNode;
}

export default function Auth({ children }: AuthProps) {
  const { user, ready, linkEmail, login } = usePrivy();
  const [username, setUsername] = useState("");
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [language, setLanguage] = useState<"english" | "french">("english");
  const multiple_language = false;

  // No Farcaster auto-login; use regular Privy login only

  // Regular Privy login only
  const handleLogin = async () => {
    try {
      login();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  //console.log("user", user);

  // Check for existing player data when user is ready and has wallet
  useEffect(() => {
    const checkPlayerData = async () => {
      if (user?.wallet?.address) {
        try {
          const response = await fetch(
            `/api/player?walletAddress=${encodeURIComponent(
              user.wallet.address,
            )}`,
          );

          if (response.ok) {
            const result = await response.json();
            const existingPlayer = result.player;

            // If player exists but has no username, prompt for username
            if (existingPlayer && !existingPlayer.username) {
              setNeedsUsername(true);
            }
          } else if (response.status === 404) {
            // New player, needs username
            setNeedsUsername(true);
          }
        } catch (error) {
          console.error("Error checking player data:", error);
          // Assume new player if error occurs
          setNeedsUsername(true);
        }
      }
    };

    if (ready && user?.wallet?.address) {
      checkPlayerData();
    }
  }, [ready, user?.wallet?.address]);

  const handleCreatePlayer = async () => {
    if (!username.trim() || !user?.wallet?.address) return;

    setIsCreatingPlayer(true);
    try {
      const response = await fetch("/api/player", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: user.wallet.address,
          email: user.email?.address || "",
          username: username.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Player created successfully
        setNeedsUsername(false);
      } else {
        console.error("Failed to create player:", result.error);
        // TODO: Show error message to user
      }
    } catch (error) {
      console.error("Error creating player:", error);
      // TODO: Show error message to user
    } finally {
      setIsCreatingPlayer(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center text-center w-full min-h-dvh font-inktrap text-2xl">
        Loading...
      </div>
    );
  }

  if (ready && user && !user.email) {
    return (
      <div className="flex items-center justify-center w-full min-h-dvh px-4">
        <div className="w-full max-w-md text-center">
          <p className="text-white text-xl font-inktrap mb-3">
            Link your email for updates
          </p>
          <Button
            className="w-full bg-white text-[#F24405] rounded-xl hover:bg-white/90 text-xl font-inktrap py-5 shadow-md"
            size="lg"
            onClick={linkEmail}
            aria-label="Link your email"
          >
            Link Email
          </Button>
        </div>
      </div>
    );
  }

  // Show username prompt after login
  if (ready && user && needsUsername) {
    return (
      <div className="flex flex-col gap-6 w-full justify-center max-w-xl mx-auto h-screen">
        <div className="flex flex-col gap-4">
          <h1 className="text-black text-2xl font-inktrap uppercase text-center">
            WELCOME TO THE IRL NETWORK
          </h1>
          <p className="text-black text-lg font-inktrap text-center">
            Choose your username to start earning points
          </p>

          <div className="bg-white rounded-2xl p-4 mb-4">
            <p className="text-sm text-gray-600 mb-3 font-inktrap">
              ENTER YOUR USERNAME
            </p>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-50 border-0 rounded-full pl-4 pr-4 py-3 text-black placeholder:text-gray-500 font-inktrap focus:outline-none"
              maxLength={20}
              disabled={isCreatingPlayer}
            />
          </div>

          <Button
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-inktrap py-3 rounded-full disabled:opacity-50 uppercase"
            onClick={handleCreatePlayer}
            disabled={!username.trim() || isCreatingPlayer}
          >
            {isCreatingPlayer ? "CREATING PLAYER..." : "START EARNING"}
            {!isCreatingPlayer && (
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </Button>

          <div className="flex justify-between items-center mt-8">
            <div className="flex flex-col gap-1">
              <p className="text-black text-sm font-inktrap">Powered by</p>
              <img
                src="/refraction.png"
                alt="Refraction"
                className="w-auto h-[16px]"
              />
            </div>
        
          </div>
        </div>
      </div>
    );
  }

  if (ready && !user) {
    return (
      <div className="flex flex-col gap-6 w-full justify-center max-w-xl mx-auto">
        <div className="flex flex-col gap-1 p-0 pt-10">
          <h3 className="text-black font-inktrap uppercase">
            CHECK IN TO
          </h3>
          <p
            style={{ lineHeight: "60px" }}
            className="text-black text-6xl font-inktrap uppercase leading-2.5"
          >
            EARN <br/> POINTS & REWARDS
          </p>
          <h3 className="text-black  font-inktrap uppercase">
            ON THE IRL NETWORK
          </h3>
          
        </div>

        <div className="flex justify-between items-center gap-1">
          <div className="flex flex-col gap-1">
            <p className="text-black text-sm font-inktrap ">Powered by</p>
            <img
              src="/refraction.png"
              alt="Refraction"
              className="w-auto h-[16px]"
            />
          </div>
          </div>
          
          <div className="flex justify-between items-center gap-1">
          <div className="flex-1">
            <h4>
          <Button
            className="bg-white text-black rounded-full hover:bg-white/80 justify-between w-full max-w-4xl font-light text-left font-inktrap my-4 px-6"
            onClick={handleLogin}
          >
            <h4 className="font-light">Check In To Earn IRL Points</h4>
            <Image
              src="/home/arrow-right.svg"
              alt="arrow-right"
              width={20}
              height={20}
              className="w-5 h-5"
            />
          </Button>
          </h4>
          </div>
          
        </div>

        <div className="flex flex-col gap-3  justify-between">
          <div className="flex flex-col gap-3 justify-between py-10 ">
            <div
              style={{
                backgroundImage: "url('/checkpoint.svg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              className="flex flex-col gap-3 justify-between h-[calc(100dvh-5rem)] p-4 rounded-2xl overflow-hidden"
            >
              <div className="display2 text-[#FFE600] font-bold leading-tight mb-6 sm:mb-8 font-inktrap w-full text-right sm:text-left">
                {language === "english"
                  ? "BE THE FIRST TO ACCESS THE IRL AIRDROP"
                  : "INSCRIVEZ-VOUS À LA CHASSE AU TRÉSOR DU VILLAGE NUMÉRIQUE MUTEK POUR GAGNER DES POINTS ET DES RÉCOMPENSES SUR LE RÉSEAU IRL\n\nVISITEZ LES 5 POINTS DE CONTRÔLE IRL POUR AVOIR UNE CHANCE DE GAGNER UN PASSEPORT MUTEK 2026\n\n "}
              </div>

              <p className="body-large leading-relaxed text-[#FFE600]">
                {language === "english"
                  ? `Powered by Refraction, the IRL network uses blockchain technology to reward audiences, artists and fans for creating and engaging with culture. \n\nCheck in to earn IRL, gain exclusive access to experiences and rewards, and help build the new creative economy.`
                  : `Propulsé par Refraction, IRL est un système de récompenses culturelles qui vous permet de gagner des points en participant à des événements que vous aimez déjà, comme des fêtes, des concerts, des expositions ou de petites quêtes en ligne.\n\nInscrivez-vous pour gagner des points, obtenir un accès exclusif à des expériences et des récompenses, et contribuer à bâtir la nouvelle économie créative.`}
              </p>
            </div>
          </div>
          {/* Language Toggle */}
          {multiple_language && (
            <div className="flex justify-center mb-4">
              <div className="flex bg-gray-800 rounded-full p-1">
                <button
                  onClick={() => setLanguage("english")}
                  className={`px-4 py-2 rounded-full text-sm font-inktrap transition-colors ${
                    language === "english"
                      ? "bg-yellow-400 text-black"
                      : "text-white hover:text-gray-300"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage("french")}
                  className={`px-4 py-2 rounded-full text-sm font-inktrap transition-colors ${
                    language === "french"
                      ? "bg-yellow-400 text-black"
                      : "text-white hover:text-gray-300"
                  }`}
                >
                  FR
                </button>
              </div>
            </div>
          )}

           {/* Claim Points Section */}
          <section className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-48 lg:pb-10">
            <div className="max-w-[468px] mx-auto text-center flex flex-col items-center justify-center gap-8 sm:gap-10">
              <div className="text-black font-bold font-inktrap leading-tight display1">
                CLAIM
              </div>
              <div className="text-black font-bold font-inktrap leading-tight display2 -mt-8">
                YOUR POINTS
              </div>
              <p className="text-black body-large leading-relaxed max-w-2xl mx-auto ">
                Check in to earn points on the IRL network, with instant access to
                future rewards and experiences.
              </p>
              <Link className="w-full" href="/interactive-map">
                <Button
                  size="lg"
                  className="flex items-center gap-2 justify-between bg-white hover:bg-white/90 font-inktrap text-black text-sm sm:text-base px-4 py-3 sm:py-4 rounded-full w-full"
                >
                  <h4 className="text-black font-light">Check In to Earn Points</h4>
                  <Image
                    src="/home/arrow-right.svg"
                    alt="arrow-right"
                    width={24}
                    height={24}
                    className="w-5 h-5 sm:w-6 sm:h-6"
                  />
                </Button>
              </Link>
            </div>
          </section>
            {/* Social Media Section */}
      {/* Newsletter & Social Media Section */}
      <section className="py-8 px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="flex flex-col lg:flex-row justify-between gap-8 lg:gap-20">
          {/* Column 1: Social Media (Mobile Top) */}
          <div className="w-full lg:w-1/2 order-1 items-center justify-center lg:order-2">
             <div className="text-black body-small font-abc-monument-regular uppercase mb-4 text-center">
               Follow
             </div>
            <div className="flex justify-between gap-4 sm:gap-6">
              <Link
                target="_blank"
                href="https://x.com/RefractionDAO"
                className="hover:opacity-80 transition-opacity"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
                >
                  <path
                    d="M33.2016 10H38.1088L27.3888 21.8611L40 38H30.1248L22.392 28.2109L13.5424 38H8.6304L20.0976 25.3144L8 10H18.1248L25.1168 18.9476L33.2016 10ZM31.48 35.1564H34.2L16.6464 12.6942H13.728L31.48 35.1564Z"
                    fill="black"
                  />
                </svg>
              </Link>
              <Link
                target="_blank"
                href="https://app.towns.com/t/0xf19e5997fa4df2e12a3961fc7e9ad09c7a301244/"
                className="hover:opacity-80 transition-opacity"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
                >
                  <path
                    d="M34.6764 9.28809C35.9346 9.32077 38.4631 10.0824 38.5153 12.8672C38.5673 15.6525 38.5369 17.7375 38.5153 18.4316C38.2983 19.2994 37.3766 21.0413 35.4244 21.0674C33.837 21.0674 33.8299 22.1295 34.025 22.6611V31.9678C34.0467 32.4234 33.8689 33.5884 32.984 34.6035C32.0989 35.6187 30.7278 36.9567 30.1529 37.499C29.9577 37.9003 29.0664 38.7031 27.0621 38.7031H19.6432C18.5478 38.4862 16.3501 37.4212 16.3238 34.8965C16.2913 31.7402 16.3239 29.2014 13.2653 29.0713C10.8187 28.967 9.75188 26.6205 9.52404 25.46V20.416C9.50244 20.0579 9.60829 19.1602 10.2067 18.4316C10.8054 17.7028 14.2961 13.1382 15.9664 10.9473C16.3355 10.394 17.6655 9.28809 20.0338 9.28809H34.6764ZM19.7408 11.8584C18.3091 11.8584 18.0383 12.6184 18.0817 12.998C18.06 13.8877 18.0296 15.9071 18.0817 16.8701C18.1339 17.8325 18.9051 18.0303 19.2848 18.0088H22.0836C23.1769 18.0088 23.4284 18.8116 23.4176 19.2129V28.4531C23.4176 29.6766 24.199 29.9397 24.5895 29.918C25.7611 29.9288 28.3576 29.944 29.3727 29.918C30.3871 29.8917 30.6197 29.0831 30.609 28.6816V19.2129C30.609 18.1717 31.4545 17.9763 31.8776 18.0088C32.4849 18.0305 33.9274 18.0608 34.8385 18.0088C35.7492 17.9567 35.9993 17.2282 36.0104 16.8701V12.998C36.0104 12.139 35.229 11.8801 34.8385 11.8584H19.7408Z"
                    fill="black"
                  />
                </svg>
              </Link>
              <Link
                target="_blank"
                href="https://farcaster.xyz/refraction"
                className="hover:opacity-80 transition-opacity"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
                >
                  <path
                    d="M32.2658 8.42285H15.7351C13.7116 8.42285 11.7709 9.22668 10.3401 10.6575C8.9093 12.0883 8.10547 14.0289 8.10547 16.0524L8.10547 31.9474C8.10547 33.9709 8.9093 35.9115 10.3401 37.3423C11.7709 38.7732 13.7116 39.577 15.7351 39.577H32.2658C34.2893 39.577 36.2299 38.7732 37.6607 37.3423C39.0916 35.9115 39.8954 33.9709 39.8954 31.9474V16.0524C39.8954 14.0289 39.0916 12.0883 37.6607 10.6575C36.2299 9.22668 34.2893 8.42285 32.2658 8.42285ZM33.3467 31.1606V31.8282C33.4365 31.8184 33.5274 31.8275 33.6135 31.8549C33.6996 31.8822 33.7791 31.9273 33.8468 31.9871C33.9145 32.047 33.969 32.1203 34.0067 32.2024C34.0444 32.2845 34.0646 32.3736 34.0659 32.464V33.2164H27.2536V32.4627C27.2551 32.3723 27.2754 32.2832 27.3133 32.2012C27.3512 32.1191 27.4058 32.0459 27.4736 31.9862C27.5415 31.9264 27.621 31.8815 27.7072 31.8543C27.7934 31.8271 27.8843 31.8182 27.9742 31.8282V31.1606C27.9742 30.8692 28.1768 30.6281 28.4484 30.5539L28.4351 24.7735C28.2258 22.4727 26.2628 20.6699 23.8746 20.6699C21.4864 20.6699 19.5234 22.4727 19.3141 24.7735L19.3008 30.546C19.6028 30.6016 20.0055 30.8215 20.0161 31.1606V31.8282C20.1059 31.8184 20.1968 31.8275 20.2829 31.8549C20.3691 31.8822 20.4485 31.9273 20.5162 31.9871C20.5839 32.047 20.6384 32.1203 20.6761 32.2024C20.7139 32.2845 20.734 32.3736 20.7353 32.464V33.2164H13.923V32.4627C13.9245 32.3724 13.9448 32.2835 13.9826 32.2015C14.0204 32.1196 14.0749 32.0464 14.1426 31.9867C14.2103 31.927 14.2897 31.882 14.3757 31.8548C14.4618 31.8275 14.5525 31.8184 14.6423 31.8282V31.1606C14.6423 30.8255 14.9085 30.5592 15.2436 30.5354V20.0778H14.5946L13.7866 17.3876H17.2848V14.7835H30.4644V17.3876H34.2024L33.3944 20.0765H32.7453V30.5354C33.0791 30.5579 33.3467 30.8268 33.3467 31.1606Z"
                    fill="black"
                  />
                </svg>
              </Link>
              <Link
                target="_blank"
                href="https://www.instagram.com/refractionfestival/"
                className="hover:opacity-80 transition-opacity"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
                >
                  <path
                    d="M24 4.32187C30.4125 4.32187 31.1719 4.35 33.6281 4.4625C36.0844 4.575 37.1625 4.90312 37.8844 5.1375C38.8219 5.4375 39.5063 5.79687 40.2281 6.51562C40.9594 7.24375 41.3125 7.91875 41.6125 8.85625C41.8469 9.57812 42.175 10.6562 42.2875 13.1125C42.4 15.5688 42.4281 16.3281 42.4281 22.7406C42.4281 29.1531 42.4 29.9125 42.2875 32.3688C42.175 34.825 41.8469 35.9031 41.6125 36.625C41.3125 37.5625 40.9531 38.2469 40.2344 38.9688C39.5063 39.7 38.8313 40.0531 37.8938 40.3531C37.1719 40.5875 36.0938 40.9156 33.6375 41.0281C31.1813 41.1406 30.4219 41.1688 24.0094 41.1688C17.5969 41.1688 16.8375 41.1406 14.3813 41.0281C11.925 40.9156 10.8469 40.5875 10.125 40.3531C9.1875 40.0531 8.50312 39.6937 7.78125 38.975C7.05 38.2469 6.69687 37.5719 6.39687 36.6344C6.1625 35.9125 5.83437 34.8344 5.72187 32.3781C5.60937 29.9219 5.58125 29.1625 5.58125 22.75C5.58125 16.3375 5.60937 15.5781 5.72187 13.1219C5.83437 10.6656 6.1625 9.5875 6.39687 8.86562C6.69687 7.92812 7.05625 7.24375 7.775 6.52187C8.50312 5.79062 9.17812 5.4375 10.1156 5.1375C10.8375 4.90312 11.9156 4.575 14.3719 4.4625C16.8281 4.35 17.5875 4.32187 24 4.32187ZM24 12.2031C17.3438 12.2031 12.2031 17.3438 12.2031 24C12.2031 30.6562 17.3438 35.7969 24 35.7969C30.6562 35.7969 35.7969 30.6562 35.7969 24C35.7969 17.3438 30.6562 12.2031 24 12.2031ZM24 31.3125C19.8187 31.3125 16.4875 27.9813 16.4875 24C16.4875 20.0187 19.8187 16.6875 24 16.6875C28.1813 16.6875 31.5125 20.0187 31.5125 24C31.5125 27.9813 28.1813 31.3125 24 31.3125ZM37.8844 11.6531C37.8844 10.1625 36.6781 8.95625 35.1875 8.95625C33.6969 8.95625 32.4906 10.1625 32.4906 11.6531C32.4906 13.1438 33.6969 14.35 35.1875 14.35C36.6781 14.35 37.8844 13.1438 37.8844 11.6531Z"
                    fill="black"
                  />
                </svg>
              </Link>
              <Link
                target="_blank"
                href="https://t.me/refractioncommunity"
                className="hover:opacity-80 transition-opacity"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"
                >
                  <path
                    d="M24 4C12.954 4 4 12.954 4 24C4 35.046 12.954 44 24 44C35.046 44 44 35.046 44 24C44 12.954 35.046 4 24 4ZM35.607 15.607L33.393 35.607C33.179 36.821 32.571 37.071 31.5 36.607L24 31.607L20.5 35C20.179 35.321 19.893 35.607 19.25 35.607L19.607 28.607L31.5 17.607C31.857 17.286 31.429 17.071 30.964 17.393L16.5 26.607L9.607 24.607C8.393 24.179 8.393 23.5 9.857 23.107L34.143 14.393C35.179 14.036 36.071 14.607 35.607 15.607Z"
                    fill="black"
                  />
                </svg>
              </Link>
            </div>
          </div>

          {/* Column 2: Newsletter Signup (Mobile Bottom) */}
          {show_newsletter && (
            <div className="w-full lg:w-1/2 order-2 lg:order-1">
              <h3 className="text-black body-large mb-6 uppercase lg:normal-case">
                Stay Up to Date With Our Newsletter
              </h3>
              <form className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-full text-black placeholder-gray-500 focus:outline-none focus:border-black"
                  value="you@yourname.com"
                  required
                />

                <Button
                  type="submit"
                  size="lg"
                  className="bg-[#EDEDED] hover:bg-gray-800 text-black font-inktrap w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center"
                >
                  <Image
                    src="/home/arrow-right.svg"
                    alt="arrow-right"
                    width={24}
                    height={24}
                    className="w-5 h-5 sm:w-6 sm:h-6"
                  />
                </Button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* Footer Section */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-24 px-4 sm:px-6">
        <img
          src="/irlfooterlogo.svg"
          alt="irl"
          className="w-full h-auto mt-6 sm:mt-8 md:mt-10 max-w-full object-contain block lg:hidden"
        />
        <img
          src="/home/footer.svg"
          alt="irl"
          className="w-full h-auto mt-6 sm:mt-8 md:mt-10 max-w-full object-contain hidden lg:block"
        />
        <div className="w-full flex justify-center items-center">
          <p className="body-small text-white dark:text-white font-mono tracking-wide uppercase">
            copyright &bull; refraction &bull; 2025
          </p>
        </div>
      </section>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
