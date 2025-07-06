import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Metadata } from "next";
import Image from "next/image";

const appUrl = "https://www.irl.energy";

const frame = {
  version: "next",
  imageUrl: `${appUrl}/logo.png`,
  button: {
    title: "Join IRL",
    action: {
      type: "launch_frame",
      name: "IRL",
      url: `${appUrl}/frame`,
      splashImageUrl: `${appUrl}/logo.png`,
      splashBackgroundColor: "#FFFFFF",
    },
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "IRL",
    openGraph: {
      title: "IRL",
      description:
        "The IRL protocol empowers artists, creators, and audiences to participate in a system that incentivizes collaboration and innovation.",
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default function Home() {
  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #EE91B7 0%, #FFE600 37.5%, #1BA351 66.34%, #61BFD1 100%)",
      }}
      className="min-h-screen"
    >
      {/* Hero Section */}
      <section
        style={{
          backgroundImage: "url('/home/hero.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        className="relative min-h-screen flex flex-col justify-center items-start px-4 sm:px-8 lg:px-16 py-8 sm:py-16 rounded-b-4xl"
      >
        {/* Logo/Header */}
        <div className="absolute top-4 sm:top-8 left-4 sm:left-8 lg:left-16 w-[40px] h-[40px] bg-[#313131] rounded-full px-2 flex items-center justify-centers">
          <Image src="/home/IRL.png" alt="irl" width={27.312} height={14} />
        </div>

        {/* Main Content */}
        <div className="max-w-6xl w-full mt-16 sm:mt-24">
          <h1 className="text-[#FFE600] font-inktrap text-4xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6 sm:mb-8">
            BRIDGING CULTURE
            <br />
            AND TECHNOLOGY
          </h1>

          <p className="text-[#FFE600] font-inktrap text-lg sm:text-xl lg:text-2xl max-w-2xl mb-[57px] leading-relaxed font-light">
            Earn Points. Unlock Rewards.
            <br />
            Revolutionize the Creative Economy.
          </p>
          <div className="flex flex-col gap-4 w-[260px]">
            <Link href="/game">
              <Button
                size="lg"
                className="flex items-center gap-2 justify-between bg-white hover:bg-white/90 font-inktrap text-black text-base px-4 py-2 sm:py-4 rounded-full w-full"
              >
                <span className="text-black font-light">
                  Earn Your First Points
                </span>
                <Image
                  src="/home/arrow-right.svg"
                  alt="arrow-right"
                  width={24}
                  height={24}
                />
              </Button>
            </Link>
            <p className="text-[#FFE600] font-inktrap text-sm sm:text-base flex w-full justify-between px-4">
              <span className="text-[11px]">POWERED BY</span>
              <Image
                src="/home/Logo.svg"
                alt="refraction"
                width={100}
                height={100}
              />
            </p>
          </div>
        </div>
      </section>

      {/* IRL Section */}
      <div className="flex">
        <Image src="/home/irl-logo.png" alt="irl" width={827} height={969} />
        <div className="flex flex-col items-center justify-center h-[969px]">
          <p className="text-white text-lg sm:text-xl lg:text-3xl leading-relaxed max-w-xl text-left font-inktrap">
            {`Developed by Refraction, a pioneer in web3 arts and culture, the
                IRL protocol realizes the blockchain's potential to
                revolutionize the creative industry.`}
          </p>
        </div>
      </div>

      {/* Airdrop Section */}
      <section
        style={{
          backgroundImage: "url('/home/airdrop.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        className="relative rounded-xl w-full h-[1017px] flex justify-between p-10"
      >
        <div className="flex flex-col items-center justify-end w-full">
          <h2 className="text-[#FFE600] text-4xl sm:text-[61px] font-bold leading-tight mb-6 sm:mb-8 font-inktrap w-full">
            BE THE FIRST
            <br />
            TO ACCESS THE
            <br />
            IRL AIRDROP
          </h2>
        </div>
        <div className="flex flex-col items-center justify-end ">
          <div className="order-2 lg:order-2 max-w-lg">
            <div className="space-y-4 sm:space-y-5 mb-8 sm:mb-4">
              <p className=" text-base sm:text-lg leading-relaxed font-inktrap text-[#FFE600]">
                Powered by Refraction, the IRL network uses blockchain
                technology to reward audiences for artists with fans for
                creating and engaging with culture.
              </p>
              <p className="text-[#FFE600] font-inktrap text-base sm:text-lg leading-relaxed">
                Check in to earn IRL, gain exclusive access to experiences and
                rewards, and help build the new creative economy.
              </p>
            </div>
            <Link href="/game">
              <Button
                size="lg"
                className="flex items-center gap-2 justify-between bg-white hover:bg-white/90 font-inktrap text-black text-base px-4 py-2 sm:py-4 rounded-full w-full"
              >
                <span className="text-black font-light">
                  Earn Your First Points
                </span>
                <Image
                  src="/home/arrow-right.svg"
                  alt="arrow-right"
                  width={24}
                  height={24}
                />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Claim Points Section */}
      <section className="py-16 sm:py-24 lg:py-48 pb-16">
        <div className="max-w-[488px] mx-auto text-center flex flex-col items-center justify-center gap-8">
          <h2 className="text-black text-[40px] sm:text-[61px] font-bold font-inktrap leading-tight">
            CLAIM
            <br />
            YOUR POINTS
          </h2>
          <p className="text-black leading-relaxed max-w-2xl mx-auto font-inktrap">
            Check in to earn points on the IRL network, with instant access to
            future rewards and experiences.
          </p>
          <Link className="w-full" href="/game">
            <Button
              size="lg"
              className="flex items-center gap-2 justify-between bg-white hover:bg-white/90 font-inktrap text-black text-base px-4 py-2 sm:py-4 rounded-full w-full"
            >
              <span className="text-black font-light">
                Earn Your First Points
              </span>
              <Image
                src="/home/arrow-right.svg"
                alt="arrow-right"
                width={24}
                height={24}
              />
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-0 px-6">
        <div className="text-center font-inktrap">Follow</div>
        <div className="flex justify-center gap-4">
          <Link target="_blank" href="https://x.com/RefractionDAO">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
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
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
            >
              <path
                d="M34.6764 9.28809C35.9346 9.32077 38.4631 10.0824 38.5153 12.8672C38.5673 15.6525 38.5369 17.7375 38.5153 18.4316C38.2983 19.2994 37.3766 21.0413 35.4244 21.0674C33.837 21.0674 33.8299 22.1295 34.025 22.6611V31.9678C34.0467 32.4234 33.8689 33.5884 32.984 34.6035C32.0989 35.6187 30.7278 36.9567 30.1529 37.499C29.9577 37.9003 29.0664 38.7031 27.0621 38.7031H19.6432C18.5478 38.4862 16.3501 37.4212 16.3238 34.8965C16.2913 31.7402 16.3239 29.2014 13.2653 29.0713C10.8187 28.967 9.75188 26.6205 9.52404 25.46V20.416C9.50244 20.0579 9.60829 19.1602 10.2067 18.4316C10.8054 17.7028 14.2961 13.1382 15.9664 10.9473C16.3355 10.394 17.6655 9.28809 20.0338 9.28809H34.6764ZM19.7408 11.8584C18.3091 11.8584 18.0383 12.6184 18.0817 12.998C18.06 13.8877 18.0296 15.9071 18.0817 16.8701C18.1339 17.8325 18.9051 18.0303 19.2848 18.0088H22.0836C23.1769 18.0088 23.4284 18.8116 23.4176 19.2129V28.4531C23.4176 29.6766 24.199 29.9397 24.5895 29.918C25.7611 29.9288 28.3576 29.944 29.3727 29.918C30.3871 29.8917 30.6197 29.0831 30.609 28.6816V19.2129C30.609 18.1717 31.4545 17.9763 31.8776 18.0088C32.4849 18.0305 33.9274 18.0608 34.8385 18.0088C35.7492 17.9567 35.9993 17.2282 36.0104 16.8701V12.998C36.0104 12.139 35.229 11.8801 34.8385 11.8584H19.7408Z"
                fill="black"
              />
            </svg>
          </Link>
          <Link target="_blank" href="https://farcaster.xyz/refraction">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
            >
              <path
                d="M32.2658 8.42285H15.7351C13.7116 8.42285 11.7709 9.22668 10.3401 10.6575C8.9093 12.0883 8.10547 14.0289 8.10547 16.0524L8.10547 31.9474C8.10547 33.9709 8.9093 35.9115 10.3401 37.3423C11.7709 38.7732 13.7116 39.577 15.7351 39.577H32.2658C34.2893 39.577 36.2299 38.7732 37.6607 37.3423C39.0916 35.9115 39.8954 33.9709 39.8954 31.9474V16.0524C39.8954 14.0289 39.0916 12.0883 37.6607 10.6575C36.2299 9.22668 34.2893 8.42285 32.2658 8.42285ZM33.3467 31.1606V31.8282C33.4365 31.8184 33.5274 31.8275 33.6135 31.8549C33.6996 31.8822 33.7791 31.9273 33.8468 31.9871C33.9145 32.047 33.969 32.1203 34.0067 32.2024C34.0444 32.2845 34.0646 32.3736 34.0659 32.464V33.2164H27.2536V32.4627C27.2551 32.3723 27.2754 32.2832 27.3133 32.2012C27.3512 32.1191 27.4058 32.0459 27.4736 31.9862C27.5415 31.9264 27.621 31.8815 27.7072 31.8543C27.7934 31.8271 27.8843 31.8182 27.9742 31.8282V31.1606C27.9742 30.8692 28.1768 30.6281 28.4484 30.5539L28.4351 24.7735C28.2258 22.4727 26.2628 20.6699 23.8746 20.6699C21.4864 20.6699 19.5234 22.4727 19.3141 24.7735L19.3008 30.546C19.6028 30.6016 20.0055 30.8215 20.0161 31.1606V31.8282C20.1059 31.8184 20.1968 31.8275 20.2829 31.8549C20.3691 31.8822 20.4485 31.9273 20.5162 31.9871C20.5839 32.047 20.6384 32.1203 20.6761 32.2024C20.7139 32.2845 20.734 32.3736 20.7353 32.464V33.2164H13.923V32.4627C13.9245 32.3724 13.9448 32.2835 13.9826 32.2015C14.0204 32.1196 14.0749 32.0464 14.1426 31.9867C14.2103 31.927 14.2897 31.882 14.3757 31.8548C14.4618 31.8275 14.5525 31.8184 14.6423 31.8282V31.1606C14.6423 30.8255 14.9085 30.5592 15.2436 30.5354V20.0778H14.5946L13.7866 17.3876H17.2848V14.7835H30.4644V17.3876H34.2024L33.3944 20.0765H32.7453V30.5354C33.0791 30.5579 33.3467 30.8268 33.3467 31.1606Z"
                fill="black"
              />
            </svg>
          </Link>
          <Link
            target="_blank"
            href="https://www.instagram.com/irl_energy/"
          ></Link>
        </div>
      </section>

      {/* Footer Section */}
      <section className="py-16 sm:py-24 px-6">
        <img src="/home/footer.svg" alt="irl" className="w-full h-auto mt-10" />
      </section>
    </div>
  );
}
