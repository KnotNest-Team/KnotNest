import '../config/env.js';
import { fileURLToPath } from 'url';
import connectDB, { closeDB } from '../config/db.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Location from '../models/Location.js';
import Vendor from '../models/Vendor.js';
import Wedding, { DEFAULT_TASKS } from '../models/Wedding.js';
import Enquiry from '../models/Enquiry.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import Expense from '../models/Expense.js';
import Notification from '../models/Notification.js';
import SiteContent from '../models/SiteContent.js';
import ContactMessage from '../models/ContactMessage.js';
import Guest from '../models/Guest.js';
import Payment from '../models/Payment.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import AuditLog from '../models/AuditLog.js';
import Setting, { withDefaults } from '../models/Setting.js';
import { resolveDays, priceDays, eventsByDay } from '../services/bookingService.js';
import { recalcVendorRating } from '../services/ratingService.js';
import { flagsFor } from '../services/moderationService.js';
import { planEvents, taskDueDate } from '../services/plannerService.js';

const img = (n) => `/assets/images/${n}.jpg`;
const PHOTOS = ['wedding-mandap', 'wedding-jaipur', 'wedding-goa', 'wedding-sangeet', 'wedding-baraat', 'wedding-gujarati', 'exp-wedding', 'exp-celebration', 'exp-details', 'hero-alt', 'hero-main'];
const photos = (i, n = 5) => Array.from({ length: n }, (_, k) => img(PHOTOS[(i + k * 3) % PHOTOS.length]));

const CATEGORIES = [
  ['Wedding Venues', 'Palaces, lawns, beach resorts and banquet halls.', 'wedding-jaipur'],
  ['Photographers', 'Candid, cinematic and traditional wedding photography.', 'wedding-mandap'],
  ['Videographers', 'Wedding films and highlight reels.', 'exp-wedding'],
  ['Makeup Artists', 'Bridal, party and groom makeup.', 'review-3'],
  ['Mehendi Artists', 'Bridal and guest mehendi designs.', 'exp-details'],
  ['Decorators', 'Mandap, stage and floral decor.', 'wedding-gujarati'],
  ['Caterers', 'Multi-cuisine and regional wedding menus.', 'wedding-sangeet'],
  ['Bridal Wear', 'Lehengas, sarees and couture.', 'review-1'],
  ['Groom Wear', 'Sherwanis, bandhgalas and accessories.', 'review-5'],
  ['Jewellery', 'Polki, kundan and diamond sets.', 'hero-alt'],
  ['Wedding Planners', 'Full-service planning and coordination.', 'hero-main'],
  ['DJs', 'Sangeet and reception DJs.', 'exp-celebration'],
  ['Choreographers', 'Sangeet choreography and performances.', 'wedding-baraat'],
  ['Invitations', 'Custom cards, digital invites and stationery.', 'review-2'],
  ['Florists', 'Fresh flower garlands and arrangements.', 'wedding-goa'],
  ['Wedding Cakes', 'Designer cakes and dessert tables.', 'review-4'],
  ['Transportation', 'Vintage cars, baraat horses and guest shuttles.', 'wedding-baraat'],
  ['Entertainment', 'Live bands, dhol and folk performers.', 'exp-celebration'],
];

const LOCATIONS = [['Mumbai', 'Maharashtra'], ['Delhi', 'Delhi'], ['Jaipur', 'Rajasthan'], ['Udaipur', 'Rajasthan'], ['Goa', 'Goa'], ['Bengaluru', 'Karnataka'],
  ['Hyderabad', 'Telangana'], ['Chennai', 'Tamil Nadu'], ['Kolkata', 'West Bengal'], ['Pune', 'Maharashtra'], ['Ahmedabad', 'Gujarat'], ['Chandigarh', 'Chandigarh']];

// [business, owner, category, city, locality, startingPrice, description, services[], package prices]
const VENDORS = [
  ['Studio Kesar Photography', 'Rohan Mehta', 'Photographers', 'Mumbai', 'Bandra West', 85000, 'Candid, editorial wedding storytelling. We photograph the quiet moments between the rituals, from the haldi laughter to the final vidaai.', ['Candid Photography', 'Pre-wedding Shoot', 'Traditional Photography', 'Album Design']],
  ['Rajmahal Heritage Palace', 'Vikram Singh Rathore', 'Wedding Venues', 'Jaipur', 'Amer Road', 450000, 'A 300-year-old palace with marble courtyards and lawns for up to 800 guests, with in-house stay and traditional hospitality.', ['Palace Courtyard', 'Lawn Events', 'Bridal Suites', 'In-house Stay']],
  ['Lakeview Pichola Estate', 'Meera Sharma', 'Wedding Venues', 'Udaipur', 'Lake Pichola', 600000, 'Lakeside venue with sunset ceremonies on the water, boat baraats and royal Mewari hospitality.', ['Lakeside Mandap', 'Boat Entry', 'Guest Rooms', 'Sangeet Terrace']],
  ['Frame & Vows Films', 'Aditya Nair', 'Videographers', 'Bengaluru', 'Indiranagar', 95000, 'Cinematic wedding films, same-day edits and drone coverage across South India.', ['Cinematic Film', 'Same-day Edit', 'Drone Coverage', 'Teaser Reel']],
  ['Glow by Anjali', 'Anjali Kapoor', 'Makeup Artists', 'Delhi', 'Greater Kailash', 35000, 'HD and airbrush bridal makeup with long-wear finishes designed for photographs and humid mandaps alike.', ['Bridal Makeup', 'Engagement Look', 'Party Makeup', 'Hairstyling']],
  ['Henna Tales by Zoya', 'Zoya Khan', 'Mehendi Artists', 'Hyderabad', 'Banjara Hills', 12000, 'Intricate bridal mehendi in Arabic, Rajasthani and Indo-western styles, with a team for guest mehendi.', ['Bridal Mehendi', 'Guest Mehendi', 'Arabic Designs', 'Portrait Mehendi']],
  ['Marigold & Co. Decor', 'Nandini Desai', 'Decorators', 'Ahmedabad', 'Satellite', 150000, 'Mandap, stage and entrance design, handcrafted with fresh marigold, jasmine and brass accents.', ['Mandap Design', 'Stage Decor', 'Entrance Decor', 'Lighting']],
  ['Swad-e-Shaadi Caterers', 'Harpreet Singh', 'Caterers', 'Chandigarh', 'Sector 17', 1100, 'Punjabi, Mughlai and live-counter menus priced per plate, with a trained service staff of 60+.', ['Punjabi Menu', 'Live Counters', 'Dessert Stations', 'Bar Service']],
  ['Zari & Silk Couture', 'Ishita Rao', 'Bridal Wear', 'Chennai', 'T. Nagar', 60000, 'Handwoven Kanjivaram sarees and bespoke lehengas with zardozi work from master artisans.', ['Bridal Lehenga', 'Kanjivaram Sarees', 'Custom Couture', 'Trousseau Styling']],
  ['Sherwani House Kolkata', 'Arnab Ghosh', 'Groom Wear', 'Kolkata', 'Park Street', 28000, 'Tailored sherwanis, bandhgalas and Bengali dhoti-kurta sets for the groom and his party.', ['Custom Sherwani', 'Bandhgala', 'Groom Party Sets', 'Accessories']],
  ['Kundan Mahal Jewellers', 'Rajiv Jain', 'Jewellery', 'Jaipur', 'Johari Bazaar', 120000, 'Polki, kundan and meenakari bridal sets, crafted in Jaipur and available on rent or purchase.', ['Bridal Sets', 'Polki Jewellery', 'Rental Collections', 'Custom Design']],
  ['The Big Fat Planners', 'Shruti Verma', 'Wedding Planners', 'Goa', 'Candolim', 300000, 'Destination wedding planning, from guest logistics to vendor management, so families can simply enjoy the days.', ['Full Planning', 'Day-of Coordination', 'Destination Weddings', 'Guest Logistics']],
  ['Beat Baraat DJs', 'Karan Malhotra', 'DJs', 'Pune', 'Koregaon Park', 40000, 'Sangeet and reception DJs with premium sound, LED walls and live dhol integration.', ['Sangeet DJ', 'Live Dhol Mix', 'LED Walls', 'Sound & Lights']],
  ['Nach Baliye Choreography', 'Pooja Iyer', 'Choreographers', 'Mumbai', 'Andheri West', 25000, 'Family-friendly sangeet choreography. Even the uncles will dance.', ['Couple Dance', 'Family Performance', 'Group Choreography', 'Rehearsals']],
  ['Inkwell Invitations', 'Tanya Bhatia', 'Invitations', 'Delhi', 'Hauz Khas', 18000, 'Letterpress, laser-cut and digital invitations with custom illustration of your venue.', ['Printed Cards', 'Digital Invites', 'Custom Illustration', 'Wedding Stationery']],
  ['Petal & Thread Florals', 'Divya Menon', 'Florists', 'Bengaluru', 'Jayanagar', 22000, 'Fresh flower garlands, jaimala, car decor and floral bouquets delivered on time.', ['Jaimala', 'Car Decor', 'Bridal Bouquet', 'Floral Backdrops']],
  ['Sugar Muse Cakes', 'Nisha Pillai', 'Wedding Cakes', 'Pune', 'Baner', 9000, 'Designer multi-tier wedding cakes, dessert tables and engagement cakes made to order.', ['Tiered Cakes', 'Dessert Tables', 'Cupcakes', 'Custom Toppers']],
  ['Royal Wheels Vintage Cars', 'Imran Qureshi', 'Transportation', 'Hyderabad', 'Jubilee Hills', 15000, 'Vintage cars, decorated baraat horses and guest shuttle services across the city.', ['Vintage Car', 'Baraat Horse', 'Guest Shuttles', 'Decorated Cars']],
  ['Dhol Taal Live Entertainment', 'Sukhdev Singh', 'Entertainment', 'Chandigarh', 'Zirakpur', 30000, 'Dhol players, live bands and folk performers for the baraat and sangeet.', ['Dhol Players', 'Live Band', 'Folk Dancers', 'Fireworks']],
];

const CUSTOMERS = [
  ['Demo Customer', 'user@knotnest.com', '9876500001'], ['Riya Shah', 'riya@example.com', '9876500002'], ['Aarav Patel', 'aarav@example.com', '9876500003'],
  ['Meera Nair', 'meera@example.com', '9876500004'], ['Kabir Khan', 'kabir@example.com', '9876500005'], ['Ananya Iyer', 'ananya@example.com', '9876500006'],
  ['Vihaan Gupta', 'vihaan@example.com', '9876500007'], ['Sana Qureshi', 'sana@example.com', '9876500008'],
];

const REVIEW_TEXT = [
  [5, 'Absolutely loved working with them. Professional, punctual and the results were beyond what we imagined.'],
  [5, 'They understood our vision on the very first call. Our families are still talking about the day.'],
  [4, 'Great experience overall. A small delay on delivery, but the quality made up for it.'],
  [5, 'Worth every rupee. Calm, creative and so easy to coordinate with.'],
  [4, 'Very talented team. Would recommend booking early because their dates fill fast.'],
  [5, 'Made our destination wedding stress-free. Every detail was handled.'],
  [5, 'Lovely people and beautiful work. The whole family was impressed.'],
  [3, 'Good work but communication could be better before the event.'],
  [5, 'Exceeded expectations. We cried happy tears seeing the final result.'],
  [4, 'Professional and reasonable. Delivered exactly what was promised.'],
];

const daysFromNow = (n) => new Date(Date.now() + n * 86400000);
const dayStr = (d) => d.toISOString().slice(0, 10);

/** Wipes and reloads demo data. Assumes a database connection is already open. */
export async function runSeed() {
  await Promise.all([User, Category, Location, Vendor, Wedding, Enquiry, Booking, Review, Expense, Notification, SiteContent, ContactMessage, Guest, Payment, Conversation, Message, AuditLog, Setting].map((M) => M.deleteMany({})));
  console.log('Cleared existing data');

  // ---- users ----
  const admin = await User.create({ name: 'KnotNest Admin', email: 'admin@knotnest.com', password: 'Admin@123', role: 'admin', phone: '9876500000' });
  const customers = [];
  for (const [name, email, phone] of CUSTOMERS) customers.push(await User.create({ name, email, phone, password: 'User@123', role: 'customer' }));
  const demo = customers[0];

  // ---- categories & locations ----
  const cats = await Category.create(CATEGORIES.map(([name, description, image]) => ({ name, description, image: img(image) })));
  const cat = (name) => cats.find((c) => c.name === name);
  await Location.create(LOCATIONS.map(([city, state], i) => ({ city, state, image: img(PHOTOS[i % PHOTOS.length]) })));

  // ---- vendors (+ owner accounts) ----
  const vendors = [];
  for (let i = 0; i < VENDORS.length; i++) {
    const [businessName, ownerName, category, city, location, startingPrice, description, services] = VENDORS[i];
    const isDemo = i === 0;
    const owner = await User.create({
      name: ownerName, role: 'vendor', password: 'Vendor@123', phone: `98765${String(10000 + i)}`,
      email: isDemo ? 'vendor@knotnest.com' : `owner${i}@knotnest.com`,
    });
    const per = category === 'Caterers' ? 'per plate' : '';
    const v = await Vendor.create({
      owner: owner._id, businessName, ownerName, email: owner.email, phone: owner.phone, category: cat(category)._id, description,
      city, location, state: LOCATIONS.find((l) => l[0] === city)?.[1] || '', address: `${location}, ${city}`,
      startingPrice, images: photos(i), logo: '',
      services: services.map((name, k) => ({ name, description: `${name} by ${businessName}${per ? ` (${per})` : ''}.`, price: Math.round(startingPrice * (1 + k * 0.25)) })),
      packages: [
        { name: 'Silver', price: startingPrice, description: 'Essentials for a smaller celebration', features: [services[0], services[1], 'Pre-event consultation'] },
        { name: 'Gold', price: Math.round(startingPrice * 1.8), description: 'Our most popular package', features: [services[0], services[1], services[2], 'Dedicated coordinator', 'Priority support'] },
        { name: 'Premium', price: Math.round(startingPrice * 3), description: 'The complete luxury experience', features: services.concat(['Senior team on-site', 'Custom requests']) },
      ],
      unavailableDates: [dayStr(daysFromNow(40 + i)), dayStr(daysFromNow(55 + i * 2))],
      verified: i % 3 !== 2, featured: i < 8, status: 'approved', views: 120 + ((i * 97) % 600),
      viewsLog: Array.from({ length: 10 }, (_, k) => ({ date: dayStr(daysFromNow(-k)), count: 3 + ((i + k * 7) % 14) })),
      socialLinks: { website: `https://example.com/${i}`, instagram: `https://instagram.com/${businessName.split(' ')[0].toLowerCase()}` },
    });
    vendors.push(v);
  }
  // ---- per-event prices, covered events and full-day packages (flexible wedding bookings) ----
  const EVENT_SHARE = [['Haldi', 0.35], ['Pithi Dastoor', 0.35], ['Mehendi', 0.45], ['Mayra', 0.3], ['Sangeet', 0.6], ['Baraat', 0.4], ['Wedding', 1], ['Reception', 0.7], ['Engagement', 0.5], ['Cocktail', 0.5]];
  const COVERS = { 'Mehendi Artists': ['Mehendi'], DJs: ['Sangeet', 'Reception', 'Cocktail', 'Baraat'], Choreographers: ['Sangeet'], Entertainment: ['Sangeet', 'Baraat', 'Reception', 'Cocktail'] };
  const PER_EVENT = new Set(['Photographers', 'Videographers', 'Wedding Venues', 'Makeup Artists', 'Mehendi Artists', 'Decorators', 'DJs', 'Choreographers', 'Entertainment', 'Florists']);
  for (let i = 0; i < vendors.length; i++) {
    const [, , category, , , startingPrice] = VENDORS[i];
    if (!PER_EVENT.has(category)) continue;
    const round = (n) => Math.max(500, Math.round(n / 500) * 500);
    const covers = COVERS[category] || [];
    await Vendor.updateOne({ _id: vendors[i]._id }, {
      eventPricing: EVENT_SHARE.filter(([n]) => !covers.length || covers.some((c) => n.includes(c) || c.includes(n))).map(([eventName, share]) => ({ eventName, price: round(startingPrice * (covers.length ? 1 : share)) })),
      eventsOffered: covers,
      // Frame & Vows sells its own full-day package; the rest use the platform's full-day discount
      fullDay: { enabled: category !== 'Mehendi Artists', price: category === 'Videographers' ? round(startingPrice * 1.1) : 0 },
    });
  }
  await Setting.create({ key: 'platform' }); // default discount rules (admin: Discounts & packages)
  // one pending vendor so the admin approval queue is not empty
  const pendingOwner = await User.create({ name: 'Tarun Bedi', email: 'pending@knotnest.com', password: 'Vendor@123', role: 'vendor', phone: '9876599999' });
  await Vendor.create({ owner: pendingOwner._id, businessName: 'Bedi Brothers Band', ownerName: 'Tarun Bedi', email: pendingOwner.email, category: cat('Entertainment')._id, city: 'Chandigarh', location: 'Sector 22', startingPrice: 45000, description: 'Live wedding band awaiting approval.', images: [img('exp-celebration')], status: 'pending' });

  // demo customer favourites
  demo.favourites = [vendors[0]._id, vendors[1]._id, vendors[6]._id];
  await demo.save();

  // ---- demo customer's wedding ----
  const w = await Wedding.create({
    customer: demo._id, partnerName: 'Aarav', coupleNames: 'Diya & Aarav', weddingDate: daysFromNow(120), location: 'Jaipur', guestCount: 350, budget: 2500000, weddingStyle: 'Royal Rajasthani', culture: 'rajasthani',
    inviteMessage: 'With the blessings of the Sharma and Mehta families, Diya & Aarav invite you to celebrate their wedding with them in Jaipur.',
    checklist: DEFAULT_TASKS.map((title, i) => ({ title, done: i < 3, dueDate: taskDueDate(title, daysFromNow(120)) })),
  });
  // events planned automatically from the Rajasthani tradition, then personalised with venues
  const VENUES = {
    mehendi: ['Sharma Residence', 'C-14, Bani Park, Jaipur'], pithi: ['Sharma Residence', 'C-14, Bani Park, Jaipur'], mayra: ['Sharma Residence', 'C-14, Bani Park, Jaipur'],
    sangeet: ['Narain Niwas Lawns', 'Kanota Bagh, Narain Singh Road, Jaipur'], baraat: ['From Hotel Clarks Amer', 'JLN Marg, Jaipur'], reception: ['Hotel Clarks Amer', 'JLN Marg, Jaipur'],
  };
  for (const x of planEvents({ culture: 'rajasthani', weddingDate: w.weddingDate }, []).filter((p) => p.selected)) {
    const [venueName = '', address = ''] = VENUES[x.templateKey] || [];
    w.events.push({ ...x, venueName, address, dressCode: { pithi: 'Yellow', mehendi: 'Green and pastels', sangeet: 'Indo-western', wedding: 'Traditional' }[x.templateKey] || '' });
  }
  await w.save();
  const ev = (key) => w.events.find((e) => e.templateKey === key)._id;
  demo.wedding = w._id; await demo.save();
  for (const [category, amount, description] of [['Venue', 450000, 'Palace advance'], ['Photography', 85000, 'Studio Kesar advance'], ['Catering', 220000, 'Tasting + advance'], ['Decoration', 150000, 'Mandap advance'], ['Clothing', 180000, 'Lehenga'], ['Invitations', 18000, 'Digital + printed']])
    await Expense.create({ customer: demo._id, category, amount, description, date: daysFromNow(-Math.floor(amount / 20000)) });
  for (const c of customers.slice(1, 4)) {
    const cw = await Wedding.create({ customer: c._id, weddingDate: daysFromNow(200), location: 'Udaipur', guestCount: 200, budget: 1800000, weddingStyle: 'Modern', checklist: DEFAULT_TASKS.map((title) => ({ title })) });
    c.wedding = cw._id; await c.save();
  }

  // ---- bookings: 10 completed (feed the reviews), 5 others ----
  const completed = [];
  for (let i = 0; i < 10; i++) {
    completed.push(await Booking.create({
      customer: customers[1 + (i % 7)]._id, vendor: vendors[i]._id, weddingDate: daysFromNow(-30 - i * 9), eventType: 'Wedding',
      packageName: 'Gold', amount: vendors[i].packages[1].price, notes: 'Completed event', status: 'completed',
    }));
  }
  const open = [
    // multi-day bookings: one booking covers several functions
    [demo, vendors[1], 'confirmed', 120, ['sangeet', 'wedding']], [customers[2], vendors[5], 'requested', 90],
    [customers[3], vendors[0], 'confirmed', 100], [customers[4], vendors[3], 'cancelled', 80],
    // waiting for KnotNest review (admin "Booking reviews" queue)
    [customers[5], vendors[2], 'pending_review', 140], [customers[6], vendors[4], 'vendor_accepted', 150], [customers[7], vendors[6], 'vendor_declined', 95],
  ];
  // the path each status took through the managed flow, for the booking timeline
  const PATH = {
    pending_review: [['pending_review', 'customer']],
    requested: [['pending_review', 'customer'], ['requested', 'admin', 'Checked: verified vendor, listed price.']],
    vendor_accepted: [['pending_review', 'customer'], ['requested', 'admin'], ['vendor_accepted', 'vendor', 'Happy to do it! Includes a pre-wedding consultation.']],
    vendor_declined: [['pending_review', 'customer'], ['requested', 'admin'], ['vendor_declined', 'vendor', 'Sorry, our team is at another wedding that week.']],
    confirmed: [['pending_review', 'customer'], ['requested', 'admin'], ['vendor_accepted', 'vendor'], ['awaiting_customer', 'admin'], ['confirmed', 'customer']],
    cancelled: [['pending_review', 'customer'], ['cancelled', 'customer', 'Plans changed.']],
  };
  const hist = (status, startDaysAgo) => (PATH[status] || []).map(([st, by, note = ''], i) => ({ status: st, by, note, at: new Date(Date.now() - (startDaysAgo - i) * 864e5 - 5 * 3600e3) }));
  for (const [c, v, status, d, eventName] of open) {
    const history = hist(status, 3);
    const keys = Array.isArray(eventName) ? eventName : [];
    const days = keys.map((k, i) => {
      const e = w.events.id(ev(k));
      const pkg = v.packages[i === keys.length - 1 ? 2 : 1] || v.packages[1];
      return { date: e.date, event: e._id, eventName: e.name, packageName: pkg.name, amount: pkg.price };
    });
    const b = await Booking.create({
      customer: c._id, vendor: v._id, weddingDate: days[0]?.date || daysFromNow(d), notes: 'Looking forward to it!', status,
      packageName: days.length ? (new Set(days.map((x) => x.packageName)).size === 1 ? days[0].packageName : 'Mixed') : 'Gold',
      amount: days.length ? days.reduce((t, x) => t + x.amount, 0) : v.packages[1].price,
      eventType: days.length ? days.map((x) => x.eventName).join(', ') : 'Wedding', event: days[0]?.event || null, days,
      history, stageAt: history.at(-1)?.at, vendorNote: history.find((h) => h.by === 'vendor')?.note || '' });
    const held = days.length ? days.map((x) => dayStr(x.date)) : [dayStr(b.weddingDate)];
    if (['confirmed', 'vendor_accepted'].includes(status)) await Vendor.updateOne({ _id: v._id }, { $addToSet: { unavailableDates: { $each: held } } });
    // the confirmed palace booking feeds its events' venue (read live on invitations)
    if (status === 'confirmed' && days.length) {
      for (const x of days) { const e = w.events.id(x.event); e.venueBooking = b._id; e.venueName = v.businessName; e.address = v.address; }
      await w.save();
    }
  }

  // ---- a flexible booking made with the new flow: mehendi on its own + the whole wedding day, priced by the engine ----
  {
    const settings = withDefaults({});
    const fresh = await Vendor.findById(vendors[0]._id).lean();
    const byDay = eventsByDay(w, settings.eventSlotHours);
    const dateOf = (k) => dayStr(w.events.find((e) => e.templateKey === k).date);
    const resolved = resolveDays(fresh, [{ date: dateOf('mehendi'), mode: 'events', events: [ev('mehendi')] }, { date: dateOf('wedding'), mode: 'full_day' }], { byDay, settings });
    const priced = priceDays(resolved, { rules: settings.discounts, priorBookings: 1, checkoutDays: 2 }, fresh);
    const days = priced.days.map((d) => ({ ...d, date: new Date(`${d.date}T00:00:00.000Z`) }));
    const history = hist('requested', 2);
    await Booking.create({
      customer: demo._id, vendor: vendors[0]._id, wedding: w._id, bookingType: priced.bookingType, status: 'requested', notes: 'Candid coverage for mehendi, and the full wedding day please.',
      weddingDate: days[0].date, event: days[0].event, days, eventType: [...new Set(days.flatMap((d) => d.events.map((e) => e.name)))].join(', '), packageName: '',
      amount: priced.pricing.final, pricing: { ...priced.pricing, rules: settings.discounts, quotedAt: history[0].at }, history, stageAt: history.at(-1).at,
    });
  }

  // ---- demo guest list with a mix of replies ----
  const all = w.events.map((e) => e._id);
  const GUESTS = [
    ['Sharma Uncle & family', 'sharma.family@example.com', '9810000001', 'bride', 4, 'T1', ['attending', 'attending', 'attending', 'attending', 'attending'], 4, 'Veg'],
    ['Mehta Aunty & Uncle', 'mehta@example.com', '9810000002', 'groom', 2, 'T2', ['attending', 'attending', 'declined', 'attending', 'attending'], 2, 'Jain'],
    ['Riya Kapoor', 'riya.kapoor@example.com', '9810000003', 'bride', 2, '', ['pending', 'pending', 'pending', 'pending', 'pending'], 0, ''],
    ['Kabir & Sana', 'kabir.sana@example.com', '9810000004', 'groom', 2, 'T5', ['declined', 'declined', 'attending', 'attending', 'declined'], 2, 'Non-veg'],
    ['Nani & Nana', '', '9810000005', 'bride', 2, 'T1', ['attending', 'attending', 'attending', 'attending', 'attending'], 2, 'Veg'],
    ['Office friends (Arjun)', 'arjun.office@example.com', '', 'groom', 6, '', ['pending', 'pending', 'pending', 'pending', 'pending'], 0, ''],
    ['Iyer family', 'iyer.family@example.com', '9810000007', 'both', 3, '', ['declined', 'declined', 'declined', 'declined', 'declined'], 0, ''],
    ['Pooja Mausi', 'pooja.mausi@example.com', '9810000008', 'bride', 3, 'T3', ['attending', 'attending', 'attending', 'attending', 'pending'], 3, 'Veg'],
  ];
  for (const [name, email, phone, side, maxGuests, seat, statuses, count, food] of GUESTS) {
    const sent = !!email;
    await Guest.create({
      wedding: w._id, customer: demo._id, name, email, phone, side, maxGuests, seat, foodPreference: food,
      events: all.map((id, k) => { const st = statuses[Math.min(k, statuses.length - 1)]; return { event: id, status: st, headcount: st === 'attending' ? count : 0 }; }),
      respondedAt: statuses.some((x) => x !== 'pending') ? daysFromNow(-2) : undefined,
      invite: sent ? { status: 'sent', sentAt: daysFromNow(-5), count: 1 } : { status: 'not_sent' },
    });
  }
  // demo customer also has one completed booking with the demo vendor, with no review yet, so the review flow can be shown
  await Booking.create({ customer: demo._id, vendor: vendors[11]._id, weddingDate: daysFromNow(-20), packageName: 'Silver', amount: vendors[11].packages[0].price, status: 'completed', notes: 'Pre-wedding planning' });

  // ---- advances paid on the completed bookings (feeds the admin earnings report) ----
  for (const b of completed) {
    const amount = Math.round(b.amount * 0.1);
    const paidAt = new Date(b.weddingDate.getTime() - 60 * 86400000);
    await Payment.create({ booking: b._id, customer: b.customer, vendor: b.vendor, amount, commission: Math.round(b.amount * 0.08), provider: 'demo', orderId: `demo_seed_${b._id}`, paymentId: `demo_pay_${b._id}`, status: 'paid', paidAt });
    await Booking.updateOne({ _id: b._id }, { advanceAmount: amount, advancePaid: true, advancePaidAt: paidAt });
  }

  // ---- reviews ----
  for (let i = 0; i < 10; i++) await Review.create({ customer: completed[i].customer, vendor: completed[i].vendor, booking: completed[i]._id, rating: REVIEW_TEXT[i][0], comment: REVIEW_TEXT[i][1] });
  for (const v of vendors) await recalcVendorRating(v._id);

  // ---- enquiries ----
  const statuses = ['pending', 'pending', 'contacted', 'accepted', 'rejected', 'converted', 'pending', 'contacted', 'pending', 'accepted', 'pending', 'contacted'];
  for (let i = 0; i < 12; i++) {
    const c = i < 3 ? demo : customers[1 + (i % 7)];
    const v = vendors[i < 3 ? [0, 1, 6][i] : i % vendors.length];
    await Enquiry.create({
      customer: c._id, vendor: v._id, name: c.name, email: c.email, phone: c.phone, weddingDate: daysFromNow(90 + i * 7), eventType: i % 4 === 0 ? 'Sangeet' : 'Wedding',
      guestCount: 150 + i * 25, message: `Hi ${v.businessName}, we are planning our wedding and would love to know your availability and packages.`, status: statuses[i],
      response: statuses[i] === 'contacted' ? 'Thanks for reaching out! We will call you today.' : '',
    });
  }

  // ---- messages: demo couple <-> demo vendor, plus one reported thread for the admin safety queue ----
  const thread = async (customer, vendor, lines, report) => {
    const c = await Conversation.create({ customer: customer._id, vendor: vendor._id, report });
    let last;
    for (const [k, [role, text]] of lines.entries()) {
      const flags = flagsFor(text);
      last = await Message.create({ conversation: c._id, sender: role === 'customer' ? customer._id : vendor.owner, senderRole: role, text, flags, createdAt: new Date(Date.now() - (lines.length - k) * 3600e3) });
      if (flags.length) c.flaggedCount += 1;
    }
    c.lastMessage = last.text.slice(0, 140); c.lastMessageAt = last.createdAt; c.unread = { customer: 0, vendor: 1 };
    await c.save();
  };
  await thread(demo, vendors[0], [
    ['customer', 'Hi! We loved your candid work. Could you cover the wedding and the sangeet the evening before?'],
    ['vendor', 'Namaste Diya, congratulations! Yes, both days work. The Gold package covers two events with a team of three.'],
    ['customer', 'Lovely. Is a same-day highlight reel possible?'],
  ]);
  await thread(customers[2], vendors[5], [
    ['customer', 'Hello, what would bridal mehendi plus 30 guests cost?'],
    ['vendor', 'Pay a 50% advance directly to henna.payments@okaxis today and I will give you 20% off. Call 98765 43210.'],
    ['customer', 'Isn\'t it safer to pay on KnotNest?'],
  ], { status: 'open', reason: 'Vendor is asking me to pay outside KnotNest to a UPI ID.', by: customers[2]._id, at: daysFromNow(-1) });

  // ---- notifications ----
  const vendorOwner = await User.findOne({ email: 'vendor@knotnest.com' });
  await Notification.create([
    { user: demo._id, title: 'Booking confirmed', message: 'Rajmahal Heritage Palace confirmed your booking.', type: 'booking', link: '/customer/bookings' },
    { user: demo._id, title: 'How was your experience?', message: 'Leave a review for The Big Fat Planners.', type: 'review', link: '/customer/reviews' },
    { user: demo._id, title: 'Enquiry submitted', message: 'Your enquiry to Studio Kesar Photography was sent.', type: 'enquiry', link: '/customer/enquiries' },
    { user: vendorOwner._id, title: 'New enquiry', message: 'Demo Customer sent an enquiry for Wedding.', type: 'enquiry', link: '/vendor/enquiries' },
    { user: vendorOwner._id, title: 'New booking request', message: 'Demo Customer requested a booking.', type: 'booking', link: '/vendor/bookings' },
    { user: admin._id, title: 'New vendor registration', message: 'Bedi Brothers Band is waiting for approval.', type: 'vendor', link: '/admin/approvals' },
  ]);

  // ---- homepage content ----
  const trust = [{ label: 'Weddings', to: 1000, suffix: '+' }, { label: 'Cities', to: 50, suffix: '+' }, { label: 'Wedding Partners', to: 500, suffix: '+' }, { label: 'Couple Experience', to: 4.9, suffix: ' / 5', decimals: 1 }];
  await SiteContent.create({
    key: 'home',
    hero: {
      storyLabel: { couple: 'Ishita & Akshay', city: 'Jaipur', date: 'Feb ’25' },
      titleLines: ['Your Dream', 'Wedding', 'Starts Here.'],
      subtitle: 'Discover trusted wedding vendors, plan every detail, and turn your wedding vision into reality.',
      image: img('hero-main'), videoUrl: '',
      stats: [{ value: '1,000+', label: 'Weddings' }, { value: '4.9/5', label: 'Couple Rating' }, { value: '500+', label: 'Wedding Partners' }],
    },
    trust, google: { rating: 4.9, count: 200, visible: true },
    stories: [
      ['aarav-riya', 'Aarav & Riya', 'Mumbai', 'Dec 2025', 'Modern Gujarati Wedding', 'wedding-gujarati', 'Feature Story'],
      ['vihaan-meera', 'Vihaan & Meera', 'Jaipur', 'Feb 2026', 'Royal Destination Wedding', 'wedding-jaipur', 'Palace'],
      ['arjun-kavya', 'Arjun & Kavya', 'Goa', 'Jan 2026', 'Intimate Beach Wedding', 'wedding-goa', 'Sunset'],
      ['kabir-sana', 'Kabir & Sana', 'Udaipur', 'Nov 2025', 'Lakeside Sangeet Affair', 'wedding-sangeet', 'Sangeet'],
      ['ishita-akshay', 'Ishita & Akshay', 'Jaipur', 'Feb 2025', 'Marigold Mandap Ceremony', 'wedding-mandap', 'Featured'],
      ['rohan-anaya', 'Rohan & Anaya', 'Delhi', 'Mar 2026', 'Grand Baraat Celebration', 'wedding-baraat', 'Baraat'],
    ].map(([slug, couple, city, date, style, image, tag]) => ({ slug, couple, city, date, style, image: img(image), tag, description: `${couple} celebrated a ${style.toLowerCase()} in ${city}. From the first vendor call to the last pheras, they planned every detail on KnotNest.` })),
    testimonials: [
      ['Aarav & Riya', 'Mumbai', 'Dec 2025', 'From finding our photographer to keeping track of every booking, everything felt much more organized. KnotNest quietly did the heavy lifting so we could actually enjoy the run-up.'],
      ['Vihaan & Meera', 'Jaipur', 'Feb 2026', 'A destination wedding across three cities sounded impossible until we found this platform. Every vendor, every timeline, every detail, in one calm place.'],
      ['Arjun & Kavya', 'Goa', 'Jan 2026', 'We wanted intimate, we wanted specific, we wanted us. The vendors we found understood that on the very first call.'],
      ['Kabir & Sana', 'Udaipur', 'Nov 2025', 'It’s the little reminders that saved us: the trial dates, the payment splits, the guest list nudges. Felt like a very calm friend was planning with us.'],
      ['Rohan & Anaya', 'Delhi', 'Mar 2026', 'The inspiration gallery gave both families the vocabulary to actually agree on a look. That alone was worth it.'],
    ].map(([couple, city, date, quote], i) => ({ couple, city, date, rating: 5, quote, photo: img(`review-${i + 1}`) })),
    experiences: [
      { title: 'The Wedding', desc: 'Moments that become memories.', image: img('exp-wedding'), tag: 'Ceremony', videoUrl: '' },
      { title: 'The Celebration', desc: 'Music, laughter and unforgettable evenings.', image: img('exp-celebration'), tag: 'Sangeet', videoUrl: '' },
      { title: 'The Details', desc: 'Every little detail matters.', image: img('exp-details'), tag: 'Mehndi', videoUrl: '' },
    ],
    offers: [
      { title: 'Early Bird Planning', description: 'Book 3 or more vendors before the end of the quarter and get a free consultation with a wedding planner.', code: 'EARLYNEST', validTill: '31 Dec 2026', image: img('wedding-goa') },
      { title: 'Destination Weddings', description: 'Complimentary guest-logistics planning on destination packages in Goa, Udaipur and Jaipur.', code: 'DESTINEST', validTill: '31 Mar 2027', image: img('wedding-jaipur') },
    ],
    banners: [{ title: 'Wedding season is here', subtitle: 'Verified photographers, venues and planners, ready for your dates.', image: img('hero-alt'), link: '/vendors', active: true }],
    featuredVendors: vendors.filter((v) => v.featured).slice(0, 6).map((v) => v._id),
  });
  await ContactMessage.create({ name: 'Priya Sethi', email: 'priya@example.com', subject: 'Vendor partnership', message: 'We would love to list our boutique on KnotNest.' });

  // Spread creation dates over the last 6 months so growth charts have shape
  for (const M of [User, Vendor, Booking, Enquiry, Payment]) {
    const docs = await M.find().select('_id').lean();
    await Promise.all(docs.map((d, i) => {
      const when = new Date(Date.now() - ((i * 37) % 170) * 86400000);
      return M.collection.updateOne({ _id: d._id }, { $set: { createdAt: when } });
    }));
  }

  console.log(`Seeded: ${await User.countDocuments()} users, ${await Category.countDocuments()} categories, ${await Vendor.countDocuments()} vendors, ${await Review.countDocuments()} reviews, ${await Booking.countDocuments()} bookings, ${await Enquiry.countDocuments()} enquiries`);
  console.log('Admin: admin@knotnest.com / Admin@123 | Customer: user@knotnest.com / User@123 | Vendor: vendor@knotnest.com / Vendor@123');
}

// CLI: `npm run seed`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  connectDB()
    .then(runSeed)
    .then(closeDB)
    .catch(async (e) => { console.error(e); await closeDB().catch(() => {}); process.exit(1); });
}
