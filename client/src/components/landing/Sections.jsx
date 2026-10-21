import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import CategoryCard from '../CategoryCard';
import VendorCard from '../VendorCard';
import { imgUrl } from '../../utils/format';

const Head = ({ eyebrow, title, em, children, light }) => (
  <div className="section-head reveal">
    <div>
      <div className="eyebrow" style={light ? { color: 'var(--gold-lt)' } : undefined}><span className="rule" />{eyebrow}</div>
      <h2>{title}<em>{em}</em></h2>
    </div>
    {children && <p>{children}</p>}
  </div>
);

export function Categories({ list = [] }) {
  if (!list.length) return null;
  return (
    <section className="slab slab--cream" id="categories">
      <Head eyebrow="Vendor Categories" title={<>Everything your day<br />will </>} em="need.">From the mandap to the mehendi, find the people who will make it yours.</Head>
      <div className="cats reveal">{list.slice(0, 12).map((c) => <CategoryCard key={c._id} category={c} />)}</div>
      <div className="cats-more"><Link to="/vendors" className="btn-primary">Browse all vendors <ArrowRight size={16} strokeWidth={1.4} className="arrow" /></Link></div>
    </section>
  );
}

export function FeaturedVendors({ list = [], offers = [], banner }) {
  if (!list.length && !offers.length && !banner) return null;
  return (
    <section className="slab slab--ivory" id="featured">
      {list.length > 0 && (
        <>
          <Head eyebrow="Featured Vendors" title={<>Trusted by couples,<br />loved by </>} em="families.">Hand-picked partners with verified work and honest reviews.</Head>
          <div className="vgrid reveal">{list.slice(0, 6).map((v) => <VendorCard key={v._id} vendor={v} />)}</div>
        </>
      )}
      {banner && (
        <div className="promo reveal" style={{ marginTop: 80 }}>
          <img src={imgUrl(banner.image)} alt="" loading="lazy" />
          <div className="promo__body">
            <h3>{banner.title}</h3><p>{banner.subtitle}</p>
            <Link to={banner.link || '/vendors'} className="btn-primary">Explore <ArrowRight size={16} strokeWidth={1.4} className="arrow" /></Link>
          </div>
        </div>
      )}
      {offers.length > 0 && (
        <div className="offers reveal">
          {offers.map((o) => (
            <div className="offer" key={o.title}>
              <img src={imgUrl(o.image)} alt="" loading="lazy" />
              <div className="offer__body"><h4>{o.title}</h4><p>{o.description}</p>{o.code && <span className="code">Code {o.code}{o.validTill ? ` · till ${o.validTill}` : ''}</span>}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const STEPS = [
  ['Tell Us Your Vision', 'Share your wedding date, location, budget and requirements.'],
  ['Discover Vendors', 'Find vendors who match your requirements, city and style.'],
  ['Compare & Connect', 'Save vendors, compare services and send enquiries.'],
  ['Book & Plan', 'Book your vendors and manage your wedding in one place.'],
];

export function HowItWorks() {
  return (
    <section className="slab slab--cream" id="how-it-works">
      <Head eyebrow="How It Works" title={<>Four calm steps to<br />your </>} em="perfect beginning." />
      <div className="how">
        {STEPS.map(([t, d], k) => (
          <motion.div key={t} className="how__step" initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.7, delay: k * 0.15, ease: [0.2, 0.7, 0.2, 1] }}>
            <div className="how__num">{String(k + 1).padStart(2, '0')}</div>
            <motion.div className="how__line" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.2 + k * 0.15 }} />
            <h3>{t}</h3><p>{d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="slab slab--maroon cta-band">
      <h2>Plan Your Perfect <em>Beginning.</em></h2>
      <p>Create a free account to save vendors, track your budget and keep every detail of your wedding in one calm place.</p>
      <div className="row">
        <Link className="btn-primary" to="/register" style={{ background: 'var(--ivory)', color: 'var(--maroon-dk)' }}>Get Started <ArrowRight size={16} strokeWidth={1.4} className="arrow" /></Link>
        <Link className="btn-outline-inv" to="/vendors">Explore Vendors</Link>
      </div>
    </section>
  );
}

export const HomeSkeleton = () => (
  <section className="slab slab--ivory" aria-busy="true">
    <div style={{ maxWidth: 1440, margin: '0 auto', display: 'grid', gap: 18, gridTemplateColumns: '1.7fr 1fr' }}>
      <div className="skel" style={{ minHeight: 520 }} />
      <div style={{ display: 'grid', gap: 18 }}><div className="skel" /><div className="skel" /><div className="skel" /></div>
    </div>
  </section>
);
