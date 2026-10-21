import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { uploadApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { errMsg, imgUrl } from '../utils/format';

/**
 * Uploads to POST /api/uploads/:kind and reports URLs. `value` is a string (single) or string[] (multiple).
 * Validates type/size on the client too (the server re-validates).
 */
export default function ImageUploader({ kind, value, onChange, multiple = false, max = 1, label, round = false }) {
  const toast = useToast();
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const list = multiple ? value || [] : value ? [value] : [];

  const pick = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    if (files.some((f) => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type))) return toast.error('Only JPG, PNG or WEBP images');
    if (files.some((f) => f.size > 5 * 1024 * 1024)) return toast.error('Each image must be under 5 MB');
    if (multiple && list.length + files.length > max) return toast.error(`You can have at most ${max} images`);
    setBusy(true);
    try {
      const urls = await uploadApi.upload(kind, files);
      onChange(multiple ? [...list, ...urls] : urls[0]);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const remove = (u) => onChange(multiple ? list.filter((x) => x !== u) : '');
  const shape = round ? 'rounded-full' : 'rounded-xl';

  return (
    <div>
      {label && <span className="kn-label">{label}</span>}
      <div className="flex flex-wrap gap-3">
        {list.map((u) => (
          <div key={u} className={`group relative h-24 w-24 overflow-hidden ${shape} border border-ink/10`}>
            <img src={imgUrl(u)} alt="" className="h-full w-full object-cover" />
            <button type="button" onClick={() => remove(u)} aria-label="Remove image" className="absolute right-1 top-1 hidden rounded-full bg-ink/70 p-1 text-white group-hover:block"><X size={12} /></button>
          </div>
        ))}
        {(multiple ? list.length < max : !list.length) && (
          <button type="button" onClick={() => ref.current.click()} disabled={busy}
            className={`grid h-24 w-24 place-items-center ${shape} border border-dashed border-ink/25 text-muted transition hover:border-maroon hover:text-maroon`}>
            {busy ? <Loader2 className="animate-spin" size={20} /> : <span className="flex flex-col items-center gap-1 text-xs"><ImagePlus size={20} />Upload</span>}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple} hidden onChange={pick} />
    </div>
  );
}
