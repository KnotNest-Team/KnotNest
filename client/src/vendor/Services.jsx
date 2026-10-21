import useVendor from './useVendor';
import ItemManager from './ItemManager';
import PageHeader from '../components/PageHeader';
import { Async } from '../components/States';
import { inr } from '../utils/format';

export function Services() {
  const v = useVendor();
  return (
    <>
      <PageHeader title="Services" subtitle="What you offer, with an optional starting price for each." />
      <Async state={v}>{() => (
        <ItemManager noun="Service" items={v.vendor.services} onSave={(services, m) => v.save({ services }, m)}
          fields={[{ key: 'name', label: 'Service name', required: true }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'price', label: 'Starting price (₹)', type: 'number' }]}
          render={(s) => <><h3 className="font-display text-2xl text-ink">{s.name}</h3><p className="mt-1 text-sm text-muted">{s.description}</p>{s.price > 0 && <p className="mt-3 text-sm">From <b className="text-maroon">{inr(s.price)}</b></p>}</>} />
      )}</Async>
    </>
  );
}

export function Packages() {
  const v = useVendor();
  return (
    <>
      <PageHeader title="Packages" subtitle="Bundle your services into tiers like Silver, Gold and Premium." />
      <Async state={v}>{() => (
        <ItemManager noun="Package" items={v.vendor.packages} onSave={(packages, m) => v.save({ packages }, m)}
          fields={[{ key: 'name', label: 'Package name', required: true }, { key: 'price', label: 'Price from (₹)', type: 'number', required: true }, { key: 'description', label: 'Short description', type: 'textarea' }, { key: 'features', label: 'What is included', type: 'lines' }]}
          render={(p) => <><h3 className="font-display text-2xl text-ink">{p.name}</h3><p className="font-display text-3xl text-maroon">{inr(p.price)}+</p><p className="mt-1 text-sm text-muted">{p.description}</p><ul className="mt-3 list-disc pl-5 text-sm text-ink-2">{p.features?.map((f) => <li key={f}>{f}</li>)}</ul></>} />
      )}</Async>
    </>
  );
}
