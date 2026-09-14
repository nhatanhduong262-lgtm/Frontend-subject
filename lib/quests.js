const QUEST_POOL = [
  { id: 'q1', title: 'Play 1 match of Sky Hopper', type: 'play', game: 'Sky Hopper', target: 1, reward: 20 },
  { id: 'q2', title: 'Play 3 matches of Sky Hopper', type: 'play', game: 'Sky Hopper', target: 3, reward: 50 },
  { id: 'q3', title: 'Score 50 points in Neon Snake', type: 'score', game: 'Neon Snake', target: 50, reward: 40 },
  { id: 'q4', title: 'Score 100 points in Neon Snake', type: 'score', game: 'Neon Snake', target: 100, reward: 80 },
  { id: 'q5', title: 'Play 1 match of Pong Arena', type: 'play', game: 'Pong Arena', target: 1, reward: 20 },
  { id: 'q6', title: 'Score 150 points in any game', type: 'score_any', target: 150, reward: 50 },
  { id: 'q7', title: 'Score 300 points in any game', type: 'score_any', target: 300, reward: 100 },
  { id: 'q8', title: 'Play 2 matches of Neon Match', type: 'play', game: 'Neon Match', target: 2, reward: 40 },
  { id: 'q9', title: 'Score 1000 points in Lucky Dice', type: 'score', game: 'Lucky Dice', target: 1000, reward: 100 },
  { id: 'q10', title: 'Play 1 match of Pulse Reflex', type: 'play', game: 'Pulse Reflex', target: 1, reward: 20 },
];

export const RANKS = [
  { name: 'Challenger', minPoints: 3000, color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444, #f97316)' },
  { name: 'Master', minPoints: 1500, color: '#d946ef', gradient: 'linear-gradient(135deg, #d946ef, #8b5cf6)' },
  { name: 'Diamond', minPoints: 1000, color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)' },
  { name: 'Platinum', minPoints: 600, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  { name: 'Gold', minPoints: 300, color: '#eab308', gradient: 'linear-gradient(135deg, #fde047, #eab308)' },
  { name: 'Silver', minPoints: 100, color: '#94a3b8', gradient: 'linear-gradient(135deg, #cbd5e1, #94a3b8)' },
  { name: 'Bronze', minPoints: 0, color: '#b45309', gradient: 'linear-gradient(135deg, #d97706, #b45309)' },
];

export function getRankFromPoints(points) {
  return RANKS.find(r => points >= r.minPoints) || RANKS[RANKS.length - 1];
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}_v2`;
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
  const questIndex = state.activeQuests.findIndex(q => q.id === questId);
  if (questIndex === -1) return false;
  const quest = state.activeQuests[questIndex];
  
  if (quest && quest.current >= quest.target && !quest.claimed) {
    const nextQuests = [...state.activeQuests];
    
    const activeIds = nextQuests.map(q => q.id);
    const availableQuests = QUEST_POOL.filter(q => !activeIds.includes(q.id));
    
    if (availableQuests.length > 0) {
      const newQuestTemplate = availableQuests[Math.floor(Math.random() * availableQuests.length)];
      nextQuests[questIndex] = { ...newQuestTemplate, current: 0, claimed: false };
    } else {
      nextQuests[questIndex] = { ...quest, claimed: true };
    }

    saveQuestState({
      ...state,
      totalPoints: state.totalPoints + quest.reward,
      activeQuests: nextQuests
    });
    return true; // Successfully claimed
  }
  return false;
}
