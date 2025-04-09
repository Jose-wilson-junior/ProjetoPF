// Funções puras
const TILE_SIZE = 51;
const GRID_WIDTH = 10;
const GRID_HEIGHT = 10;
const NUM_BOMBS = 10;
const MAX_FLAGS = 10;

const COLORS = [
  "#ffffff", // 0
  "#3498db", // 1
  "#2ecc71", // 2
  "#f1c40f", // 3
  "#e67e22", // 4
  "#e74c3c", // 5
  "#9b59b6", // 6
  "#1abc9c", // 7
  "#34495e"  // 8
];

const createTile = (i, j) => ({
  i,
  j,
  isBomb: false,
  isOpen: false,
  bombsAround: 0,
  marked: false,
});

const generateGrid = (width, height) =>
  Array.from({ length: width * height }, (_, index) => {
    const i = Math.floor(index / height);
    const j = index % height;
    return createTile(i, j);
  });

const placeBombs = (tiles, numBombs) => {
  const indices = [...Array(tiles.length).keys()];
  const bombIndices = shuffle(indices).slice(0, numBombs);
  return tiles.map((tile, index) => ({ ...tile, isBomb: bombIndices.includes(index) }));
};

const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const getNeighbors = (i, j) => {
  const deltas = [-1, 0, 1];
  return deltas.flatMap(di =>
    deltas.map(dj => [i + di, j + dj])
  ).filter(([ni, nj]) =>
    (ni !== i || nj !== j) &&
    ni >= 0 && ni < GRID_WIDTH && nj >= 0 && nj < GRID_HEIGHT
  );
};

const getTile = (tiles, i, j) =>
  tiles.find(t => t.i === i && t.j === j);

const calculateNBombs = (tiles) =>
  tiles.map(tile => {
    const bombsAround = getNeighbors(tile.i, tile.j).reduce((acc, [ni, nj]) => {
      const neighbor = getTile(tiles, ni, nj);
      return acc + (neighbor?.isBomb ? 1 : 0);
    }, 0);
    return { ...tile, bombsAround };
  });

const openTileRecursive = (tiles, i, j, visited = new Set(), currentScore = 0) => {
  const key = `${i},${j}`;
  if (visited.has(key)) return { tiles, score: currentScore };
  visited.add(key);

  const tile = getTile(tiles, i, j);
  if (!tile || tile.isOpen || tile.isBomb || tile.marked) return { tiles, score: currentScore };

  let newTiles = tiles.map(t =>
    t.i === i && t.j === j ? { ...t, isOpen: true } : t
  );
  let newScore = currentScore + 1;

  if (tile.bombsAround === 0) {
    const neighbors = getNeighbors(i, j);
    for (const [ni, nj] of neighbors) {
      const result = openTileRecursive(newTiles, ni, nj, visited, newScore);
      newTiles = result.tiles;
      newScore = result.score;
    }
  }

  return { tiles: newTiles, score: newScore };
};

const revealAllBombs = (tiles) =>
  tiles.map(tile => tile.isBomb ? { ...tile, isOpen: true } : tile);

// DOM e controle
const canvas = document.getElementById('jogo');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameover');
const startButton = document.getElementById('start');
const tutorialBtn = document.getElementById('tutorialBtn');
const tutorialBox = document.getElementById('tutorial');
const closeTutorial = document.getElementById('closeTutorial');

// Melhorando visual dos botões
startButton.classList.add('styled-button');
tutorialBtn.classList.add('styled-button');

const flagElement = document.createElement('span');
flagElement.id = 'flags';
flagElement.textContent = '🚩: 0';
document.querySelector('.menu').appendChild(flagElement);

let state = {
  tiles: generateGrid(GRID_WIDTH, GRID_HEIGHT),
  score: 0,
  gameOver: true,
  flags: 0,
};

const initializeGame = () => {
  const baseTiles = generateGrid(GRID_WIDTH, GRID_HEIGHT);
  const withBombs = placeBombs(baseTiles, NUM_BOMBS);
  const finalTiles = calculateNBombs(withBombs);
  return {
    tiles: finalTiles,
    score: 0,
    gameOver: false,
    flags: 0,
  };
};

const draw = ({ tiles, score, flags }) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  tiles.forEach(drawTile);
  scoreElement.textContent = `Score: ${score}`;
  flagElement.textContent = `🚩: ${flags}`;
};

const drawTile = (tile) => {
  const x = tile.i * TILE_SIZE + 1;
  const y = tile.j * TILE_SIZE + 1;
  ctx.fillStyle = tile.isOpen
    ? (tile.isBomb ? "#ff7675" : "#dfe6e9")
    : "#74b9ff";
  ctx.fillRect(x, y, 50, 50);
  ctx.strokeStyle = "#2d3436";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, 50, 50);

  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (tile.isOpen) {
    if (tile.isBomb) {
      ctx.fillText("💣", x + 25, y + 25);
    } else if (tile.bombsAround > 0) {
      ctx.fillStyle = COLORS[tile.bombsAround];
      ctx.fillText(tile.bombsAround, x + 25, y + 25);
    }
  } else if (tile.marked) {
    ctx.fillText("🚩", x + 25, y + 25);
  }
};

canvas.addEventListener("click", (e) => {
  if (state.gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const i = Math.floor(((e.clientX - rect.left) / canvas.width) * GRID_WIDTH);
  const j = Math.floor(((e.clientY - rect.top) / canvas.height) * GRID_HEIGHT);
  const clickedTile = getTile(state.tiles, i, j);
  if (!clickedTile || clickedTile.marked) return;

  if (clickedTile.isBomb) {
    const updatedTiles = revealAllBombs(state.tiles);
    state = { ...state, tiles: updatedTiles, gameOver: true };
    gameOverElement.style.display = 'block';
    startButton.disabled = false;
  } else {
    const { tiles: newTiles, score: newScore } = openTileRecursive(state.tiles, i, j);
    state = { ...state, tiles: newTiles, score: newScore };
  }
  draw(state);
});

canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (state.gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const i = Math.floor(((e.clientX - rect.left) / canvas.width) * GRID_WIDTH);
  const j = Math.floor(((e.clientY - rect.top) / canvas.height) * GRID_HEIGHT);
  const tile = getTile(state.tiles, i, j);
  if (!tile || tile.isOpen) return;

  let flags = state.flags;
  const marked = !tile.marked;
  if (marked && flags >= MAX_FLAGS) return;

  flags = marked ? flags + 1 : flags - 1;
  const newTiles = state.tiles.map(t =>
    t.i === i && t.j === j ? { ...t, marked } : t
  );
  state = { ...state, tiles: newTiles, flags };
  draw(state);
});

startButton.addEventListener("click", () => {
    if (startButton.disabled) return;
    startButton.disabled = true;
    state = initializeGame();
    gameOverElement.style.display = 'none';
    draw(state);
  });
  

tutorialBtn.addEventListener("click", () => {
  tutorialBox.style.display = 'flex';
});

closeTutorial.addEventListener("click", () => {
  tutorialBox.style.display = 'none';
});

draw(state);
