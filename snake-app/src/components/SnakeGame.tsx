import { useEffect, useMemo, useRef, useState } from "react";
import { createGame, step } from "../game/snakeGame";
import {
    addLeaderboardEntry,
    clearLeaderboard,
    loadLeaderboard,
    type ScoreEntry,
} from "../game/leaderboard";
import {
    playEatSound,
    playGameOverSound,
    playGoldSound,
    playPauseSound,
    playResumeSound,
    unlockSound,
} from "../game/sound";
import "../styles/snake.css";

const CELL = 20;
const STORAGE_KEY = "snake-high-score";

type Direction = { x: number; y: number };
type Difficulty = "easy" | "normal" | "hard";
type Theme = "classic" | "dark" | "ice" | "fire";

const difficultyConfig: Record<
    Difficulty,
    { label: string; baseSpeed: number; minSpeed: number; speedGain: number }
> = {
    easy: { label: "Easy", baseSpeed: 190, minSpeed: 120, speedGain: 4 },
    normal: { label: "Normal", baseSpeed: 150, minSpeed: 80, speedGain: 8 },
    hard: { label: "Hard", baseSpeed: 110, minSpeed: 55, speedGain: 10 },
};

export default function SnakeGame() {
    const [obstaclesEnabled, setObstaclesEnabled] = useState(false);
    const [game, setGame] = useState(() => createGame(false));
    const [paused, setPaused] = useState(true);
    const [started, setStarted] = useState(false);
    const [difficulty, setDifficulty] = useState<Difficulty>("normal");
    const [wrapMode, setWrapMode] = useState(false);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [theme, setTheme] = useState<Theme>("classic");
    const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>(() =>
        loadLeaderboard()
    );
    const [highScore, setHighScore] = useState<number>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? Number(saved) : 0;
    });

    const level = Math.floor(game.score / 5) + 1;

    const prevLevelRef = useRef(level);
    const prevScoreRef = useRef(game.score);
    const prevFoodKindRef = useRef(game.food.kind);
    const prevGameOverRef = useRef(game.gameOver);

    const speed = useMemo(() => {
        const config = difficultyConfig[difficulty];
        const next =
            config.baseSpeed - game.score * config.speedGain - (level - 1) * 10;

        return Math.max(config.minSpeed, next);
    }, [difficulty, game.score, level]);

    useEffect(() => {
        if (!started || paused || game.gameOver) return;

        const interval = window.setInterval(() => {
            setGame((g) => step({ ...g, wrap: wrapMode }));
        }, speed);

        return () => window.clearInterval(interval);
    }, [started, paused, game.gameOver, speed, wrapMode]);

    const changeDirection = (nextDir: Direction) => {
        setGame((g) => {
            if (nextDir.x === 1 && g.direction.x === -1) return g;
            if (nextDir.x === -1 && g.direction.x === 1) return g;
            if (nextDir.y === 1 && g.direction.y === -1) return g;
            if (nextDir.y === -1 && g.direction.y === 1) return g;

            return { ...g, direction: nextDir };
        });
    };

    const restartGame = (nextObstaclesEnabled = obstaclesEnabled) => {
        setGame(createGame(nextObstaclesEnabled));
        setPaused(true);
        setStarted(false);
        setShowLevelUp(false);
        prevLevelRef.current = 1;
        prevScoreRef.current = 0;
        prevFoodKindRef.current = "normal";
        prevGameOverRef.current = false;
    };

    const startGame = () => {
        unlockSound();
        setStarted(true);
        setPaused(false);
    };

    useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if (e.key === " ") {
                e.preventDefault();

                if (!started) {
                    startGame();
                    return;
                }

                if (!game.gameOver) {
                    setPaused((p) => {
                        const next = !p;
                        if (soundEnabled) {
                            next ? playPauseSound() : playResumeSound();
                        }
                        return next;
                    });
                }
                return;
            }

            switch (e.key) {
                case "ArrowUp":
                case "w":
                case "W":
                    if (!started) startGame();
                    changeDirection({ x: 0, y: -1 });
                    return;

                case "ArrowDown":
                case "s":
                case "S":
                    if (!started) startGame();
                    changeDirection({ x: 0, y: 1 });
                    return;

                case "ArrowLeft":
                case "a":
                case "A":
                    if (!started) startGame();
                    changeDirection({ x: -1, y: 0 });
                    return;

                case "ArrowRight":
                case "d":
                case "D":
                    if (!started) startGame();
                    changeDirection({ x: 1, y: 0 });
                    return;

                case "r":
                case "R":
                    restartGame();
                    return;

                default:
                    return;
            }
        };

        window.addEventListener("keydown", handle);
        return () => window.removeEventListener("keydown", handle);
    }, [started, game.gameOver, obstaclesEnabled, soundEnabled]);

    useEffect(() => {
        setHighScore((prev) => {
            if (game.score > prev) {
                localStorage.setItem(STORAGE_KEY, String(game.score));
                return game.score;
            }
            return prev;
        });
    }, [game.score]);

    useEffect(() => {
        if (level > prevLevelRef.current) {
            setShowLevelUp(true);

            const timeout = window.setTimeout(() => {
                setShowLevelUp(false);
            }, 1200);

            prevLevelRef.current = level;
            return () => window.clearTimeout(timeout);
        }

        prevLevelRef.current = level;
    }, [level]);

    useEffect(() => {
        if (soundEnabled && game.score > prevScoreRef.current) {
            if (prevFoodKindRef.current === "gold") {
                playGoldSound();
            } else {
                playEatSound();
            }
        }

        prevScoreRef.current = game.score;
        prevFoodKindRef.current = game.food.kind;
    }, [game.score, game.food.kind, soundEnabled]);

    useEffect(() => {
        if (soundEnabled && game.gameOver && !prevGameOverRef.current) {
            playGameOverSound();
        }

        if (game.gameOver && !prevGameOverRef.current && game.score > 0) {
            const updated = addLeaderboardEntry({
                score: game.score,
                level,
                date: new Date().toLocaleDateString(),
            });
            setLeaderboard(updated);
        }

        prevGameOverRef.current = game.gameOver;
    }, [game.gameOver, game.score, level, soundEnabled]);

    const difficultyLabel = difficultyConfig[difficulty].label;

    return (
        <div className={`snake-wrap theme-${theme}`}>
            <h1 className="snake-title">Snake</h1>
            <h2>Score: {game.score}</h2>

            <p className="snake-meta">
                Level: <strong>{level}</strong>
            </p>

            <p className="snake-subtitle">High score: {highScore}</p>

            <p className="snake-meta">
                Difficulty: <strong>{difficultyLabel}</strong>
            </p>

            <p className="snake-meta">
                Wall mode: <strong>{wrapMode ? "Wrap" : "Solid"}</strong>
            </p>

            <p className="snake-meta">
                Obstacles: <strong>{obstaclesEnabled ? "ON" : "OFF"}</strong>
            </p>

            <p className="snake-meta">
                Sound: <strong>{soundEnabled ? "ON" : "OFF"}</strong>
            </p>

            <p className="snake-meta">
                Theme: <strong>{theme}</strong>
            </p>

            <div className="difficulty-switcher">
                <button
                    className={difficulty === "easy" ? "active" : ""}
                    onClick={() => {
                        setDifficulty("easy");
                        restartGame();
                    }}
                >
                    Easy
                </button>
                <button
                    className={difficulty === "normal" ? "active" : ""}
                    onClick={() => {
                        setDifficulty("normal");
                        restartGame();
                    }}
                >
                    Normal
                </button>
                <button
                    className={difficulty === "hard" ? "active" : ""}
                    onClick={() => {
                        setDifficulty("hard");
                        restartGame();
                    }}
                >
                    Hard
                </button>
            </div>

            <div className="difficulty-switcher">
                <button
                    className={theme === "classic" ? "active" : ""}
                    onClick={() => setTheme("classic")}
                >
                    Classic
                </button>
                <button
                    className={theme === "dark" ? "active" : ""}
                    onClick={() => setTheme("dark")}
                >
                    Dark
                </button>
                <button
                    className={theme === "ice" ? "active" : ""}
                    onClick={() => setTheme("ice")}
                >
                    Ice
                </button>
                <button
                    className={theme === "fire" ? "active" : ""}
                    onClick={() => setTheme("fire")}
                >
                    Fire
                </button>
            </div>

            <div className="snake-actions">
                <button onClick={() => setWrapMode((w) => !w)}>
                    {wrapMode ? "Wrap: ON 🌀" : "Wrap: OFF ❌"}
                </button>

                <button
                    onClick={() => {
                        const next = !obstaclesEnabled;
                        setObstaclesEnabled(next);
                        restartGame(next);
                    }}
                >
                    {obstaclesEnabled ? "Obstacles: ON 🧱" : "Obstacles: OFF"}
                </button>

                <button
                    onClick={() => {
                        unlockSound();
                        setSoundEnabled((s) => !s);
                    }}
                >
                    {soundEnabled ? "Sound: ON 🔊" : "Sound: OFF"}
                </button>

                {!started ? (
                    <button
                        onClick={() => {
                            unlockSound();
                            startGame();
                        }}
                    >
                        Start
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            setPaused((p) => {
                                const next = !p;
                                if (soundEnabled) {
                                    next ? playPauseSound() : playResumeSound();
                                }
                                return next;
                            });
                        }}
                    >
                        {paused ? "Resume" : "Pause"}
                    </button>
                )}

                <button onClick={() => restartGame()}>Restart</button>
            </div>

            <div
                className="board"
                style={{
                    width: 400,
                    height: 400,
                    margin: "16px auto 0",
                }}
            >
                {game.obstacles.map((o, i) => (
                    <div
                        key={`obstacle-${i}`}
                        className="obstacle"
                        style={{
                            left: o.x * CELL,
                            top: o.y * CELL,
                        }}
                    />
                ))}

                {game.snake.map((s, i) => (
                    <div
                        key={i}
                        className={`snake ${i === 0 ? "snake-head" : ""}`}
                        style={{
                            left: s.x * CELL,
                            top: s.y * CELL,
                        }}
                    />
                ))}

                <div
                    className={`food ${game.food.kind === "gold" ? "food-gold" : ""}`}
                    style={{
                        left: game.food.x * CELL,
                        top: game.food.y * CELL,
                    }}
                />

                {showLevelUp && !game.gameOver && (
                    <div className="level-up-banner">LEVEL UP!</div>
                )}

                {!started && !game.gameOver && (
                    <div className="overlay">
                        <div>
                            <div className="overlay-title">Ready?</div>
                            <div className="overlay-subtitle">
                                {difficultyLabel} · {wrapMode ? "Wrap walls" : "Solid walls"} ·{" "}
                                {obstaclesEnabled ? "Obstacles ON" : "Obstacles OFF"}
                            </div>
                            <button className="overlay-button" onClick={startGame}>
                                Start
                            </button>
                        </div>
                    </div>
                )}

                {paused && started && !game.gameOver && (
                    <div className="overlay">
                        <div>
                            <div className="overlay-title">Paused</div>
                            <button className="overlay-button" onClick={() => setPaused(false)}>
                                Resume
                            </button>
                        </div>
                    </div>
                )}

                {game.gameOver && (
                    <div className="overlay">
                        <div>
                            <div className="overlay-title">Game Over</div>
                            <div className="overlay-subtitle">
                                Score: {game.score} · Level: {level}
                            </div>
                            <button className="overlay-button" onClick={() => restartGame()}>
                                Restart
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="leaderboard">
                <div className="leaderboard-header">
                    <h3>Top Scores</h3>
                    <button
                        onClick={() => {
                            clearLeaderboard();
                            setLeaderboard([]);
                        }}
                    >
                        Clear
                    </button>
                </div>

                {leaderboard.length === 0 ? (
                    <p className="snake-help">Поки що рекордів немає</p>
                ) : (
                    <ol className="leaderboard-list">
                        {leaderboard.map((entry, index) => (
                            <li key={`${entry.score}-${entry.level}-${entry.date}-${index}`}>
                                <span>#{index + 1}</span>
                                <span>{entry.score} pts</span>
                                <span>Lvl {entry.level}</span>
                                <span>{entry.date}</span>
                            </li>
                        ))}
                    </ol>
                )}
            </div>

            <p className="snake-help">
                Красная еда = +1 · Золотая еда = +3
            </p>

            <div className="mobile-controls">
                <button onClick={() => changeDirection({ x: 0, y: -1 })}>↑</button>
                <div className="mobile-controls-row">
                    <button onClick={() => changeDirection({ x: -1, y: 0 })}>←</button>
                    <button onClick={() => changeDirection({ x: 0, y: 1 })}>↓</button>
                    <button onClick={() => changeDirection({ x: 1, y: 0 })}>→</button>
                </div>
            </div>

            <p className="snake-help">
                Управление: стрелки / WASD · Space: pause · R: restart
            </p>
        </div>
    );
}