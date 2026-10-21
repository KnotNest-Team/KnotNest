import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import useVendor from './useVendor';
import useFetch from '../hooks/useFetch';
import { categoryApi } from '../services/api';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ImageUploader from '../components/ImageUploader';
import { Input, Select, Textarea } from '../components/Field';
import { Async } from '../components/States';

export default function VendorProfileEditor() {
  const v = useVendor();
  const cats = useFetch(() => categoryApi.list());
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm();
  useEffect(() => {
    if (v.vendor) reset({ businessName: v.vendor.businessName, ownerName: v.vendor.ownerName, email: v.vendor.email, phone: v.vendor.phone, category: v.vendor.category?._id || v.vendor.category, description: v.vendor.description,
      location: v.vendor.location, city: v.vendor.city, state: v.vendor.state, address: v.vendor.address, startingPrice: v.vendor.startingPrice, logo: v.vendor.logo,
      website: v.vendor.socialLinks?.website || '', instagram: v.vendor.socialLinks?.instagram || '', facebook: v.vendor.socialLinks?.facebook || '', youtube: v.vendor.socialLinks?.youtube || '' });
  }, [v.vendor?._id]); // eslint-disable-line

  const submit = ({ website, instagram, facebook, youtube, ...d }) => v.save({ ...d, startingPrice: Number(d.startingPrice) || 0, socialLinks: { website, instagram, facebook, youtube } }, 'Profile saved');

  return (
    <>
      <PageHeader title="Business Profile" subtitle="This is what couples see on your public page." action={v.vendor && <Badge status={v.vendor.status} />} />
      <Async state={v}>
        {() => (
          <form onSubmit={handleSubmit(submit)} className="grid max-w-4xl gap-6" noValidate>
            <Card title="Basics">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2"><ImageUploader kind="profile" round label="Logo" value={watch('logo')} onChange={(u) => setValue('logo', u, { shouldDirty: true })} /></div>
                <Input label="Business name" error={errors.businessName?.message} {...register('businessName', { required: 'Required' })} />
                <Input label="Owner name" {...register('ownerName')} />
                <Input label="Business email" type="email" {...register('email')} />
                <Input label="Phone" type="tel" {...register('phone')} />
                <Select label="Category" options={(cats.data?.categories || []).map((c) => ({ value: c._id, label: c.name }))} {...register('category')} />
                <Input label="Starting price (₹)" type="number" min="0" {...register('startingPrice')} />
                <Textarea wrapClass="sm:col-span-2" label="About your business" rows={6} {...register('description')} />
              </div>
            </Card>
            <Card title="Location">
              <div className="grid gap-5 sm:grid-cols-3">
                <Input label="Area / locality" {...register('location')} /><Input label="City" {...register('city')} /><Input label="State" {...register('state')} />
                <Input wrapClass="sm:col-span-3" label="Full address (used for the map)" {...register('address')} />
              </div>
            </Card>
            <Card title="Social links">
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Website" placeholder="https://" {...register('website')} /><Input label="Instagram" placeholder="https://instagram.com/…" {...register('instagram')} />
                <Input label="Facebook" {...register('facebook')} /><Input label="YouTube" {...register('youtube')} />
              </div>
            </Card>
            <div><Button size="lg" type="submit" loading={isSubmitting}>Save profile</Button></div>
          </form>
        )}
      </Async>
    </>
  );
}
