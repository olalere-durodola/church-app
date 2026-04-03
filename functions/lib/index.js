"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveNotification = exports.weeklyAttendanceReport = exports.visitorFollowUp = exports.birthdayReminders = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const mail_1 = __importDefault(require("@sendgrid/mail"));
admin.initializeApp();
const db = admin.firestore();
// ---------------------------------------------------------------------------
// Birthday Reminders — runs every day at 8 AM Central Time
// ---------------------------------------------------------------------------
exports.birthdayReminders = (0, scheduler_1.onSchedule)({
    schedule: 'every day 08:00',
    timeZone: 'America/Chicago',
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'ANTHROPIC_API_KEY'],
}, async () => {
    const today = new Date();
    const month = today.getMonth() + 1; // 1-based
    const day = today.getDate();
    // Fetch members whose birthday is today
    const snap = await db
        .collection('members')
        .where('birthdayMonth', '==', month)
        .where('birthdayDay', '==', day)
        .get();
    if (snap.empty) {
        console.log('No birthdays today.');
        return;
    }
    const members = snap.docs.map(d => d.data());
    // Use Claude to draft a birthday message for each member
    const anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    const drafts = [];
    for (const m of members) {
        const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            messages: [
                {
                    role: 'user',
                    content: `Write a warm, brief birthday message from R.C.C.G Covenant Embassy church to ${m.firstName} ${m.lastName}. Keep it to 2-3 sentences. Friendly and faith-based but not overly formal.`,
                },
            ],
        });
        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        drafts.push(`<b>${m.firstName} ${m.lastName}</b>${m.phone ? ` — ${m.phone}` : ''}${m.email ? ` — ${m.email}` : ''}<br/><i>${text}</i>`);
    }
    // Build email
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const html = `
      <h2>🎂 Birthday Reminders — ${dateStr}</h2>
      <p>${members.length} member${members.length !== 1 ? 's have' : ' has'} a birthday today:</p>
      <hr/>
      ${drafts.map(d => `<p>${d}</p><hr/>`).join('')}
      <p style="color:#888;font-size:12px;">Sent by R.C.C.G Covenant Embassy Church App</p>
    `;
    mail_1.default.setApiKey(process.env.SENDGRID_API_KEY);
    await mail_1.default.send({
        to: 'olalere.durodola@gmail.com',
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: `🎂 ${members.length} Birthday${members.length !== 1 ? 's' : ''} Today — ${dateStr}`,
        html,
    });
    console.log(`Birthday reminder sent for ${members.length} member(s).`);
});
// ---------------------------------------------------------------------------
// Visitor Follow-up — triggers when a new member document is created
// ---------------------------------------------------------------------------
exports.visitorFollowUp = (0, firestore_1.onDocumentCreated)({
    document: 'members/{memberId}',
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'ANTHROPIC_API_KEY'],
}, async (event) => {
    var _a, _b, _c;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    // Only proceed for Visitors with an email address
    if (data.status !== 'Visitor' || !data.email) {
        console.log('Not a visitor or no email — skipping.');
        return;
    }
    const firstName = (_b = data.firstName) !== null && _b !== void 0 ? _b : '';
    const lastName = (_c = data.lastName) !== null && _c !== void 0 ? _c : '';
    // Use Claude to draft a personalized welcome message, fall back to default if unavailable
    let messageText = `We are so glad you joined us and hope your visit was a blessing.
      You are always welcome at R.C.C.G Covenant Embassy, and we look forward to seeing you again soon.
      May God continue to guide and bless you. — The R.C.C.G Covenant Embassy Family`;
    try {
        const anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
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
    }
    catch (err) {
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
    mail_1.default.setApiKey(process.env.SENDGRID_API_KEY);
    await mail_1.default.send({
        to: data.email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: `Welcome to R.C.C.G Covenant Embassy, ${firstName}!`,
        html,
    });
    console.log(`Visitor follow-up sent to ${firstName} ${lastName} at ${data.email}`);
});
// ---------------------------------------------------------------------------
// Weekly Attendance Report — runs every Monday at 8 AM Central Time
// ---------------------------------------------------------------------------
exports.weeklyAttendanceReport = (0, scheduler_1.onSchedule)({
    schedule: 'every monday 08:00',
    timeZone: 'America/Chicago',
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'ANTHROPIC_API_KEY'],
}, async () => {
    var _a;
    // Get last Sunday's date (YYYY-MM-DD)
    const today = new Date();
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - 1); // Monday - 1 = Sunday
    const lastSundayStr = lastSunday.toISOString().split('T')[0];
    // Get previous 4 Sundays for trend comparison
    const pastSundays = [];
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
    const current = lastSundayDoc.data();
    const currentTotal = (_a = current.total) !== null && _a !== void 0 ? _a : (current.men + current.women + current.children + current.visitors);
    // Fetch past records for trend
    const pastDocs = await Promise.all(pastSundays.map(d => db.collection('attendance').doc(d).get()));
    const pastRecords = pastDocs
        .filter(d => d.exists)
        .map(d => {
        var _a;
        const rec = d.data();
        const total = (_a = rec.total) !== null && _a !== void 0 ? _a : (rec.men + rec.women + rec.children + rec.visitors);
        return Object.assign(Object.assign({ date: d.id }, rec), { total });
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
        const anthropic = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
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
    }
    catch (err) {
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
    mail_1.default.setApiKey(process.env.SENDGRID_API_KEY);
    await mail_1.default.send({
        to: 'olalere.durodola@gmail.com',
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: `📊 Weekly Attendance Report — ${dateLabel} (Total: ${currentTotal})`,
        html,
    });
    console.log(`Weekly attendance report sent for ${lastSundayStr}. Total: ${currentTotal}`);
});
// ---------------------------------------------------------------------------
// Leave Notification — triggers when a new leave document is created
// ---------------------------------------------------------------------------
exports.leaveNotification = (0, firestore_1.onDocumentCreated)({
    document: 'leaves/{leaveId}',
    secrets: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
}, async (event) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const data = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!data)
        return;
    const memberName = (_b = data.memberName) !== null && _b !== void 0 ? _b : '';
    const department = (_c = data.department) !== null && _c !== void 0 ? _c : '';
    const startDate = (_d = data.startDate) !== null && _d !== void 0 ? _d : '';
    const endDate = (_e = data.endDate) !== null && _e !== void 0 ? _e : '';
    const memberEmail = (_f = data.memberEmail) !== null && _f !== void 0 ? _f : '';
    const fmt = (d) => {
        const [y, m, day] = d.split('-').map(Number);
        return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };
    // Fetch all members to find pastors, minister, HOD of this dept, and the member
    const snap = await db.collection('members').get();
    const allMembers = snap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
    const recipients = new Set();
    for (const m of allMembers) {
        if (!m.email)
            continue;
        if (m.role === 'pastor')
            recipients.add(m.email);
        if (m.role === 'minister')
            recipients.add(m.email);
        if (m.role === 'hod' && ((_g = m.hodDepartments) !== null && _g !== void 0 ? _g : []).includes(department))
            recipients.add(m.email);
    }
    // Always notify the member themselves
    if (memberEmail)
        recipients.add(memberEmail);
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
    mail_1.default.setApiKey(process.env.SENDGRID_API_KEY);
    await Promise.all(Array.from(recipients).map(to => mail_1.default.send({
        to,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: `Leave Scheduled: ${memberName} — ${department} (${startDate} to ${endDate})`,
        html,
    })));
    console.log(`Leave notification sent to ${recipients.size} recipient(s) for ${memberName}.`);
});
//# sourceMappingURL=index.js.map