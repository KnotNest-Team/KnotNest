import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { imgUrl } from '../../utils/format';

const EASE = [0.2, 0.7, 0.2, 1];
const MotionLink = motion.create(Link);
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Stories({ list = [] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = list.length;
  const go = (d) => setI((p) => (p + d + n) % n);

  useEffect(() => {
    if (n < 2 || paused || reduced()) return undefined;
    const t = setInterval(() => setI((p) => (p + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n, paused]);

  if (!n) return null;
  const active = list[i];
  const thumbs = [0, 1, 2].map((k) => list[(i + 1 + k) % n]).filter((t, k, arr) => n > 1 && arr.findIndex((x) => x.slug === t.slug) === k && t.slug !== active.slug);
  const [a, b] = active.couple.split(' & ');
  const pad = (x) => String(x).padStart(2, '0');

  return (
    <section className="slab slab--ivory" id="real-weddings" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="section-head reveal">
        <div>
          <div className="eyebrow"><span className="rule" />Real Weddings</div>
          <h2>Every wedding<br />has a <em>story.</em></h2>
        </div>
        <p>Discover celebrations we've helped bring to life, from intimate seaside vows to full-throated palace baraats.</p>
      </div>

      <div className="stories reveal">
        <div className="stories__stage">
          <MotionLink className="story-active" to={`/inspiration/${active.slug}`} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.15}
            onDragEnd={(_, info) => { if (info.offset.x < -60) go(1); else if (info.offset.x > 60) go(-1); }}>
              <AnimatePresence mode="popLayout">
                <motion.img key={active.slug} src={imgUrl(active.image)} alt={active.couple} draggable={false}
                  initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: EASE }} />
              </AnimatePresence>
              <div className="veil" />
              <div className="index-tag"><span className="rule" /><span>{pad(i + 1)} / {pad(n)}</span><span className="rule" /><span>{active.tag}</span></div>
              <div className="caption">
                <AnimatePresence mode="wait">
                  <motion.div key={active.slug} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.5, ease: EASE }}>
                    <div className="meta">{active.city} · {active.date}</div>
                    <h3>{a} <em>&amp;</em> {b}</h3>
                    <div className="style">{active.style}</div>
                  </motion.div>
                </AnimatePresence>
                <div className="go" aria-hidden="true"><ArrowRight size={20} strokeWidth={1.4} /></div>
              </div>
          </MotionLink>

          <div className="story-thumbs">
            {thumbs.map((t) => (
              <div key={t.slug} className="story-thumb" role="button" tabIndex={0} onClick={() => setI(list.findIndex((x) => x.slug === t.slug))}
                onKeyDown={(e) => e.key === 'Enter' && setI(list.findIndex((x) => x.slug === t.slug))}>
                <img src={imgUrl(t.image)} alt={t.couple} loading="lazy" />
                <div className="thumb-cap"><div className="n">{t.couple}</div><div className="m">{t.city} · {t.date}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="stories__controls">
          <div className="stories__count"><b>{pad(i + 1)}</b> · {pad(n)} Stories</div>
          <div className="stories__dots">{list.map((s, k) => <button key={s.slug} className={k === i ? 'active' : ''} onClick={() => setI(k)} aria-label={`Story ${k + 1}`} />)}</div>
          <div className="stories__arrows">
            <button className="arrow-btn" onClick={() => go(-1)} aria-label="Previous story"><ArrowLeft size={18} strokeWidth={1.4} /></button>
            <button className="arrow-btn" onClick={() => go(1)} aria-label="Next story"><ArrowRight size={18} strokeWidth={1.4} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
