import { Star, Trash2 } from 'lucide-react';
import useVendor from './useVendor';
import PageHeader from '../components/PageHeader';
import ImageUploader from '../components/ImageUploader';
import Card from '../components/Card';
import { Async } from '../components/States';
import { imgUrl } from '../utils/format';

export function Portfolio() {
  const v = useVendor();
  return (
    <>
      <PageHeader title="Portfolio" subtitle="Up to 12 images. The first image is your cover photo." />
      <Async state={v}>{() => {
        const imgs = v.vendor.images || [];
        return (
          <div className="grid gap-6">
            <Card title="Upload images"><ImageUploader kind="portfolio" multiple max={12} value={imgs} onChange={(images) => v.save({ images }, 'Portfolio updated')} /></Card>
            {imgs.length > 0 && (
              <div className="columns-2 gap-4 md:columns-3 xl:columns-4">
                {imgs.map((u, i) => (
                  <div key={u} className="group relative mb-4 overflow-hidden rounded-xl">
                    <img src={imgUrl(u)} alt="" className="w-full object-cover" />
                    {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-gold px-2.5 py-1 text-xs font-medium text-white">Cover</span>}
                    <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-ink-bg/70 p-2 opacity-0 transition group-hover:opacity-100">
                      {i !== 0 && <button onClick={() => v.save({ images: [u, ...imgs.filter((x) => x !== u)] }, 'Cover updated')} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs"><Star size={12} /> Make cover</button>}
                      <button onClick={() => v.save({ images: imgs.filter((x) => x !== u) }, 'Image removed')} aria-label="Delete image" className="rounded-full bg-white p-1.5 text-red-600"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }}</Async>
    </>
  );
}

