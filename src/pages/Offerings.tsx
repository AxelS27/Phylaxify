import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Database } from '../lib/database.types';

type Donation = Database['public']['Tables']['donations']['Row'];

export function Offerings() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'passed' | 'blocked'>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);

      let query = supabase
        .from('donations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter === 'passed') query = query.eq('blocked', false);
      if (filter === 'blocked') query = query.eq('blocked', true);
      if (search) query = query.ilike('donator_name', `%${search}%`);
      if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);

      const { data, error } = await query;
      setLoading(false);
      if (!error && data) {
        setDonations(data);
      }
    }
    load();
  }, [user, filter, search, dateFrom, dateTo]);

  function exportCsv() {
    const headers = ['Date', 'Status', 'Donor', 'Provider', 'Amount (IDR)', 'Layer', 'Reason', 'Message'];
    const rows = donations.map((d) => [
      new Date(d.created_at).toISOString(),
      d.blocked ? 'Blocked' : d.manually_approved ? 'Manual' : 'Passed',
      d.donator_name,
      d.provider,
      d.amount,
      d.filter_layer ?? '',
      d.filter_reason ?? '',
      d.message ?? '',
    ]);
    const escape = (cell: string | number) => {
      const s = String(cell);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donations-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleClearHistory() {
    if (!user) return;
    if (!confirm('Delete ALL donation history? This cannot be undone.')) return;
    setClearing(true);
    const { error } = await supabase.from('donations').delete().eq('user_id', user.id);
    setClearing(false);
    if (!error) {
      setDonations([]);
      setIsDrawerOpen(false);
    }
  }

  async function handleApprove(id: number) {
    if (submitting) return;
    setSubmitting(true);
    const { error } = await supabase
      .from('donations')
      .update({ blocked: false, manually_approved: true })
      .eq('id', id);
    
    if (!error) {
      setDonations(prev => prev.map(d => d.id === id ? { ...d, blocked: false, manually_approved: true } : d));
      if (selectedDonation?.id === id) {
        setSelectedDonation({ ...selectedDonation, blocked: false, manually_approved: true });
      }
    }
    setSubmitting(false);
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this donation history?')) return;
    const { error } = await supabase.from('donations').delete().eq('id', id);
    if (!error) {
      setDonations(prev => prev.filter(d => d.id !== id));
      setIsDrawerOpen(false);
    }
  }

  function openDetail(d: Donation) {
    setSelectedDonation(d);
    setIsDrawerOpen(true);
  }

  const filteredCount = donations.length;

  return (
    <Layout>
      <div className="flex flex-col gap-8 max-w-7xl mx-auto p-12">
        <header className="flex justify-between items-end blurFadeUp">
          <div>
            <span className="text-label text-tertiary-fixed-dim uppercase tracking-[0.2em] mb-2 block">Offerings Hub</span>
            <h2 className="font-h1 text-h1 text-on-surface">Donation History</h2>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClearHistory}
              disabled={clearing || donations.length === 0}
              className="bg-error/10 text-error border border-error/30 px-6 py-2.5 rounded-lg font-label uppercase tracking-widest hover:bg-error/20 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
              {clearing ? 'Clearing...' : 'Clear History'}
            </button>
            <button
              onClick={exportCsv}
              disabled={donations.length === 0}
              className="bg-gold text-[#0A0A0A] px-6 py-2.5 rounded-lg font-label uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export CSV
            </button>
          </div>
        </header>

        <div className="flex flex-col md:flex-row md:flex-wrap justify-between items-stretch md:items-center gap-4 liquid-glass p-4 rounded-xl blurFadeUp" style={{animationDelay: '0.1s'}}>
          <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-md font-label uppercase tracking-wider text-[11px] transition-all ${filter === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('passed')}
              className={`px-6 py-2 rounded-md font-label uppercase tracking-wider text-[11px] transition-all ${filter === 'passed' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
            >
              Passed
            </button>
            <button
              onClick={() => setFilter('blocked')}
              className={`px-6 py-2 rounded-md font-label uppercase tracking-wider text-[11px] transition-all ${filter === 'blocked' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
            >
              Blocked
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-white/30 text-[18px]">date_range</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo || undefined}
              className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs text-white/80 focus:border-gold/50 focus:ring-0 outline-none transition-all [color-scheme:dark]"
            />
            <span className="text-white/30 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
              className="bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs text-white/80 focus:border-gold/50 focus:ring-0 outline-none transition-all [color-scheme:dark]"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                aria-label="Clear date filter"
                className="text-white/30 hover:text-error transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="relative w-full max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/20">search</span>
              <input
                type="text"
                placeholder="Search donators..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-gold/50 focus:ring-0 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="liquid-glass rounded-2xl overflow-hidden border border-white/10 blurFadeUp" style={{animationDelay: '0.2s'}}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="p-5 font-label text-[10px] text-white/40 uppercase tracking-widest">Status</th>
                  <th className="p-5 font-label text-[10px] text-white/40 uppercase tracking-widest">Donor Identity</th>
                  <th className="p-5 font-label text-[10px] text-white/40 uppercase tracking-widest text-right">Quantum</th>
                  <th className="p-5 font-label text-[10px] text-white/40 uppercase tracking-widest text-center">Layer</th>
                  <th className="p-5 font-label text-[10px] text-white/40 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={5} className="p-10 text-center text-white/20 font-label tracking-widest uppercase text-xs">Loading Data...</td></tr>
                ) : donations.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-white/20 font-label tracking-widest uppercase text-xs">No donations found</td></tr>
                ) : (
                  donations.map((d) => (
                    <tr 
                      key={d.id} 
                      onClick={() => openDetail(d)}
                      className={`hover:bg-white/[0.02] transition-colors group cursor-pointer ${d.blocked ? 'border-l-2 border-red-500/50 bg-red-500/[0.01]' : ''}`}
                    >
                      <td className="p-5">
                        {d.blocked ? (
                          <span className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-red-500/20">Blocked</span>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${d.manually_approved ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                            {d.manually_approved ? 'Manual' : d.provider === 'test' ? 'Test' : 'Passed'}
                          </span>
                        )}
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-[10px] text-gold">
                            {d.donator_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{d.donator_name}</div>
                            <div className="text-[10px] text-white/30 uppercase tracking-tighter">{d.provider} • {new Date(d.created_at).toLocaleTimeString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        <span className="text-sm font-bold text-white font-mono">Rp{d.amount.toLocaleString('id-ID')}</span>
                      </td>
                      <td className="p-5 text-center">
                        <span className="px-2 py-1 bg-white/5 text-white/40 rounded text-[10px] border border-white/10 uppercase tracking-tighter">
                          {d.filter_layer || 'none'}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <button className="text-white/20 group-hover:text-gold transition-all">
                          <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-5 bg-white/5 flex items-center justify-between">
            <p className="text-[11px] text-white/40 uppercase tracking-widest">Showing {filteredCount} Offerings</p>
          </div>
        </div>
      </div>
      
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        ></div>
      )}
      
      <aside className={`fixed right-0 top-0 h-full w-full max-w-[450px] bg-[#0F0F0F] border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-50 flex flex-col transition-transform duration-500 ease-out transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
         <div className="absolute inset-0 greek-meander opacity-5 pointer-events-none"></div>
         <header className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10">
            <div className="flex items-center gap-3">
               <span className="material-symbols-outlined text-gold">history_edu</span>
               <h3 className="font-bold text-lg uppercase tracking-widest">Donation Detail</h3>
            </div>
            <button 
              onClick={() => setIsDrawerOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40"
            >
               <span className="material-symbols-outlined">close</span>
            </button>
         </header>
         
         {selectedDonation && (
           <div className="flex-1 overflow-y-auto p-8 space-y-8 relative z-10">
              <div className={`liquid-glass p-6 rounded-2xl text-center border-2 ${selectedDonation.blocked ? 'border-red-500/20' : 'border-emerald-500/20'}`}>
                 <p className="text-label text-white/40 mb-2 uppercase tracking-widest">Transaction Value</p>
                 <div className={`text-[42px] font-black font-mono ${selectedDonation.blocked ? 'text-red-500' : 'text-emerald-500'}`}>
                   Rp{selectedDonation.amount.toLocaleString('id-ID')}
                 </div>
                 <div className="mt-4 flex justify-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${selectedDonation.blocked ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                      Status: {selectedDonation.blocked ? 'Blocked' : 'Passed'}
                    </span>
                 </div>
              </div>
              
              <section>
                 <h4 className="text-label text-white/40 mb-4 uppercase tracking-[0.2em]">Donor's Intent</h4>
                 <div className="p-5 bg-white/5 rounded-xl italic text-sm border-l-2 border-gold/30 leading-relaxed text-white/80">
                    "{selectedDonation.message || 'No message.'}"
                 </div>
                 <p className="mt-3 text-[10px] text-white/30 uppercase tracking-widest">From: {selectedDonation.donator_name} via {selectedDonation.provider}</p>
              </section>
              
              <section>
                 <h4 className="text-label text-white/40 mb-4 uppercase tracking-[0.2em]">Sentinel Analysis</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="liquid-glass p-4 rounded-xl">
                       <p className="text-[10px] text-white/30 uppercase mb-1">Protection Layer</p>
                       <p className="text-sm font-bold text-white uppercase">{selectedDonation.filter_layer || 'none'}</p>
                    </div>
                    <div className="liquid-glass p-4 rounded-xl">
                       <p className="text-[10px] text-white/30 uppercase mb-1">Confidence Score</p>
                       <div className="flex items-end gap-2">
                          <p className={`text-lg font-bold ${selectedDonation.confidence > 0.7 ? 'text-red-500' : 'text-white'}`}>
                            {(selectedDonation.confidence * 100).toFixed(0)}%
                          </p>
                          <div className="h-2 w-full bg-white/5 rounded-full mb-2 overflow-hidden">
                             <div className={`h-full ${selectedDonation.confidence > 0.7 ? 'bg-red-500' : 'bg-emerald-500'} transition-all`} style={{ width: `${selectedDonation.confidence * 100}%` }}></div>
                          </div>
                       </div>
                    </div>
                    <div className="liquid-glass p-4 rounded-xl col-span-2">
                       <p className="text-[10px] text-white/30 uppercase mb-1">Primary Reason</p>
                       <div className="flex items-center gap-2 text-sm text-white/80">
                          <span className={`material-symbols-outlined text-[18px] ${selectedDonation.blocked ? 'text-red-500' : 'text-emerald-500'}`}>
                            {selectedDonation.blocked ? 'gavel' : 'verified'}
                          </span>
                          {selectedDonation.filter_reason || 'No specific reason found.'}
                       </div>
                    </div>
                 </div>
              </section>
              
              <div className="pt-8 space-y-4">
                 {selectedDonation.blocked && (
                   <button 
                     onClick={() => handleApprove(selectedDonation.id)}
                     disabled={submitting}
                     className="w-full bg-emerald-500 text-[#0A0A0A] py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                      <span className="material-symbols-outlined font-bold">check_circle</span>
                      {submitting ? 'Approving...' : 'Manually Approve Donation'}
                   </button>
                 )}
                 <button 
                    onClick={() => handleDelete(selectedDonation.id)}
                    className="w-full bg-white/5 border border-white/10 text-white/60 py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all flex items-center justify-center gap-2"
                 >
                    <span className="material-symbols-outlined font-bold">delete_forever</span>
                    Purge from History
                 </button>
              </div>
           </div>
         )}
         <footer className="p-6 border-t border-white/10 text-center relative z-10">
            <p className="text-[10px] text-white/20 uppercase tracking-[0.3em]">Guardian Protocol 4.2.0 • Secured by Phylaxify</p>
         </footer>
      </aside>
    </Layout>
  );
}
