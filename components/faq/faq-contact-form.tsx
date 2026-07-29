'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type SubmitStatus = 'idle' | 'success' | 'error';

const FIELD_CLASS =
  'w-full border border-[#3A3A3A] bg-[#1A1A1A] px-4 py-3 body-medium text-white outline-none transition-colors placeholder:text-[#757575] focus:border-[#FFF200]';

/**
 * FAQ contact form — submits to `/api/contact` (Airtable) so the public
 * inbox is not exposed via mailto.
 */
export function FaqContactForm({ className }: { className?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          message: formData.message.trim(),
        }),
      });

      if (!response.ok) {
        setSubmitStatus('error');
        return;
      }

      setSubmitStatus('success');
      setFormData({ name: '', email: '', message: '' });
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex w-full max-w-xl flex-col gap-4', className)}
      noValidate
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="faq-contact-name" className="body-small text-[#DBDBDB]">
          Name *
        </label>
        <input
          id="faq-contact-name"
          name="name"
          type="text"
          required
          maxLength={100}
          autoComplete="name"
          value={formData.name}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, name: event.target.value }))
          }
          placeholder="Your name"
          className={FIELD_CLASS}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="faq-contact-email"
          className="body-small text-[#DBDBDB]"
        >
          Email *
        </label>
        <input
          id="faq-contact-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          value={formData.email}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, email: event.target.value }))
          }
          placeholder="you@example.com"
          className={FIELD_CLASS}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="faq-contact-message"
          className="body-small text-[#DBDBDB]"
        >
          Message *
        </label>
        <textarea
          id="faq-contact-message"
          name="message"
          required
          maxLength={2000}
          rows={5}
          value={formData.message}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, message: event.target.value }))
          }
          placeholder="How can we help?"
          className={cn(FIELD_CLASS, 'resize-y min-h-[120px]')}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="label-large flex h-11 min-h-[44px] w-full items-center justify-center bg-white px-4 py-2 uppercase text-[#171717] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Sending…' : 'Send message'}
      </button>

      {submitStatus === 'success' ? (
        <p className="body-medium text-[#1BA351]" role="status">
          Thanks — your message was sent. We&apos;ll get back to you as soon as
          we can.
        </p>
      ) : null}

      {submitStatus === 'error' ? (
        <p className="body-medium text-[#F87171]" role="alert">
          Something went wrong. Please try again in a moment.
        </p>
      ) : null}
    </form>
  );
}
