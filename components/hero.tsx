"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LazyWebGLRenderer = dynamic(() => import("@/components/webgl-renderer"), {
  ssr: false,
  loading: () => <HeroGradientFallback />,
});

function HeroGradientFallback() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-950" />
  );
}

/**
 * Hero component that renders an animated WebGL gradient above the fold
 */
export default function Hero() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [shouldMountWebGL, setShouldMountWebGL] = useState(false);

  useEffect(() => {
    const target = sectionRef.current;
    if (!target || shouldMountWebGL) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries.some((entry) => entry.isIntersecting);
        if (isIntersecting) {
          setShouldMountWebGL(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0,
        rootMargin: "300px 0px",
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [shouldMountWebGL]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen overflow-hidden"
    >
      {/* WebGL Background with padding */}
      <div className="absolute inset-0 p-0 md:p-4">
        <div className="relative w-full h-full rounded-[48px] overflow-hidden">
          {shouldMountWebGL ? <LazyWebGLRenderer /> : <HeroGradientFallback />}
        </div>
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 gap-[33px]">
        {/* Heading section */}
        <div className="flex flex-col gap-4 items-start text-white text-center w-[325px] max-w-full md:w-[1177px]">
          <h1
            className="font-pleasure font-black text-[61px] leading-[64px] tracking-[-4.88px] md:text-[100px] md:leading-[100px] md:tracking-[-8px] uppercase w-full"
            style={{
              textShadow: "0 0 24px rgba(255, 255, 255, 0.54)",
            }}
          >
            Get On The List
          </h1>
          <p
            className="font-pleasure font-medium text-[25px] leading-[28px] tracking-[-0.5px] w-full"
            style={{
              textShadow: "0 0 24px rgba(255, 255, 255, 0.54)",
            }}
          >
            IRL gives you access to global cultural intel. Discover new places, earn real rewards.
          </p>
        </div>

        {/* CTA Button and Powered By section */}
        <div className="flex flex-col gap-4 items-start w-[260px] max-w-full">
          {/* Primary CTA Button */}
          <Link href="/interactive-map" className="mx-auto w-full">
            <button className="bg-white flex h-12 items-center justify-between px-4 py-2 rounded-full w-full cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="font-pleasure font-medium text-[16px] leading-[16px] text-[#313131] tracking-[-1.28px]">
                Earn Your First Points
              </span>
              <img src="/arrow-right.svg" alt="" className="w-6 h-6" />
            </button>
          </Link>

          {/* Powered By section */}
          <div className="flex items-center justify-between px-4 w-full">
            <div className="flex flex-col justify-center">
              <p className="font-['ABC_Monument_Grotesk_Semi-Mono_Unlicensed_Trial',_sans-serif] font-medium text-[11px] leading-[16px] text-white tracking-[0.44px] uppercase">
                Powered by
              </p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="102"
              height="16"
              viewBox="0 0 102 16"
              fill="none"
            >
              <path
                d="M30.3081 3.02266V3.70646H25.3332L20.9562 7.67608H30.3081V8.35988H20.9562L26.0897 13.0133H25.0209L19.5129 8.01798L25.0209 3.02266H30.3081Z"
                fill="white"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M52.4946 4.48575C53.5281 3.54895 54.9298 3.02266 56.3913 3.02266H61.525V3.70646H56.3913C55.1299 3.70646 53.9201 4.1607 53.028 4.96927C51.1705 6.65303 51.1705 9.38293 53.028 11.0667C53.9201 11.8753 55.1299 12.3295 56.3913 12.3295H61.525V13.0133H56.3913C54.9298 13.0133 53.5281 12.487 52.4946 11.5502C50.3425 9.59941 50.3425 6.43655 52.4946 4.48575Z"
                fill="white"
              />
              <path
                d="M71.4801 8.34162V13.0133H70.699V8.04835L76.2432 3.02266H77.3476L71.4801 8.34162Z"
                fill="white"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.5578 3.02266H20.845V3.70646H15.8701L11.4931 7.67608H20.845V8.35988H11.4931L15.8701 12.3295H20.845V13.0133H15.5578L10.0498 8.01798L15.5578 3.02266Z"
                fill="white"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.724976 3.02266H12.3119L6.78589 8.01912L12.3077 13.0133H11.2393L1.48142 4.19024V13.0133H0.724976V3.02266ZM2.01631 3.70661H10.4857L6.251 7.5355L2.01631 3.70661Z"
                fill="white"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M32.0801 3.02266H43.667L38.141 8.01912L43.6628 13.0133H42.5944L32.8365 4.19024V13.0133H32.0801V3.02266ZM33.3714 3.70661H41.8408L37.6061 7.5355L33.3714 3.70661Z"
                fill="white"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M63.6382 8.34162V13.0133H62.8571V8.04835L67.6202 3.73069H63.2476V3.02266H73.8785V3.73069H68.7248L63.6382 8.34162Z"
                fill="white"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M82.1414 3.57863C79.4367 3.57863 77.244 5.5662 77.244 8.01798C77.244 10.4698 79.4367 12.4573 82.1414 12.4573C84.8461 12.4573 87.0388 10.4698 87.0388 8.01798C87.0388 5.5662 84.8461 3.57863 82.1414 3.57863ZM76.4673 8.01798C76.4673 5.17735 79.0077 2.87457 82.1414 2.87457C85.2751 2.87457 87.8155 5.17735 87.8155 8.01798C87.8155 10.8586 85.2751 13.1614 82.1414 13.1614C79.0077 13.1614 76.4673 10.8586 76.4673 8.01798Z"
                fill="white"
              />
              <path
                d="M89.1476 3.02266L89.1476 13.0131H90.0271L90.0272 3.81866L100.17 13.0133H101.275L101.274 13.0131H101.275L101.275 3.02266H100.395L100.395 12.2161L90.2535 3.02268H90.0272L89.1476 3.02266Z"
                fill="white"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M49.7118 13.0131H48.8323L48.8323 8.36543H43.8164L38.6891 13.0133H37.5847L48.6059 3.02268H48.8322L49.7118 3.02266L49.7118 13.0131ZM48.8323 7.67053L48.8322 3.81866L44.583 7.67053H48.8323Z"
                fill="white"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M101.274 13.0133L101.274 13.0133L101.275 13.0133L101.275 13.0132L101.274 13.0131H101.275L101.275 3.02266H100.395L100.395 12.2161L90.2535 3.02268H90.0272L89.1476 3.02266L89.1476 13.0131H90.0271L90.0272 3.81866L100.17 13.0133H101.274ZM90.2785 4.3687L100.066 13.2411H101.526V12.919L101.526 2.79482H100.144L100.144 11.666L90.3576 2.79484H90.2785L88.8963 2.79482L88.8963 13.2409H90.2785L90.2785 4.3687ZM30.5594 3.93429H25.4374L21.5628 7.44825H30.5594V8.58772H21.563L26.6965 13.2411H24.9168L19.7857 8.58772H12.0997L15.9743 12.1017H21.0964V13.2411H15.4537L9.69445 8.01798L15.4537 2.79482H21.0964V3.93429H15.9743L12.0997 7.44825H19.7857L24.9168 2.79482H30.5594V3.93429ZM19.8899 7.67608H11.4931L15.8701 3.70646H20.845V3.02266H15.5578L10.0498 8.01798L15.5578 13.0133H20.845V12.3295H15.8701L11.4931 8.35988H19.8899L25.0209 13.0133H26.0897L20.9562 8.35988H30.3081V7.67608H20.9562L25.3332 3.70646H30.3081V3.02266H25.0209L19.8899 7.67608ZM61.7763 2.79482V3.93429H56.3913C55.1965 3.93429 54.0506 4.36454 53.2058 5.13038C51.4464 6.72516 51.4464 9.3108 53.2058 10.9056C54.0506 11.6714 55.1965 12.1017 56.3913 12.1017H61.7763V13.2411H56.3913C54.8631 13.2411 53.3975 12.6908 52.3169 11.7113C50.0667 9.67154 50.0667 6.36442 52.3169 4.32465C53.3975 3.34512 54.8631 2.79482 56.3913 2.79482H61.7763ZM71.7314 13.2411H70.4476V7.95398L76.1391 2.79482H77.9544L71.7314 8.436V13.2411ZM71.4801 8.34162L77.3476 3.02266H76.2432L70.699 8.04835V13.0133H71.4801V8.34162ZM0.473633 2.79482H12.9198L7.14177 8.01915L12.9155 13.2411H11.1354L1.73276 4.73931V13.2411H0.473633V2.79482ZM1.48142 4.19024L11.2393 13.0133H12.3077L6.78589 8.01912L12.3119 3.02266H0.724976V13.0133H1.48142V4.19024ZM31.8287 2.79482H44.2749L38.4969 8.01915L40.6201 9.93951L48.5018 2.79484H48.5809L49.9631 2.79482L49.9631 13.2409H48.5809L48.5809 8.59327H43.9205L41.5288 10.7614L44.2706 13.2411H42.4905L40.6395 11.5675L38.7932 13.2411H36.9779L39.7307 10.7457L33.0879 4.73931V13.2411H31.8287V2.79482ZM32.8365 4.19024L40.0864 10.7455L37.5847 13.0133H38.6891L40.6393 11.2455L42.5944 13.0133H43.6628L41.1731 10.7615L43.8164 8.36543H48.8323L48.8323 13.0131H49.7118L49.7118 3.02266L48.8322 3.02268H48.6059L40.6203 10.2615L38.141 8.01912L43.667 3.02266H32.0801V13.0133H32.8365V4.19024ZM63.8895 13.2411H62.6057V7.95398L67.0134 3.95852H62.9963V2.79482H74.1298V3.95852H68.8289L63.8895 8.436V13.2411ZM63.6382 8.34162L68.7248 3.73069H73.8785V3.02266H63.2476V3.73069H67.6202L62.8571 8.04835V13.0133H63.6382V8.34162ZM56.3913 3.02266C54.9298 3.02266 53.5281 3.54895 52.4946 4.48575C50.3425 6.43655 50.3425 9.59941 52.4946 11.5502C53.5281 12.487 54.9298 13.0133 56.3913 13.0133H61.525V12.3295H56.3913C55.1299 12.3295 53.9201 11.8753 53.028 11.0667C51.1705 9.38293 51.1705 6.65303 53.028 4.96927C53.9201 4.1607 55.1299 3.70646 56.3913 3.70646H61.525V3.02266H56.3913ZM2.01631 3.70661L6.251 7.5355L10.4857 3.70661H2.01631ZM2.6242 3.93445L6.251 7.2137L9.8778 3.93445H2.6242ZM33.3714 3.70661L37.6061 7.5355L41.8408 3.70661H33.3714ZM33.9793 3.93445L37.6061 7.2137L41.2329 3.93445H33.9793ZM82.1414 3.80647C79.5755 3.80647 77.4954 5.69203 77.4954 8.01798C77.4954 10.3439 79.5755 12.2295 82.1414 12.2295C84.7073 12.2295 86.7874 10.3439 86.7874 8.01798C86.7874 5.69203 84.7073 3.80647 82.1414 3.80647ZM76.216 8.01798C76.216 5.05152 78.8689 2.64673 82.1414 2.64673C85.4139 2.64673 88.0668 5.05152 88.0668 8.01798C88.0668 10.9844 85.4139 13.3892 82.1414 13.3892C78.8689 13.3892 76.216 10.9844 76.216 8.01798ZM48.8322 3.81866L44.583 7.67053H48.8323L48.8322 3.81866ZM48.5809 4.36871L48.5809 7.44269H45.1898L48.5809 4.36871ZM77.244 8.01798C77.244 5.5662 79.4367 3.57863 82.1414 3.57863C84.8461 3.57863 87.0388 5.5662 87.0388 8.01798C87.0388 10.4698 84.8461 12.4573 82.1414 12.4573C79.4367 12.4573 77.244 10.4698 77.244 8.01798ZM82.1414 2.87457C79.0077 2.87457 76.4673 5.17735 76.4673 8.01798C76.4673 10.8586 79.0077 13.1614 82.1414 13.1614C85.2751 13.1614 87.8155 10.8586 87.8155 8.01798C87.8155 5.17735 85.2751 2.87457 82.1414 2.87457Z"
                fill="white"
              />
            </svg>
          </div>
        </div>

        {/* Learn More section */}
        <div className="flex flex-col gap-[9px] items-center pt-7 pb-0">
          <p className="font-['ABC_Monument_Grotesk_Semi-Mono_Unlicensed_Trial',_sans-serif] font-medium text-[11px] leading-[16px] text-white tracking-[0.44px] uppercase whitespace-nowrap">
            Learn More
          </p>

          <button
            onClick={() => {
              const nextSection = document.querySelector('[data-section="map"]');
              if (nextSection) {
                nextSection.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="Scroll to next section"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 45 45" fill="none">
              <path d="M37.2656 22.375C36.6224 22.375 35.744 22.7039 34.7334 23.2783C33.7409 23.8424 32.6895 24.6031 31.7188 25.377C29.3888 27.2347 27.3396 29.4249 25.7324 31.918L25.417 32.4209C24.7949 33.4397 24.1919 34.5584 23.7451 35.6621C23.2961 36.7713 23.0186 37.8338 23.0186 38.75H21.9814C21.9814 37.8338 21.7039 36.7713 21.2549 35.6621C20.9198 34.8344 20.497 33.9981 20.0439 33.2021L19.583 32.4209C17.9322 29.7187 15.7665 27.3586 13.2812 25.377C12.3105 24.6031 11.2591 23.8424 10.2666 23.2783C9.25602 22.7039 8.37762 22.375 7.73438 22.375V21.375C8.65207 21.375 9.72277 21.8192 10.7607 22.4092C11.8167 23.0094 12.9135 23.8049 13.9043 24.5947C16.4701 26.6405 18.718 29.0864 20.4365 31.8994C21.0757 32.9463 21.7077 34.1154 22.1816 35.2861C22.2972 35.5717 22.4044 35.8598 22.5 36.1475C22.5956 35.8598 22.7028 35.5717 22.8184 35.2861C23.2923 34.1154 23.9243 32.9463 24.5635 31.8994C26.282 29.0864 28.5299 26.6405 31.0957 24.5947C32.0865 23.8049 33.1833 23.0094 34.2393 22.4092C35.2772 21.8192 36.3479 21.375 37.2656 21.375V22.375ZM37.2656 8C36.6224 8 35.744 8.32892 34.7334 8.90332C33.7409 9.46745 32.6895 10.2281 31.7188 11.002C29.3888 12.8597 27.3396 15.0499 25.7324 17.543L25.417 18.0459C24.7949 19.0647 24.1919 20.1834 23.7451 21.2871C23.2961 22.3963 23.0186 23.4588 23.0186 24.375H21.9814C21.9814 23.4588 21.7039 22.3963 21.2549 21.2871C20.9198 20.4594 20.497 19.6231 20.0439 18.8271L19.583 18.0459C17.9322 15.3437 15.7665 12.9836 13.2812 11.002C12.3105 10.2281 11.2591 9.46745 10.2666 8.90332C9.25602 8.32892 8.37762 8 7.73438 8V7C8.65207 7 9.72277 7.44421 10.7607 8.03418C11.8167 8.63438 12.9135 9.42991 13.9043 10.2197C16.4701 12.2655 18.718 14.7114 20.4365 17.5244C21.0757 18.5713 21.7077 19.7404 22.1816 20.9111C22.2972 21.1967 22.4044 21.4848 22.5 21.7725C22.5956 21.4848 22.7028 21.1967 22.8184 20.9111C23.2923 19.7404 23.9243 18.5713 24.5635 17.5244C26.282 14.7114 28.5299 12.2655 31.0957 10.2197C32.0865 9.42991 33.1833 8.63438 34.2393 8.03418C35.2772 7.44421 36.3479 7 37.2656 7V8Z" fill="white"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
