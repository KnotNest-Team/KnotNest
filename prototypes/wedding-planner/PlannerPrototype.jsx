/**
 * Entry point for the four planning prototypes, wired to the synthetic sample wedding.
 * Not imported anywhere: see README.md for what it would take to try it out.
 */
import { useState } from 'react';
import DayTimeline from './components/DayTimeline.jsx';
import SeatingPlanner from './components/SeatingPlanner.jsx';
import VendorComparison from './components/VendorComparison.jsx';
import BudgetBreakdown from './components/BudgetBreakdown.jsx';
import { Tabs } from './components/ui.jsx';
import { shortDate } from './lib/format.js';
import {
  wedding, locations, travelMinutes, dayItems, dayVendors, tables, households, vendorShortlist, vendorNeeds, budgetLines,
} from './data/sampleWedding.js';

const TABS = [
  { id: 'timeline', label: 'Wedding day' },
  { id: 'seating', label: 'Seating' },
  { id: 'vendors', label: 'Compare vendors' },
  { id: 'budget', label: 'Budget' },
];

export default function PlannerPrototype() {
  const [tab, setTab] = useState('timeline');
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 font-sans">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Prototype · sample data</p>
        <h1 className="font-display text-4xl text-ink">{wedding.couple}</h1>
        <p className="text-sm text-muted">{shortDate(wedding.date)} · {wedding.venue}</p>
      </header>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'timeline' && <DayTimeline items={dayItems} locations={locations} travel={travelMinutes} vendors={dayVendors} muhurat={wedding.muhurat} soundCurfew={wedding.soundCurfew} />}
      {tab === 'seating' && <SeatingPlanner households={households} tables={tables} />}
      {tab === 'vendors' && <VendorComparison vendors={vendorShortlist} needs={vendorNeeds} date={wedding.date} />}
      {tab === 'budget' && <BudgetBreakdown lines={budgetLines} budget={wedding.budget} contingencyPercent={wedding.contingencyPercent} today={wedding.today} weddingDate={wedding.date} guests={wedding.guestEstimate} />}
    </main>
  );
}
