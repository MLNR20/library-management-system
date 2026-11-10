import { Link } from 'react-router';
import { SiteFooter } from '../components/layout/SiteFooter.tsx';
import { SiteNavbar } from '../components/layout/SiteNavbar.tsx';

export type LegalDocument = 'privacy' | 'terms' | 'legal';

interface Section {
    heading: string;
    /** Paragraphs, then an optional bullet list. */
    paragraphs?: string[];
    items?: string[];
}

interface LegalContent {
    title: string;
    intro: string;
    sections: Section[];
}

// General wording that matches what the system actually does. The library should have it checked against the law that
// applies to it (and add its contact details) before relying on it.
const documents: Record<LegalDocument, LegalContent> = {
    privacy: {
        title: 'Data privacy',
        intro: 'This page explains what personal information Alexandria keeps about you, why, and what you can ask the library to do about it.',
        sections: [
            {
                heading: 'What we keep',
                paragraphs: ['When you register and use the library we keep:'],
                items: [
                    'Your account details: user name, email address and a securely hashed password (we never store the password itself).',
                    'Your borrowing history and your table and reading-room reservations, including the times and the purpose you gave.',
                    'Notifications we sent you, such as due-date reminders and decisions on your reservations.',
                    'Sign-in sessions: when you signed in, the device and browser you used and its IP address, so you can see and end your own sessions.',
                    'A security log of important actions (signing in, borrowing, reserving), with the IP address and browser they came from.',
                ],
            },
            {
                heading: 'Why we keep it',
                paragraphs: [
                    'We use this information to run the library: to let you borrow and reserve, to remind you about due books, to keep your account secure and to resolve problems. We do not sell it and we do not use it for advertising.',
                ],
            },
            {
                heading: 'Who can see it',
                paragraphs: [
                    'Librarians and administrators can see accounts, loans and reservations, because they need them to do their work. Other students and visitors cannot see your name or notes: the table and room availability views only show that a slot is taken, never by whom.',
                ],
            },
            {
                heading: 'How we protect it',
                paragraphs: [
                    'Passwords are hashed, sessions can be revoked and each sign-in uses short-lived access tokens. Staff actions are recorded in the security log. No system is perfectly secure, so please choose a strong password and sign out on shared computers.',
                ],
            },
            {
                heading: 'Your choices',
                items: [
                    'See and end your own sessions from the Sessions page after you sign in.',
                    'Ask a librarian to correct your details, to export what we hold about you, or to close your account.',
                    'Ask about how long records are kept. Some records, such as loan history and the security log, may be kept for a time so the library can account for its books and its security.',
                ],
            },
            {
                heading: 'Changes to this page',
                paragraphs: ['If we change how we handle personal information we will update this page, and the date of the change will appear in the library news.'],
            },
        ],
    },
    terms: {
        title: 'Terms and conditions',
        intro: 'By creating an account or using Alexandria you agree to these terms. They are short on purpose.',
        sections: [
            {
                heading: 'Your account',
                items: [
                    'Give accurate details when you register and keep your password to yourself.',
                    'You are responsible for what happens under your account. Tell a librarian straight away if you think someone else is using it.',
                    'The library may deactivate an account that is misused or no longer needed.',
                ],
            },
            {
                heading: 'Borrowing',
                items: [
                    'Books are lent for the loan period shown when you borrow them, and must be returned on time and in the condition you received them.',
                    'The library may ask you to replace or pay for a book that is lost or damaged.',
                    'Reminders are a courtesy: you remain responsible for the due date even if a reminder does not reach you.',
                ],
            },
            {
                heading: 'Tables and reading rooms',
                items: [
                    'A request is not a booking. A table or room is yours only once a librarian approves it.',
                    'A reservation lasts at most four hours and must start in the future.',
                    'Approved reservations cannot overlap. Reserving a whole reading room also holds its tables for that time.',
                    'Cancel a reservation you no longer need so others can use the space. The library may cancel one that is not used or that breaks these terms.',
                ],
            },
            {
                heading: 'Acceptable use',
                paragraphs: [
                    'Use the system only for library purposes. Do not try to break into it, overload it, use another person’s account or collect other people’s information.',
                ],
            },
            {
                heading: 'Availability and changes',
                paragraphs: [
                    'We work to keep Alexandria available but do not promise it will always be, and the catalogue may not show every change the moment it happens. We may change these terms; continuing to use the library after a change means you accept it.',
                ],
            },
        ],
    },
    legal: {
        title: 'Legal notice',
        intro: 'Information about the service and the rules around the content on this site.',
        sections: [
            {
                heading: 'About the service',
                paragraphs: [
                    'Alexandria is a library management system: a catalogue, loans, a floor map and bookings for study spaces. It is operated by the library that provides it to you; ask the library desk for the operator’s full name, address and contact details.',
                ],
            },
            {
                heading: 'Content',
                paragraphs: [
                    'The catalogue entries, news, announcements and images on this site belong to the library or to the people who made them. You may use them for your own study and reading, but not copy or republish them without permission.',
                ],
            },
            {
                heading: 'Liability',
                paragraphs: [
                    'We take care over the information on this site but cannot guarantee that it is always complete or up to date. The library is not liable for losses that come from relying on it, except where the law does not allow that limit.',
                ],
            },
            {
                heading: 'Links to other sites',
                paragraphs: ['Where we link to another site we do not control it and are not responsible for what it says or does.'],
            },
            {
                heading: 'Questions and complaints',
                paragraphs: [
                    'If you have a question about these documents, or want to report a problem with the service or with content on it, please speak to a librarian at the library desk.',
                ],
            },
        ],
    },
};

/** A public legal page: data privacy, terms and conditions or the legal notice. Reached from the footer. */
export function LegalPage({ document }: { document: LegalDocument }) {
    const content = documents[document];

    return (
        <div className="flex min-h-screen flex-col bg-base-100">
            <SiteNavbar />
            <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
                <Link to="/welcome" className="link link-hover text-sm">
                    ← Back to the home page
                </Link>
                <h1 className="mt-4 text-3xl font-bold text-primary">{content.title}</h1>
                <p className="mt-3 text-lg opacity-80">{content.intro}</p>

                <div className="mt-8 flex flex-col gap-8">
                    {content.sections.map(section => (
                        <section key={section.heading} aria-labelledby={`legal-${section.heading}`}>
                            <h2 id={`legal-${section.heading}`} className="text-xl font-bold">
                                {section.heading}
                            </h2>
                            {section.paragraphs?.map(paragraph => (
                                <p key={paragraph} className="mt-2 leading-relaxed opacity-80">
                                    {paragraph}
                                </p>
                            ))}
                            {section.items && (
                                <ul className="mt-2 list-disc space-y-1 pl-6 leading-relaxed opacity-80">
                                    {section.items.map(item => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    ))}
                </div>
            </main>
            <SiteFooter />
        </div>
    );
}
