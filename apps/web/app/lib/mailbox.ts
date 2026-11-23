export type MailboxSecurity = "ssl" | "starttls" | "none";

export type MailboxStatus = "pending" | "active" | "suspended";

export type OrganisationMailbox = {
  id: string;
  organisationId: string;
  emailAddress: string;
  username: string | null;
  webmailUrl: string | null;
  imapHost: string | null;
  imapPort: number | null;
  imapSecurity: MailboxSecurity | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecurity: MailboxSecurity | null;
  popHost: string | null;
  popPort: number | null;
  popSecurity: MailboxSecurity | null;
  status: MailboxStatus;
  customerNotes: string | null;
  adminNotes: string | null;
  provisionedAt: string | null;
  updatedAt: string | null;
};

export function isMailboxStatus(value: string): value is MailboxStatus {
  return value === "pending" || value === "active" || value === "suspended";
}

export function isMailboxSecurity(value: string): value is MailboxSecurity {
  return value === "ssl" || value === "starttls" || value === "none";
}

export function mailboxStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Ready to use";
    case "suspended":
      return "Suspended";
    case "pending":
    default:
      return "Being set up";
  }
}

export function mailboxSecurityLabel(value: string | null | undefined): string {
  switch (value) {
    case "ssl":
      return "SSL/TLS";
    case "starttls":
      return "STARTTLS";
    case "none":
      return "None";
    default:
      return "—";
  }
}

/** Generic client setup steps — same for every customer once details exist. */
export const MAIL_CLIENT_GUIDES = [
  {
    id: "webmail",
    title: "Webmail (browser)",
    body: "Open the webmail link, sign in with your full email address and mailbox password. Works on any computer or phone browser.",
  },
  {
    id: "outlook",
    title: "Outlook (Windows / Mac)",
    steps: [
      "Open Outlook → File → Add Account (or Outlook → Settings → Accounts).",
      "Enter your full email address and continue.",
      "Choose IMAP (recommended) and enter the IMAP and SMTP details shown on this page.",
      "Username is usually your full email address. Use the mailbox password we provided.",
      "Turn on SSL/TLS for incoming and outgoing mail, then finish setup.",
    ],
  },
  {
    id: "apple",
    title: "Apple Mail (iPhone / Mac)",
    steps: [
      "Settings → Mail → Accounts → Add Account → Other (iPhone), or Mail → Add Account (Mac).",
      "Choose IMAP and enter your name, email address and mailbox password.",
      "Incoming: IMAP host and port from this page. Outgoing: SMTP host and port.",
      "Use SSL/TLS where shown, then save.",
    ],
  },
  {
    id: "gmail-app",
    title: "Gmail app (phone)",
    steps: [
      "Open the Gmail app → add another account → Other.",
      "Enter your business email address → Personal (IMAP).",
      "Enter the mailbox password, then the IMAP and SMTP server details from this page.",
      "Finish and open the inbox for your business address.",
    ],
  },
  {
    id: "android",
    title: "Android Mail / Samsung Email",
    steps: [
      "Add account → Other / IMAP.",
      "Email address + mailbox password.",
      "Incoming IMAP and outgoing SMTP as listed below (with SSL/TLS).",
      "Username is usually the full email address.",
    ],
  },
] as const;
