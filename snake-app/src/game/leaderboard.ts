export type ScoreEntry = {
    score: number;
    level: number;
    date: string;
};

const LEADERBOARD_KEY = "snake-leaderboard";

export function loadLeaderboard(): ScoreEntry[] {
    if (typeof window === "undefined") return [];

    try {
        const raw = localStorage.getItem(LEADERBOARD_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw) as ScoreEntry[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveLeaderboard(entries: ScoreEntry[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

export function addLeaderboardEntry(entry: ScoreEntry): ScoreEntry[] {
    const current = loadLeaderboard();

    const updated = [...current, entry]
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.level - a.level;
        })
        .slice(0, 5);

    saveLeaderboard(updated);
    return updated;
}

export function clearLeaderboard() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(LEADERBOARD_KEY);
}