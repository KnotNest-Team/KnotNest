import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../components/Modal';
import Button from '../components/Button';
import ImageUploader from '../components/ImageUploader';
import { Input, Select, Textarea } from '../components/Field';
import { adminApi, categoryApi, locationApi, vendorApi } from '../services/api';
import useFetch from '../hooks/useFetch';
import { useToast } from '../context/ToastContext';
import { errMsg, fieldErrors } from '../utils/format';

const blank = { businessName: '', ownerName: '', email: '', phone: '', category: '', description: '', location: '', city: '', state: '', address: '', startingPrice: '', status: 'approved', verified: false, featured: false };

/** Add / edit vendor modal used by Admin > Vendors. */
export default function VendorForm({ vendor, open, onClose, onSaved }) {
  const toast = useToast();
  const meta = useFetch(async () => ({ cats: (await categoryApi.list({ all: true })).categories, cities: (await locationApi.list({ all: true })).locations }), [], { enabled: open });
  const { register, handleSubmit, reset, watch, setValue, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues: blank });
  const [images, setImages] = useState([]);
  const [logo, setLogo] = useState('');

  useEffect(() => {
    if (!open) return;
    reset(vendor ? { ...blank, ...vendor, category: vendor.category?._id || vendor.category } : blank);
    setImages(vendor?.images || []); setLogo(vendor?.logo || '');
  }, [open, vendor]); // eslint-disable-line

  const submit = async (d) => {
    const body = { ...d, startingPrice: Number(d.startingPrice) || 0, images, logo };
    delete body._id; delete body.__v; delete body.createdAt; delete body.updatedAt; delete body.viewsLog; delete body.views; delete body.rating; delete body.reviewCount;
    try {
      if (vendor) { await vendorApi.update(vendor._id, body); toast.success('Vendor updated'); }
      else { await vendorApi.create(body); toast.success('Vendor added'); }
      onSaved(); onClose();
    } catch (e) { Object.entries(fieldErrors(e)).forEach(([k, m]) => setError(k, { message: m })); toast.error(errMsg(e)); }
  };

  return (
    <Modal open={open} onClose={onClose} size="xl" title={vendor ? 'Edit vendor' : 'Add vendor'} subtitle="Changes are saved to the database immediately."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={isSubmitting} onClick={handleSubmit(submit)}>{vendor ? 'Save changes' : 'Add vendor'}</Button></>}>
      <form className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" onSubmit={handleSubmit(submit)} noValidate>
        <Input label="Business name *" error={errors.businessName?.message} {...register('businessName', { required: 'Required' })} />
        <Input label="Owner name" {...register('ownerName')} />
        <Select label="Category *" placeholder="Select…" error={errors.category?.message} options={(meta.data?.cats || []).map((c) => ({ value: c._id, label: c.name }))} {...register('category', { required: 'Required' })} />
        <Input label="Email" type="email" {...register('email')} />
        <Input label="Phone" type="tel" {...register('phone')} />
        <Input label="Starting price (₹)" type="number" min="0" {...register('startingPrice')} />
        <Select label="City" placeholder="Select…" options={(meta.data?.cities || []).map((l) => l.city)} {...register('city')} />
        <Input label="Area / locality" {...register('location')} />
        <Input label="State" {...register('state')} />
        <Input wrapClass="sm:col-span-2 lg:col-span-3" label="Address" {...register('address')} />
        <Textarea wrapClass="sm:col-span-2 lg:col-span-3" label="Description" rows={4} {...register('description')} />
        <Select label="Status" options={['approved', 'pending', 'rejected', 'suspended']} {...register('status')} />
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-ink-2"><input type="checkbox" className="h-4 w-4 accent-[#6E1E2A]" {...register('verified')} /> Verified</label>
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-ink-2"><input type="checkbox" className="h-4 w-4 accent-[#6E1E2A]" {...register('featured')} /> Featured</label>
        <div className="sm:col-span-2 lg:col-span-3 grid gap-5 sm:grid-cols-[auto_1fr]">
          <ImageUploader kind="profile" round label="Logo" value={logo} onChange={setLogo} />
          <ImageUploader kind="portfolio" multiple max={12} label="Portfolio images (first is the cover)" value={images} onChange={setImages} />
        </div>
      </form>
    </Modal>
  );
}
