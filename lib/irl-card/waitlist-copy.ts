/** Page copy approved by Malcolm, November 11, 2026. Do not edit without approval. */
export const IRL_CARD_WAITLIST_COPY = {
  productLabel: 'IRL Card',
  headline: 'The card for going out.',
  body: 'Music, clubs, drinks and everything in between. Join the waitlist for updates and access invitations as the IRL Card rolls out.',
  emailLabel: 'Email',
  cityLabel: 'City',
  countryLabel: 'Country of residence',
  alreadyUsesIrlLabel: 'Do you already use IRL?',
  yes: 'Yes',
  no: 'No',
  submit: 'Join the waitlist',
  availabilityNote:
    'Joining the waitlist doesn’t guarantee a card. Access depends on availability and eligibility.',
  success: 'You’re on the list. We’ll keep you posted.',
} as const;

/**
 * PENDING REVIEW before launch: validation/error messages, consent and privacy
 * wording, and share labels are not yet approved. Replace here only.
 */
export const IRL_CARD_WAITLIST_PENDING_COPY = {
  emailRequired: 'Enter your email.',
  emailInvalid: 'Enter a valid email address.',
  countryRequired: 'Select your country of residence.',
  cityRequired: 'Search for your city and select it from the list.',
  cityNeedsCountry: 'Select a country first',
  citySearchPlaceholder: 'Search for your city',
  citySuggestionsLabel: 'City suggestions',
  citySearching: 'Searching…',
  cityNoResults: 'No matching cities. Check the spelling and try again.',
  alreadyUsesIrlRequired: 'Choose Yes or No.',
  countriesLoadFailed:
    'We couldn’t load the country list. Refresh the page to try again.',
  submitFailed:
    'We couldn’t add you to the waitlist. Check your connection and try again.',
  submitInvalid:
    'Some details need another look. Check the highlighted fields and try again.',
  submitting: 'Joining…',
  errorSummaryTitle: 'Please fix the following:',
  consentLabel:
    'Send me IRL Card updates and access invitations by email. You can unsubscribe at any time.',
  privacyLinkLabel: 'Privacy policy',
  shareButton: 'Share the waitlist',
  shareCopied: 'Link copied',
  shareFailed: 'Couldn’t copy the link',
  exploreLink: 'Explore IRL',
} as const;
