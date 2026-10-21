import { imgUrl, initials } from '../utils/format';

export default function VendorLogo({ vendor, size = 56 }) {
  const style = { width: size, height: size, fontSize: size * 0.36 };
  return vendor?.logo
    ? <img src={imgUrl(vendor.logo)} alt={vendor.businessName} style={style} className="rounded-full border-2 border-white object-cover shadow" />
    : <span style={style} className="grid place-items-center rounded-full border-2 border-white bg-maroon font-display font-medium text-gold-lt shadow">{initials(vendor?.businessName)}</span>;
}
