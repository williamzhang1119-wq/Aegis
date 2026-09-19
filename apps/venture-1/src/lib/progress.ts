export type ProgressState = {
  xp: number;
  streak: number;
  lastActiveDay: string; // YYYY-MM-DD
  questionsAsked: number;
  quizzesCompleted: number;
  adventuresCompleted: number;
  dailyChallengeDone: string | null; // day id when completed
  topicsTouched: string[];
  badges: string[];
};

const KEY = "venture1-progress-v2";

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function defaultProgress(): ProgressState {
  return {
    xp: 0,
    streak: 0,
    lastActiveDay: "",
    questionsAsked: 0,
    quizzesCompleted: 0,
    adventuresCompleted: 0,
    dailyChallengeDone: null,
    topicsTouched: [],
    badges: [],
  };
}

export function loadProgress(): ProgressState {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    return { ...defaultProgress(), ...(JSON.parse(raw) as ProgressState) };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(state: ProgressState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function touchStreak(state: ProgressState, now = new Date()): ProgressState {
  const today = todayKey(now);
  if (state.lastActiveDay === today) return state;
  const yesterday = todayKey(new Date(now.getTime() - 86400000));
  const streak = state.lastActiveDay === yesterday ? state.streak + 1 : 1;
  return { ...state, streak, lastActiveDay: today };
}

export function levelFromXp(xp: number) {
  // Soft curve: level 1 at 0, then ~50, 120, 210, ...
  let level = 1;
  let need = 50;
  let remaining = xp;
  while (remaining >= need) {
    remaining -= need;
    level += 1;
    need = Math.floor(need * 1.35);
  }
  return { level, intoLevel: remaining, needForNext: need, pct: Math.min(100, (remaining / need) * 100) };
}

export function addTopic(state: ProgressState, topic: string): ProgressState {
  const t = topic.trim().toLowerCase();
  if (!t) return state;
  if (state.topicsTouched.includes(t)) return state;
  return { ...state, topicsTouched: [...state.topicsTouched.slice(-19), t] };
}
