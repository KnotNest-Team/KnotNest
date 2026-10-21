import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { imgUrl } from '../../utils/format';

export default function Experience({ list = [] }) {
  const [open, setOpen] = useState(null);
  const video = useRef(null);
  const active = open != null ? list[open] : null;

  useEffect(() => {
    if (open == null) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);

  if (!list.length) return null;
  return (
    <section className="slab slab--ink" id="experience">
      <div className="section-head reveal">
        <div>
          <div className="eyebrow" style={{ color: 'var(--gold-lt)' }}><span className="rule" />Video Journal</div>
          <h2>Feel the moments<br />before you <em>live them.</em></h2>
        </div>
        <p>Three short films drawn from real celebrations: the ceremony, the party after, and the small details that never leave you.</p>
      </div>

      <div className="exp reveal">
        {list.slice(0, 3).map((t, k) => (
          <button key={t.title} className={'exp-tile ' + (k === 0 ? 't1' : 't' + (k + 1))} onClick={() => setOpen(k)} aria-label={`Play ${t.title}`}>
            <img src={imgUrl(t.image)} alt={t.title} loading="lazy" />
            <div className="exp-body">
              <div className="exp-top"><span className="exp-num">Reel {String(k + 1).padStart(2, '0')}</span><span className="exp-tag">{t.tag}</span></div>
              <div className="exp-bottom">
                <div>
                  <h3 className="exp-title">{t.title.split(' ')[0]} <em>{t.title.split(' ').slice(1).join(' ')}</em></h3>
                  <div className="exp-desc">{t.desc}</div>
                </div>
                <div className="play" aria-hidden="true"><Play size={k === 0 ? 28 : 22} fill="currentColor" /></div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div className="modal open" style={{ transition: 'none' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} onClick={() => setOpen(null)}>
            <motion.div className="modal__box" style={{ transition: 'none' }} initial={{ y: 30, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }} onClick={(e) => e.stopPropagation()}>
              <div className="modal__head">
                <div><h4 className="modal__title">{active.title}</h4><p className="modal__desc">{active.desc}</p></div>
                <button className="modal__close" onClick={() => setOpen(null)} aria-label="Close"><X size={18} strokeWidth={1.4} /></button>
              </div>
              <div className="modal__video">
                {active.videoUrl
                  ? <video ref={video} src={imgUrl(active.videoUrl)} poster={imgUrl(active.image)} controls autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <><img src={imgUrl(active.image)} alt="" /><div className="film-badge"><div className="fake-note">The film for this reel is coming soon</div></div></>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
