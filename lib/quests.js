const QUEST_POOL = [
  { id: 'q1', title: 'Chơi 1 ván Sky Hopper', type: 'play', game: 'Sky Hopper', target: 1, reward: 20 },
  { id: 'q2', title: 'Chơi 3 ván Sky Hopper', type: 'play', game: 'Sky Hopper', target: 3, reward: 50 },
  { id: 'q3', title: 'Đạt 50 điểm trong Neon Snake', type: 'score', game: 'Neon Snake', target: 50, reward: 40 },
  { id: 'q4', title: 'Đạt 100 điểm trong Neon Snake', type: 'score', game: 'Neon Snake', target: 100, reward: 80 },
  { id: 'q5', title: 'Chơi 1 ván Pong Arena', type: 'play', game: 'Pong Arena', target: 1, reward: 20 },
  { id: 'q6', title: 'Đạt 150 điểm bất kỳ', type: 'score_any', target: 150, reward: 50 },
  { id: 'q7', title: 'Đạt 300 điểm bất kỳ', type: 'score_any', target: 300, reward: 100 },
  { id: 'q8', title: 'Chơi 2 ván Neon Match', type: 'play', game: 'Neon Match', target: 2, reward: 40 },
  { id: 'q9', title: 'Đạt 1000 điểm Lucky Dice', type: 'score', game: 'Lucky Dice', target: 1000, reward: 100 },
  { id: 'q10', title: 'Chơi 1 ván Pulse Reflex', type: 'play', game: 'Pulse Reflex', target: 1, reward: 20 },
];

export const RANKS = [
  { name: 'Thách Đấu', minPoints: 3000, color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f97316)' }, // Challenger
  { name: 'Cao Thủ', minPoints: 1500, color: '#d946ef', gradient: 'linear-gradient(135deg, #d946ef, #8b5cf6)' }, // Master
  { name: 'Kim Cương', minPoints: 1000, color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }, // Diamond
  { name: 'Bạch Kim', minPoints: 600, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' }, // Platinum
  { name: 'Vàng', minPoints: 300, color: '#eab308', gradient: 'linear-gradient(135deg, #fde047, #eab308)' }, // Gold
  { name: 'Bạc', minPoints: 100, color: '#94a3b8', gradient: 'linear-gradient(135deg, #cbd5e1, #94a3b8)' }, // Silver
  { name: 'Đồng', minPoints: 0, color: '#b45309', gradient: 'linear-gradient(135deg, #d97706, #b45309)' }, // Bronze
];

export function getRankFromPoints(points) {
  return RANKS.find(r => points >= r.minPoints) || RANKS[RANKS.length - 1];
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function getQuestState() {
  if (typeof window === 'undefined') return { totalPoints: 0, activeQuests: [], date: getTodayString() };
  
  try {
    const saved = JSON.parse(window.localStorage.getItem('pixelpulse-quests') || 'null');
    const today = getTodayString();
    
    // If no saved state, or if it's a new day, regenerate quests
    if (!saved || saved.date !== today) {
      // Pick 3 random quests
      const shuffled = [...QUEST_POOL].sort(() => 0.5 - Math.random());
      const newQuests = shuffled.slice(0, 3).map(q => ({ ...q, current: 0, claimed: false }));
      
      const newState = {
        totalPoints: saved ? saved.totalPoints : 0,
        date: today,
        activeQuests: newQuests
      };
      
      window.localStorage.setItem('pixelpulse-quests', JSON.stringify(newState));
      return newState;
    }
    
    return saved;
  } catch (error) {
    return { totalPoints: 0, activeQuests: [], date: getTodayString() };
  }
}

export function saveQuestState(newState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('pixelpulse-quests', JSON.stringify(newState));
  window.dispatchEvent(new CustomEvent('pixelpulse-quests-updated', { detail: newState }));
}

export function recordGameActivity(gameName, score) {
  const state = getQuestState();
  if (!state.activeQuests || state.activeQuests.length === 0) return;

  let hasUpdates = false;
  const nextQuests = state.activeQuests.map(q => {
    if (q.claimed) return q;
    
    let nextCurrent = q.current;
    
    if (q.type === 'play' && (q.game === gameName || !q.game)) {
      nextCurrent += 1;
    } else if (q.type === 'score' && q.game === gameName) {
      nextCurrent = Math.max(nextCurrent, score);
    } else if (q.type === 'score_any') {
      nextCurrent = Math.max(nextCurrent, score);
    }
    
    // Clamp current to target
    nextCurrent = Math.min(nextCurrent, q.target);
    
    if (nextCurrent !== q.current) {
      hasUpdates = true;
      return { ...q, current: nextCurrent };
    }
    return q;
  });

  if (hasUpdates) {
    saveQuestState({ ...state, activeQuests: nextQuests });
  }
}

export function claimQuestReward(questId) {
  const state = getQuestState();
  const quest = state.activeQuests.find(q => q.id === questId);
  
  if (quest && quest.current >= quest.target && !quest.claimed) {
    const nextQuests = state.activeQuests.map(q => 
      q.id === questId ? { ...q, claimed: true } : q
    );
    saveQuestState({
      ...state,
      totalPoints: state.totalPoints + quest.reward,
      activeQuests: nextQuests
    });
    return true; // Successfully claimed
  }
  return false;
}
