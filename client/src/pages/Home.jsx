import { useEffect } from 'react';
import useFetch from '../hooks/useFetch';
import useReveal from '../hooks/useReveal';
import { contentApi } from '../services/api';
import Hero from '../components/landing/Hero';
import Stories from '../components/landing/Stories';
import TrustReviews from '../components/landing/TrustReviews';
import Experience from '../components/landing/Experience';
import { Categories, FeaturedVendors, HowItWorks, CtaBand, HomeSkeleton } from '../components/landing/Sections';
import { ErrorState } from '../components/States';

export default function Home() {
  const state = useFetch(() => contentApi.home());
  const c = state.data;
  useEffect(() => { document.title = 'KnotNest | Plan Your Perfect Beginning.'; }, []);
  useReveal([c]);

  return (
    <>
      <Hero hero={c?.hero} />
      {state.loading && <HomeSkeleton />}
      {state.error && <div className="slab slab--ivory"><ErrorState message={state.error} onRetry={state.reload} /></div>}
      {c && (
        <>
          <Categories list={c.categories} />
          <Stories list={c.stories} />
          <FeaturedVendors list={c.featuredVendors} offers={c.offers} banner={c.banners?.find((b) => b.active)} />
          <HowItWorks />
          <TrustReviews trust={c.trust} reviews={c.testimonials} google={c.google} />
          <Experience list={c.experiences} />
          <CtaBand />
        </>
      )}
    </>
  );
}
