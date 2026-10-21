/**
 * Wedding invitation email. Email apps ignore modern CSS and strip scripts, so this is built from
 * nested tables with inline styles only (works in Gmail, Outlook, Apple Mail and phone apps).
 * Palette and type follow the KnotNest site: maroon #6E1E2A, gold #B8894A, ivory #F7F1E8, Cormorant/Georgia.
 */
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MONTH = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SANS = "'Jost', 'Helvetica Neue', Arial, sans-serif";

const fullDate = (d) => { const x = new Date(d); return `${WEEKDAY[x.getUTCDay()]}, ${x.getUTCDate()} ${MONTH[x.getUTCMonth()].charAt(0)}${MONTH[x.getUTCMonth()].slice(1).toLowerCase()} ${x.getUTCFullYear()}`; };
/** Email colours per invitation theme (matches the RSVP page designs). */
export const PALETTES = {
  royal: { band: '#4A0F1A', accent: '#D9B46A', primary: '#7A1F2B', bg: '#F7EEDF', card: '#FFFAF1', line: '#E5C992', motif: '&#9670;' },
  gujarati: { band: '#9E0F26', accent: '#F2B705', primary: '#B3122E', bg: '#FFF6E5', card: '#FFFFFF', line: '#F4C95D', motif: '&#10022;' },
  marathi: { band: '#3A1450', accent: '#D4A72C', primary: '#5B2178', bg: '#F6F0E6', card: '#FFFDF8', line: '#DCC07A', motif: '&#10048;' },
  punjabi: { band: '#8A1430', accent: '#F6A623', primary: '#A3122A', bg: '#FFF4EC', card: '#FFFFFF', line: '#F7B955', motif: '&#10042;' },
  south: { band: '#0D3527', accent: '#D4A537', primary: '#8A1C1C', bg: '#FBF6E9', card: '#FFFDF6', line: '#D9BE72', motif: '&#10023;' },
  bengali: { band: '#8F0F12', accent: '#FFFFFF', primary: '#B71C1C', bg: '#FFF8F3', card: '#FFFFFF', line: '#EFB3A8', motif: '&#10049;' },
  nikah: { band: '#06281F', accent: '#C9A646', primary: '#0B4F3C', bg: '#F5F2EA', card: '#FFFDF7', line: '#D8C38A', motif: '&#10038;' },
  christian: { band: '#8C5A50', accent: '#F3D9C8', primary: '#8C5A50', bg: '#FBF8F3', card: '#FFFFFF', line: '#EAD8C9', motif: '&#10047;' },
  modern: { band: '#2D3A2E', accent: '#C46A4A', primary: '#2D3A2E', bg: '#F7F6F1', card: '#FFFFFF', line: '#DDE3D6', motif: '&#8226;' },
};

const isPublic = (url) => /^https:\/\//i.test(url) && !/localhost|127\.0\.0\.1/.test(url);

function eventBlock(e, P) {
  const d = new Date(e.date);
  const where = [e.venueName, e.address].filter(Boolean).map(esc).join('<br>');
  return `
  <tr><td style="padding:0 0 14px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${P.card};border:1px solid ${P.line};border-radius:14px;">
      <tr>
        <td width="84" valign="top" align="center" style="padding:18px 0 18px 0;border-right:1px solid #EFE6D6;">
          <div style="font-family:${SANS};font-size:11px;letter-spacing:2px;color:${P.primary};opacity:.75;">${MONTH[d.getUTCMonth()]}</div>
          <div style="font-family:${SERIF};font-size:38px;line-height:40px;color:${P.primary};">${d.getUTCDate()}</div>
          <div style="font-family:${SANS};font-size:11px;color:#7A6A62;">${d.getUTCFullYear()}</div>
        </td>
        <td valign="top" style="padding:16px 20px 18px 20px;">
          <div style="font-family:${SERIF};font-size:24px;line-height:28px;color:#1A1414;">${esc(e.name)}</div>
          <div style="font-family:${SANS};font-size:13px;line-height:20px;color:#3A2E2A;padding-top:4px;">${fullDate(e.date)}${e.time ? ` &nbsp;|&nbsp; ${esc(e.time)}` : ''}</div>
          ${e.meaning ? `<div style="font-family:${SERIF};font-style:italic;font-size:15px;line-height:21px;color:#7A6A62;padding-top:6px;">${esc(e.meaning)}</div>` : ''}
          ${where ? `<div style="font-family:${SANS};font-size:13px;line-height:20px;color:#3A2E2A;padding-top:8px;">${where}</div>` : ''}
          ${e.dressCode ? `<div style="font-family:${SANS};font-size:12px;line-height:18px;color:#7A6A62;padding-top:6px;">Dress code: ${esc(e.dressCode)}</div>` : ''}
          ${e.mapLink ? `<div style="padding-top:10px;"><a href="${esc(e.mapLink)}" style="font-family:${SANS};font-size:13px;color:${P.primary};text-decoration:underline;">View on map</a></div>` : ''}
        </td>
      </tr>
    </table>
  </td></tr>`;
}

/**
 * @param {object} p  couple, hostLine, message, guest {name, seat, maxGuests}, events[], rsvpUrl, appUrl, reminder
 * @returns {{subject:string, html:string, text:string}}
 */
export function renderInvite({ couple, message, guest, events, rsvpUrl, appUrl, reminder = false, theme = 'royal' }) {
  const P = PALETTES[theme] || PALETTES.royal;
  const hero = isPublic(appUrl) ? `${appUrl.replace(/\/$/, '')}/assets/images/wedding-mandap.jpg` : '';
  const first = events[0];
  const subject = reminder
    ? `Reminder: please RSVP for ${couple}'s wedding`
    : `You're invited: ${couple}${first ? `, ${fullDate(first.date).split(', ')[1]}` : ''}`;
  const pre = reminder ? `${couple} would love to know if you can make it.` : `Join ${couple} for their wedding celebrations.`;
  const intro = reminder
    ? `We haven't heard from you yet. It would mean a lot to ${esc(couple)} to know if you can join them, so they can plan seats and food for everyone.`
    : esc(message || `Together with their families, ${couple} request the pleasure of your company as they begin their journey together.`);

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Jost:wght@400;500&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${P.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(pre)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${P.bg};">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${P.card};border:1px solid ${P.line};border-radius:20px;overflow:hidden;">
    <tr><td align="center" style="background:${P.band};padding:30px 24px 26px 24px;border-bottom:4px solid ${P.accent};">
      <div style="font-family:${SERIF};font-size:18px;color:${P.accent};letter-spacing:6px;">${P.motif}&nbsp;${P.motif}&nbsp;${P.motif}</div>
      <div style="font-family:${SANS};font-size:12px;letter-spacing:3px;color:#EFE6D6;padding-top:12px;">${reminder ? 'A GENTLE REMINDER' : 'WEDDING INVITATION'}</div>
    </td></tr>
    ${hero ? `<tr><td><img src="${esc(hero)}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>` : ''}
    <tr><td align="center" style="padding:34px 36px 6px 36px;">
      <div style="font-family:${SANS};font-size:15px;color:#3A2E2A;">Dear ${esc(guest.name)},</div>
      <div style="font-family:${SERIF};font-style:italic;font-size:46px;line-height:52px;color:${P.primary};padding:16px 0 10px 0;">${esc(couple)}</div>
      <div style="font-family:${SERIF};font-size:16px;color:${P.primary};opacity:.6;letter-spacing:8px;">${P.motif}${P.motif}${P.motif}</div>
      <div style="font-family:${SERIF};font-size:19px;line-height:28px;color:#3A2E2A;padding:18px 0 0 0;">${intro}</div>
    </td></tr>
    <tr><td style="padding:26px 28px 6px 28px;">
      <div style="font-family:${SERIF};font-size:20px;color:#7A6A62;padding:0 0 12px 4px;">${events.length > 1 ? 'You are invited to' : 'Join us for'}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${events.map((e) => eventBlock(e, P)).join('')}</table>
    </td></tr>
    ${guest.seat ? `<tr><td align="center" style="padding:4px 28px 6px 28px;"><div style="display:inline-block;font-family:${SANS};font-size:14px;color:${P.primary};background:${P.bg};border:1px solid ${P.line};border-radius:999px;padding:8px 18px;">Your table: <b>${esc(guest.seat)}</b></div></td></tr>` : ''}
    <tr><td align="center" style="padding:22px 28px 8px 28px;">
      <div style="font-family:${SANS};font-size:14px;line-height:22px;color:#3A2E2A;padding-bottom:16px;">This invitation is for up to <b>${guest.maxGuests || 1}</b> ${guest.maxGuests === 1 ? 'person' : 'people'}. Please let us know who's coming.</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${P.primary}" style="border-radius:999px;">
        <a href="${esc(rsvpUrl)}" style="display:inline-block;font-family:${SANS};font-size:15px;font-weight:500;letter-spacing:1px;color:#F7F1E8;text-decoration:none;padding:15px 38px;border-radius:999px;">RSVP now</a>
      </td></tr></table>
      <div style="font-family:${SANS};font-size:12px;color:#7A6A62;padding-top:12px;">No account or password needed.</div>
    </td></tr>
    <tr><td style="padding:26px 36px 30px 36px;">
      <div style="border-top:1px solid ${P.line};padding-top:18px;font-family:${SANS};font-size:12px;line-height:19px;color:#7A6A62;">
        If the button doesn't work, copy this link into your browser:<br><a href="${esc(rsvpUrl)}" style="color:${P.primary};word-break:break-all;">${esc(rsvpUrl)}</a><br><br>
        Sent by KnotNest on behalf of ${esc(couple)}. Your details are used only for this invitation. This link is personal to you, so please don't forward it.
      </div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    `Dear ${guest.name},`, '', reminder ? `A reminder from ${couple}: please let them know if you can make it.` : (message || `${couple} invite you to their wedding celebrations.`), '',
    ...events.flatMap((e) => [`${e.name}: ${fullDate(e.date)}${e.time ? `, ${e.time}` : ''}`, [e.venueName, e.address].filter(Boolean).join(', '), e.mapLink ? `Map: ${e.mapLink}` : '', '']).filter((l, i, a) => l || a[i - 1]),
    guest.seat ? `Your table: ${guest.seat}` : '', `RSVP (no account needed): ${rsvpUrl}`, '', `Sent by KnotNest on behalf of ${couple}.`,
  ].filter((l) => l !== undefined).join('\n');

  return { subject, html, text };
}
