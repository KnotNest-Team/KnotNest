import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { imgUrl } from '../../utils/format';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Counter({ to, suffix = '', decimals = 0 }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (reduced()) { setN(to); return undefined; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting || started.current) return;
      started.current = true;
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / 1600);
        setN(to * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(tick); else setN(to);
      };
      requestAnimationFrame(tick);
    }), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return <span ref={ref}>{decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString()}{suffix}</span>;
}

export default function TrustReviews({ trust = [], reviews = [], google }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = reviews.length;
  const go = (d) => setI((p) => (p + d + n) % n);
  useEffect(() => {
    if (n < 2 || paused || reduced()) return undefined;
    const t = setInterval(() => setI((p) => (p + 1) % n), 7000);
    return () => clearInterval(t);
  }, [n, paused]);

  if (!trust.length && !n) return null;
  const active = reviews[i];

  return (
    <section className="slab slab--maroon" id="reviews">
      <div className="section-head reveal">
        <div>
          <div className="eyebrow" style={{ color: 'var(--gold-lt)' }}><span className="rule" />Trust</div>
          <h2>Planning a wedding is a lot.<br />Planning it together should <em>feel easy.</em></h2>
        </div>
        <p>A handful of numbers, and many stories behind them: the quiet architecture of a well-planned day.</p>
      </div>

      {trust.length > 0 && (
        <div className="trust-band reveal">
          {trust.map((t) => (
            <div className="cell" key={t.label}>
              <span className="num"><Counter to={t.to} suffix={t.suffix?.startsWith(' ') ? '' : t.suffix} decimals={t.decimals} />{t.suffix?.startsWith(' ') && <em style={{ fontSize: '0.5em', opacity: 0.7 }}>{t.suffix}</em>}</span>
              <span className="lbl">{t.label}</span>
            </div>
          ))}
        </div>
      )}

      {n > 0 && (
        <>
          <div className="section-head reveal" style={{ marginTop: 80, marginBottom: 40 }}>
            <div>
              <div className="eyebrow" style={{ color: 'var(--gold-lt)' }}><span className="rule" />Testimonials</div>
              <h2>Love from the couples<br />we've <em>planned with.</em></h2>
            </div>
            <p>Conversations with the families we've walked alongside, from first call to final pheras.</p>
          </div>

          <div className="reviews" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div className="reviews__stage">
              <div className="review-photo">
                <div className="badge"><span className="dot" /> Real Couple</div>
                <AnimatePresence mode="wait">
                  <motion.img key={active.photo} src={imgUrl(active.photo)} alt={active.couple} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} />
                </AnimatePresence>
              </div>
              <div className="review-body">
                <AnimatePresence mode="wait">
                  <motion.div key={active.couple} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}>
                    <div className="review-stars">{'★'.repeat(active.rating)}</div>
                    <blockquote className="review-quote">{active.quote}</blockquote>
                    <div className="review-attr"><span className="name">{active.couple}</span><span className="sep">·</span><span className="meta">{active.city} · {active.date}</span></div>
                  </motion.div>
                </AnimatePresence>
                <div className="reviews__faded">
                  {reviews.map((r, k) => <button key={r.couple} className={'mini' + (k === i ? ' active' : '')} onClick={() => setI(k)} aria-label={r.couple}><img src={imgUrl(r.photo)} alt="" /></button>)}
                </div>
              </div>
            </div>
            <div className="reviews__controls">
              <div className="reviews__count">{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')} Reviews</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="arrow-btn" onClick={() => go(-1)} aria-label="Previous review"><ArrowLeft size={18} strokeWidth={1.4} /></button>
                <button className="arrow-btn" onClick={() => go(1)} aria-label="Next review"><ArrowRight size={18} strokeWidth={1.4} /></button>
              </div>
            </div>

            {google?.visible && google.rating > 0 && (
              <div className="gcard reveal">
                <div className="gcard__left">
                  <div className="gcard__logo"><GoogleG /></div>
                  <div className="gcard__label"><div className="t1">Google Reviews</div><div className="t2">Verified across India</div></div>
                </div>
                <div className="gcard__stars">
                  <div><div className="gcard__based" style={{ marginBottom: 6 }}>Based on {google.count}+ reviews</div><div className="stars">★★★★★</div></div>
                  <div className="rating">{google.rating}<em>/5</em></div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

const GoogleG = () => (
  <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
);
