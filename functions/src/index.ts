import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Anthropic from '@anthropic-ai/sdk';
import sgMail from '@sendgrid/mail';

admin.initializeApp();
const db = admin.firestore();

// ---------------------------------------------------------------------------
// Branded "Covenant" birthday card (dark, reverent, brass) — email-safe HTML
// ---------------------------------------------------------------------------
function birthdayCardHtml(firstName: string, message: string): string {
  const body = message
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
  return `
    <div style="background:#0E1015;padding:32px 16px;font-family:Georgia,'Times New Roman',serif">
      <div style="max-width:560px;margin:0 auto;background:#1B1E26;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden">
        <div style="height:3px;background:linear-gradient(90deg,#C9A24B,rgba(201,162,75,0))"></div>
        <div style="padding:36px 40px 8px;text-align:center">
          <div style="width:64px;height:64px;margin:0 auto 18px;border-radius:50%;background:#C9A24B;color:#23170A;font-size:24px;font-weight:700;line-height:64px;font-family:Georgia,serif">CE</div>
          <div style="color:#C9A24B;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif">Happy Birthday</div>
          <h1 style="color:#ECE7DC;margin:10px 0 0;font-size:28px;font-weight:600">Dear ${firstName},</h1>
        </div>
        <div style="padding:18px 40px 30px">
          <p style="color:#CFCABF;font-size:16px;line-height:1.85;margin:0;text-align:center">${body}</p>
        </div>
        <div style="padding:22px 40px;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
          <p style="color:#9AA0AD;font-size:12px;margin:0;font-family:Arial,sans-serif">
            R.C.C.G Covenant Embassy &nbsp;·&nbsp; Plano, Texas<br/>
            <span style="color:#6B7180">Redeemed Christian Church of God</span>
          </p>
        </div>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Birthday Greetings — runs every day at 8 AM Central Time
//   "Human in the middle": drafts a greeting per birthday member and queues it
//   in `birthdayGreetings` with status 'pending'. An admin reviews/edits in the
//   app and presses Send (see sendBirthdayGreeting below). Members are NOT
//   emailed automatically. The admin gets a heads-up email.
// ---------------------------------------------------------------------------
export const birthdayReminders = onSchedule(
  {
    schedule: 'every day 08:00',
    timeZone: 'America/Chicago',
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'ANTHROPIC_API_KEY'],
  },
  async () => {
    const today = new Date();
    const month = today.getMonth() + 1; // 1-based
    const day = today.getDate();
    const dateId = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const snap = await db
      .collection('members')
      .where('birthdayMonth', '==', month)
      .where('birthdayDay', '==', day)
      .get();

    if (snap.empty) {
      console.log('No birthdays today.');
      return;
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let queued = 0;
    const digestRows: string[] = [];

    for (const docSnap of snap.docs) {
      const m = docSnap.data() as {
        firstName: string; lastName: string; phone?: string; email?: string; status?: string;
      };

      // One greeting per member per day (id is idempotent across retries/runs)
      const greetingRef = db.collection('birthdayGreetings').doc(`${dateId}_${docSnap.id}`);
      const existing = await greetingRef.get();

      // Draft a warm greeting (fall back to a default if Claude is unavailable)
      let text = `Happy birthday, ${m.firstName}! On behalf of the entire R.C.C.G Covenant Embassy family, ` +
        `we celebrate the gift of your life today. May this new year overflow with God's grace, favour, and joy. ` +
        `We are grateful to walk this journey of faith with you.`;
      if (!existing.exists) {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 220,
            messages: [
              {
                role: 'user',
                content: `Write a warm, brief birthday message from R.C.C.G Covenant Embassy church to ${m.firstName} ${m.lastName}. ` +
                  `Keep it to 2-3 sentences. Friendly and faith-based but not overly formal. ` +
                  `Do NOT include a salutation (no "Dear ...") and do NOT include a sign-off. Plain text only.`,
              },
            ],
          });
          if (response.content[0].type === 'text') text = response.content[0].text;
        } catch (err) {
          console.warn(`Claude unavailable for ${m.firstName}, using default message:`, err);
        }

        await greetingRef.set({
          memberId: docSnap.id,
          memberName: `${m.firstName} ${m.lastName}`,
          firstName: m.firstName,
          email: m.email ?? '',
          phone: m.phone ?? '',
          status: m.status ?? '',
          date: dateId,
          draft: text,
          reviewStatus: 'pending', // pending | sent | skipped
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        queued++;
      }

      const flag = !m.email ? ' (no email on file)' : '';
      digestRows.push(`<b>${m.firstName} ${m.lastName}</b>${m.email ? ` — ${m.email}` : ''}${flag}`);
    }

    // Heads-up email to the admin
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    await sgMail.send({
      to: 'olalere.durodola@gmail.com',
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: `🎂 ${snap.size} Birthday${snap.size !== 1 ? 's' : ''} Today — review & send (${dateStr})`,
      html: `
        <h2>🎂 Birthdays Today — ${dateStr}</h2>
        <p>${snap.size} member${snap.size !== 1 ? 's have' : ' has'} a birthday today.
           ${queued} greeting${queued !== 1 ? 's are' : ' is'} drafted and waiting for your review.</p>
        <p>Open the church app → <b>Birthdays</b> to review, edit, and send.</p>
        <hr/>
        ${digestRows.map(d => `<p>${d}</p>`).join('')}
        <p style="color:#888;font-size:12px;">Sent by R.C.C.G Covenant Embassy Church App</p>
      `,
    });

    console.log(`Birthdays: ${snap.size} today, ${queued} greeting(s) queued for review.`);
  }
);

// ---------------------------------------------------------------------------
// sendBirthdayGreeting — callable, admin-only. Sends one reviewed greeting.
// ---------------------------------------------------------------------------
export const sendBirthdayGreeting = onCall(
  { secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in required.');
    const adminDoc = await db.collection('admins').doc(uid).get();
    if (!adminDoc.exists) throw new HttpsError('permission-denied', 'Admins only.');

    const greetingId = request.data?.greetingId as string | undefined;
    if (!greetingId) throw new HttpsError('invalid-argument', 'greetingId is required.');

    const ref = db.collection('birthdayGreetings').doc(greetingId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Greeting not found.');
    const g = snap.data() as { firstName: string; email: string; draft: string; reviewStatus: string };

    if (g.reviewStatus === 'sent') return { ok: true, alreadySent: true };
    if (!g.email) throw new HttpsError('failed-precondition', 'This member has no email on file.');

    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    await sgMail.send({
      to: g.email,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: `Happy Birthday, ${g.firstName}! 🎉`,
      html: birthdayCardHtml(g.firstName, g.draft),
    });

    await ref.update({
      reviewStatus: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      sentBy: uid,
    });

    return { ok: true };
  }
);

// ---------------------------------------------------------------------------
// Visitor Follow-up — triggers when a new member document is created
// ---------------------------------------------------------------------------
export const visitorFollowUp = onDocumentCreated(
  {
    document: 'members/{memberId}',
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'ANTHROPIC_API_KEY'],
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    // Only proceed for Visitors with an email address
    if (data.status !== 'Visitor' || !data.email) {
      console.log('Not a visitor or no email — skipping.');
      return;
    }

    const firstName: string = data.firstName ?? '';
    const lastName: string = data.lastName ?? '';

    // Use Claude to draft a personalized welcome message, fall back to default if unavailable
    let messageText = `We are so glad you joined us and hope your visit was a blessing.
      You are always welcome at R.C.C.G Covenant Embassy, and we look forward to seeing you again soon.
      May God continue to guide and bless you. — The R.C.C.G Covenant Embassy Family`;

    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Write a warm welcome message for a first-time church visitor named ${firstName} ${lastName} from R.C.C.G Covenant Embassy in Plano, Texas. 3-4 sentences. Friendly, faith-based, welcoming. Invite them to return. Do NOT include a salutation (no "Dear ..."). Do NOT include a sign-off. Plain text only, no markdown.`,
          },
        ],
      });
      if (response.content[0].type === 'text') {
        messageText = response.content[0].text;
      }
    } catch (err) {
      console.warn('Claude unavailable, using default message:', err);
    }

    // Convert markdown bold (**text**) to <strong> and newlines to <br/>
    const formattedMessage = messageText
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');

    const html = `
      <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
        <div style="background:linear-gradient(135deg,#1e3a5f,#0f2744);padding:32px 40px;text-align:center">
          <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:600;letter-spacing:0.5px">Welcome to R.C.C.G Covenant Embassy</h1>
          <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px">Plano, Texas</p>
        </div>
        <div style="padding:36px 40px">
          <p style="font-size:16px;color:#1e293b;margin:0 0 20px">Dear <strong>${firstName}</strong>,</p>
          <p style="font-size:15px;color:#334155;line-height:1.8;margin:0 0 24px">${formattedMessage}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>
          <p style="font-size:13px;color:#64748b;margin:0;text-align:center">
            R.C.C.G Covenant Embassy &nbsp;·&nbsp; Plano, Texas<br/>
            <em>Redeemed Christian Church of God</em>
          </p>
        </div>
      </div>
    `;

    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    await sgMail.send({
      to: data.email,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: `Welcome to R.C.C.G Covenant Embassy, ${firstName}!`,
      html,
    });

    console.log(`Visitor follow-up sent to ${firstName} ${lastName} at ${data.email}`);
  }
);

// ---------------------------------------------------------------------------
// Weekly Attendance Report — runs every Monday at 8 AM Central Time
// ---------------------------------------------------------------------------
export const weeklyAttendanceReport = onSchedule(
  {
    schedule: 'every monday 08:00',
    timeZone: 'America/Chicago',
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'ANTHROPIC_API_KEY'],
  },
  async () => {
    // Get last Sunday's date (YYYY-MM-DD)
    const today = new Date();
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - 1); // Monday - 1 = Sunday
    const lastSundayStr = lastSunday.toISOString().split('T')[0];

    // Get previous 4 Sundays for trend comparison
    const pastSundays: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const d = new Date(lastSunday);
      d.setDate(lastSunday.getDate() - (i * 7));
      pastSundays.push(d.toISOString().split('T')[0]);
    }

    // Fetch last Sunday's record
    const lastSundayDoc = await db.collection('attendance').doc(lastSundayStr).get();

    if (!lastSundayDoc.exists) {
      console.log(`No attendance record found for ${lastSundayStr}. Skipping report.`);
      return;
    }

    const current = lastSundayDoc.data() as {
      men: number; women: number; children: number; visitors: number;
      total: number; sermonTitle?: string; preacher?: string;
    };
    const currentTotal = current.total ?? (current.men + current.women + current.children + current.visitors);

    // Fetch past records for trend
    const pastDocs = await Promise.all(
      pastSundays.map(d => db.collection('attendance').doc(d).get())
    );
    const pastRecords = pastDocs
      .filter(d => d.exists)
      .map(d => {
        const rec = d.data() as { men: number; women: number; children: number; visitors: number; total: number };
        const total = rec.total ?? (rec.men + rec.women + rec.children + rec.visitors);
        return { date: d.id, ...rec, total };
      });

    // Calculate trend
    const avgPast = pastRecords.length > 0
      ? Math.round(pastRecords.reduce((sum, r) => sum + r.total, 0) / pastRecords.length)
      : null;
    const trendPct = avgPast ? Math.round(((currentTotal - avgPast) / avgPast) * 100) : null;
    const trendStr = trendPct !== null
      ? (trendPct > 0 ? `+${trendPct}%` : `${trendPct}%`) + ` vs ${pastRecords.length}-week average (${avgPast})`
      : 'No prior data for comparison';

    // Format last Sunday date nicely
    const dateLabel = lastSunday.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Build context string for Claude
    const context = `
Church: R.C.C.G Covenant Embassy, Plano, Texas
Date: ${dateLabel}
Attendance breakdown:
  - Men: ${current.men}
  - Women: ${current.women}
  - Children: ${current.children}
  - Visitors: ${current.visitors}
  - Total: ${currentTotal}
${current.sermonTitle ? `Sermon: "${current.sermonTitle}"` : ''}
${current.preacher ? `Preacher: ${current.preacher}` : ''}
Trend: ${trendStr}
${pastRecords.length > 0 ? `Recent Sundays: ${pastRecords.map(r => `${r.date}: ${r.total}`).join(', ')}` : ''}
    `.trim();

    // Use Claude to write the report, fall back to plain summary if unavailable
    let reportBody = `Total attendance was ${currentTotal} (Men: ${current.men}, Women: ${current.women}, Children: ${current.children}, Visitors: ${current.visitors}). Trend: ${trendStr}.`;

    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: `Write a brief weekly attendance report for a church pastor. Use the data below. Be concise (3-5 sentences), professional, and faith-encouraging. Mention any notable trends. Do not use bullet points — write in paragraph form.\n\n${context}`,
          },
        ],
      });
      if (response.content[0].type === 'text') {
        reportBody = response.content[0].text;
      }
    } catch (err) {
      console.warn('Claude unavailable, using default report:', err);
    }

    // Build trend table rows for past Sundays
    const trendRows = pastRecords.length > 0
      ? pastRecords.map(r => `<tr><td style="padding:4px 12px">${r.date}</td><td style="padding:4px 12px;text-align:center">${r.total}</td></tr>`).join('')
      : '<tr><td colspan="2" style="padding:4px 12px;color:#888">No prior records</td></tr>';

    const html = `
      <h2 style="color:#1e3a5f">Weekly Attendance Report</h2>
      <p style="color:#555">${dateLabel}</p>
      <hr/>

      <h3 style="margin-bottom:4px">Summary</h3>
      <p>${reportBody}</p>

      <h3 style="margin-top:1.5rem;margin-bottom:8px">Breakdown</h3>
      <table style="border-collapse:collapse;font-size:14px">
        <tr style="background:#f1f5f9"><th style="padding:6px 16px;text-align:left">Category</th><th style="padding:6px 16px;text-align:center">Count</th></tr>
        <tr><td style="padding:4px 16px">Men</td><td style="padding:4px 16px;text-align:center">${current.men}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:4px 16px">Women</td><td style="padding:4px 16px;text-align:center">${current.women}</td></tr>
        <tr><td style="padding:4px 16px">Children</td><td style="padding:4px 16px;text-align:center">${current.children}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:4px 16px">Visitors</td><td style="padding:4px 16px;text-align:center">${current.visitors}</td></tr>
        <tr style="font-weight:bold;border-top:2px solid #e2e8f0"><td style="padding:6px 16px">Total</td><td style="padding:6px 16px;text-align:center">${currentTotal}</td></tr>
      </table>

      ${current.sermonTitle ? `<p style="margin-top:1rem"><strong>Sermon:</strong> "${current.sermonTitle}"${current.preacher ? ` — ${current.preacher}` : ''}</p>` : ''}

      <h3 style="margin-top:1.5rem;margin-bottom:8px">Recent Trend</h3>
      <p style="margin-bottom:8px">${trendStr}</p>
      <table style="border-collapse:collapse;font-size:13px">
        <tr style="background:#f1f5f9"><th style="padding:4px 12px;text-align:left">Date</th><th style="padding:4px 12px;text-align:center">Total</th></tr>
        ${trendRows}
        <tr style="font-weight:bold;border-top:2px solid #e2e8f0"><td style="padding:4px 12px">${lastSundayStr} (this week)</td><td style="padding:4px 12px;text-align:center">${currentTotal}</td></tr>
      </table>

      <p style="margin-top:2rem;color:#888;font-size:12px">Sent by R.C.C.G Covenant Embassy Church App</p>
    `;

    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    await sgMail.send({
      to: 'olalere.durodola@gmail.com',
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: `📊 Weekly Attendance Report — ${dateLabel} (Total: ${currentTotal})`,
      html,
    });

    console.log(`Weekly attendance report sent for ${lastSundayStr}. Total: ${currentTotal}`);
  }
);

// ---------------------------------------------------------------------------
// Leave Notification — triggers when a new leave document is created
// ---------------------------------------------------------------------------
export const leaveNotification = onDocumentCreated(
  {
    document: 'leaves/{leaveId}',
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const memberName: string = data.memberName ?? '';
    const department: string = data.department ?? '';
    const startDate: string = data.startDate ?? '';
    const endDate: string = data.endDate ?? '';
    const memberEmail: string = data.memberEmail ?? '';

    const fmt = (d: string) => {
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };

    // Fetch all members to find pastors, minister, HOD of this dept, and the member
    const snap = await db.collection('members').get();
    const allMembers = snap.docs.map(d => ({ id: d.id, ...d.data() } as {
      id: string; firstName: string; lastName: string; email?: string;
      role?: string; hodDepartments?: string[];
    }));

    const recipients = new Set<string>();

    for (const m of allMembers) {
      if (!m.email) continue;
      if (m.role === 'pastor') recipients.add(m.email);
      if (m.role === 'minister') recipients.add(m.email);
      if (m.role === 'hod' && (m.hodDepartments ?? []).includes(department)) recipients.add(m.email);
    }

    // Always notify the member themselves
    if (memberEmail) recipients.add(memberEmail);

    if (recipients.size === 0) {
      console.log('No recipients found for leave notification.');
      return;
    }

    const html = `
      <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
        <div style="background:linear-gradient(135deg,#1e3a5f,#0f2744);padding:28px 40px">
          <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:600">Leave Schedule Notification</h1>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">R.C.C.G Covenant Embassy — Plano, Texas</p>
        </div>
        <div style="padding:32px 40px">
          <p style="font-size:15px;color:#334155;margin:0 0 20px">A leave has been scheduled for a department member.</p>
          <table style="border-collapse:collapse;font-size:14px;width:100%">
            <tr style="background:#f1f5f9"><td style="padding:8px 16px;font-weight:600;color:#475569;width:140px">Member</td><td style="padding:8px 16px;color:#1e293b">${memberName}</td></tr>
            <tr><td style="padding:8px 16px;font-weight:600;color:#475569">Department</td><td style="padding:8px 16px;color:#1e293b">${department}</td></tr>
            <tr style="background:#f1f5f9"><td style="padding:8px 16px;font-weight:600;color:#475569">Start Date</td><td style="padding:8px 16px;color:#1e293b">${fmt(startDate)}</td></tr>
            <tr><td style="padding:8px 16px;font-weight:600;color:#475569">End Date</td><td style="padding:8px 16px;color:#1e293b">${fmt(endDate)}</td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0"/>
          <p style="font-size:13px;color:#64748b;margin:0;text-align:center">
            R.C.C.G Covenant Embassy &nbsp;·&nbsp; Plano, Texas<br/>
            <em>Redeemed Christian Church of God</em>
          </p>
        </div>
      </div>
    `;

    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
    await Promise.all(
      Array.from(recipients).map(to =>
        sgMail.send({
          to,
          from: process.env.SENDGRID_FROM_EMAIL!,
          subject: `Leave Scheduled: ${memberName} — ${department} (${startDate} to ${endDate})`,
          html,
        })
      )
    );

    console.log(`Leave notification sent to ${recipients.size} recipient(s) for ${memberName}.`);
  }
);
