import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import ThemeToggle from "../components/ThemeToggle";
import BackButton from "../components/BackButton";
import { DEFAULT_PLAYER_PROGRESS, getStoredPlayerProgress, loadPlayerProgressFromDatabase, subscribeToUserProgress } from "../lib/playerProgress";
import { getQuestState, claimQuestReward, getRankFromPoints, RANKS } from "../lib/quests";
import { useUnreadMessages } from "../hooks/useUnreadMessages";
import { useTheme } from "../hooks/useTheme";

const defaultPlayerProgress = DEFAULT_PLAYER_PROGRESS;

const quickLinks = [
  { label: "Game Library", href: "/games", icon: "🎮", color: "#8b5cf6" },
  { label: "Progress", href: "/progress", icon: "📈", color: "#3dd9ff" },
  { label: "Profile", href: "/profile", icon: "👤", color: "#10b981" },
  { label: "Messages", href: "/messages", icon: "💬", color: "#f59e0b" },
];

function AuthGuard({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const token = window.localStorage.getItem("token");
    const profile = JSON.parse(window.localStorage.getItem("profile") || "null");
    if (!token || !profile) { router.replace("/login"); return; }
    setReady(true);
  }, [router]);
  if (!ready) return null;
  return children;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isLight } = useTheme();
  const [profile, setProfile] = useState(null);
  const [playerProgress, setPlayerProgress] = useState(() => getStoredPlayerProgress());
  const [loadingProgress, setLoadingProgress] = useState(() => {
    const initial = getStoredPlayerProgress();
    return !initial || initial.length === 0 || !initial.some(g => (g.playtime || 0) > 0 || (g.score || 0) > 0);
  });
  const [questState, setQuestState] = useState(null);
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [showNextLevelXp, setShowNextLevelXp] = useState(false);
  const [greeting, setGreeting] = useState("Welcome back");
  const unreadCount = useUnreadMessages();

  // ── Theme-aware color palette ──────────────────────────────────────────────
  const t = isLight ? {
    bg:           "transparent",
    navBg:        "rgba(255,253,249,0.85)",
    navBorder:    "rgba(90,60,30,0.12)",
    heroBg:       "rgba(255,253,249,0.90)",
    heroBorder:   "rgba(90,60,30,0.12)",
    heroShadow:   "0 12px 40px rgba(90,60,30,0.10)",
    panelBg:      "rgba(255,253,249,0.92)",
    panelBorder:  "rgba(90,60,30,0.12)",
    panelShadow:  "0 6px 24px rgba(90,60,30,0.08)",
    cardBg:       (color) => `linear-gradient(145deg, ${color}18 0%, rgba(255,253,249,0.95) 100%)`,
    cardBorder:   (color) => `${color}40`,
    statBg:       "rgba(255,253,249,0.95)",
    questCard:    "rgba(255,253,249,0.95)",
    questBorder:  "rgba(90,60,30,0.10)",
    questHover:   "rgba(109,59,232,0.06)",
    navLink:      "rgba(90,60,30,0.06)",
    navLinkHover: "rgba(90,60,30,0.12)",
    text:         "#1a1410",
    muted:        "#6b5e52",
    accent:       "#6d3be8",
    orb1:         "rgba(109,59,232,0.10)",
    orb2:         "rgba(3,105,161,0.07)",
    orb3:         "rgba(4,120,87,0.06)",
    inputBg:      "rgba(255,253,249,0.9)",
    inputBorder:  "rgba(90,60,30,0.18)",
    rankCardHover:"rgba(90,60,30,0.05)",
  } : {
    bg:           "transparent",
    navBg:        "rgba(5,8,22,0.80)",
    navBorder:    "rgba(255,255,255,0.06)",
    heroBg:       "linear-gradient(135deg, rgba(11,17,33,0.95) 0%, rgba(20,28,50,0.90) 100%)",
    heroBorder:   "rgba(255,255,255,0.07)",
    heroShadow:   "0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
    panelBg:      "rgba(11,17,33,0.88)",
    panelBorder:  "rgba(255,255,255,0.07)",
    panelShadow:  "0 12px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
    cardBg:       (color) => `linear-gradient(145deg, ${color}15 0%, rgba(5,8,22,0.9) 100%)`,
    cardBorder:   (color) => `${color}30`,
    statBg:       "rgba(5,8,22,0.9)",
    questCard:    "rgba(255,255,255,0.03)",
    questBorder:  "rgba(255,255,255,0.07)",
    questHover:   "rgba(139,92,246,0.05)",
    navLink:      "rgba(255,255,255,0.03)",
    navLinkHover: "rgba(255,255,255,0.07)",
    text:         "#edf4ff",
    muted:        "#9eb3d9",
    accent:       "#8b5cf6",
    orb1:         "rgba(139,92,246,0.15)",
    orb2:         "rgba(61,217,255,0.12)",
    orb3:         "rgba(16,185,129,0.08)",
    inputBg:      "rgba(255,255,255,0.04)",
    inputBorder:  "rgba(255,255,255,0.12)",
    rankCardHover:"rgba(255,255,255,0.02)",
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    const initialProgress = getStoredPlayerProgress();
    setPlayerProgress(initialProgress);
    const hasAnyProgress = initialProgress.some(g => (g.playtime || 0) > 0 || (g.score || 0) > 0);
    setLoadingProgress(!hasAnyProgress);
    setQuestState(getQuestState());
    const handleQuestUpdate = (e) => setQuestState(e.detail);
    window.addEventListener("pixelpulse-quests-updated", handleQuestUpdate);
    return () => window.removeEventListener("pixelpulse-quests-updated", handleQuestUpdate);
  }, []);

  useEffect(() => {
    const token = window.localStorage.getItem("token");
    const savedProfile = JSON.parse(window.localStorage.getItem("profile") || "null");
    if (!token || !savedProfile) { router.replace("/login"); return; }
    if (savedProfile.role === "admin") { router.replace("/admin"); return; }
    setProfile(savedProfile);
  }, [router]);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    let pollingId = null;
    const syncProgress = (event) => {
      const nextProgress = event?.detail ?? getStoredPlayerProgress();
      if (active) setPlayerProgress(Array.isArray(nextProgress) ? nextProgress : defaultPlayerProgress);
    };
    const handleStorage = () => syncProgress({ detail: getStoredPlayerProgress() });
    window.addEventListener("pixelpulse-progress-updated", syncProgress);
    window.addEventListener("storage", handleStorage);
    const hydrateProgress = async () => {
      const nextProgress = await loadPlayerProgressFromDatabase();
      if (active) {
        setPlayerProgress(nextProgress);
        setLoadingProgress(false);
      }
    };
    hydrateProgress();
    const userId = window.localStorage.getItem("userId");
    if (userId) {
      unsubscribe = subscribeToUserProgress(userId, (nextProgress) => {
        if (active) setPlayerProgress(nextProgress);
      });
      pollingId = window.setInterval(() => { hydrateProgress(); }, 4000);
    }
    return () => {
      active = false;
      unsubscribe();
      if (pollingId) window.clearInterval(pollingId);
      window.removeEventListener("pixelpulse-progress-updated", syncProgress);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("userId");
    window.localStorage.removeItem("profile");
    router.push("/login");
  };

  if (!profile) return null;

  const featuredGames = playerProgress.slice(0, 4);
  const averageProgress = Math.round(featuredGames.reduce((sum, g) => sum + Number(g.progress || 0), 0) / Math.max(featuredGames.length, 1));
  const completedStages = questState?.activeQuests?.filter(q => q.claimed || q.current >= q.target).length || 0;
  const totalQuests = questState?.activeQuests?.length || 3;
  const xp = playerProgress.reduce((sum, g) => sum + (Number(g.score) || 0), 0);
  const level = Math.floor(xp / 100) + 1;
  const xpNeeded = (level * 100) - xp;
  const currentPoints = questState?.totalPoints || 0;
  const currentRank = getRankFromPoints(currentPoints);
  const sortedRanks = [...RANKS].sort((a, b) => a.minPoints - b.minPoints);
  const nextRank = sortedRanks.find(r => r.minPoints > currentPoints);
  let expPercentage = 100;
  let expText = "Max Rank";
  if (nextRank) {
    expPercentage = ((currentPoints - currentRank.minPoints) / (nextRank.minPoints - currentRank.minPoints)) * 100;
    expText = `${currentPoints} / ${nextRank.minPoints} QP`;
  }

  const avatarUrl = profile.avatar_url || "";

  const statCards = [
    { label: "Player Level", value: level, icon: "⚡", color: "#8b5cf6", glow: "rgba(139,92,246,0.4)" },
    { label: "Total XP", value: showNextLevelXp ? `Need ${xpNeeded}` : xp.toLocaleString(), icon: "⭐", color: "#f59e0b", glow: "rgba(245,158,11,0.4)", isXp: true },
    { label: "Quests Done", value: `${completedStages}/${totalQuests}`, icon: "🎯", color: isLight ? "#0369a1" : "#3dd9ff", glow: "rgba(61,217,255,0.4)" },
    { label: "Rank", value: currentRank.name, icon: "🏆", color: currentRank.color, glow: `${currentRank.color}66`, isRank: true, gradient: currentRank.gradient },
  ];

  return (
    <AuthGuard>
      <>
        <style>{`
          @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(139,92,246,0.5)}70%{box-shadow:0 0 0 12px rgba(139,92,246,0)}100%{box-shadow:0 0 0 0 rgba(139,92,246,0)} }
          @keyframes glow-pulse  { 0%,100%{opacity:.5} 50%{opacity:1} }
          @keyframes slideInUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
          .stat-hover:hover  { transform:translateY(-6px)!important; }
          .nav-link-db:hover { transform:translateX(6px)!important; background:${isLight?"rgba(90,60,30,0.10)":"rgba(255,255,255,0.07)"}!important; }
          .game-card-db:hover { transform:translateY(-4px) scale(1.02)!important; }
          .logout-btn:hover  { background:rgba(239,68,68,0.15)!important; color:#ef4444!important; border-color:rgba(239,68,68,0.35)!important; }
          ::-webkit-scrollbar{width:4px}
          ::-webkit-scrollbar-track{background:transparent}
          ::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.4);border-radius:4px}
        `}</style>

        <main style={{ minHeight: "100vh", padding: "0 0 60px", position: "relative", overflow: "hidden" }}>

          {/* Ambient orbs */}
          <div style={{ position:"fixed", top:"-20%", left:"-10%", width:500, height:500, borderRadius:"50%", background:`radial-gradient(circle, ${t.orb1}, transparent 70%)`, pointerEvents:"none", filter:"blur(60px)", zIndex:0 }} />
          <div style={{ position:"fixed", bottom:"-10%", right:"-5%", width:400, height:400, borderRadius:"50%", background:`radial-gradient(circle, ${t.orb2}, transparent 70%)`, pointerEvents:"none", filter:"blur(60px)", zIndex:0 }} />
          <div style={{ position:"fixed", top:"40%", right:"20%", width:300, height:300, borderRadius:"50%", background:`radial-gradient(circle, ${t.orb3}, transparent 70%)`, pointerEvents:"none", filter:"blur(50px)", zIndex:0 }} />

          {/* ── TOP NAV ── */}
          <div style={{ position:"sticky", top:0, zIndex:50, backdropFilter:"blur(20px)", background:t.navBg, borderBottom:`1px solid ${t.navBorder}`, transition:"background 0.35s, border-color 0.35s" }}>
            <div style={{ maxWidth:1200, margin:"0 auto", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#8b5cf6,#3dd9ff)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, boxShadow:"0 0 16px rgba(139,92,246,0.5)", animation:"glow-pulse 3s ease-in-out infinite" }}>🕹️</div>
                <span style={{ fontWeight:900, fontSize:16, letterSpacing:"0.1em", textTransform:"uppercase", background:"linear-gradient(90deg,#8b5cf6,#3dd9ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>PixelPulse</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                {[{href:"/games",label:"Games",icon:"🎮"},{href:"/progress",label:"Progress",icon:"📈"},{href:"/profile",label:"Profile",icon:"👤"}].map(item=>(
                  <Link key={item.href} href={item.href} style={{
                    padding:"7px 14px", borderRadius:10, fontSize:13, fontWeight:600,
                    background:t.navLink, border:`1px solid ${t.navBorder}`,
                    color:t.muted, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:5, transition:"all 0.2s",
                  }}
                    onMouseOver={e=>{e.currentTarget.style.background=isLight?"rgba(109,59,232,0.10)":"rgba(139,92,246,0.15)";e.currentTarget.style.color=t.text;e.currentTarget.style.borderColor=isLight?"rgba(109,59,232,0.25)":"rgba(139,92,246,0.3)";}}
                    onMouseOut={e=>{e.currentTarget.style.background=t.navLink;e.currentTarget.style.color=t.muted;e.currentTarget.style.borderColor=t.navBorder;}}
                  >{item.icon} {item.label}</Link>
                ))}
                <Link href="/messages" style={{
                  padding:"7px 14px", borderRadius:10, fontSize:13, fontWeight:600,
                  background:unreadCount>0?(isLight?"rgba(180,83,9,0.12)":"rgba(245,158,11,0.15)"):t.navLink,
                  border:unreadCount>0?(isLight?"1px solid rgba(180,83,9,0.30)":"1px solid rgba(245,158,11,0.35)"):`1px solid ${t.navBorder}`,
                  color:unreadCount>0?(isLight?"#b45309":"#f59e0b"):t.muted,
                  textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6, transition:"all 0.2s", position:"relative",
                }}>
                  💬 Messages
                  {unreadCount>0&&<span style={{background:"#ef4444",color:"#fff",borderRadius:20,padding:"1px 7px",fontSize:11,fontWeight:800,animation:"pulse-ring 1.5s infinite"}}>{unreadCount}</span>}
                </Link>
                <ThemeToggle />
                <button className="logout-btn" onClick={handleLogout} style={{
                  padding:"7px 14px", borderRadius:10, fontSize:13, fontWeight:600,
                  background:t.navLink, border:`1px solid ${t.navBorder}`,
                  color:t.muted, cursor:"pointer", transition:"all 0.2s",
                }}>🚪 Logout</button>
              </div>
            </div>
          </div>

          <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px", position:"relative", zIndex:1 }}>

            {/* ── HERO BANNER ── */}
            <div style={{
              margin:"32px 0 28px", padding:"32px 36px", borderRadius:28,
              background:t.heroBg, border:`1px solid ${t.heroBorder}`,
              boxShadow:t.heroShadow, position:"relative", overflow:"hidden",
              display:"flex", alignItems:"center", gap:28, flexWrap:"wrap",
              animation:"slideInUp 0.4s ease",
            }}>
              <div style={{ position:"absolute", top:0, right:0, width:"55%", height:"100%", background:isLight?"linear-gradient(135deg,transparent 0%,rgba(109,59,232,0.04) 50%,rgba(3,105,161,0.03) 100%)":"linear-gradient(135deg,transparent 0%,rgba(139,92,246,0.07) 50%,rgba(61,217,255,0.05) 100%)", pointerEvents:"none" }} />
              <div style={{ position:"absolute", top:-60, right:80, width:200, height:200, borderRadius:"50%", background:isLight?"radial-gradient(circle,rgba(109,59,232,0.08) 0%,transparent 70%)":"radial-gradient(circle,rgba(139,92,246,0.18) 0%,transparent 70%)", pointerEvents:"none" }} />

              {/* Avatar */}
              <div style={{ position:"relative", flexShrink:0 }}>
                <div style={{
                  width:80, height:80, borderRadius:"50%",
                  background:avatarUrl?`url(${avatarUrl}) center/cover`:"linear-gradient(135deg,#8b5cf6,#3dd9ff)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:30, fontWeight:900, color:"#fff",
                  boxShadow:"0 0 0 3px rgba(139,92,246,0.35), 0 0 30px rgba(139,92,246,0.25)",
                }}>
                  {!avatarUrl&&(profile.name?.[0]?.toUpperCase()||"P")}
                </div>
                <div style={{ position:"absolute", bottom:2, right:2, width:20, height:20, borderRadius:"50%", background:"#10b981", border:`3px solid ${isLight?"#fffdf9":"#050816"}`, boxShadow:"0 0 8px rgba(16,185,129,0.8)" }} />
              </div>

              {/* Text */}
              <div style={{ flex:1, position:"relative", zIndex:1 }}>
                <div style={{ fontSize:12, color:t.muted, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:6 }}>{greeting} 👋</div>
                <h1 style={{ margin:"0 0 10px", fontSize:"clamp(1.8rem,4vw,2.8rem)", fontWeight:900, letterSpacing:"-0.04em", color:t.text, lineHeight:1.1 }}>
                  {profile.name||"Player"}
                  <span style={{ marginLeft:12, fontSize:"clamp(1.2rem,2.5vw,1.8rem)", background:"linear-gradient(90deg,#8b5cf6,#3dd9ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>✦</span>
                </h1>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <span style={{ padding:"4px 12px", borderRadius:8, background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.30)", fontSize:12, fontWeight:700, color:"#059669", display:"inline-flex", alignItems:"center", gap:5 }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background:"#10b981", boxShadow:"0 0 6px #10b981", display:"inline-block" }} /> Online
                  </span>
                  <span style={{ padding:"4px 12px", borderRadius:8, background:`${currentRank.color}18`, border:`1px solid ${currentRank.color}40`, fontSize:12, fontWeight:700, color:currentRank.color }}>{currentRank.name} Rank</span>
                  <span style={{ padding:"4px 12px", borderRadius:8, background:isLight?"rgba(109,59,232,0.10)":"rgba(139,92,246,0.10)", border:isLight?"1px solid rgba(109,59,232,0.25)":"1px solid rgba(139,92,246,0.3)", fontSize:12, fontWeight:700, color:t.accent }}>⚡ Lv. {level}</span>
                </div>
              </div>

              {/* XP bar */}
              <div className="w-full sm:w-auto" style={{ minWidth:220, background:isLight?"rgba(90,60,30,0.05)":"rgba(255,255,255,0.03)", border:`1px solid ${t.panelBorder}`, borderRadius:16, padding:"16px 18px", position:"relative", zIndex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontSize:11, color:t.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Quest Points</span>
                  <span style={{ fontSize:18, fontWeight:900, backgroundImage:currentRank.gradient||"#f59e0b", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{currentPoints} QP</span>
                </div>
                <div style={{ height:8, borderRadius:999, background:isLight?"rgba(90,60,30,0.10)":"rgba(255,255,255,0.08)", overflow:"hidden", marginBottom:8 }}>
                  <div style={{ width:`${Math.min(100,Math.max(0,expPercentage))}%`, height:"100%", borderRadius:999, background:currentRank.gradient||"#f59e0b", transition:"width 0.6s ease-out", boxShadow:`0 0 8px ${currentRank.color}80` }} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:t.muted, fontWeight:600 }}>
                  <span>{expText}</span>
                  <span>{nextRank?`→ ${nextRank.name}`:"👑 Max"}</span>
                </div>
              </div>
            </div>

            {/* ── STAT CARDS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap:16, marginBottom:28, animation:"slideInUp 0.5s ease 0.1s both" }}>
              {statCards.map((card,i)=>(
                <div key={card.label} className="stat-hover"
                  onClick={card.isRank ? () => setIsRankModalOpen(true) : card.isXp ? () => setShowNextLevelXp(!showNextLevelXp) : undefined}
                  style={{
                    padding:"22px 20px", borderRadius:20,
                    cursor:(card.isRank || card.isXp) ? "pointer" : "default",
                    background:t.cardBg(card.color),
                    border:`1px solid ${t.cardBorder(card.color)}`,
                    boxShadow:isLight?`0 4px 16px rgba(90,60,30,0.08)`:`0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)`,
                    transition:"transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease",
                    position:"relative", overflow:"hidden", animationDelay:`${i*0.08}s`,
                  }}>
                  <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:`radial-gradient(circle,${card.color}${isLight?"15":"25"},transparent 70%)`, pointerEvents:"none" }} />
                  <div style={{ fontSize:24, marginBottom:12, filter:`drop-shadow(0 0 8px ${card.glow})` }}>{card.icon}</div>
                  <div style={{ fontSize:11, color:t.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>
                    {card.label}
                    {card.isRank&&<span style={{ marginLeft:6, fontSize:9, padding:"1px 5px", border:`1px solid ${card.color}`, borderRadius:6, color:card.color }}>INFO</span>}
                  </div>
                  {card.isRank?(
                    <strong style={{ fontSize:"1.9rem", fontWeight:900, backgroundImage:card.gradient, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", display:"block", letterSpacing:"-0.04em" }}>{card.value}</strong>
                  ):(
                    <strong style={{ fontSize:"1.9rem", fontWeight:900, color:t.text, display:"block", letterSpacing:"-0.04em" }}>{card.value}</strong>
                  )}
                </div>
              ))}
            </div>

            {/* ── MAIN GRID ── */}
            <div className="flex flex-col lg:grid lg:grid-cols-[1fr_340px]" style={{ gap:20, animation:"slideInUp 0.5s ease 0.2s both" }}>

              {/* LEFT */}
              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

                {/* Quests */}
                <section style={{ background:t.panelBg, border:`1px solid ${t.panelBorder}`, borderRadius:24, padding:"24px 26px", boxShadow:t.panelShadow, backdropFilter:"blur(12px)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16, marginBottom:20 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:40, height:40, borderRadius:12, background:isLight?"rgba(180,83,9,0.12)":"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.35)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🎯</div>
                      <div>
                        <div style={{ fontSize:11, color:isLight?"#b45309":"#f59e0b", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em" }}>Daily Quests</div>
                        <h2 style={{ margin:"3px 0 0", fontSize:20, fontWeight:800, color:t.text }}>Today&apos;s Missions</h2>
                      </div>
                    </div>
                    <div style={{ padding:"6px 14px", borderRadius:10, background:isLight?"rgba(180,83,9,0.08)":"rgba(245,158,11,0.10)", border:isLight?"1px solid rgba(180,83,9,0.22)":"1px solid rgba(245,158,11,0.30)", fontSize:13, fontWeight:700, color:isLight?"#b45309":"#f59e0b" }}>
                      {completedStages}/{totalQuests} Done
                    </div>
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {questState?.activeQuests?.map((q,idx)=>{
                      const pct=Math.min(100,(q.current/q.target)*100);
                      const done=q.current>=q.target;
                      return (
                        <div key={q.id} style={{
                          display:"flex", alignItems:"center", justifyContent:"space-between",
                          padding:"16px 18px", borderRadius:16, gap:16,
                          background:q.claimed?(isLight?"rgba(4,120,87,0.06)":"rgba(16,185,129,0.06)"):t.questCard,
                          border:q.claimed?(isLight?"1px solid rgba(4,120,87,0.20)":"1px solid rgba(16,185,129,0.25)"):`1px solid ${t.questBorder}`,
                          transition:"all 0.2s",
                        }}>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                              <span style={{ fontSize:16 }}>{["🎮","⚔️","🏆"][idx%3]}</span>
                              <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:t.text }}>{q.title}</h3>
                              {q.claimed&&<span style={{ fontSize:11, padding:"2px 8px", borderRadius:6, background:isLight?"rgba(4,120,87,0.12)":"rgba(16,185,129,0.20)", color:isLight?"#047857":"#10b981", fontWeight:700 }}>✓ Done</span>}
                            </div>
                            <div style={{ height:6, borderRadius:999, background:isLight?"rgba(90,60,30,0.10)":"rgba(255,255,255,0.08)", overflow:"hidden", marginBottom:6 }}>
                              <div style={{ width:`${pct}%`, height:"100%", borderRadius:999, background:q.claimed?"#10b981":done?"#f59e0b":"linear-gradient(90deg,#8b5cf6,#3dd9ff)", transition:"width 0.5s ease-out" }} />
                            </div>
                            <div style={{ fontSize:12, color:t.muted, fontWeight:600 }}>{q.current} / {q.target}</div>
                          </div>
                          <div style={{ flexShrink:0 }}>
                            {q.claimed?(
                              <div style={{ padding:"8px 14px", borderRadius:10, background:isLight?"rgba(4,120,87,0.08)":"rgba(16,185,129,0.10)", color:isLight?"#047857":"#10b981", fontWeight:700, fontSize:13 }}>Claimed ✓</div>
                            ):done?(
                              <button onClick={()=>claimQuestReward(q.id)} style={{ background:"linear-gradient(135deg,#f59e0b,#fbbf24)", color:"#000", border:"none", borderRadius:10, padding:"9px 16px", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:"0 4px 14px rgba(245,158,11,0.45)", transition:"transform 0.2s" }}
                                onMouseOver={e=>e.currentTarget.style.transform="scale(1.05)"}
                                onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}
                              >🎁 Claim {q.reward} QP</button>
                            ):(
                              <div style={{ padding:"8px 14px", borderRadius:10, background:isLight?"rgba(180,83,9,0.08)":"rgba(245,158,11,0.08)", border:isLight?"1px solid rgba(180,83,9,0.20)":"1px solid rgba(245,158,11,0.20)", color:isLight?"#b45309":"#f59e0b", fontWeight:700, fontSize:13 }}>+{q.reward} QP</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Games */}
                <section style={{ background:t.panelBg, border:`1px solid ${t.panelBorder}`, borderRadius:24, padding:"24px 26px", boxShadow:t.panelShadow, backdropFilter:"blur(12px)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:isLight?"rgba(109,59,232,0.10)":"rgba(139,92,246,0.15)", border:isLight?"1px solid rgba(109,59,232,0.25)":"1px solid rgba(139,92,246,0.4)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🕹️</div>
                    <div>
                      <div style={{ fontSize:11, color:t.accent, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em" }}>Play Now</div>
                      <h2 style={{ margin:"3px 0 0", fontSize:20, fontWeight:800, color:t.text }}>Your Games</h2>
                    </div>
                    <Link href="/games" style={{ marginLeft:"auto", padding:"6px 14px", borderRadius:10, fontSize:12, fontWeight:700, background:isLight?"rgba(109,59,232,0.08)":"rgba(139,92,246,0.12)", border:isLight?"1px solid rgba(109,59,232,0.22)":"1px solid rgba(139,92,246,0.3)", color:t.accent, textDecoration:"none" }}>See All →</Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap:14 }}>
                    {featuredGames.map((game,i)=>{
                      const colors=["#8b5cf6","#3dd9ff","#10b981","#f59e0b"];
                      const c=colors[i%4];
                      return (
                        <Link key={game.title} href={game.href} className="game-card-db" style={{
                          position:"relative", borderRadius:18, overflow:"hidden",
                          padding:"18px 16px", textDecoration:"none",
                          background:isLight?`linear-gradient(145deg,${c}12,rgba(255,253,249,0.98))`:`linear-gradient(145deg,${c}18,rgba(5,8,22,0.9))`,
                          border:`1px solid ${c}${isLight?"22":"25"}`,
                          display:"block", transition:"all 0.3s cubic-bezier(0.34,1.2,0.64,1)",
                          boxShadow:isLight?`0 4px 14px rgba(90,60,30,0.07)`:"0 6px 20px rgba(0,0,0,0.3)",
                        }}>
                          {game.image&&<img src={game.image} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", opacity:isLight?0.10:0.18, zIndex:0 }} />}
                          <div style={{ position:"relative", zIndex:1 }}>
                            <div style={{ fontSize:11, color:c, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>{game.genre}</div>
                            <div style={{ fontSize:16, fontWeight:800, color:t.text, marginBottom:12, lineHeight:1.2 }}>{game.title}</div>
                            <div style={{ height:5, borderRadius:999, background:isLight?"rgba(90,60,30,0.10)":"rgba(255,255,255,0.08)", overflow:"hidden", marginBottom:6 }}>
                              <div style={{ width:`${Math.min(100,game.progress||0)}%`, height:"100%", background:`linear-gradient(90deg,${c},${c}88)`, borderRadius:999 }} />
                            </div>
                            <div style={{ fontSize:11, color:t.muted, fontWeight:600 }}>{game.playtime?`${Math.floor(game.playtime)}s played`:"Not played yet"}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* RIGHT SIDEBAR */}
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                {/* Quick Nav */}
                <aside style={{ background:t.panelBg, border:`1px solid ${t.panelBorder}`, borderRadius:24, padding:"22px", boxShadow:t.panelShadow, backdropFilter:"blur(12px)" }}>
                  <div style={{ fontSize:11, color:isLight?"#0369a1":"var(--cyan)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6 }}>Navigation</div>
                  <h2 style={{ margin:"0 0 18px", fontSize:18, fontWeight:800, color:t.text }}>Quick Access</h2>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {quickLinks.map(link=>(
                      <Link key={link.label} href={link.href} className="nav-link-db" style={{
                        display:"flex", alignItems:"center", justifyContent:"space-between",
                        padding:"13px 15px", borderRadius:14,
                        border:`1px solid ${t.panelBorder}`, background:t.navLink,
                        fontWeight:700, fontSize:14, textDecoration:"none", color:t.text, transition:"all 0.2s",
                      }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ width:32, height:32, borderRadius:8, background:`${link.color}${isLight?"12":"18"}`, border:`1px solid ${link.color}${isLight?"28":"30"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>{link.icon}</span>
                          {link.label}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          {link.label==="Messages"&&unreadCount>0&&<span style={{ background:"#ef4444", color:"#fff", borderRadius:20, padding:"1px 7px", fontSize:11, fontWeight:800 }}>{unreadCount}</span>}
                          <span style={{ color:t.muted, fontSize:16 }}>›</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </aside>

                {/* Account Card */}
                <div style={{ background:t.panelBg, border:isLight?"1px solid rgba(3,105,161,0.18)":"1px solid rgba(61,217,255,0.15)", borderRadius:24, padding:"20px 22px", boxShadow:t.panelShadow, backdropFilter:"blur(12px)" }}>
                  <div style={{ fontSize:11, color:t.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14 }}>Account</div>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                    <div style={{ width:44, height:44, borderRadius:"50%", background:avatarUrl?`url(${avatarUrl}) center/cover`:"linear-gradient(135deg,#8b5cf6,#3dd9ff)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:"#fff", boxShadow:"0 0 0 2px rgba(139,92,246,0.35)" }}>
                      {!avatarUrl&&(profile.name?.[0]?.toUpperCase()||"P")}
                    </div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:15, color:t.text }}>{profile.name}</div>
                      <div style={{ fontSize:12, color:t.muted, marginTop:2 }}>{profile.email}</div>
                    </div>
                  </div>
                  <div style={{ padding:"10px 14px", borderRadius:12, background:isLight?"rgba(3,105,161,0.06)":"rgba(61,217,255,0.06)", border:isLight?"1px solid rgba(3,105,161,0.15)":"1px solid rgba(61,217,255,0.15)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:12, color:t.muted, fontWeight:600 }}>Role</span>
                    <span style={{ fontSize:12, fontWeight:700, color:isLight?"#0369a1":"var(--cyan)", textTransform:"capitalize" }}>{profile.role||"Player"}</span>
                  </div>
                </div>

                {/* Rank Card */}
                <div style={{
                  background:isLight?`linear-gradient(145deg,${currentRank.color}10,rgba(255,253,249,0.97))`:`linear-gradient(145deg,${currentRank.color}12,rgba(5,8,22,0.95))`,
                  border:`1px solid ${currentRank.color}${isLight?"22":"25"}`,
                  borderRadius:24, padding:"20px 22px", cursor:"pointer",
                  boxShadow:isLight?`0 4px 16px rgba(90,60,30,0.08)`:"0 8px 30px rgba(0,0,0,0.3)",
                  transition:"transform 0.2s, box-shadow 0.2s",
                }}
                  onClick={()=>setIsRankModalOpen(true)}
                  onMouseOver={e=>{e.currentTarget.style.transform="translateY(-3px)";}}
                  onMouseOut={e=>{e.currentTarget.style.transform="translateY(0)";}}
                >
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <div style={{ fontSize:11, color:t.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em" }}>Current Rank</div>
                    <span style={{ fontSize:10, padding:"2px 8px", borderRadius:6, border:`1px solid ${currentRank.color}`, color:currentRank.color, fontWeight:700 }}>VIEW ALL</span>
                  </div>
                  <div style={{ fontSize:26, fontWeight:900, backgroundImage:currentRank.gradient, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:14, letterSpacing:"-0.04em" }}>🏆 {currentRank.name}</div>
                  <div style={{ height:7, borderRadius:999, background:isLight?"rgba(90,60,30,0.10)":"rgba(255,255,255,0.08)", overflow:"hidden", marginBottom:8 }}>
                    <div style={{ width:`${Math.min(100,Math.max(0,expPercentage))}%`, height:"100%", background:currentRank.gradient, borderRadius:999, transition:"width 0.6s ease" }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:t.muted, fontWeight:600 }}>
                    <span>{expText}</span>
                    <span>{nextRank?`Next: ${nextRank.name}`:"👑 Max"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* RANK MODAL */}
        {isRankModalOpen&&(
          <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
            <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)" }} onClick={()=>setIsRankModalOpen(false)} />
            <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:480, background:isLight?"rgba(255,253,249,0.98)":"rgba(8,12,24,0.98)", border:`1px solid ${currentRank.color}50`, borderRadius:28, padding:"28px 26px", boxShadow:`0 40px 80px rgba(0,0,0,0.5), 0 0 40px ${currentRank.color}30`, animation:"slideInUp 0.3s ease" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
                <div>
                  <div style={{ fontSize:11, color:t.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Ranking System</div>
                  <h2 style={{ margin:0, fontSize:22, fontWeight:900, color:t.text }}>All Ranks 🏆</h2>
                </div>
                <button onClick={()=>setIsRankModalOpen(false)} style={{ background:isLight?"rgba(90,60,30,0.08)":"rgba(255,255,255,0.06)", border:`1px solid ${isLight?"rgba(90,60,30,0.15)":"rgba(255,255,255,0.1)"}`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, cursor:"pointer", color:t.muted }}>×</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:"60vh", overflowY:"auto" }}>
                {[...RANKS].sort((a,b)=>b.minPoints-a.minPoints).map(r=>(
                  <div key={r.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", borderRadius:14, background:r.name===currentRank.name?`${r.color}${isLight?"0e":"12"}`:isLight?"rgba(90,60,30,0.04)":"rgba(255,255,255,0.03)", border:r.name===currentRank.name?`1px solid ${r.color}50`:`1px solid ${t.panelBorder}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:r.color, boxShadow:`0 0 8px ${r.color}` }} />
                      <strong style={{ backgroundImage:r.gradient, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", fontSize:17, fontWeight:900 }}>{r.name}</strong>
                      {r.name===currentRank.name&&<span style={{ fontSize:10, padding:"2px 8px", borderRadius:6, background:`${r.color}20`, color:r.color, fontWeight:700 }}>YOU</span>}
                    </div>
                    <span style={{ color:t.muted, fontSize:14, fontWeight:600 }}>{r.minPoints} QP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    </AuthGuard>
  );
}
