"use client";

import Link from "next/link";

interface MembersSectionProps {
  /**
   * Variant style: "centered" for dark background with centered layout,
   * "left-aligned" for transparent background with left-aligned layout
   */
  variant?: "centered" | "left-aligned";
  /**
   * Color scheme: "dark" for white text on black background,
   * "light" for black text on white background
   */
  colorScheme?: "dark" | "light";
  /**
   * Optional custom className for the container
   */
  className?: string;
  /**
   * Optional click handlers for each button (will be called in addition to navigation)
   */
  onBecomeMemberClick?: () => void;
  onFAQClick?: () => void;
  onBecomePartnerClick?: () => void;
  /**
   * Optional custom URLs for each link
   */
  becomeMemberUrl?: string;
  faqUrl?: string;
  becomePartnerUrl?: string;
}

/**
 * Reusable component for displaying "FOR MEMBERS" and "FOR VENUES AND BRANDS" sections
 */
export default function MembersSection({
  variant = "centered",
  colorScheme = "dark",
  className = "",
  onBecomeMemberClick,
  onFAQClick,
  onBecomePartnerClick,
  becomeMemberUrl = "https://airtable.com/appygGt0rRgfh6qxA/shrkshw6J2OMYuae7",
  faqUrl = "/faq",
  becomePartnerUrl = "/partners",
}: MembersSectionProps) {
  const isCentered = variant === "centered";
  const isDark = colorScheme === "dark";

  // Define link texts and pad them to the same length (matching the longest)
  const longestText = "Frequently Asked Questions →";
  const linkTexts = {
    becomeMember: "Become A Founding Member →".padEnd(longestText.length, " "),
    faq: longestText,
    becomePartner: "Become An IRL Partner →".padEnd(longestText.length, " "),
  };

  const containerClasses = isCentered
    ? isDark
      ? "bg-[#131313] rounded-2xl p-6 mb-4"
      : "bg-white rounded-2xl p-6 mb-4 border border-[#EDEDED]"
    : "bg-transparent p-6";

  const wrapperClasses = isCentered
    ? "text-center space-y-4"
    : "space-y-4 text-left";

  const titleClasses = isCentered
    ? isDark
      ? "body-small text-white font-grotesk"
      : "body-small text-[#313131] font-grotesk"
    : isDark
      ? "body-small font-grotesk text-center text-white"
      : "body-small font-grotesk text-center text-[#313131]";

  const buttonClasses = isCentered
    ? isDark
      ? "text-left text-white title4 font-anonymous-pro underline hover:no-underline transition-all"
      : "text-left text-[#313131] title4 font-anonymous-pro underline hover:no-underline transition-all"
    : isDark
      ? "w-full text-left font-anonymous-pro text-xl underline transition hover:no-underline text-white"
      : "w-full text-left font-anonymous-pro text-xl underline transition hover:no-underline text-[#313131]";

  const venuesTitleClasses = isCentered
    ? isDark
      ? "text-white body-small font-grotesk text-center"
      : "text-[#313131] body-small font-grotesk text-center"
    : isDark
      ? "body-small font-grotesk text-center text-white"
      : "body-small font-grotesk text-center text-[#313131]";

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className={wrapperClasses}>
        {/* FOR MEMBERS Title */}
        <div className={titleClasses}>FOR MEMBERS</div>

        {/* Buttons Container */}
        {isCentered ? (
          <>
            {/* Become A Founding Member */}
            <div className="flex justify-center">
              {becomeMemberUrl ? (
                <Link
                  href={becomeMemberUrl}
                  target={becomeMemberUrl.startsWith("http") ? "_blank" : undefined}
                  rel={becomeMemberUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                  onClick={onBecomeMemberClick}
                  className={buttonClasses}
                >
                  {linkTexts.becomeMember}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onBecomeMemberClick}
                  className={buttonClasses}
                >
                  {linkTexts.becomeMember}
                </button>
              )}
            </div>

            {/* Frequently Asked Questions */}
            <div className="flex justify-center">
              {faqUrl ? (
                <Link
                  href={faqUrl}
                  target={faqUrl.startsWith("http") ? "_blank" : undefined}
                  rel={faqUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                  onClick={onFAQClick}
                  className={buttonClasses}
                >
                  {linkTexts.faq}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onFAQClick}
                  className={buttonClasses}
                >
                  {linkTexts.faq}
                </button>
              )}
            </div>

            {/* FOR VENUES AND BRANDS Title */}
            <div className={venuesTitleClasses}>FOR VENUES AND BRANDS</div>

            {/* Become An IRL Partner */}
            <div className="flex justify-center">
              {becomePartnerUrl ? (
                <Link
                  href={becomePartnerUrl}
                  target={becomePartnerUrl.startsWith("http") ? "_blank" : undefined}
                  rel={becomePartnerUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                  onClick={onBecomePartnerClick}
                  className={buttonClasses}
                >
                  {linkTexts.becomePartner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onBecomePartnerClick}
                  className={buttonClasses}
                >
                  {linkTexts.becomePartner}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-start gap-4">
            {/* Become A Founding Member */}
            {becomeMemberUrl ? (
              <Link
                href={becomeMemberUrl}
                target={becomeMemberUrl.startsWith("http") ? "_blank" : undefined}
                rel={becomeMemberUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                onClick={onBecomeMemberClick}
                className={buttonClasses}
              >
                {linkTexts.becomeMember}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onBecomeMemberClick}
                className={buttonClasses}
              >
                {linkTexts.becomeMember}
              </button>
            )}

            {/* Frequently Asked Questions */}
            {faqUrl ? (
              <Link
                href={faqUrl}
                target={faqUrl.startsWith("http") ? "_blank" : undefined}
                rel={faqUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                onClick={onFAQClick}
                className={buttonClasses}
              >
                {linkTexts.faq}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onFAQClick}
                className={buttonClasses}
              >
                {linkTexts.faq}
              </button>
            )}

            {/* FOR VENUES AND BRANDS Title */}
            <div className={venuesTitleClasses}>FOR VENUES AND BRANDS</div>

            {/* Become An IRL Partner */}
            {becomePartnerUrl ? (
              <Link
                href={becomePartnerUrl}
                target={becomePartnerUrl.startsWith("http") ? "_blank" : undefined}
                rel={becomePartnerUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                onClick={onBecomePartnerClick}
                className={buttonClasses}
              >
                {linkTexts.becomePartner}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onBecomePartnerClick}
                className={buttonClasses}
              >
                {linkTexts.becomePartner}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

