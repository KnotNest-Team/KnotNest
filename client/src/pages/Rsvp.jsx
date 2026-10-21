import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { rsvpApi } from '../services/api';
import RsvpView from '../rsvp/RsvpView';
import { errMsg, fieldErrors } from '../utils/format';

/** Public page behind each guest's personal link: /rsvp/:token. No account needed. */
export default function Rsvp() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    rsvpApi.get(token).then((d) => { setData(d); document.title = `${d.couple} | You are invited`; }).catch((e) => setError(errMsg(e)));
  }, [token]);

  if (error) return (
    <div className="grid min-h-screen place-items-center bg-ivory px-4 font-sans">
      <div className="max-w-md rounded-3xl border border-ink/10 bg-cream p-10 text-center shadow-card">
        <p aria-hidden="true" className="font-display text-xl tracking-[0.5em] text-gold">◆ ◆ ◆</p>
        <h1 className="mt-3 font-display text-4xl text-ink">This link isn't working</h1>
        <p className="mt-3 text-sm text-muted">{error}. Ask the couple to send you a fresh invitation.</p>
      </div>
    </div>
  );
  if (!data) return <div className="grid min-h-screen place-items-center bg-ivory"><Loader2 className="animate-spin text-maroon" aria-label="Loading your invitation" /></div>;
  return (
    <RsvpView data={data}
      onSubmit={async (payload) => {
        try { const d = await rsvpApi.respond(token, payload); setData(d); return d; } catch (e) { throw Object.assign(new Error(errMsg(e)), { details: fieldErrors(e) }); }
      }} />
  );
}
