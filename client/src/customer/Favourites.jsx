import { Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { favouriteApi } from '../services/api';
import PageHeader from '../components/PageHeader';
import VendorCard from '../components/VendorCard';
import Button from '../components/Button';
import { Async, EmptyState } from '../components/States';

export default function Favourites() {
  const state = useFetch(() => favouriteApi.list());
  const drop = (id) => state.setData({ favourites: state.data.favourites.filter((v) => v._id !== id) });
  return (
    <>
      <PageHeader title="Favourites" subtitle="Vendors you've saved. Compare them or send an enquiry." action={<Button to="/customer/compare" variant="secondary">Open compare</Button>} />
      <Async state={state} isEmpty={(d) => !d.favourites.length} empty={<EmptyState title="No saved vendors" message="Tap the heart on any vendor to save it here." action={<Button to="/vendors">Discover vendors</Button>} />}>
        {({ favourites }) => (
          <div className="grid gap-6 sm:grid-cols-2 2xl:grid-cols-3">{favourites.map((v) => <VendorCard key={v._id} vendor={v} onRemoveFavourite={drop} />)}</div>
        )}
      </Async>
      <p className="mt-6 text-sm text-muted">Looking for more? <Link to="/vendors" className="text-maroon underline">Browse the marketplace</Link>.</p>
    </>
  );
}
