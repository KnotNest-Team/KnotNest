import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  CalendarCheck, Heart, LayoutDashboard, MessageSquare, Bell, User, Settings, Wallet, ListChecks, GitCompareArrows, Star, HeartHandshake,
  Store, Users, FolderTree, MapPin, BarChart3, FileText, Home, ShieldCheck, Image, Layers, Package, CalendarDays, LineChart, UsersRound, MessagesSquare, ShieldAlert, ClipboardCheck, Palette,
  CalendarPlus, BadgePercent, IndianRupee,
} from 'lucide-react';
import ProtectedRoute from './ProtectedRoute';
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import { PageLoader } from '../components/States';
import HomePage from '../pages/Home';
import { Login, Register } from '../pages/AuthPage';
import { NotificationsPage, ProfilePage, SettingsPage } from '../pages/Shared';
import { About, Contact, Inspiration, InspirationDetail, NotFound, StartPlanning, Unauthorized } from '../pages/StaticPages';

// Dashboards and the marketplace are code-split so the landing page stays light.
const Vendors = lazy(() => import('../pages/Vendors'));
const Rsvp = lazy(() => import('../pages/Rsvp'));
const Messages = lazy(() => import('../pages/Messages'));
const VendorProfile = lazy(() => import('../pages/VendorProfile'));
const c = {
  Overview: lazy(() => import('../customer/Overview')), Wedding: lazy(() => import('../customer/Wedding')), Checklist: lazy(() => import('../customer/Checklist')),
  Budget: lazy(() => import('../customer/Budget')), Enquiries: lazy(() => import('../customer/Enquiries')), Bookings: lazy(() => import('../customer/Bookings')),
  Favourites: lazy(() => import('../customer/Favourites')), Compare: lazy(() => import('../customer/Compare')), Reviews: lazy(() => import('../customer/Reviews')),
  Guests: lazy(() => import('../customer/Guests')),
  InvitationDesign: lazy(() => import('../customer/InvitationDesign')),
  BookWedding: lazy(() => import('../customer/BookWedding')),
};
const v = {
  Dashboard: lazy(() => import('../vendor/Dashboard')), Profile: lazy(() => import('../vendor/Profile')), Services: lazy(() => import('../vendor/Services').then((m) => ({ default: m.Services }))),
  Packages: lazy(() => import('../vendor/Services').then((m) => ({ default: m.Packages }))), Portfolio: lazy(() => import('../vendor/Portfolio').then((m) => ({ default: m.Portfolio }))),
  Availability: lazy(() => import('../vendor/Availability')), Enquiries: lazy(() => import('../vendor/Enquiries')), Bookings: lazy(() => import('../vendor/Bookings')),
  Reviews: lazy(() => import('../vendor/Reviews')), Analytics: lazy(() => import('../vendor/Analytics')),
  Pricing: lazy(() => import('../vendor/Pricing')),
};
const a = {
  Dashboard: lazy(() => import('../admin/Dashboard')), Users: lazy(() => import('../admin/Users')), Vendors: lazy(() => import('../admin/Vendors')),
  Categories: lazy(() => import('../admin/Taxonomy').then((m) => ({ default: m.Categories }))), Locations: lazy(() => import('../admin/Taxonomy').then((m) => ({ default: m.Locations }))),
  Bookings: lazy(() => import('../admin/Records').then((m) => ({ default: m.Bookings }))), Enquiries: lazy(() => import('../admin/Records').then((m) => ({ default: m.Enquiries }))),
  Reviews: lazy(() => import('../admin/Records').then((m) => ({ default: m.Reviews }))), Reports: lazy(() => import('../admin/Reports')),
  Homepage: lazy(() => import('../admin/Homepage')), Notifications: lazy(() => import('../admin/Notifications')),
  Safety: lazy(() => import('../admin/Safety')),
  BookingReviews: lazy(() => import('../admin/BookingReviews')),
  Discounts: lazy(() => import('../admin/Discounts')),
};

const CUSTOMER_NAV = [
  { to: '/customer/dashboard', label: 'Overview', icon: LayoutDashboard }, { to: '/customer/wedding', label: 'My Wedding', icon: HeartHandshake },
  { to: '/customer/guests', label: 'Guests & RSVP', icon: UsersRound }, { to: '/customer/invitation', label: 'Invitation design', icon: Palette },
  { to: '/customer/checklist', label: 'Checklist', icon: ListChecks }, { to: '/customer/budget', label: 'Budget', icon: Wallet },
  { to: '/customer/messages', label: 'Messages', icon: MessagesSquare },
  { to: '/customer/enquiries', label: 'Enquiries', icon: MessageSquare }, { to: '/customer/book', label: 'Plan & book', icon: CalendarPlus }, { to: '/customer/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/customer/favourites', label: 'Favourites', icon: Heart }, { to: '/customer/compare', label: 'Compare', icon: GitCompareArrows },
  { to: '/customer/reviews', label: 'Reviews', icon: Star }, { to: '/customer/notifications', label: 'Notifications', icon: Bell },
  { to: '/customer/profile', label: 'Profile', icon: User }, { to: '/customer/settings', label: 'Settings', icon: Settings },
];
const VENDOR_NAV = [
  { to: '/vendor/dashboard', label: 'Dashboard', icon: LayoutDashboard }, { to: '/vendor/profile', label: 'Profile', icon: Store },
  { to: '/vendor/services', label: 'Services', icon: Layers }, { to: '/vendor/packages', label: 'Packages', icon: Package }, { to: '/vendor/pricing', label: 'Event pricing', icon: IndianRupee },
  { to: '/vendor/portfolio', label: 'Portfolio', icon: Image }, { to: '/vendor/availability', label: 'Availability', icon: CalendarDays },
  { to: '/vendor/messages', label: 'Messages', icon: MessagesSquare },
  { to: '/vendor/enquiries', label: 'Enquiries', icon: MessageSquare }, { to: '/vendor/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/vendor/reviews', label: 'Reviews', icon: Star }, { to: '/vendor/analytics', label: 'Analytics', icon: LineChart },
  { to: '/vendor/notifications', label: 'Notifications', icon: Bell }, { to: '/vendor/settings', label: 'Settings', icon: Settings },
];
const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }, { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/vendors', label: 'Vendors', icon: Store }, { to: '/admin/approvals', label: 'Vendor Approvals', icon: ShieldCheck },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree }, { to: '/admin/locations', label: 'Locations', icon: MapPin },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck }, { to: '/admin/enquiries', label: 'Enquiries', icon: MessageSquare },
  { to: '/admin/booking-reviews', label: 'Booking reviews', icon: ClipboardCheck }, { to: '/admin/discounts', label: 'Discounts', icon: BadgePercent }, { to: '/admin/reviews', label: 'Reviews', icon: Star }, { to: '/admin/safety', label: 'Safety', icon: ShieldAlert }, { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/homepage', label: 'Homepage', icon: Home }, { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout landing />}><Route index element={<HomePage />} /></Route>
        <Route element={<PublicLayout />}>
          <Route path="vendors" element={<Vendors />} />
          <Route path="vendors/:id" element={<VendorProfile />} />
          <Route path="inspiration" element={<Inspiration />} />
          <Route path="inspiration/:slug" element={<InspirationDetail />} />
          <Route path="real-weddings" element={<Navigate to="/inspiration" replace />} />
          <Route path="real-weddings/:slug" element={<InspirationDetail />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="start-planning" element={<StartPlanning />} />
          <Route path="unauthorized" element={<Unauthorized />} />
        </Route>
        <Route path="rsvp/:token" element={<Rsvp />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        <Route element={<ProtectedRoute roles={['customer']} />}>
          <Route path="customer" element={<DashboardLayout variant="customer" items={CUSTOMER_NAV} subtitle="Your wedding" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<c.Overview />} /><Route path="wedding" element={<c.Wedding />} /><Route path="checklist" element={<c.Checklist />} />
            <Route path="budget" element={<c.Budget />} /><Route path="enquiries" element={<c.Enquiries />} /><Route path="bookings" element={<c.Bookings />} />
            <Route path="favourites" element={<c.Favourites />} /><Route path="compare" element={<c.Compare />} /><Route path="reviews" element={<c.Reviews />} /><Route path="guests" element={<c.Guests />} /><Route path="invitation" element={<c.InvitationDesign />} /><Route path="book" element={<c.BookWedding />} /><Route path="messages" element={<Messages />} />
            <Route path="notifications" element={<NotificationsPage />} /><Route path="profile" element={<ProfilePage />} /><Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['vendor']} />}>
          <Route path="vendor" element={<DashboardLayout variant="vendor" items={VENDOR_NAV} subtitle="Vendor studio" />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<v.Dashboard />} /><Route path="profile" element={<v.Profile />} /><Route path="services" element={<v.Services />} />
            <Route path="packages" element={<v.Packages />} /><Route path="pricing" element={<v.Pricing />} /><Route path="portfolio" element={<v.Portfolio />} /><Route path="availability" element={<v.Availability />} />
            <Route path="enquiries" element={<v.Enquiries />} /><Route path="bookings" element={<v.Bookings />} /><Route path="reviews" element={<v.Reviews />} /><Route path="messages" element={<Messages />} />
            <Route path="analytics" element={<v.Analytics />} /><Route path="notifications" element={<NotificationsPage />} /><Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="admin" element={<DashboardLayout variant="admin" items={ADMIN_NAV} subtitle="Admin console" />}>
            <Route index element={<a.Dashboard />} /><Route path="users" element={<a.Users />} /><Route path="vendors" element={<a.Vendors />} />
            <Route path="approvals" element={<a.Vendors pendingOnly />} /><Route path="categories" element={<a.Categories />} /><Route path="locations" element={<a.Locations />} />
            <Route path="bookings" element={<a.Bookings />} /><Route path="enquiries" element={<a.Enquiries />} /><Route path="reviews" element={<a.Reviews />} /><Route path="safety" element={<a.Safety />} /><Route path="booking-reviews" element={<a.BookingReviews />} /><Route path="discounts" element={<a.Discounts />} />
            <Route path="reports" element={<a.Reports />} /><Route path="homepage" element={<a.Homepage />} /><Route path="notifications" element={<a.Notifications />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<PublicLayout />}><Route path="*" element={<NotFound />} /></Route>
      </Routes>
    </Suspense>
  );
}
