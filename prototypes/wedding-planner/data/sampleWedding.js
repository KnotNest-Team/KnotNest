/**
 * Synthetic example wedding used by every prototype in this folder.
 * Every name, business, venue and amount is invented. There are no contact details, IDs or credentials.
 * Times are 24-hour "HH:MM" strings; amounts are whole rupees.
 */

export const wedding = {
  couple: 'Ananya & Rohan',
  date: '2027-12-11',
  today: '2027-09-20', // fixed reference date so the prototypes give the same output every time
  venue: 'Lakeview Haveli, Udaipur',
  guestEstimate: 118,
  muhurat: '19:42', // the pheras must be in progress at this time
  soundCurfew: '22:00', // amplified music must stop by this time (venue rule)
  budget: 2950000,
  contingencyPercent: 8, // share of the budget kept aside for surprises
};

/** Venue spaces on the wedding day, and walking time between them in minutes. */
export const locations = {
  bridal_suite: 'Bridal suite (east wing)',
  groom_suite: 'Groom suite (west wing)',
  forecourt: 'Haveli forecourt',
  mandap: 'Lakeside mandap',
  lawn: 'Rose lawn',
  banquet: 'Durbar hall',
};
export const travelMinutes = {
  'bridal_suite|mandap': 10, 'groom_suite|forecourt': 5, 'forecourt|mandap': 8, 'mandap|lawn': 6,
  'lawn|banquet': 4, 'mandap|banquet': 7, 'bridal_suite|lawn': 9, 'groom_suite|mandap': 9,
};

/**
 * Wedding-day schedule. `owner` is who is responsible for the item, either a vendor key or 'family'.
 * `after` lists items that must finish first; `fixed` items cannot be moved by a shift.
 */
export const dayItems = [
  { id: 'bride_makeup', title: 'Bridal makeup and hair', start: '13:30', durationMin: 180, location: 'bridal_suite', owner: 'makeup', kind: 'prep' },
  { id: 'groom_dress', title: 'Groom dressing and safa tying', start: '15:30', durationMin: 75, location: 'groom_suite', owner: 'family', kind: 'prep' },
  { id: 'portraits', title: 'Couple and family portraits', start: '16:45', durationMin: 45, location: 'lawn', owner: 'photo', kind: 'celebration', after: ['bride_makeup'] },
  { id: 'baraat', title: 'Baraat procession with dhol', start: '17:45', durationMin: 60, location: 'forecourt', owner: 'music', kind: 'celebration', music: true, after: ['groom_dress'] },
  { id: 'milni', title: 'Milni and welcome of the baraat', start: '18:45', durationMin: 25, location: 'forecourt', owner: 'family', kind: 'ritual', after: ['baraat'] },
  { id: 'jaimala', title: 'Jaimala on the lakeside stage', start: '19:10', durationMin: 20, location: 'mandap', owner: 'family', kind: 'ritual', after: ['milni', 'portraits'] },
  { id: 'pheras', title: 'Pheras and saptapadi', start: '19:35', durationMin: 75, location: 'mandap', owner: 'priest', kind: 'ritual', fixed: true, after: ['jaimala'] },
  { id: 'dinner', title: 'Wedding dinner service', start: '20:30', durationMin: 120, location: 'banquet', owner: 'catering', kind: 'meal' },
  { id: 'sangeet_set', title: 'Live band set on the lawn', start: '21:00', durationMin: 75, location: 'lawn', owner: 'music', kind: 'celebration', music: true, after: ['pheras'] },
  { id: 'vidaai', title: 'Vidaai', start: '23:15', durationMin: 30, location: 'forecourt', owner: 'family', kind: 'ritual', after: ['pheras', 'dinner'] },
];

/** Vendors on the wedding day: setup lead time before their first item, and a display name. */
export const dayVendors = {
  makeup: { name: 'Kesar Bridal Studio', setupMin: 30 },
  photo: { name: 'Golden Hour Frames', setupMin: 45 },
  music: { name: 'Dhol & Brass Collective', setupMin: 60 },
  priest: { name: 'Pandit ji (family priest)', setupMin: 40 },
  catering: { name: 'Neel Kamal Caterers', setupMin: 120 },
};

/**
 * Reception seating. Zones run from the stage outwards; accessible tables have step-free access
 * and space for a wheelchair.
 */
export const tables = [
  { id: 'T1', name: 'Marigold', seats: 10, zone: 'stage', accessible: true },
  { id: 'T2', name: 'Jasmine', seats: 10, zone: 'stage', accessible: false },
  { id: 'T3', name: 'Lotus', seats: 10, zone: 'centre', accessible: true },
  { id: 'T4', name: 'Champa', seats: 10, zone: 'centre', accessible: false },
  { id: 'T5', name: 'Mogra', seats: 10, zone: 'centre', accessible: false },
  { id: 'T6', name: 'Rajnigandha', seats: 12, zone: 'centre', accessible: true },
  { id: 'T7', name: 'Gulmohar', seats: 12, zone: 'rear', accessible: false },
  { id: 'T8', name: 'Kadamba', seats: 12, zone: 'rear', accessible: false },
  { id: 'T9', name: 'Palash', seats: 12, zone: 'rear', accessible: true },
  { id: 'T10', name: 'Amaltas', seats: 12, zone: 'garden', accessible: false },
];

/**
 * Invited households. `closeness` 3 = immediate family, 2 = close family and friends, 1 = everyone else.
 * `needs`: 'wheelchair' requires an accessible table; 'quiet' keeps a household away from the stage speakers.
 * `apart`: households that should not share a table.
 */
export const households = [
  { id: 'h01', name: "Bride's parents and grandmother", side: 'bride', group: 'family', closeness: 3, adults: 2, seniors: 1, children: 0, needs: ['wheelchair'] },
  { id: 'h02', name: "Groom's parents", side: 'groom', group: 'family', closeness: 3, adults: 2, seniors: 0, children: 0, needs: [] },
  { id: 'h03', name: "Bride's brother and sister-in-law", side: 'bride', group: 'family', closeness: 3, adults: 2, seniors: 0, children: 1, needs: [] },
  { id: 'h04', name: "Groom's sister's family", side: 'groom', group: 'family', closeness: 3, adults: 2, seniors: 0, children: 2, needs: [] },
  { id: 'h05', name: "Groom's grandparents", side: 'groom', group: 'elders', closeness: 3, adults: 0, seniors: 2, children: 0, needs: ['quiet'] },
  { id: 'h06', name: "Bride's maternal uncle's family", side: 'bride', group: 'family', closeness: 2, adults: 2, seniors: 0, children: 2, needs: [], apart: ['h07'] },
  { id: 'h07', name: "Bride's paternal aunt's family", side: 'bride', group: 'family', closeness: 2, adults: 3, seniors: 1, children: 0, needs: [], apart: ['h06'] },
  { id: 'h08', name: "Groom's maternal aunt and cousins", side: 'groom', group: 'family', closeness: 2, adults: 4, seniors: 0, children: 0, needs: [] },
  { id: 'h09', name: "Groom's paternal uncle's family", side: 'groom', group: 'family', closeness: 2, adults: 2, seniors: 1, children: 1, needs: ['wheelchair'] },
  { id: 'h10', name: "Bride's college friends", side: 'bride', group: 'friends', closeness: 2, adults: 7, seniors: 0, children: 0, needs: [] },
  { id: 'h11', name: "Groom's school friends", side: 'groom', group: 'friends', closeness: 2, adults: 6, seniors: 0, children: 0, needs: [] },
  { id: 'h12', name: "Bride's office team", side: 'bride', group: 'colleagues', closeness: 1, adults: 5, seniors: 0, children: 0, needs: [] },
  { id: 'h13', name: "Groom's office team", side: 'groom', group: 'colleagues', closeness: 1, adults: 6, seniors: 0, children: 0, needs: [] },
  { id: 'h14', name: "Neighbours from the bride's colony", side: 'bride', group: 'friends', closeness: 1, adults: 4, seniors: 2, children: 1, needs: ['quiet'] },
  { id: 'h15', name: "Groom's father's business partners", side: 'groom', group: 'colleagues', closeness: 1, adults: 4, seniors: 0, children: 0, needs: [] },
  { id: 'h16', name: "Bride's mother's book club", side: 'bride', group: 'friends', closeness: 1, adults: 5, seniors: 1, children: 0, needs: [] },
  { id: 'h17', name: "Groom's cousins from Pune", side: 'groom', group: 'family', closeness: 2, adults: 3, seniors: 0, children: 2, needs: [] },
  { id: 'h18', name: "Bride's grand-aunts", side: 'bride', group: 'elders', closeness: 2, adults: 0, seniors: 3, children: 0, needs: ['wheelchair', 'quiet'] },
  { id: 'h19', name: "Groom's family friends from Jaipur", side: 'groom', group: 'friends', closeness: 1, adults: 4, seniors: 1, children: 1, needs: [] },
  { id: 'h20', name: "Bride's dance class friends", side: 'bride', group: 'friends', closeness: 1, adults: 5, seniors: 0, children: 0, needs: [] },
  { id: 'h21', name: "Groom's mother's sisters", side: 'groom', group: 'family', closeness: 2, adults: 3, seniors: 1, children: 0, needs: [] },
  { id: 'h22', name: "Bride's cousins from Indore", side: 'bride', group: 'family', closeness: 2, adults: 4, seniors: 0, children: 1, needs: [] },
  { id: 'h23', name: "Groom's mentor and family", side: 'groom', group: 'colleagues', closeness: 1, adults: 2, seniors: 0, children: 1, needs: [] },
  { id: 'h24', name: "Bride's father's colleagues", side: 'bride', group: 'colleagues', closeness: 1, adults: 4, seniors: 1, children: 0, needs: [] },
];

/** Shortlisted vendors to compare. Pricing models differ, which is why quotes are normalised first. */
export const vendorShortlist = [
  { id: 'v_ph1', category: 'Photography', name: 'Golden Hour Frames', rating: 4.8, reviews: 64, pricing: { model: 'per_event', amount: 55000 }, gstIncluded: false, travelFee: 18000, advancePercent: 30, cancellation: 'moderate', responseHours: 6, busy: [], includes: ['candid', 'traditional', 'drone', 'album'] },
  { id: 'v_ph2', category: 'Photography', name: 'Peacock Lane Studio', rating: 4.9, reviews: 9, pricing: { model: 'flat', amount: 140000 }, gstIncluded: true, travelFee: 0, advancePercent: 50, cancellation: 'strict', responseHours: 24, busy: [], includes: ['candid', 'traditional', 'album', 'pre_wedding'] },
  { id: 'v_ph3', category: 'Photography', name: 'Monsoon Stories', rating: 4.5, reviews: 132, pricing: { model: 'per_hour', amount: 9000, minimum: 6 }, gstIncluded: false, travelFee: 12000, advancePercent: 25, cancellation: 'flexible', responseHours: 3, busy: ['2027-12-11'], includes: ['candid', 'traditional'] },
  { id: 'v_ca1', category: 'Catering', name: 'Neel Kamal Caterers', rating: 4.6, reviews: 88, pricing: { model: 'per_plate', amount: 1650, minimum: 100 }, gstIncluded: false, travelFee: 0, advancePercent: 40, cancellation: 'moderate', responseHours: 8, busy: [], includes: ['live_counters', 'jain_menu', 'service_staff'] },
  { id: 'v_ca2', category: 'Catering', name: 'Saffron Thali Co.', rating: 4.3, reviews: 41, pricing: { model: 'per_plate', amount: 1400, minimum: 150 }, gstIncluded: true, travelFee: 25000, advancePercent: 30, cancellation: 'flexible', responseHours: 12, busy: [], includes: ['jain_menu', 'service_staff'] },
  { id: 'v_ca3', category: 'Catering', name: 'Royal Rasoi Kitchens', rating: 4.7, reviews: 203, pricing: { model: 'per_plate', amount: 1900, minimum: 80 }, gstIncluded: false, travelFee: 0, advancePercent: 50, cancellation: 'strict', responseHours: 5, busy: [], includes: ['live_counters', 'jain_menu', 'service_staff', 'dessert_bar'] },
  { id: 'v_de1', category: 'Decor', name: 'Petal & Brass Decor', rating: 4.4, reviews: 57, pricing: { model: 'flat', amount: 310000 }, gstIncluded: false, travelFee: 0, advancePercent: 40, cancellation: 'moderate', responseHours: 10, busy: [], includes: ['mandap', 'stage', 'florals', 'lighting'] },
  { id: 'v_de2', category: 'Decor', name: 'Lakeside Blooms', rating: 4.6, reviews: 22, pricing: { model: 'flat', amount: 265000 }, gstIncluded: true, travelFee: 20000, advancePercent: 50, cancellation: 'strict', responseHours: 30, busy: [], includes: ['mandap', 'florals', 'lighting'] },
];

/** What the couple needs from each category, used to quote and to score coverage. */
export const vendorNeeds = {
  Photography: { hours: 10, events: 3, required: ['candid', 'traditional', 'album'] },
  Catering: { guests: 118, required: ['jain_menu', 'service_staff', 'live_counters'] },
  Decor: { required: ['mandap', 'stage', 'florals', 'lighting'] },
};

/**
 * Budget lines. `planned` is the allocation; `committed` is the signed contract value (0 = nothing signed);
 * `paid` is the money already sent; `due` lists the instalments still owed.
 */
export const budgetLines = [
  { id: 'b01', category: 'Venue', item: 'Haveli for two days', planned: 650000, quoted: 690000, committed: 690000, paid: 345000, due: [{ date: '2027-11-10', amount: 345000 }] },
  { id: 'b02', category: 'Venue', item: 'Guest rooms (24 rooms, 2 nights)', planned: 380000, quoted: 352000, committed: 352000, paid: 100000, due: [{ date: '2027-11-25', amount: 252000 }] },
  { id: 'b03', category: 'Catering', item: 'Wedding dinner', planned: 210000, quoted: 194700, committed: 194700, paid: 77880, due: [{ date: '2027-12-04', amount: 116820 }] },
  { id: 'b04', category: 'Catering', item: 'Mehendi lunch and sangeet snacks', planned: 120000, quoted: 138000, committed: 0, paid: 0, due: [] },
  { id: 'b05', category: 'Decor', item: 'Mandap, stage and florals', planned: 300000, quoted: 310000, committed: 310000, paid: 124000, due: [{ date: '2027-10-15', amount: 93000 }, { date: '2027-12-08', amount: 93000 }] },
  { id: 'b06', category: 'Photography', item: 'Candid and traditional coverage', planned: 200000, quoted: 183000, committed: 183000, paid: 54900, due: [{ date: '2027-12-12', amount: 128100 }] },
  { id: 'b07', category: 'Attire', item: "Bride's lehenga and alterations", planned: 180000, quoted: 0, committed: 162000, paid: 162000, due: [] },
  { id: 'b08', category: 'Attire', item: "Groom's sherwani and safa", planned: 70000, quoted: 0, committed: 0, paid: 0, due: [] },
  { id: 'b09', category: 'Jewellery', item: 'Bridal set (family contribution)', planned: 250000, quoted: 0, committed: 0, paid: 0, due: [] },
  { id: 'b10', category: 'Music', item: 'Dhol, brass band and live set', planned: 90000, quoted: 112000, committed: 112000, paid: 30000, due: [{ date: '2027-12-01', amount: 82000 }] },
  { id: 'b11', category: 'Makeup', item: 'Bridal makeup and family looks', planned: 60000, quoted: 58000, committed: 58000, paid: 15000, due: [{ date: '2027-12-11', amount: 43000 }] },
  { id: 'b12', category: 'Invitations', item: 'Printed cards and digital invite', planned: 40000, quoted: 0, committed: 31500, paid: 31500, due: [] },
  { id: 'b13', category: 'Transport', item: 'Airport shuttles and baraat horse', planned: 55000, quoted: 61000, committed: 0, paid: 0, due: [] },
  { id: 'b14', category: 'Gifts', item: 'Return gifts and room hampers', planned: 75000, quoted: 0, committed: 0, paid: 0, due: [] },
];
