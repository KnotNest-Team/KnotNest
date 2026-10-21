import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { imgUrl } from '../../utils/format';

export default function Hero({ hero }) {
  const video = useRef(null);
  useEffect(() => { video.current?.play?.().catch(() => {}); }, [hero?.videoUrl]);
  const lines = hero?.titleLines?.length ? hero.titleLines : ['Your Dream', 'Wedding', 'Starts Here.'];
  const label = hero?.storyLabel;
  const stats = hero?.stats || [];
  const poster = imgUrl(hero?.image || '/assets/images/hero-main.jpg');

  return (
    <section className="hero" id="home">
      <div className="hero__media">
        <img src={poster} alt="Indian wedding ceremony" style={{ position: 'absolute', inset: 0, zIndex: -1 }} />
        {hero?.videoUrl && (
          <video ref={video} autoPlay muted loop playsInline preload="metadata" poster={poster} onError={(e) => { e.currentTarget.style.display = 'none'; }}>
            <source src={imgUrl(hero.videoUrl)} type="video/mp4" />
          </video>
        )}
      </div>
      <div className="hero__overlay" />
      <div className="hero__grain" />

      <div className="hero__content">
        <div className="hero__center">
          {label?.couple && (
            <div className="hero__story-label reveal in">
              <span className="dot" /><span>{label.couple}</span><span className="sep">•</span><span>{label.city}</span><span className="sep">•</span><span>{label.date}</span>
            </div>
          )}
          <h1 className="hero__title reveal in delay-1">
            {lines.slice(0, -1).map((l) => <span key={l}>{l}<br /></span>)}
            <em>{lines[lines.length - 1]}</em>
          </h1>
          <p className="hero__sub reveal in delay-2">{hero?.subtitle || 'Discover trusted wedding vendors, plan every detail, and turn your wedding vision into reality.'}</p>
          <div className="hero__actions reveal in delay-3">
            <Link className="btn-primary" to="/vendors">Explore Vendors <ArrowRight size={16} strokeWidth={1.4} className="arrow" /></Link>
            <Link className="btn-ghost" to="/start-planning">Plan My Wedding <ArrowRight size={16} strokeWidth={1.4} className="arrow" /></Link>
          </div>
          {stats.length > 0 && (
            <div className="hero__stats reveal in delay-4">
              {stats.map((s) => <div className="hero__stat" key={s.label}><span className="num">{s.value}</span><span className="lbl">{s.label}</span></div>)}
            </div>
          )}
        </div>
        <div className="hero__bottom">
          <div className="scroll-ind"><span>Scroll to explore</span><span className="line" aria-hidden="true" /></div>
          <div className="hero__meta">Plan Your Perfect Beginning.<br />An editorial by KnotNest</div>
        </div>
      </div>
    </section>
  );
}
