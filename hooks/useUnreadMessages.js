import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const userId = typeof window !== 'undefined' ? window.localStorage.getItem('userId') : null;
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    
    if (!userId || !token) return;

    // Initial fetch
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/messages/unread-count', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count || 0);
        }
      } catch (err) {
        console.error("Failed to fetch unread count", err);
      }
    };
    fetchCount();

    // Realtime subscription
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    
    if (!url || !key) return;

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const channel = supabase.channel(`global-unread-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
        (payload) => {
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return unreadCount;
}
