"use client";

import { useState } from "react";
import Image from "next/image";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error" | "already-subscribed"
  >("idle");
  const [message, setMessage] = useState("");

  const handleNewsletterSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const responseData = await response.json();

        if (responseData.alreadySubscribed) {
          setSubmitStatus("already-subscribed");
          setMessage("You are already subscribed!");
        } else {
          setSubmitStatus("success");
          setMessage("Thanks for subscribing!");
        }
        setEmail("");
      } else {
        const errorData = await response.json();
        setSubmitStatus("error");
        setMessage(errorData.error || "Failed to subscribe. Please try again.");
      }
    } catch (error) {
      console.error("Newsletter error:", error);
      setSubmitStatus("error");
      setMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="relative w-full max-w-md mx-auto bg-[#131313] text-white">
      <div className="relative min-h-[600px] w-full overflow-hidden pb-8 pt-20 md:min-h-[700px] md:pb-24">
        <img
          src="/irl-footer-black-bg.svg"
          alt="irl"
          className="w-full h-auto mt-6 max-w-full object-contain absolute bottom-0 left-0 md:scale-75 md:translate-y-8 md:opacity-50"
        />

        {/* Footer content section */}
        <div className="relative z-20 mx-auto flex max-w-md flex-col gap-8 px-6 md:gap-6">
          {/* Social media links */}
          <div className="flex flex-col gap-3">
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.44px] text-[#ededed]">
              Follow
            </p>
            <div className="flex items-center justify-between gap-2">
              {/* X/Twitter */}
              <a
                href="https://x.com/refraction_irl"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:bg-white/10"
                aria-label="Follow us on X/Twitter"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                >
                  <path
                    d="M33.2016 10H38.1088L27.3888 21.8611L40 38H30.1248L22.392 28.2109L13.5424 38H8.6304L20.0976 25.3144L8 10H18.1248L25.1168 18.9476L33.2016 10ZM31.48 35.1564H34.2L16.6464 12.6942H13.728L31.48 35.1564Z"
                    fill="white"
                  />
                </svg>
              </a>

              {/* Towns */}
              <a
                href="https://app.towns.com/t/0xf19e5997fa4df2e12a3961fc7e9ad09c7a301244/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:bg-white/10"
                aria-label="Join us on Towns"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="49"
                  height="48"
                  viewBox="0 0 49 48"
                  fill="none"
                >
                  <path
                    d="M35.0089 9.28809C36.267 9.32062 38.7966 10.0821 38.8488 12.8672C38.9008 15.6525 38.8704 17.7375 38.8488 18.4316C38.6318 19.2993 37.7099 21.0411 35.7579 21.0674C34.1704 21.0674 34.1634 22.1296 34.3585 22.6611V31.9678C34.3802 32.4235 34.2024 33.5885 33.3175 34.6035C32.4325 35.6186 31.0614 36.9566 30.4865 37.499C30.2912 37.9003 29.399 38.7031 27.3947 38.7031H19.9767C18.8813 38.4862 16.6836 37.4212 16.6573 34.8965C16.6248 31.7402 16.6574 29.2015 13.5988 29.0713C11.1519 28.9672 10.0844 26.6205 9.85657 25.46V20.416C9.83498 20.0579 9.94168 19.1603 10.5402 18.4316C11.1389 17.7028 14.6286 13.1382 16.299 10.9473C16.6677 10.3941 17.9979 9.28821 20.3663 9.28809H35.0089ZM20.0743 11.8584C18.6426 11.8584 18.3708 12.6184 18.4142 12.998C18.3925 13.8877 18.3621 15.9071 18.4142 16.8701C18.4665 17.8328 19.2387 18.0304 19.6183 18.0088H22.4171C23.5101 18.009 23.7619 18.8116 23.7511 19.2129V28.4531C23.7511 29.6764 24.5315 29.9396 24.922 29.918C26.0933 29.9288 28.6899 29.944 29.7052 29.918C30.72 29.8919 30.9522 29.0831 30.9415 28.6816V19.2129C30.9415 18.1717 31.7881 17.9762 32.2111 18.0088C32.8186 18.0305 34.2611 18.0608 35.172 18.0088C36.0825 17.9567 36.3318 17.2282 36.3429 16.8701V12.998C36.3429 12.1391 35.5625 11.8802 35.172 11.8584H20.0743Z"
                    fill="white"
                  />
                </svg>
              </a>

              {/* Farcaster */}
              <a
                href="https://farcaster.xyz/refraction"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:bg-white/10"
                aria-label="Follow us on Farcaster"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="49"
                  height="48"
                  viewBox="0 0 49 48"
                  fill="none"
                >
                  <path
                    d="M32.932 8.42285H16.4012C14.3777 8.42285 12.4371 9.22668 11.0063 10.6575C9.57544 12.0883 8.77161 14.0289 8.77161 16.0524L8.77161 31.9474C8.77161 33.9709 9.57544 35.9115 11.0063 37.3423C12.4371 38.7732 14.3777 39.577 16.4012 39.577H32.932C34.9554 39.577 36.8961 38.7732 38.3269 37.3423C39.7577 35.9115 40.5615 33.9709 40.5615 31.9474V16.0524C40.5615 14.0289 39.7577 12.0883 38.3269 10.6575C36.8961 9.22668 34.9554 8.42285 32.932 8.42285ZM34.0128 31.1606V31.8282C34.1026 31.8184 34.1935 31.8275 34.2797 31.8549C34.3658 31.8822 34.4452 31.9273 34.513 31.9871C34.5807 32.047 34.6351 32.1203 34.6728 32.2024C34.7106 32.2845 34.7307 32.3736 34.7321 32.464V33.2164H27.9197V32.4627C27.9212 32.3723 27.9416 32.2832 27.9794 32.2012C28.0173 32.1191 28.0719 32.0459 28.1398 31.9862C28.2076 31.9264 28.2872 31.8815 28.3734 31.8543C28.4596 31.8271 28.5505 31.8182 28.6403 31.8282V31.1606C28.6403 30.8692 28.843 30.6281 29.1145 30.5539L29.1013 24.7735C28.892 22.4727 26.929 20.6699 24.5407 20.6699C22.1525 20.6699 20.1895 22.4727 19.9802 24.7735L19.967 30.546C20.269 30.6016 20.6716 30.8215 20.6822 31.1606V31.8282C20.7721 31.8184 20.863 31.8275 20.9491 31.8549C21.0352 31.8822 21.1147 31.9273 21.1824 31.9871C21.2501 32.047 21.3045 32.1203 21.3423 32.2024C21.38 32.2845 21.4002 32.3736 21.4015 32.464V33.2164H14.5892V32.4627C14.5907 32.3724 14.611 32.2835 14.6488 32.2015C14.6866 32.1196 14.7411 32.0464 14.8088 31.9867C14.8764 31.927 14.9558 31.882 15.0419 31.8548C15.1279 31.8275 15.2187 31.8184 15.3084 31.8282V31.1606C15.3084 30.8255 15.5747 30.5592 15.9098 30.5354V20.0778H15.2607L14.4527 17.3876H17.9509V14.7835H31.1305V17.3876H34.8685L34.0605 20.0765H33.4115V30.5354C33.7452 30.5579 34.0128 30.8268 34.0128 31.1606Z"
                    fill="white"
                  />
                </svg>
              </a>

              <a
                target="_blank"
                href="https://www.instagram.com/refraction_irl/"
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
                    fill="white"
                  />
                </svg>
              </a>

              {/* Telegram */}
              <a
                href="https://t.me/irlnetwork"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:bg-white/10"
                aria-label="Join us on Telegram"
              >
                <Image
                  src="/Telegram.png"
                  alt="Telegram"
                  width={48}
                  height={48}
                />
              </a>
            </div>
          </div>

          {/* Newsletter section */}
          <div className="flex w-full flex-col items-center gap-4 md:mt-4 md:mb-12">
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.44px] text-[#b5b5b5]">
              Stay Up to Date With Our Newsletter
            </p>
            <form
              onSubmit={handleNewsletterSubmit}
              className="w-full space-y-2"
            >
              <div className="flex w-full gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@gmail.com"
                  required
                  disabled={isSubmitting}
                  className="h-10 flex-1 rounded-full border border-white/25 bg-white/10 px-4 text-[15px] text-white placeholder:text-[#7d7d7d] focus:outline-none focus:ring-2 focus:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ededed] transition-colors hover:bg-[#b5b5b5] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Submit newsletter signup"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="12"
                      viewBox="0 0 18 12"
                      fill="none"
                    >
                      <path
                        d="M12 0C12 0.636 12.5498 1.58571 13.1063 2.38286C13.8218 3.41143 14.6767 4.30886 15.657 4.99371C16.392 5.50714 17.283 6 18 6M18 6C17.283 6 16.3912 6.49286 15.657 7.00629C14.6767 7.692 13.8218 8.58943 13.1063 9.61629C12.5498 10.4143 12 11.3657 12 12M18 6H0"
                        stroke="#7D7D7D"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Status messages */}
              {submitStatus === "success" && (
                <p className="text-xs text-green-400">{message}</p>
              )}
              {submitStatus === "already-subscribed" && (
                <p className="text-xs text-blue-400">{message}</p>
              )}
              {submitStatus === "error" && (
                <p className="text-xs text-red-400">{message}</p>
              )}
            </form>
          </div>
        </div>
      </div>
    </footer>
  );
}
