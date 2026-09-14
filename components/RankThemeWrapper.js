import { useEffect, useState } from 'react';
import { getQuestState, getRankFromPoints } from '../lib/quests';

export default function RankThemeWrapper({ children }) {
  const [currentRank, setCurrentRank] = useState(null);

  useEffect(() => {
    // Chỉ chạy ở client-side
    const state = getQuestState();
    setCurrentRank(getRankFromPoints(state?.totalPoints || 0));

    const handleQuestUpdate = (e) => {
      setCurrentRank(getRankFromPoints(e.detail?.totalPoints || 0));
    };
    
    window.addEventListener('pixelpulse-quests-updated', handleQuestUpdate);
    return () => window.removeEventListener('pixelpulse-quests-updated', handleQuestUpdate);
  }, []);

  if (!currentRank) return children;

  const hexToRgbStr = (hex) => {
    const hexStr = hex || '#7dd3fc';
    const r = parseInt(hexStr.slice(1, 3), 16) || 125;
    const g = parseInt(hexStr.slice(3, 5), 16) || 211;
    const b = parseInt(hexStr.slice(5, 7), 16) || 252;
    return `${r}, ${g}, ${b}`;
  };

  return (
    <>
      <style jsx global>{`
        :root {
          --cyan: ${currentRank.color};
          --accent: ${currentRank.color};
          --pink: ${currentRank.color};
          --cyan-rgb: ${hexToRgbStr(currentRank.color)};
        }
        body {
          background: radial-gradient(ellipse at 0% 50%, ${currentRank.color}30, transparent 50%),
                      radial-gradient(ellipse at 100% 50%, ${currentRank.color}30, transparent 50%),
                      var(--bg) !important;
        }
        .brand-dot {
          background: ${currentRank.gradient} !important;
          box-shadow: 0 0 18px ${currentRank.color}80 !important;
        }
        .eyebrow {
          color: ${currentRank.color} !important;
          border-color: ${currentRank.color}60 !important;
          background: ${currentRank.color}15 !important;
        }
      `}</style>
      {children}
    </>
  );
}
