/** Shared public sales copy — keep claims aligned with Terms & package reality. */

export const PRIMARY_CTA = "Get My Website";
export const PACKAGE_PRICE = "£39.99";
export const PACKAGE_PERIOD = "/month";
export const SUPPORT_PHONE_DISPLAY = "0800 852 7267";
export const SUPPORT_PHONE_HREF = "tel:08008527267";
export const SUPPORT_EMAIL = "support@iwantfreewebsite.com";

export const POSITIONING_LINE =
  "You run your business. We'll handle your website.";

export const OFFER_LINE =
  "Everything your business needs to get online, professionally managed for just £39.99 a month.";

/** Short reassurances near purchase CTAs */
export const CTA_REASSURANCE =
  "£39.99/month · No upfront design fee · Cancel anytime · No technical knowledge needed";

export type PackageBenefit = {
  title: string;
  benefit: string;
};

/** Benefit-led package items shown on homepage / pricing */
export const PACKAGE_BENEFITS: PackageBenefit[] = [
  {
    title: "Professional website",
    benefit:
      "A professional first impression for your business — without spending hundreds upfront on design.",
  },
  {
    title: "Domain name included",
    benefit:
      "Your own professional web address, registered and renewed for you while you subscribe.",
  },
  {
    title: "Website hosting",
    benefit:
      "Your site stays online without you arranging separate hosting or remembering renewals.",
  },
  {
    title: "One business email",
    benefit:
      "Look more professional when you email customers from your own domain.",
  },
  {
    title: "Weekly Google Business posts",
    benefit:
      "We help keep your Google Business Profile active while you focus on the work.",
  },
  {
    title: "Google review reply help",
    benefit:
      "Show potential customers that you care about your reputation.",
  },
  {
    title: "Fully managed",
    benefit:
      "We handle the technical side so you are not left juggling design, hosting and domains alone.",
  },
  {
    title: "Cancel anytime",
    benefit:
      "No minimum term. Stay because you are happy with the service, not because you are locked in.",
  },
];

export const HOME_FAQS: { q: string; a: string }[] = [
  {
    q: "What's the catch? Why is there no upfront design fee?",
    a: "There isn't a hidden catch. We don't charge a large upfront design fee because our business is based on the £39.99 monthly subscription. You pay that from the start for the full managed package — website, hosting, domain care, email and Google Business help — not a free website forever.",
  },
  {
    q: "When will I be charged?",
    a: "You pay £39.99 when you complete checkout. That covers your first month in advance. The subscription then renews monthly until you cancel.",
  },
  {
    q: "Are there hidden charges?",
    a: "The advertised package is £39.99/month (inclusive of VAT where applicable). That covers the managed website package described on this site. Domain registration and renewals for your chosen domain are handled as part of the subscription while it is active. If you ever need something outside the package, we will say so clearly before any extra work.",
  },
  {
    q: "Do I need technical knowledge?",
    a: "No. Answer a short questionnaire about your business, choose a domain, and pay securely. We handle the build, hosting, domain care and ongoing management.",
  },
  {
    q: "What if I don't have a logo or professional photos?",
    a: "Upload what you have. If you don't have a logo or photos yet, tell us in the questionnaire — we can still get started and use what you provide later.",
  },
  {
    q: "What if I already own a domain?",
    a: "Tell us during signup. We can work with a domain you already own, or register a new .co.uk, .com or .uk for you after payment.",
  },
  {
    q: "How long will my website take?",
    a: "We start work after payment is confirmed. Progress is tracked in your customer dashboard, and our team will keep you updated. Timings depend on the brief and how quickly materials are available.",
  },
  {
    q: "Can I cancel anytime? What happens to my website?",
    a: "Yes — there is no minimum contract and no cancellation fee. After you cancel, your subscription continues until the end of the period you have already paid for. We then help transfer your website and domain to you (manual process). After you leave, you will need to arrange your own hosting and related services.",
  },
  {
    q: "Why do I need a website if I already use Facebook or WhatsApp?",
    a: "Social profiles are useful, but they are not yours to keep forever and they change. A proper website gives customers a professional place to find you, contact you and take you seriously — including people who search on Google.",
  },
  {
    q: "Will having a website guarantee more enquiries?",
    a: "No honest provider can guarantee enquiries or sales. A professional website helps you look credible and makes it easier for customers to find and contact you. Results still depend on your business, market and how you use the site.",
  },
  {
    q: "Is this a genuine UK service?",
    a: "Yes. We are a UK-based managed website service. You can call 0800 852 7267 or email support@iwantfreewebsite.com, and payments are handled securely by Stripe.",
  },
];

export const WHO_FOR = [
  "Tradespeople and contractors",
  "Sole traders and the self-employed",
  "Local service businesses",
  "New businesses starting with a limited budget",
  "Businesses still relying on Facebook, Instagram or WhatsApp",
  "Anyone with an outdated or unfinished website",
] as const;

export const WHO_FOR_EXAMPLES =
  "Plumbers, electricians, cleaners, builders, roofers, fencers, decorators, beauty professionals, consultants and many other UK small businesses.";
