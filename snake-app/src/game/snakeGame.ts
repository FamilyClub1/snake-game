export type Point = { x: number; y: number };

export type Food = Point & {
    kind: "normal" | "gold";
    value: number;
};

export type GameState = {
    snake: Point[];
    food: Food;
    direction: Point;
    gameOver: boolean;
    score: number;
    wrap?: boolean;
    obstacles: Point[];
};

const GRID = 20;
const DEFAULT_OBSTACLE_COUNT = 12;
const GOLD_FOOD_CHANCE = 0.18;

export function createGame(withObstacles = false): GameState {
    const initialSnake = [{ x: 10, y: 10 }];
    const obstacles = withObstacles ? generateObstacles(initialSnake, DEFAULT_OBSTACLE_COUNT) : [];
    const food = randomFood(initialSnake, obstacles);

    return {
        snake: initialSnake,
        food,
        direction: { x: 1, y: 0 },
        gameOver: false,
        score: 0,
        wrap: false,
        obstacles,
    };
}

function samePoint(a: Point, b: Point): boolean {
    return a.x === b.x && a.y === b.y;
}

function randomFreeCell(occupied: Point[]): Point {
    let p: Point;

    do {
        p = {
            x: Math.floor(Math.random() * GRID),
            y: Math.floor(Math.random() * GRID),
        };
    } while (occupied.some((cell) => samePoint(cell, p)));

    return p;
}

function randomFood(snake: Point[], obstacles: Point[]): Food {
    const point = randomFreeCell([...snake, ...obstacles]);
    const isGold = Math.random() < GOLD_FOOD_CHANCE;

    return {
        ...point,
        kind: isGold ? "gold" : "normal",
        value: isGold ? 3 : 1,
    };
}

function generateObstacles(snake: Point[], count: number): Point[] {
    const blocked: Point[] = [...snake];
    const obstacles: Point[] = [];

    const safeZone: Point[] = [
        { x: 10, y: 10 },
        { x: 11, y: 10 },
        { x: 9, y: 10 },
        { x: 10, y: 9 },
        { x: 10, y: 11 },
    ];

    blocked.push(...safeZone);

    for (let i = 0; i < count; i++) {
        const cell = randomFreeCell([...blocked, ...obstacles]);
        obstacles.push(cell);
    }

    return obstacles;
}

export function step(state: GameState): GameState {
    if (state.gameOver) return state;

    let head = {
        x: state.snake[0].x + state.direction.x,
        y: state.snake[0].y + state.direction.y,
    };

    if (state.wrap) {
        if (head.x < 0) head.x = GRID - 1;
        if (head.x >= GRID) head.x = 0;
        if (head.y < 0) head.y = GRID - 1;
        if (head.y >= GRID) head.y = 0;
    } else {
        if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) {
            return { ...state, gameOver: true };
        }
    }

    if (state.snake.some((s) => samePoint(s, head))) {
        return { ...state, gameOver: true };
    }

    if (state.obstacles.some((o) => samePoint(o, head))) {
        return { ...state, gameOver: true };
    }

    const newSnake = [head, ...state.snake];

    if (samePoint(head, state.food)) {
        return {
            ...state,
            snake: newSnake,
            food: randomFood(newSnake, state.obstacles),
            score: state.score + state.food.value,
        };
    }

    newSnake.pop();

    return {
        ...state,
        snake: newSnake,
    };
}