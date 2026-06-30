'use client';

import { useState } from 'react';
import Image from 'next/image';
import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error' | 'already-subscribed'
  >('idle');
  const [message, setMessage] = useState('');

  const handleNewsletterSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const responseData = await response.json();

        if (responseData.alreadySubscribed) {
          setSubmitStatus('already-subscribed');
          setMessage('You are already subscribed!');
        } else {
          setSubmitStatus('success');
          setMessage('Thanks for subscribing!');
        }
        setEmail('');
      } else {
        const errorData = await response.json();
        setSubmitStatus('error');
        setMessage(errorData.error || 'Failed to subscribe. Please try again.');
      }
    } catch (error) {
      console.error('Newsletter error:', error);
      setSubmitStatus('error');
      setMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const newsletterInputClassName =
    'h-10 border border-white/25 bg-white/10 px-4 text-[15px] text-white placeholder:text-[#7d7d7d] focus:outline-none focus:ring-2 focus:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50';

  const newsletterButtonClassName =
    'flex h-10 w-10 shrink-0 items-center justify-center bg-[#454545] transition-colors hover:bg-[#b5b5b5] disabled:cursor-not-allowed disabled:opacity-50';

  const copyrightStyle = {
    fontFamily: '"Special Gothic Expanded One", sans-serif',
    fontSize: '8px',
    fontWeight: 400,
    lineHeight: 'normal',
  } as const;

  const copyrightClassName = 'text-center text-[#A9A9A9]';

  // Social media icons component for reuse
  const SocialIcons = () => (
    <div className="flex w-auto items-center justify-center gap-[var(--sds-size-space-800)]">
      <a
        href="https://x.com/irl_energy"
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
            fill="#ffffff"
          />
        </svg>
      </a>

      <a
        href="https://www.instagram.com/irl_energy/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:bg-white/10"
        aria-label="Follow us on Instagram"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          className="h-12 w-12"
        >
          <path
            d="M24 4.32187C30.4125 4.32187 31.1719 4.35 33.6281 4.4625C36.0844 4.575 37.1625 4.90312 37.8844 5.1375C38.8219 5.4375 39.5063 5.79687 40.2281 6.51562C40.9594 7.24375 41.3125 7.91875 41.6125 8.85625C41.8469 9.57812 42.175 10.6562 42.2875 13.1125C42.4 15.5688 42.4281 16.3281 42.4281 22.7406C42.4281 29.1531 42.4 29.9125 42.2875 32.3688C42.175 34.825 41.8469 35.9031 41.6125 36.625C41.3125 37.5625 40.9531 38.2469 40.2344 38.9688C39.5063 39.7 38.8313 40.0531 37.8938 40.3531C37.1719 40.5875 36.0938 40.9156 33.6375 41.0281C31.1813 41.1406 30.4219 41.1688 24.0094 41.1688C17.5969 41.1688 16.8375 41.1406 14.3813 41.0281C11.925 40.9156 10.8469 40.5875 10.125 40.3531C9.1875 40.0531 8.50312 39.6937 7.78125 38.975C7.05 38.2469 6.69687 37.5719 6.39687 36.6344C6.1625 35.9125 5.83437 34.8344 5.72187 32.3781C5.60937 29.9219 5.58125 29.1625 5.58125 22.75C5.58125 16.3375 5.60937 15.5781 5.72187 13.1219C5.83437 10.6656 6.1625 9.5875 6.39687 8.86562C6.69687 7.92812 7.05625 7.24375 7.775 6.52187C8.50312 5.79062 9.17812 5.4375 10.1156 5.1375C10.8375 4.90312 11.9156 4.575 14.3719 4.4625C16.8281 4.35 17.5875 4.32187 24 4.32187ZM24 12.2031C17.3438 12.2031 12.2031 17.3438 12.2031 24C12.2031 30.6562 17.3438 35.7969 24 35.7969C30.6562 35.7969 35.7969 30.6562 35.7969 24C35.7969 17.3438 30.6562 12.2031 24 12.2031ZM24 31.3125C19.8187 31.3125 16.4875 27.9813 16.4875 24C16.4875 20.0187 19.8187 16.6875 24 16.6875C28.1813 16.6875 31.5125 20.0187 31.5125 24C31.5125 27.9813 28.1813 31.3125 24 31.3125ZM37.8844 11.6531C37.8844 10.1625 36.6781 8.95625 35.1875 8.95625C33.6969 8.95625 32.4906 10.1625 32.4906 11.6531C32.4906 13.1438 33.6969 14.35 35.1875 14.35C36.6781 14.35 37.8844 13.1438 37.8844 11.6531Z"
            fill="#ffffff"
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          focusable={false}
        >
          <path
            d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"
            fill="#ffffff"
          />
        </svg>
      </a>
    </div>
  );

  return (
    <footer className="relative w-full max-w-md mx-auto bg-[#131313] text-white md:max-w-full">
      {/* Mobile Layout */}
      <div className="relative w-full pb-8 pt-[150px] md:hidden">
        <div className="relative z-20 mx-auto flex max-w-md flex-col px-6">
          {/* Newsletter section */}
          <div className="flex w-full flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <WelcomeEllipse />
              <p className="title4 text-white">
                Stay up to date with our newsletter
              </p>
            </div>
            <form
              onSubmit={handleNewsletterSubmit}
              className="w-full space-y-2"
            >
              <div className="flex w-full items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@gmail.com"
                  required
                  disabled={isSubmitting}
                  className={`flex-1 ${newsletterInputClassName}`}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={newsletterButtonClassName}
                  aria-label="Submit newsletter signup"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin  border-2 border-black border-t-transparent" />
                  ) : (
                    <Image
                      src="/arrow-right.svg"
                      alt=""
                      width={20}
                      height={20}
                      className="brightness-0 invert"
                    />
                  )}
                </button>
              </div>

              {/* Status messages */}
              {submitStatus === 'success' && (
                <p className="text-xs text-green-400">{message}</p>
              )}
              {submitStatus === 'already-subscribed' && (
                <p className="text-xs text-blue-400">{message}</p>
              )}
              {submitStatus === 'error' && (
                <p className="text-xs text-red-400">{message}</p>
              )}
            </form>
          </div>
          <div className="mt-[89px] flex flex-col items-center gap-3">
            <p className="text-center label-small font-medium uppercase text-[#ededed]">
              Follow
            </p>
            <SocialIcons />
          </div>
        </div>

        {/* Wordmark — 32px after the social section */}
        <div className="mt-8 flex flex-col items-center gap-3 px-6">
          <Image
            src="/irl-svg/irl-logo-new-yellow.svg"
            alt="IRL"
            width={133}
            height={71}
            className="h-[71px] w-[133px] object-contain"
            unoptimized
          />
          <p className={copyrightClassName} style={copyrightStyle}>
            © Copyright IRL 2026
          </p>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden w-full bg-[#131313] text-white md:block">
        <div className="w-full px-6 pt-20 pb-[60px] md:px-8">
          <div className="mb-4 flex items-center gap-2">
            <WelcomeEllipse />
            <p className="title4 text-white">
              Stay up to date with our newsletter
            </p>
          </div>

          <div className="flex items-center">
            <form
              onSubmit={handleNewsletterSubmit}
              className="flex min-w-0 flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@gmail.com"
                  required
                  disabled={isSubmitting}
                  className={`w-[280px] ${newsletterInputClassName}`}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={newsletterButtonClassName}
                  aria-label="Submit newsletter signup"
                >
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin border-2 border-black border-t-transparent" />
                  ) : (
                    <Image
                      src="/arrow-right.svg"
                      alt=""
                      width={20}
                      height={20}
                      className="brightness-0 invert"
                    />
                  )}
                </button>
              </div>
              {submitStatus === 'success' && (
                <p className="text-xs text-green-400">{message}</p>
              )}
              {submitStatus === 'already-subscribed' && (
                <p className="text-xs text-blue-400">{message}</p>
              )}
              {submitStatus === 'error' && (
                <p className="text-xs text-red-400">{message}</p>
              )}
            </form>

            <div className="ml-auto flex items-center gap-[50px]">
              <div className="inline-flex h-[88px] shrink-0 flex-col items-center gap-[29px]">
                <p className="label-small font-medium uppercase text-[#ededed]">
                  Follow
                </p>
                <SocialIcons />
              </div>

              <div className="flex w-[133px] shrink-0 flex-col items-end gap-[7px]">
                <Image
                  src="/irl-svg/irl-logo-new-yellow.svg"
                  alt="IRL"
                  width={133}
                  height={71}
                  className="h-[71px] w-[133px] object-contain"
                  unoptimized
                />
                <p
                  className={`${copyrightClassName} text-right`}
                  style={copyrightStyle}
                >
                  © Copyright IRL 2026
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
