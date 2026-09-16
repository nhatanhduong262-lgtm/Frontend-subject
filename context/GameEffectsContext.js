import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { recordGameActivity } from '../lib/quests';

const GameEffectsContext = createContext(null);

export function GameEffectsProvider({ children }) {
  const [isMuted, setIsMuted] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [lastScoreSavedAt, setLastScoreSavedAt] = useState(Date.now());

  // Initialize from localStorage
  useEffect(() => {
    const saved = window.localStorage.getItem('pixelpulse_muted');
    if (saved === 'true') setIsMuted(true);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      window.localStorage.setItem('pixelpulse_muted', String(next));
      return next;
    });
  }, []);

  // Simple Web Audio API Synthesizer for 8-bit retro sounds
  const playSound = useCallback((frequency, type, duration, vol = 0.1) => {
    if (isMuted) return;
    try {
      if (!window.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        window.audioCtx = new AudioContext();
      }
      const ctx = window.audioCtx;

      // Ensure context is running (browsers suspend it before user interaction)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context not supported or failed to play");
    }
  }, [isMuted]);

  const playJumpSound = useCallback(() => playSound(600, 'square', 0.1, 0.05), [playSound]);
  const playScoreSound = useCallback(() => playSound(1200, 'sine', 0.15, 0.1), [playSound]);
  const playGameOverSound = useCallback(() => playSound(150, 'sawtooth', 0.5, 0.2), [playSound]);
  
  // Specific Game Sounds
  const playSnakeEatSound = useCallback(() => playSound(800, 'sine', 0.1, 0.08), [playSound]);
  const playPaddleHitSound = useCallback(() => playSound(300, 'square', 0.08, 0.05), [playSound]);
  const playWallHitSound = useCallback(() => playSound(450, 'square', 0.08, 0.05), [playSound]);
  const playCardFlipSound = useCallback(() => playSound(600, 'triangle', 0.05, 0.05), [playSound]);
  const playMatchSuccessSound = useCallback(() => {
    playSound(800, 'sine', 0.1, 0.05);
    setTimeout(() => playSound(1200, 'sine', 0.15, 0.05), 100);
  }, [playSound]);
  const playMismatchSound = useCallback(() => playSound(200, 'sawtooth', 0.2, 0.08), [playSound]);
  const playAlertSound = useCallback(() => playSound(1000, 'sine', 0.1, 0.08), [playSound]);
  const playErrorSound = useCallback(() => playSound(150, 'sawtooth', 0.3, 0.1), [playSound]);
  
  const playDiceRollSound = useCallback(() => {
    let count = 0;
    const interval = setInterval(() => {
      playSound(300 + Math.random() * 200, 'triangle', 0.05, 0.05);
      count++;
      if (count > 5) clearInterval(interval);
    }, 80);
  }, [playSound]);

  // Confetti effect for new high score
  const fireConfetti = useCallback(() => {
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults, particleCount,
        origin: { x: Math.random(), y: Math.random() - 0.2 }
      });
    }, 250);
  }, []);

  const showCloudSyncToast = useCallback((msg = "☁️ Record saved to cloud!") => {
    // Basic DOM-based toast because this can be called from anywhere
    const toast = document.createElement("div");
    toast.innerText = msg;
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.background = "linear-gradient(135deg, #4f46e5, #3b82f6)";
    toast.style.color = "#fff";
    toast.style.padding = "12px 20px";
    toast.style.borderRadius = "12px";
    toast.style.boxShadow = "0 8px 16px rgba(59, 130, 246, 0.4)";
    toast.style.zIndex = "9999";
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "600";
    toast.style.transition = "all 0.3s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });
    
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(20px)";
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 2500);
  }, []);

  const saveScoreToCloud = useCallback(async (gameName, score) => {
    try {
      if (score > 0) {
        recordGameActivity(gameName, score);
      }
      
      const userId = window.localStorage.getItem("userId");
      const token = window.localStorage.getItem("token");
      if (!userId || !token) return;
      
      const payload = { game_name: gameName, score: Number(score) };
      
      const response = await fetch('/api/game_logs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        showCloudSyncToast(`☁️ Saved ${score} points to cloud!`);
        setLastScoreSavedAt(Date.now());
      }
    } catch (err) {
      console.error("Failed to sync score to cloud", err);
    }
  }, [showCloudSyncToast]);

  return (
    <GameEffectsContext.Provider value={{
      isMuted, toggleMute,
      playJumpSound, playScoreSound, playGameOverSound,
      playSnakeEatSound, playPaddleHitSound, playWallHitSound,
      playCardFlipSound, playMatchSuccessSound, playMismatchSound,
      playAlertSound, playErrorSound, playDiceRollSound,
      fireConfetti, showCloudSyncToast, saveScoreToCloud,
      lastScoreSavedAt
    }}>
      {children}
      
      {/* Toast Notification UI */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'var(--card-bg)',
          color: 'var(--text-main)',
          padding: '16px 24px',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 9999,
          animation: 'slideInRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          fontWeight: 500
        }}>
          {toastMessage}
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </GameEffectsContext.Provider>
  );
}

export function useGameEffects() {
  return useContext(GameEffectsContext);
}
