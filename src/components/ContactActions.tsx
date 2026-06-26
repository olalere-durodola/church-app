import { whatsappLink, telLink } from '../utils/contactUtils';

interface Props {
  phone?: string;
  email?: string;
  /** Optional pre-filled WhatsApp message */
  message?: string;
  /** Compact icon-only buttons (for table rows / lists) */
  compact?: boolean;
}

const WhatsAppIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.42 5.83c0 4.54-3.7 8.24-8.25 8.24a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24Zm-4.5 4.43c-.21 0-.55.08-.84.39-.29.31-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.21 2.22 3.39 5.38 4.62.75.29 1.34.46 1.8.59.76.24 1.45.21 1.99.13.61-.09 1.87-.76 2.13-1.5.26-.74.26-1.37.18-1.5-.08-.13-.29-.21-.6-.37-.31-.16-1.87-.92-2.16-1.03-.29-.11-.5-.16-.71.16-.21.31-.81 1.02-1 1.23-.18.21-.37.24-.68.08-.31-.16-1.32-.49-2.51-1.55-.93-.83-1.56-1.85-1.74-2.16-.18-.31-.02-.48.14-.63.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.11-.21.05-.39-.03-.55-.08-.16-.71-1.72-.97-2.35-.26-.62-.52-.53-.71-.54l-.61-.01Z"/>
  </svg>
);
const PhoneIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
);
const MailIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
);

export default function ContactActions({ phone, email, message, compact }: Props) {
  const wa = phone ? whatsappLink(phone, message) : null;
  const tel = phone ? telLink(phone) : null;
  const mail = email ? `mailto:${email}` : null;

  if (!wa && !tel && !mail) return null;

  const cls = `contact-actions${compact ? ' contact-actions-compact' : ''}`;

  return (
    <div className={cls}>
      {wa && (
        <a className="contact-btn whatsapp" href={wa} target="_blank" rel="noopener noreferrer" title="Message on WhatsApp">
          {WhatsAppIcon}{!compact && <span>WhatsApp</span>}
        </a>
      )}
      {tel && (
        <a className="contact-btn" href={tel} title="Call">
          {PhoneIcon}{!compact && <span>Call</span>}
        </a>
      )}
      {mail && (
        <a className="contact-btn" href={mail} title="Email">
          {MailIcon}{!compact && <span>Email</span>}
        </a>
      )}
    </div>
  );
}
