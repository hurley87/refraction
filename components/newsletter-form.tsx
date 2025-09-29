"use client";

import { useState } from 'react';
import Image from 'next/image';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error' | 'already-subscribed'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

      console.log('Newsletter response status:', response.status);
      console.log('Newsletter response ok:', response.ok);

      if (response.ok) {
        try {
          const responseData = await response.json();
          console.log('Newsletter success response:', responseData);
          
          if (responseData.alreadySubscribed) {
            setSubmitStatus('already-subscribed');
            setMessage('You are already subscribed to our newsletter!');
          } else {
            setSubmitStatus('success');
            setMessage('Thanks for subscribing! We will keep you updated.');
          }
          setEmail(''); // Clear the form
        } catch (parseError) {
          console.error('Error parsing newsletter success response:', parseError);
          setSubmitStatus('error');
          setMessage('Something went wrong. Please try again.');
        }
      } else {
        try {
          const errorData = await response.json();
          console.error('Newsletter error response:', errorData);
          setSubmitStatus('error');
          setMessage(errorData.error || 'Failed to subscribe. Please try again.');
        } catch (parseError) {
          console.error('Error parsing newsletter error response:', parseError);
          setSubmitStatus('error');
          setMessage('Something went wrong. Please try again.');
        }
      }
    } catch (error) {
      console.error('Newsletter fetch error:', error);
      setSubmitStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-full text-black placeholder-gray-500 focus:outline-none focus:border-black"
          required
          disabled={isSubmitting}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Image
              src="/white-arrow-right.svg"
              alt="arrow-right"
              width={24}
              height={24}
              className="w-5 h-5 sm:w-6 sm:h-6"
            />
          )}
        </button>
      </form>

      {/* Status Messages */}
      {submitStatus === 'success' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm font-mono">
            {message}
          </p>
        </div>
      )}

      {submitStatus === 'already-subscribed' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm font-mono">
            {message}
          </p>
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm font-mono">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}
