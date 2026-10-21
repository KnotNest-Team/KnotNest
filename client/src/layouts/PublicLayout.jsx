import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CompareTray from '../components/CompareTray';

/** `landing` pages let the transparent navbar overlap the hero; inner pages are offset below a solid bar. */
export default function PublicLayout({ landing = false }) {
  return (
    <>
      <Navbar solid={!landing} />
      <main className={landing ? '' : 'page-top min-h-[70vh] bg-ivory'}><Outlet /></main>
      <Footer />
      <CompareTray />
    </>
  );
}
