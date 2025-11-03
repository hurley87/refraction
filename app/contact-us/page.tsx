"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function ContactUs() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    const data = {
      name: formData.name,
      email: formData.email,
      message: formData.message,
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (response.ok) {
        try {
          const responseText = await response.text();
          console.log('Raw response text:', responseText);
          
          if (responseText.trim() === '') {
            console.log('Empty response body, treating as success');
            setSubmitStatus('success');
            setFormData({ name: '', email: '', message: '' });
          } else {
            const responseData = JSON.parse(responseText);
            console.log('Success response:', responseData);
            setSubmitStatus('success');
            setFormData({ name: '', email: '', message: '' });
          }
        } catch (parseError) {
          console.error('Error parsing success response:', parseError);
          setSubmitStatus('error');
        }
      } else {
        try {
          const errorData = await response.json();
          console.error('Error response:', errorData);
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #EE91B7 0%, #FFE600 37.5%, #1BA351 66.34%, #61BFD1 100%)",
      }}
      className="min-h-screen"
    >
      {/* Logo/Header */}
      <Link href="/">
      <div className="absolute top-4 sm:top-6 md:top-8 left-4 sm:left-6 md:left-8 lg:left-16 w-[40px] h-[40px] sm:w-[40px] sm:h-[40px] md:w-[40px] md:h-[40px] bg-[#313131] rounded-full px-2 flex items-center justify-center z-10">
        
        <Image src="/home/IRL.png" alt="irl" width={27.312} height={14} />
        
      </div>
      </Link>

      <div className="container mx-auto px-4 max-w-2xl pt-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-inktrap text-black mb-6">
            Partner with IRL
          </h1>
          <p className="text-lg text-black font-inktrap">
            Ready to become an affiliate partner? We&apos;d love to hear from you.
          </p>
        </div>

        {/* Contact Form */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20 bg-opacity-90">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block body-small text-gray-700 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-transparent outline-none font-mono transition-colors"
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block body-small  text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your.email@example.com"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-transparent outline-none font-mono transition-colors"
              />
            </div>

            {/* Message Field */}
            <div>
              <label htmlFor="message" className="block body-small  text-gray-700 mb-2">
                Partnership Proposal *
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Tell us about your partnership idea, your organization, and how you'd like to collaborate with IRL..."
                required
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-transparent outline-none font-mono resize-none transition-colors"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#313131] text-white px-6 py-4 rounded-full font-inktrap hover:bg-[#1a1a1a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300"
            >
              {isSubmitting ? 'Sending...' : 'Send Partnership Request'}
            </button>

            {/* Status Messages */}
            {submitStatus === 'success' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-mono">
                  Thank you for your partnership request! We&apos;ll review your proposal and get back to you within 2-3 business days.
                </p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-inktrap">
                  There was an error sending your message. Please try again or contact us directly.
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Additional Info */}
     
      </div>

      {/* Social Media Section */}
      <section className="py-8 px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="flex flex-col items-center">
          {/* Social Media - Centered on Desktop */}
          <div className="w-full sm:max-w-md">
            <h3 className="text-black font-inktrap text-lg font-bold mb-4 text-center">
              Follow Us
            </h3>
            <div className="flex justify-between sm:justify-center gap-4 sm:gap-6">
              <Link
                target="_blank"
                href="https://x.com/refraction_irl"
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
                href="https://farcaster.xyz/irl-energy"
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
                href="https://www.instagram.com/irl_energy/"
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
              </Link>
              <Link
                target="_blank"
                href="https://t.me/irlnetwork"
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
  );
}
