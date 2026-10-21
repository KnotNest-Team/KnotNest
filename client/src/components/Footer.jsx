import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="kfoot">
      <div className="kfoot__grid">
        <div>
          <div className="kfoot__brand">Knot<em>Nest</em></div>
          <p className="kfoot__tag">Plan Your Perfect Beginning. A quieter way to plan the loudest, brightest days of your life.</p>
        </div>
        <div><h5>Explore</h5><ul>
          <li><Link to="/vendors">Vendors</Link></li><li><Link to="/inspiration">Inspiration</Link></li>
          <li><Link to="/#how-it-works">How It Works</Link></li><li><Link to="/vendors?featured=true">Featured vendors</Link></li>
        </ul></div>
        <div><h5>For couples</h5><ul>
          <li><Link to="/register">Create an account</Link></li><li><Link to="/customer/wedding">Wedding planner</Link></li>
          <li><Link to="/customer/budget">Budget tracker</Link></li><li><Link to="/customer/compare">Compare vendors</Link></li>
        </ul></div>
        <div><h5>Company</h5><ul>
          <li><Link to="/about">About</Link></li><li><Link to="/contact">Contact</Link></li>
          <li><Link to="/register?role=vendor">List your business</Link></li><li><Link to="/login">Login</Link></li>
        </ul></div>
      </div>
      <div className="kfoot__base"><span>© {new Date().getFullYear()} KnotNest</span><span>Crafted for Indian celebrations</span></div>
    </footer>
  );
}
