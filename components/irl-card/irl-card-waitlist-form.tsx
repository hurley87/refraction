'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAnalytics } from '@/components/shared/analytics-provider';
import { getSignupAttributionBodyFields } from '@/lib/analytics/attribution';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { buildIrlCardWaitlistAttribution } from '@/lib/irl-card/waitlist-attribution';
import {
  IRL_CARD_WAITLIST_COPY as COPY,
  IRL_CARD_WAITLIST_PENDING_COPY as PENDING,
} from '@/lib/irl-card/waitlist-copy';
import { buildIrlCardWaitlistShareUrl } from '@/lib/irl-card/waitlist-urls';
import { cn } from '@/lib/utils';

type CountryOption = { id: string; iso2: string; name: string };

type CityOption = {
  mapboxId: string;
  name: string;
  region: string | null;
  placeFormatted?: string | null;
};

type FieldName = 'email' | 'country' | 'city' | 'alreadyUsesIrl';
type FieldErrors = Partial<Record<FieldName, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD_ORDER: FieldName[] = ['email', 'country', 'city', 'alreadyUsesIrl'];

const INPUT_CLASS =
  'h-12 w-full rounded-none border bg-white px-3 text-base text-[#171717] placeholder:text-[#8A8A8A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF200] focus-visible:ring-offset-2 focus-visible:ring-offset-[#131313] disabled:cursor-not-allowed disabled:bg-[#EDEDED]';

function validate(values: {
  email: string;
  countryId: string;
  city: CityOption | null;
  alreadyUsesIrl: boolean | null;
}): FieldErrors {
  const errors: FieldErrors = {};
  const email = values.email.trim();
  if (!email) errors.email = PENDING.emailRequired;
  else if (!EMAIL_PATTERN.test(email)) errors.email = PENDING.emailInvalid;
  if (!values.countryId) errors.country = PENDING.countryRequired;
  if (!values.city) errors.city = PENDING.cityRequired;
  if (values.alreadyUsesIrl === null) {
    errors.alreadyUsesIrl = PENDING.alreadyUsesIrlRequired;
  }
  return errors;
}

/**
 * IRL Card waitlist form. Shows success only after the API confirms the signup
 * is stored; failures keep the entered values so the visitor can retry.
 */
export function IrlCardWaitlistForm() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { trackEvent } = useAnalytics();
  const fieldId = useId();
  const ids = {
    email: `${fieldId}-email`,
    country: `${fieldId}-country`,
    city: `${fieldId}-city`,
    cityList: `${fieldId}-city-list`,
    alreadyUsesIrl: `${fieldId}-already`,
    consent: `${fieldId}-consent`,
    note: `${fieldId}-note`,
  };

  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countriesError, setCountriesError] = useState(false);
  const [email, setEmail] = useState('');
  const [countryId, setCountryId] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [city, setCity] = useState<CityOption | null>(null);
  const [suggestions, setSuggestions] = useState<CityOption[]>([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [alreadyUsesIrl, setAlreadyUsesIrl] = useState<boolean | null>(null);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLButtonElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const alreadyYesRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const viewTrackedRef = useRef(false);
  const prefillAppliedRef = useRef(false);
  const touchedRef = useRef<Set<string>>(new Set());
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCountry = countries.find((c) => c.id === countryId) ?? null;

  useEffect(() => {
    if (viewTrackedRef.current) return;
    viewTrackedRef.current = true;
    trackEvent(ANALYTICS_EVENTS.IRL_CARD_WAITLIST_VIEWED, {
      is_signed_in: authenticated,
    });
  }, [authenticated, trackEvent]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/countries')
      .then(async (res) => {
        if (!res.ok) throw new Error('countries');
        const json = await res.json();
        if (!cancelled) {
          setCountries(
            (json.data?.countries ?? json.countries ?? []) as CountryOption[]
          );
        }
      })
      .catch(() => {
        if (!cancelled) setCountriesError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Signed-in members: prefill verified email, country and saved city.
  useEffect(() => {
    if (!ready || !authenticated || prefillAppliedRef.current) return;
    prefillAppliedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch('/api/irl-card/waitlist', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const data = json.data ?? json;
        if (cancelled) return;
        const touched = touchedRef.current;
        if (data.email && !touched.has('email')) setEmail(data.email);
        if (data.countryId && !touched.has('country')) {
          setCountryId(data.countryId);
          if (data.city && !touched.has('city')) {
            setCity(data.city);
            setCityQuery(data.city.name);
          }
        }
        if (data.isMember && !touched.has('alreadyUsesIrl')) {
          setAlreadyUsesIrl(true);
        }
      } catch {
        // Prefill is a convenience; the form still works empty.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, getAccessToken]);

  const runSuggest = useCallback(async (q: string, iso2: string) => {
    setIsSuggesting(true);
    try {
      const params = new URLSearchParams({ countryIso2: iso2, q: q.trim() });
      const res = await fetch(`/api/geo/cities/suggest?${params}`);
      if (!res.ok) throw new Error('suggest');
      const json = await res.json();
      const list = (json.data?.suggestions ??
        json.suggestions ??
        []) as CityOption[];
      setSuggestions(list);
      setActiveIndex(-1);
      setIsSuggestOpen(true);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSuggesting(false);
      setHasSearched(true);
    }
  }, []);

  useEffect(() => {
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (!selectedCountry || city || cityQuery.trim().length < 2) {
      setSuggestions([]);
      setIsSuggestOpen(false);
      setHasSearched(false);
      return;
    }
    suggestTimerRef.current = setTimeout(() => {
      void runSuggest(cityQuery, selectedCountry.iso2);
    }, 250);
    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    };
  }, [cityQuery, selectedCountry, city, runSuggest]);

  const clearFieldError = (field: FieldName) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const selectCity = (option: CityOption) => {
    touchedRef.current.add('city');
    setCity(option);
    setCityQuery(option.name);
    setSuggestions([]);
    setIsSuggestOpen(false);
    setActiveIndex(-1);
    clearFieldError('city');
  };

  const handleCityKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      if (!suggestions.length) return;
      event.preventDefault();
      setIsSuggestOpen(true);
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      if (!suggestions.length) return;
      event.preventDefault();
      setIsSuggestOpen(true);
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === 'Enter') {
      if (isSuggestOpen && activeIndex >= 0 && suggestions[activeIndex]) {
        event.preventDefault();
        selectCity(suggestions[activeIndex]);
      }
    } else if (event.key === 'Escape') {
      if (isSuggestOpen) {
        event.preventDefault();
        setIsSuggestOpen(false);
        setActiveIndex(-1);
      }
    }
  };

  const focusField = (field: FieldName) => {
    const target = {
      email: emailRef.current,
      country: countryRef.current,
      city: cityRef.current,
      alreadyUsesIrl: alreadyYesRef.current,
    }[field];
    target?.focus();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);

    const nextErrors = validate({ email, countryId, city, alreadyUsesIrl });
    setErrors(nextErrors);
    const invalidFields = FIELD_ORDER.filter((f) => nextErrors[f]);
    if (invalidFields.length > 0) {
      trackEvent(ANALYTICS_EVENTS.IRL_CARD_WAITLIST_FAILED, {
        reason: 'validation',
        fields: invalidFields,
      });
      focusField(invalidFields[0]);
      return;
    }

    setIsSubmitting(true);
    const attribution = buildIrlCardWaitlistAttribution({
      search: window.location.search,
      href: window.location.href,
      referrer: document.referrer,
      stored: getSignupAttributionBodyFields().signup_attribution,
    });

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authenticated) {
        const token = await getAccessToken().catch(() => null);
        if (token) headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch('/api/irl-card/waitlist', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: email.trim(),
          countryId,
          city: city && {
            mapboxId: city.mapboxId,
            name: city.name,
            region: city.region,
          },
          alreadyUsesIrl,
          marketingConsent,
          attribution,
        }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success || !json?.data?.joined) {
        const reason =
          res.status >= 400 && res.status < 500 ? 'validation' : 'server';
        trackEvent(ANALYTICS_EVENTS.IRL_CARD_WAITLIST_FAILED, {
          reason,
          status: res.status,
        });
        setSubmitError(
          reason === 'validation' ? PENDING.submitInvalid : PENDING.submitFailed
        );
        return;
      }

      trackEvent(ANALYTICS_EVENTS.IRL_CARD_WAITLIST_JOINED, {
        already_joined: Boolean(json.data.alreadyJoined),
        already_uses_irl: alreadyUsesIrl,
        is_signed_in: authenticated,
        country_iso2: json.data.countryIso2 ?? selectedCountry?.iso2,
        has_marketing_consent: marketingConsent,
        ...(attribution.utm_source
          ? { utm_source: attribution.utm_source }
          : {}),
        ...(attribution.utm_medium
          ? { utm_medium: attribution.utm_medium }
          : {}),
        ...(attribution.utm_campaign
          ? { utm_campaign: attribution.utm_campaign }
          : {}),
        ...(attribution.source ? { source: attribution.source } : {}),
        ...(attribution.source_ref
          ? { source_ref: attribution.source_ref }
          : {}),
      });
      setIsJoined(true);
    } catch {
      trackEvent(ANALYTICS_EVENTS.IRL_CARD_WAITLIST_FAILED, {
        reason: 'network',
      });
      setSubmitError(PENDING.submitFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isJoined) successRef.current?.focus();
  }, [isJoined]);

  const handleShare = async () => {
    const url = buildIrlCardWaitlistShareUrl(window.location.origin);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: COPY.productLabel,
          text: COPY.headline,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(PENDING.shareCopied);
    } catch {
      toast.error(PENDING.shareFailed);
    }
  };

  if (isJoined) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="flex flex-col gap-6 border border-white/15 bg-white/5 p-6 focus:outline-none"
      >
        <p className="title3 text-white">{COPY.success}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void handleShare()}
            className="flex h-12 items-center justify-center bg-[#FFF200] px-6 font-semibold uppercase text-[#171717] transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#131313]"
          >
            {PENDING.shareButton}
          </button>
          <Link
            href="/interactive-map"
            className="flex h-12 items-center justify-center border border-white/40 px-6 font-semibold uppercase text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {PENDING.exploreLink}
          </Link>
        </div>
      </div>
    );
  }

  const errorList = FIELD_ORDER.filter((f) => errors[f]);
  const describedBy = (field: FieldName, extra?: string) =>
    [errors[field] ? `${fieldId}-${field}-error` : null, extra]
      .filter(Boolean)
      .join(' ') || undefined;
  const fieldError = (field: FieldName) =>
    errors[field] ? (
      <p id={`${fieldId}-${field}-error`} className="text-sm text-[#FF8A80]">
        {errors[field]}
      </p>
    ) : null;
  const activeOptionId =
    isSuggestOpen && activeIndex >= 0
      ? `${ids.cityList}-option-${activeIndex}`
      : undefined;

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(event)}
      aria-describedby={ids.note}
      className="flex flex-col gap-5"
    >
      {errorList.length > 0 ? (
        <div
          role="alert"
          className="border border-[#FF8A80]/60 bg-[#FF8A80]/10 p-4"
        >
          <p className="font-semibold text-white">
            {PENDING.errorSummaryTitle}
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-white/90">
            {errorList.map((field) => (
              <li key={field}>
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() => focusField(field)}
                >
                  {errors[field]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.email} className="text-sm font-semibold text-white">
          {COPY.emailLabel}
        </label>
        <input
          ref={emailRef}
          id={ids.email}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          required
          aria-required="true"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={describedBy('email')}
          value={email}
          onChange={(event) => {
            touchedRef.current.add('email');
            setEmail(event.target.value);
            clearFieldError('email');
          }}
          className={cn(
            INPUT_CLASS,
            errors.email ? 'border-[#FF8A80]' : 'border-[#DBDBDB]'
          )}
        />
        {fieldError('email')}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={ids.country}
          className="text-sm font-semibold text-white"
        >
          {COPY.countryLabel}
        </label>
        <Select
          value={countryId || undefined}
          onValueChange={(value) => {
            touchedRef.current.add('country');
            setCountryId(value);
            setCity(null);
            setCityQuery('');
            clearFieldError('country');
          }}
          disabled={countriesError || countries.length === 0}
        >
          <SelectTrigger
            ref={countryRef}
            id={ids.country}
            aria-required="true"
            aria-invalid={Boolean(errors.country)}
            aria-describedby={describedBy('country')}
            className={cn(
              'h-12 rounded-none bg-white text-base text-[#171717] focus:ring-2 focus:ring-[#FFF200] focus:ring-offset-2 focus:ring-offset-[#131313]',
              errors.country ? 'border-[#FF8A80]' : 'border-[#DBDBDB]'
            )}
          >
            <SelectValue placeholder={COPY.countryLabel} />
          </SelectTrigger>
          <SelectContent className="max-h-72 rounded-none">
            {countries.map((country) => (
              <SelectItem key={country.id} value={country.id}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {countriesError ? (
          <p role="alert" className="text-sm text-[#FF8A80]">
            {PENDING.countriesLoadFailed}
          </p>
        ) : null}
        {fieldError('country')}
      </div>

      <div className="relative flex flex-col gap-1.5">
        <label htmlFor={ids.city} className="text-sm font-semibold text-white">
          {COPY.cityLabel}
        </label>
        <input
          ref={cityRef}
          id={ids.city}
          type="text"
          name="city"
          role="combobox"
          autoComplete="off"
          required
          aria-required="true"
          aria-autocomplete="list"
          aria-expanded={isSuggestOpen && suggestions.length > 0}
          aria-controls={ids.cityList}
          aria-activedescendant={activeOptionId}
          aria-invalid={Boolean(errors.city)}
          aria-describedby={describedBy('city', `${ids.city}-status`)}
          disabled={!selectedCountry}
          placeholder={
            selectedCountry
              ? PENDING.citySearchPlaceholder
              : PENDING.cityNeedsCountry
          }
          value={cityQuery}
          onChange={(event) => {
            touchedRef.current.add('city');
            setCityQuery(event.target.value);
            setCity(null);
            clearFieldError('city');
          }}
          onKeyDown={handleCityKeyDown}
          onBlur={() => setIsSuggestOpen(false)}
          onFocus={() => {
            if (suggestions.length > 0 && !city) setIsSuggestOpen(true);
          }}
          className={cn(
            INPUT_CLASS,
            errors.city ? 'border-[#FF8A80]' : 'border-[#DBDBDB]'
          )}
        />
        <ul
          id={ids.cityList}
          role="listbox"
          aria-label={PENDING.citySuggestionsLabel}
          hidden={!isSuggestOpen || suggestions.length === 0}
          className="absolute left-0 right-0 top-[76px] z-20 max-h-60 overflow-auto border border-[#DBDBDB] bg-white shadow-lg"
        >
          {suggestions.map((option, index) => (
            <li
              key={option.mapboxId}
              id={`${ids.cityList}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => {
                event.preventDefault();
                selectCity(option);
              }}
              className={cn(
                'flex cursor-pointer flex-col px-3 py-2 text-left',
                index === activeIndex ? 'bg-[#FFF200]' : 'hover:bg-[#F5F5F5]'
              )}
            >
              <span className="text-[#171717]">{option.name}</span>
              {option.placeFormatted || option.region ? (
                <span className="text-xs text-[#5C5C5C]">
                  {option.placeFormatted || option.region}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        <p
          id={`${ids.city}-status`}
          aria-live="polite"
          className="text-xs text-white/60"
        >
          {isSuggesting
            ? PENDING.citySearching
            : hasSearched && !city && suggestions.length === 0
              ? PENDING.cityNoResults
              : ''}
        </p>
        {fieldError('city')}
      </div>

      <fieldset
        aria-invalid={Boolean(errors.alreadyUsesIrl)}
        aria-describedby={describedBy('alreadyUsesIrl')}
        className="flex flex-col gap-2"
      >
        <legend className="mb-1.5 text-sm font-semibold text-white">
          {COPY.alreadyUsesIrlLabel}
        </legend>
        <div className="flex gap-3">
          {[
            { value: true, label: COPY.yes, ref: alreadyYesRef },
            { value: false, label: COPY.no, ref: undefined },
          ].map((option) => (
            <label
              key={option.label}
              className={cn(
                'flex h-12 min-w-[96px] cursor-pointer items-center justify-center gap-2 border px-4 font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#FFF200] has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[#131313]',
                alreadyUsesIrl === option.value
                  ? 'border-[#FFF200] bg-[#FFF200] text-[#171717]'
                  : errors.alreadyUsesIrl
                    ? 'border-[#FF8A80] text-white'
                    : 'border-white/40 text-white hover:bg-white/10'
              )}
            >
              <input
                ref={option.ref}
                type="radio"
                name={ids.alreadyUsesIrl}
                className="sr-only"
                checked={alreadyUsesIrl === option.value}
                onChange={() => {
                  touchedRef.current.add('alreadyUsesIrl');
                  setAlreadyUsesIrl(option.value);
                  clearFieldError('alreadyUsesIrl');
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
        {fieldError('alreadyUsesIrl')}
      </fieldset>

      <div className="flex items-start gap-3">
        <input
          id={ids.consent}
          type="checkbox"
          checked={marketingConsent}
          onChange={(event) => setMarketingConsent(event.target.checked)}
          className="mt-1 size-5 shrink-0 accent-[#FFF200]"
        />
        <label htmlFor={ids.consent} className="text-sm text-white/80">
          {PENDING.consentLabel}{' '}
          <Link href="/faq#privacy" className="underline underline-offset-2">
            {PENDING.privacyLinkLabel}
          </Link>
        </label>
      </div>

      <p id={ids.note} className="text-sm text-white/70">
        {COPY.availabilityNote}
      </p>

      {submitError ? (
        <p role="alert" className="text-sm text-[#FF8A80]">
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
        className="flex h-14 w-full items-center justify-center bg-[#FFF200] px-6 text-base font-semibold uppercase text-[#171717] transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#131313] disabled:opacity-70"
      >
        {isSubmitting ? PENDING.submitting : COPY.submit}
      </button>
    </form>
  );
}
