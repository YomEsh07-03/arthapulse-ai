import { useState } from 'react';

type NicheType = 'churn' | 'staffing' | 'inventory';
type WeatherType = 'clear' | 'monsoon' | 'heatwave';
type EventType = 'none' | 'festival' | 'conference';

interface QueryPreset {
  id: string;
  question: string;
  sqlEquivalent: string;
  rootCause: string;
  externalFactors: string[];
  recommendedAction: string;
  impactMetric: string;
}

const QUERY_PRESETS: QueryPreset[] = [
  {
    id: 'q1',
    question: 'Why did D2C subscription renewals drop 18% in Pune this week?',
    sqlEquivalent: 'SELECT cohort_month, COUNT(user_id), AVG(delivery_delay_hrs) FROM subscriptions JOIN logistics ON subscriptions.order_id = logistics.id WHERE region = "Pune" GROUP BY cohort_month HAVING churn_rate > 0.15;',
    rootCause: 'Renewal drop is 78% correlated with 36-hour last-mile delivery delays on the Mumbai-Pune expressway rather than product dissatisfaction.',
    externalFactors: ['Heavy Monsoon Rainfall (+64mm)', 'Highway Transit Bottleneck (+42 min delay)', 'Payment Gateway UPI Timeout Spike (11% failure)'],
    recommendedAction: 'Trigger automated ₹150 loyalty credit for delayed subscribers and switch regional courier allocation to Express Hub B.',
    impactMetric: 'Projected to recover ₹1,84,000 in Monthly Recurring Revenue (MRR)'
  },
  {
    id: 'q2',
    question: 'Why did walk-in clinic patient wait times spike on Tuesday morning?',
    sqlEquivalent: 'SELECT shift_id, dept, AVG(wait_time_mins), staff_count FROM clinic_visits WHERE visit_date = CURRENT_DATE - 2 GROUP BY shift_id, dept;',
    rootCause: 'Unseasonal AQI spike (295+) triggered a 41% surge in respiratory consultations while morning nursing roster was scheduled at baseline capacity.',
    externalFactors: ['Local AQI Spike (298 - Poor)', 'Post-Weekend Viral Surge', '2 Front-Desk Staff on Unplanned Leave'],
    recommendedAction: 'Activate dynamic on-call shift allocation for 2 additional triage nurses whenever 48-hour AQI forecast exceeds 220.',
    impactMetric: 'Reduces average patient wait time from 38 mins to 11 mins'
  },
  {
    id: 'q3',
    question: 'Which independent hotel rooms are underpriced for the upcoming long weekend?',
    sqlEquivalent: 'SELECT room_tier, current_rate, occupancy_pct, comp_avg_rate FROM hotel_inventory WHERE booking_date BETWEEN "2026-10-30" AND "2026-11-02";',
    rootCause: 'Deluxe and Suite tiers are priced at static weekday rates despite 88% regional competitor occupancy and a local cultural festival.',
    externalFactors: ['Regional Concert & Festival (+3,200 visitors)', 'Competitor Occupancy at 88%', 'Clear Weekend Weather Forecast'],
    recommendedAction: 'Apply +19.5% algorithmic surge pricing on Deluxe rooms and bundle complimentary late checkout.',
    impactMetric: 'Generates ₹68,500 additional RevPAR lift over 3 nights'
  }
];

export default function App() {
  const [selectedPreset, setSelectedPreset] = useState<QueryPreset>(QUERY_PRESETS[0]);
  const [customQuery, setCustomQuery] = useState<string>('');
  const [customResult, setCustomResult] = useState<QueryPreset | null>(null);
  const [activeNiche, setActiveNiche] = useState<NicheType>('churn');

  const [baseRoomRate, setBaseRoomRate] = useState<number>(3500);
  const [occupancyPct, setOccupancyPct] = useState<number>(76);
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [localEvent, setLocalEvent] = useState<EventType>('festival');

  const [monthlyOrders, setMonthlyOrders] = useState<number>(2400);
  const [avgOrderValue, setAvgOrderValue] = useState<number>(850);
  const [avgDistanceKm, setAvgDistanceKm] = useState<number>(18);
  const [evFleetShare, setEvFleetShare] = useState<number>(35);

  const handleCustomQuerySubmit = () => {
    if (!customQuery.trim()) return;
    setCustomResult({
      id: 'custom',
      question: customQuery,
      sqlEquivalent: 'SELECT metric_delta, external_weather_idx, transit_delay_coeff, price_elasticity FROM enterprise_bi_warehouse WHERE anomaly_score > 0.82;',
      rootCause: `Multi-variate analysis for "${customQuery}" indicates external micro-market shifts (weather and transit friction) accounted for 71% of the variance, rather than internal operational drops.`,
      externalFactors: ['Localized Weather Variance (+18%)', 'Regional Logistics Congestion Index: High', 'Competitor Flash Promotion Detected'],
      recommendedAction: 'Enable automated dynamic pricing guardrails and reallocate 15% safety stock to high-conversion postal codes.',
      impactMetric: '+14.2% Net Margin Protection'
    });
  };

  const activeDiagnostic = customResult || selectedPreset;

  const weatherMultiplier = weather === 'clear' ? 1.04 : weather === 'monsoon' ? 0.94 : 1.08;
  const eventMultiplier = localEvent === 'none' ? 1.0 : localEvent === 'festival' ? 1.18 : 1.24;
  const occupancyMultiplier = occupancyPct > 80 ? 1.15 : occupancyPct > 60 ? 1.06 : 0.92;

  const recommendedRate = Math.round(baseRoomRate * weatherMultiplier * eventMultiplier * occupancyMultiplier);
  const priceDeltaPct = (((recommendedRate - baseRoomRate) / baseRoomRate) * 100).toFixed(1);
  const monthlyUplift = Math.max(0, (recommendedRate - baseRoomRate) * Math.round((occupancyPct / 100) * 30 * 15));
  const platformCommission = Math.round(monthlyUplift * 0.08);
  const netHotelGain = monthlyUplift - platformCommission;

  const emissionPerKm = (1 - evFleetShare / 100) * 0.14 + (evFleetShare / 100) * 0.03;
  const totalCarbonKg = Math.round(monthlyOrders * avgDistanceKm * emissionPerKm);
  const grossMerchandiseValue = monthlyOrders * avgOrderValue;
  const carbonOffsetPool = Math.round(totalCarbonKg * 1.85);
  const transactionFeeRevenue = Math.round(carbonOffsetPool * 0.05);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-8 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
              Applied Analytics & Business Intelligence Engine
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400">
              ArthaPulse AI
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mt-1">
              Context-Aware Augmented BI, Predictive Niche Forecasting, Algorithmic Pricing & Eco-Ledger
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="text-xs text-slate-400">External Data Streams</div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-2 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Weather + Transit + POS Active
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5">
              <div className="text-xs text-slate-400">SQL Replacement Rate</div>
              <div className="text-sm font-bold text-cyan-400 mt-0.5">94.2% Automated</div>
            </div>
          </div>
        </header>

        <section className="mt-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                1. Conversational &quot;Augmented&quot; Analytics
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                Natural Language Root-Cause Diagnostics (Zero-SQL Interface)
              </h2>
            </div>
            <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg">
              Replaces Complex SQL Joins with Context-Aware AI
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {QUERY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setCustomResult(null);
                  setSelectedPreset(preset);
                }}
                className={`text-xs sm:text-sm px-3.5 py-2 rounded-xl border transition-all text-left ${
                  !customResult && selectedPreset.id === preset.id
                    ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {preset.question}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Or ask any business question in plain English (e.g., Why did weekend orders drop in Nashik?)"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleCustomQuerySubmit}
              className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all whitespace-nowrap"
            >
              Run Augmented Diagnosis
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 bg-slate-950/90 border border-slate-800/90 rounded-xl p-5">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-1">
                  AI Root-Cause Synthesis
                </div>
                <p className="text-slate-100 text-sm sm:text-base leading-relaxed font-medium">
                  {activeDiagnostic.rootCause}
                </p>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Correlated External & Internal Triggers
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeDiagnostic.externalFactors.map((factor) => (
                    <span
                      key={factor}
                      className="text-xs bg-slate-900 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg"
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5">
                <div className="text-xs font-bold uppercase text-emerald-400 mb-1">
                  Prescriptive Action & Financial Recovery
                </div>
                <p className="text-xs sm:text-sm text-slate-200">{activeDiagnostic.recommendedAction}</p>
                <div className="text-xs font-bold text-emerald-300 mt-2">
                  Expected Impact: {activeDiagnostic.impactMetric}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase text-slate-400">Bypassed SQL Query</span>
                  <span className="text-[11px] px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded">
                    Auto-Generated
                  </span>
                </div>
                <pre className="text-xs text-cyan-300 bg-slate-950 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed border border-slate-800">
                  {activeDiagnostic.sqlEquivalent}
                </pre>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
                <span>Query Latency: 0.14s</span>
                <span className="text-indigo-400 font-semibold">3 External APIs Joined</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                2. Predictive Niche Dashboards
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                Industry-Specific Micro-Forecasting Engines
              </h2>
            </div>

            <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveNiche('churn')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeNiche === 'churn' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Subscription Churn (Boxes)
              </button>
              <button
                onClick={() => setActiveNiche('staffing')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeNiche === 'staffing' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Staffing Analytics (Clinics)
              </button>
              <button
                onClick={() => setActiveNiche('inventory')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeNiche === 'inventory' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Inventory Forecaster (D2C)
              </button>
            </div>
          </div>

          {activeNiche === 'churn' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                <div className="text-xs text-slate-400">30-Day Predicted Churn Risk</div>
                <div className="text-3xl font-extrabold text-rose-400 mt-1">6.8% <span className="text-xs font-normal text-emerald-400">(-2.4% vs last mo)</span></div>
                <p className="text-xs text-slate-400 mt-3">
                  142 subscription box members flagged due to skipped customization window + 2 consecutive transit delays.
                </p>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                <div className="text-xs text-slate-400">High-Risk Segment Trigger</div>
                <div className="text-lg font-bold text-white mt-1">Month-3 Cohort Drop-off</div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: '68%' }} />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  68% of cancellations occur when box weight/value perception dips below ₹1,200.
                </p>
              </div>
              <div className="bg-slate-950 border border-emerald-500/30 p-5 rounded-xl">
                <div className="text-xs text-emerald-400 font-bold uppercase">Automated Retention Action</div>
                <div className="text-base font-bold text-white mt-1">Auto-Insert Mystery Add-On SKU</div>
                <p className="text-xs text-slate-300 mt-2">
                  Injecting a ₹95 overstock sample into at-risk boxes increases Month-4 retention by 31%.
                </p>
              </div>
            </div>
          )}

          {activeNiche === 'staffing' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                <div className="text-xs text-slate-400">Predicted Tomorrow Footfall</div>
                <div className="text-3xl font-extrabold text-cyan-400 mt-1">184 Patients</div>
                <p className="text-xs text-slate-400 mt-3">
                  +28% surge expected between 9:00 AM – 12:30 PM due to localized humidity and seasonal flu index.
                </p>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                <div className="text-xs text-slate-400">Recommended Shift Roster</div>
                <div className="text-lg font-bold text-white mt-1">4 Doctors • 7 Triage Nurses</div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-cyan-400 h-full rounded-full" style={{ width: '88%' }} />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Reallocates 2 afternoon nurses to morning peak, saving ₹14,200 in overtime cost.
                </p>
              </div>
              <div className="bg-slate-950 border border-emerald-500/30 p-5 rounded-xl">
                <div className="text-xs text-emerald-400 font-bold uppercase">Patient SLA Impact</div>
                <div className="text-base font-bold text-white mt-1">11 Min Avg Wait Time</div>
                <p className="text-xs text-slate-300 mt-2">
                  Prevents reception bottleneck and improves clinic NPS rating from 62 to 84.
                </p>
              </div>
            </div>
          )}

          {activeNiche === 'inventory' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                <div className="text-xs text-slate-400">Imminent Stockout Risk</div>
                <div className="text-3xl font-extrabold text-amber-400 mt-1">4 Hero SKUs</div>
                <p className="text-xs text-slate-400 mt-3">
                  Cold-Brew Concentrate & Vitamin Serum will deplete in 4.2 days at current regional velocity.
                </p>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl">
                <div className="text-xs text-slate-400">Highway Lead-Time Buffer</div>
                <div className="text-lg font-bold text-white mt-1">+1.5 Days Transit Cushion</div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: '76%' }} />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Adjusted reorder point upward due to freight congestion at Bhiwandi & NH-48 corridors.
                </p>
              </div>
              <div className="bg-slate-950 border border-emerald-500/30 p-5 rounded-xl">
                <div className="text-xs text-emerald-400 font-bold uppercase">Working Capital Unlocked</div>
                <div className="text-base font-bold text-white mt-1">₹2,45,000 Saved</div>
                <p className="text-xs text-slate-300 mt-2">
                  Prevents dead-stock over-ordering on slow-moving winter SKUs while protecting top sellers.
                </p>
              </div>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          
          <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    3. Dynamic Pricing for Small Business
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">
                    Algorithmic Hotel & SMB Rate Simulator
                  </h2>
                </div>
                <span className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                  8% Uplift Commission Model
                </span>
              </div>

              <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Base Standard Room Rate (₹)</span>
                    <span className="font-bold text-white">₹{baseRoomRate}</span>
                  </div>
                  <input
                    type="range"
                    min={1500}
                    max={8000}
                    step={100}
                    value={baseRoomRate}
                    onChange={(e) => setBaseRoomRate(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Current Local Occupancy (%)</span>
                    <span className="font-bold text-white">{occupancyPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={98}
                    step={2}
                    value={occupancyPct}
                    onChange={(e) => setOccupancyPct(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Local Weather API</label>
                    <select
                      value={weather}
                      onChange={(e) => setWeather(e.target.value as WeatherType)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="clear">Pleasant / Clear (+4%)</option>
                      <option value="monsoon">Heavy Monsoon (-6%)</option>
                      <option value="heatwave">Hill-Station Heat Escape (+8%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Local Event Radar</label>
                    <select
                      value={localEvent}
                      onChange={(e) => setLocalEvent(e.target.value as EventType)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value="none">No Major Event (0%)</option>
                      <option value="festival">Local Festival / Wedding (+18%)</option>
                      <option value="conference">Tech / Trade Expo (+24%)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 bg-slate-950 border border-amber-500/30 rounded-xl p-4">
              <div>
                <div className="text-[11px] text-slate-400">AI Dynamic Rate</div>
                <div className="text-xl font-extrabold text-amber-400 mt-0.5">₹{recommendedRate}</div>
                <div className="text-[11px] text-emerald-400">{Number(priceDeltaPct) >= 0 ? `+${priceDeltaPct}%` : `${priceDeltaPct}%`} vs Base</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Hotel Net Uplift / Mo</div>
                <div className="text-xl font-extrabold text-white mt-0.5">₹{netHotelGain.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-slate-400">After Commission</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">ArthaPulse 8% Fee</div>
                <div className="text-xl font-extrabold text-cyan-400 mt-0.5">₹{platformCommission.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-slate-400">Win-Win Revenue</div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    4. Sustainability & Ethics Tracking
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">
                    E-Commerce Carbon Footprint & Offset Engine
                  </h2>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  5% Offset Transaction Fee
                </span>
              </div>

              <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Monthly Online Store Deliveries</span>
                    <span className="font-bold text-white">{monthlyOrders.toLocaleString('en-IN')} orders</span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={10000}
                    step={250}
                    value={monthlyOrders}
                    onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Average Last-Mile Distance (km)</span>
                    <span className="font-bold text-white">{avgDistanceKm} km</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={1}
                    value={avgDistanceKm}
                    onChange={(e) => setAvgDistanceKm(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">EV Delivery Fleet %</span>
                      <span className="font-bold text-emerald-400">{evFleetShare}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={evFleetShare}
                      onChange={(e) => setEvFleetShare(Number(e.target.value))}
                      className="w-full accent-emerald-400"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Avg Order Value (₹)</span>
                      <span className="font-bold text-white">₹{avgOrderValue}</span>
                    </div>
                    <input
                      type="range"
                      min={300}
                      max={3000}
                      step={50}
                      value={avgOrderValue}
                      onChange={(e) => setAvgOrderValue(Number(e.target.value))}
                      className="w-full accent-emerald-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 bg-slate-950 border border-emerald-500/30 rounded-xl p-4">
              <div>
                <div className="text-[11px] text-slate-400">Delivery Carbon</div>
                <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{totalCarbonKg.toLocaleString('en-IN')} kg</div>
                <div className="text-[11px] text-slate-400">CO₂e Calculated</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Verified Offset Pool</div>
                <div className="text-xl font-extrabold text-white mt-0.5">₹{carbonOffsetPool.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-slate-400">GMV: ₹{(grossMerchandiseValue / 100000).toFixed(1)}L</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">5% Platform Fee</div>
                <div className="text-xl font-extrabold text-cyan-400 mt-0.5">₹{transactionFeeRevenue.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-emerald-400">ESG Monetized</div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
