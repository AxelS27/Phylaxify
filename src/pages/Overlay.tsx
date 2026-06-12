import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Donation = Database['public']['Tables']['donations']['Row'];

export function Overlay() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [currentDonation, setCurrentDonation] = useState<Donation | null>(null);
  const [queue, setQueue] = useState<Donation[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveToken() {
      if (!token) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('overlay_token', token)
        .single();

      if (data) {
        setUserId(data.id);
      } else {
        console.error('Invalid overlay token:', error);
      }
      setLoading(false);
    }
    resolveToken();
  }, [token]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`overlay-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donations',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newRow = payload.new as Donation;
          const oldRow = payload.old as (Donation | undefined);

          if (payload.eventType === 'INSERT') {
            if (!newRow.blocked) {
              setQueue((prev) => [...prev, newRow]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const wasBlocked = oldRow ? oldRow.blocked === true : true;
            const isNowLolos = newRow.blocked === false && newRow.manually_approved === true;
            
            if (isNowLolos && (oldRow ? wasBlocked : true)) {
              setQueue((prev) => [...prev, newRow]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!currentDonation && queue.length > 0) {
      const next = queue[0];
      setQueue((prev) => prev.slice(1));
      setCurrentDonation(next);

      try {
        const audio = new AudioContext();
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.frequency.setValueAtTime(880, audio.currentTime);
        osc.frequency.setValueAtTime(1100, audio.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.4);
        osc.start();
        osc.stop(audio.currentTime + 0.5);
      } catch (e) {

      }
    }
  }, [currentDonation, queue]);

  useEffect(() => {
    if (currentDonation) {
      const timer = setTimeout(() => {
        setCurrentDonation(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentDonation]);

  if (loading) return null;
  
  if (!token || !userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-transparent">
        <div className="text-white/10 font-mono text-[10px] uppercase tracking-[0.2em] border border-white/5 px-4 py-2 rounded">
          Phylaxify Overlay • Waiting for Token
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {currentDonation && (
          <motion.div
            key={currentDonation.id}
            initial={{ opacity: 0, y: 40, scale: 0.9, filter: 'blur(12px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -40, scale: 0.9, filter: 'blur(12px)' }}
            transition={{ 
              type: 'spring', 
              stiffness: 80, 
              damping: 20,
              mass: 1
            }}
            className="relative"
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-48 h-1.5 greek-meander opacity-30"></div>

            <div className="liquid-glass p-10 rounded-[2rem] min-w-[450px] max-w-[650px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-gold/40 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-gold/10 blur-[100px] rounded-full"></div>
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/10 blur-[100px] rounded-full"></div>

              <div className="flex items-center gap-8 mb-6">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gold/20 blur-xl rounded-2xl group-hover:bg-gold/30 transition-all duration-700"></div>
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/40 flex items-center justify-center relative z-10 overflow-hidden">
                     <div className="absolute inset-0 greek-watermark-laurel opacity-20 scale-150"></div>
                     <span className="text-4xl font-black text-gold uppercase drop-shadow-sm">
                       {(currentDonation.donator_name || '?')[0]}
                     </span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-on-surface tracking-tight mb-1 uppercase">
                    {currentDonation.donator_name}
                  </h3>
                  <div className="flex items-center gap-3">
                    <p className="text-4xl font-display font-black text-gold drop-shadow-sm">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        maximumFractionDigits: 0,
                      }).format(currentDonation.amount)}
                    </p>
                    <div className="px-2 py-0.5 rounded bg-gold/10 border border-gold/20 text-[10px] font-bold text-gold uppercase tracking-widest">
                      {currentDonation.provider}
                    </div>
                  </div>
                </div>
              </div>

              {currentDonation.message && (
                <div className="relative mt-2">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gold via-gold/20 to-transparent rounded-full"></div>
                  <p className="text-2xl text-on-surface-variant font-medium leading-relaxed pl-6 italic">
                    {currentDonation.message}
                  </p>
                </div>
              )}
              
              <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-gold/30 rounded-tl-lg"></div>
              <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-gold/30 rounded-tr-lg"></div>
              <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-gold/30 rounded-bl-lg"></div>
              <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-gold/30 rounded-br-lg"></div>
            </div>
            
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-48 h-1.5 greek-meander opacity-30 rotate-180"></div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="fixed bottom-4 right-4 opacity-0 hover:opacity-100 transition-opacity">
        <p className="text-[8px] text-white/20 font-mono uppercase tracking-widest">
          Phylaxify Overlay Core v2 • {userId ? 'Active' : 'Offline'}
        </p>
      </div>
    </div>
  );
}
