import { Link } from 'react-router-dom';
import { imgUrl } from '../utils/format';

export default function CategoryCard({ category }) {
  return (
    <Link to={`/vendors?category=${category.slug}`} className="cat-card">
      <img src={imgUrl(category.image)} alt="" loading="lazy" />
      <div className="cap">
        <h3>{category.name}</h3>
        {category.vendorCount !== undefined && <div className="n">{category.vendorCount} vendor{category.vendorCount === 1 ? '' : 's'}</div>}
      </div>
    </Link>
  );
}
