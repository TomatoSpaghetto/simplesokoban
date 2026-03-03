const GRID_SIZE = 16;
const MAX_COL = 26;
const MAX_ROW = 26;

const images = {
    floor: new Image(),
    icefloor: new Image(),
    wall: new Image(),
    icewall: new Image(),
    box: new Image(),
    switch: new Image(),
    lookdown: new Image(),
    lookleft: new Image(),
    lookright: new Image(),
    lookup: new Image(),
    walkdown1: new Image(),
    walkdown2: new Image(),
    walkleft1: new Image(),
    walkleft2: new Image(),
    walkright1: new Image(),
    walkright2: new Image(),
    walkup1: new Image(),
    walkup2: new Image(),
    teleporter: new Image(),
    teleporterPaused: new Image(),
    duplicator: new Image(),
    duplicatorPaused: new Image(),
    teleporterFrames: [new Image(), new Image(), new Image(), new Image(), new Image()],
    duplicatorFrames: [new Image(), new Image(), new Image(), new Image(), new Image()],
    waterFrames: [new Image(), new Image(), new Image(), new Image()],
    deepwaterFrames: [new Image(), new Image(), new Image(), new Image()],
    waterboxFrames: [new Image(), new Image()],
    sandfloor: new Image(),
    sandstonewall: new Image(),
    ladderup: new Image(),
    ladderdown: new Image(),
    floorhole: new Image()
};

images.floor.src = 'floor.png';
images.icefloor.src = 'icefloor.png';
images.wall.src = 'wall.png';
images.icewall.src = 'icewall.png';
images.sandfloor.src = 'sandfloor.png';
images.sandstonewall.src = 'sandstonewall.png';
images.box.src = 'box.png';
images.switch.src = 'switch.png';
images.lookdown.src = 'lookdown.png';
images.lookleft.src = 'lookleft.png';
images.lookright.src = 'lookright.png';
images.lookup.src = 'lookup.png';
images.walkdown1.src = 'walkdown1.png';
images.walkdown2.src = 'walkdown2.png';
images.walkleft1.src = 'walkleft1.png';
images.walkleft2.src = 'walkleft2.png';
images.walkright1.src = 'walkright1.png';
images.walkright2.src = 'walkright2.png';
images.walkup1.src = 'walkup1.png';
images.walkup2.src = 'walkup2.png';
images.teleporter.src = 'teleporter.gif';
images.teleporterPaused.src = 'teleporterframe4.png';
images.duplicator.src = 'duplicator.gif';
images.duplicatorPaused.src = 'duplicatorframe4.png';
images.ladderup.src = 'ladderup.png';
images.ladderdown.src = 'ladderdown.png';
images.floorhole.src = 'floorhole.png';

for (let i = 0; i < 5; i++) {
    images.teleporterFrames[i].src = `teleporterframe${i}.png`;
    images.duplicatorFrames[i].src = `duplicatorframe${i}.png`;
}
for (let i = 0; i < 4; i++) {
    images.waterFrames[i].src = `water${i + 1}.png`;
    images.deepwaterFrames[i].src = `deepwater${i + 1}.png`;
}
for (let i = 0; i < 2; i++) {
    images.waterboxFrames[i].src = `waterbox${i + 1}.png`;
}

const levels = [];
let currentLevelIndex = 0;

let canvas, ctx;
let editorCanvas, editorCtx;
let grid = [];
let floorGrid = [];
let boxes = [];
let players = [{ x: 0, y: 0, facing: 'down', pixelX: 0, pixelY: 0, targetX: 0, targetY: 0, isMoving: false, moveProgress: 0, walkStep: 0, isSliding: false }];
let player = players[0];
let teleporters = [];
let duplicators = [];
let width = 0, height = 0;
const MOVE_SPEED = 0.15;
const BOX_MOVE_SPEED = 0.16;
let moveQueue = [];
let scale = 4;
let editorScale = 2;
let baseEditorScale = 2;
let editorPinchScale = 1;
let currentTool = 'wall';
let isEditing = false;
let isTesting = false;
let isWinning = false;
let isMobile = false;
let testLevelData = null;

function detectMobile() {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
}
detectMobile();

function initMobileControls() {
    if (!isMobile) return;
    const canvas = document.getElementById('gameCanvas');

    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeDir = null;
    let swipeInterval = null;
    const SWIPE_THRESHOLD = 30;
    const REPEAT_DELAY = 150;

    function startRepeating(dir) {
        if (swipeDir === dir) return;
        stopRepeating();
        swipeDir = dir;
        handleMobileMove(dir);
        swipeInterval = setInterval(() => handleMobileMove(dir), REPEAT_DELAY);
    }

    function stopRepeating() {
        swipeDir = null;
        if (swipeInterval) {
            clearInterval(swipeInterval);
            swipeInterval = null;
        }
    }

    canvas.addEventListener('touchstart', (e) => {
        if (isEditing) return;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        if (isEditing) return;
        e.preventDefault();
        const dx = e.touches[0].clientX - swipeStartX;
        const dy = e.touches[0].clientY - swipeStartY;
        if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
        const dir = Math.abs(dx) > Math.abs(dy)
            ? (dx > 0 ? 'right' : 'left')
            : (dy > 0 ? 'down' : 'up');
        startRepeating(dir);
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        stopRepeating();
    }, { passive: true });

    canvas.addEventListener('touchcancel', () => {
        stopRepeating();
    }, { passive: true });
}

window.addEventListener('DOMContentLoaded', initMobileControls);

const EDITOR_WIDTH = 26;
const EDITOR_HEIGHT = 26;
let currentFloor = 0;
let viewedFloor = 0;
let numFloors = 1;
let floorData = [];

let editorGrid = [];
let editorFloorGrid = [];
let editorBoxes = [];
let editorPlayer = { x: 1, y: 1 };
let editorLadders = [];
let editorFloorData = [];
let editorViewedFloor = 0;

const directions = {
    up: { dx: 0, dy: -1, look: 'lookup' },
    down: { dx: 0, dy: 1, look: 'lookdown' },
    left: { dx: -1, dy: 0, look: 'lookleft' },
    right: { dx: 1, dy: 0, look: 'lookright' }
};


function resetDpadToCenter() {
}

function calculateVisitedGrid(gridArray, w, h) {
    if (!gridArray || gridArray.length === 0) return Array.from({length: w || 1}, () => Array(h || 1).fill(false));
    const widthToUse = w || 1;
    const heightToUse = h || 1;
    const visited = Array.from({length: widthToUse}, () => Array(heightToUse).fill(false));
    const floodFromEdges = (fw, fh, isWallFn, fillFn) => {
        for (let y = 0; y < fh; y++) {
            if (!isWallFn(0, y)) fillFn(0, y);
            if (!isWallFn(fw - 1, y)) fillFn(fw - 1, y);
        }
        for (let x = 0; x < fw; x++) {
            if (!isWallFn(x, 0)) fillFn(x, 0);
            if (!isWallFn(x, fh - 1)) fillFn(x, fh - 1);
        }
    };
    const floodFillFn = (startX, startY) => {
        const stack = [[startX, startY]];
        while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            if (cx < 0 || cx >= widthToUse || cy < 0 || cy >= heightToUse ||
                !gridArray[cx] || gridArray[cx][cy] === 'wall' || gridArray[cx][cy] === 'icewall' || gridArray[cx][cy] === 'deepwater' || gridArray[cx][cy] === 'sandstonewall' || visited[cx][cy]) continue;
            visited[cx][cy] = true;
            stack.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]);
        }
    };
    floodFromEdges(widthToUse, heightToUse, (x, y) => !gridArray[x] || gridArray[x][y] === 'wall' || gridArray[x][y] === 'icewall' || gridArray[x][y] === 'deepwater' || gridArray[x][y] === 'sandstonewall', (x, y) => {
        if (!visited[x][y]) floodFillFn(x, y);
    });
    return visited;
}

function isPlayerEnclosed(gridArray, w, h, px, py) {
    if (!gridArray || gridArray.length === 0) return false;
    const widthToUse = w || 1;
    const heightToUse = h || 1;
    const visited = calculateVisitedGrid(gridArray, widthToUse, heightToUse);

    if (px < 0 || px >= widthToUse || py < 0 || py >= heightToUse || !gridArray[px]) return false;
    return !visited[px][py] && gridArray[px][py] !== 'wall' && gridArray[px][py] !== 'icewall' && gridArray[px][py] !== 'deepwater' && gridArray[px][py] !== 'sandstonewall';
}

function showLevelError(message, returnMode) {
    const overlay = document.getElementById('win-overlay');
    const msgEl = document.getElementById('win-message');
    const nextBtn = document.getElementById('next-lvl-btn');
    const replayBtn = document.getElementById('replay-lvl-btn');
    const prevBtn = document.getElementById('prev-lvl-btn');
    const menuBtn = document.getElementById('win-menu-btn');
    const editorBtn = document.getElementById('win-editor-btn');

    msgEl.innerText = message;
    nextBtn.style.display = 'none';
    replayBtn.style.display = 'none';
    prevBtn.style.display = 'none';

    menuBtn.innerText = "Return to Main Menu";
    menuBtn.style.display = 'inline-block';

    editorBtn.innerText = returnMode || "Return to Level Editor";
    editorBtn.style.display = 'inline-block';

    overlay.style.display = 'block';
}

function validateFloorData(dataArr, widthToUse, heightToUse, returnMode) {
    if (!dataArr || dataArr.length === 0) return true;

    let hasPlayer = dataArr.some(f => f.player != null);
    if (!hasPlayer) {
        showLevelError("Error: Level must have at least one player character!", returnMode);
        return false;
    }

    for (let i = 0; i < dataArr.length; i++) {
        const f = dataArr[i];

        if (f.player && !isPlayerEnclosed(f.grid, widthToUse, heightToUse, f.player.x, f.player.y)) {
            showLevelError("Error: Player must be in an enclosed space!", returnMode);
            return false;
        }

        for (let x = 0; x < widthToUse; x++) {
            if (!f.grid[x]) continue;
            for (let y = 0; y < heightToUse; y++) {
                if (f.grid[x][y] === 'floorhole') {
                    if (i === 0) {
                        showLevelError(`Error at Floor ${i + 1} (${x + 1}${String.fromCharCode(65 + y)}): A floor hole on the bottom floor is invalid.`, returnMode);
                        return false;
                    }

                    const nextFloorData = dataArr[i - 1];
                    if (!isPlayerEnclosed(nextFloorData.grid, widthToUse, heightToUse, x, y)) {
                        showLevelError(`Error at Floor ${i + 1} (${x + 1}${String.fromCharCode(65 + y)}): The hole placement leads to an unenclosed space on the floor below.`, returnMode);
                        return false;
                    }

                    const targetCell = nextFloorData.grid[x][y];
                    const isWallBelow = targetCell === 'wall' || targetCell === 'icewall' || targetCell === 'sandstonewall';
                    if (isWallBelow) {
                        showLevelError(`Error at Floor ${i + 1} (${x + 1}${String.fromCharCode(65 + y)}): The hole coordinates correspond to a wall on the floor below.`, returnMode);
                        return false;
                    }
                }
            }
        }
    }
    return true;
}

let loadedImages = 0;
const imageKeys = Object.keys(images).filter(key => !Array.isArray(images[key]));
let totalImages = 0;

function calculateTotalImages() {
    totalImages = imageKeys.length;
    [images.teleporterFrames, images.duplicatorFrames, images.waterFrames, images.deepwaterFrames, images.waterboxFrames].forEach(arr => {
        totalImages += arr.length;
    });
}
calculateTotalImages();

function onImageLoaded() {
    loadedImages++;
    if (loadedImages === totalImages) {
        initGame().catch(err => console.error("Error initializing game:", err));
    }
}

imageKeys.forEach(key => {
    const img = images[key];
    img.onload = onImageLoaded;
    img.onerror = () => {
        console.error(`Failed to load image: ${img.src}`);
        onImageLoaded();
    };
});
[...images.teleporterFrames, ...images.duplicatorFrames, ...images.waterFrames, ...images.deepwaterFrames, ...images.waterboxFrames].forEach(img => {
    img.onload = onImageLoaded;
    img.onerror = () => {
        console.error(`Failed to load image: ${img.src}`);
        onImageLoaded();
    };
});

async function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    editorCanvas = document.getElementById('editorCanvas');
    editorCtx = editorCanvas.getContext('2d');
    editorCtx.imageSmoothingEnabled = false;

    document.getElementById('p-wall').style.backgroundImage = `url(${images.wall.src})`;
    document.getElementById('p-icewall').style.backgroundImage = `url(${images.icewall.src})`;
    document.getElementById('p-box').style.backgroundImage = `url(${images.box.src})`;
    document.getElementById('p-switch').style.backgroundImage = `url(${images.switch.src})`;
    document.getElementById('p-player').style.backgroundImage = `url(${images.lookdown.src})`;
    document.getElementById('p-floor').style.backgroundImage = `url(${images.floor.src})`;
    document.getElementById('p-icefloor').style.backgroundImage = `url(${images.icefloor.src})`;
    document.getElementById('p-sandfloor').style.backgroundImage = `url(${images.sandfloor.src})`;
    document.getElementById('p-sandstonewall').style.backgroundImage = `url(${images.sandstonewall.src})`;
    document.getElementById('p-ladderup').style.backgroundImage = `url(${images.ladderup.src})`;
    document.getElementById('p-ladderdown').style.backgroundImage = `url(${images.ladderdown.src})`;
    document.getElementById('p-floorhole').style.backgroundImage = `url(${images.floorhole.src})`;
    document.getElementById('p-waterbox').style.backgroundImage = `url(${images.waterboxFrames[0].src})`;
    document.getElementById('p-teleporter').style.backgroundImage = `url(${images.teleporter.src})`;
    document.getElementById('p-duplicator').style.backgroundImage = `url(${images.duplicator.src})`;
    document.getElementById('p-water').style.backgroundImage = `url(${images.waterFrames[0].src})`;
    document.getElementById('p-deepwater').style.backgroundImage = `url(${images.deepwaterFrames[0].src})`;
    document.getElementById('p-erase').style.backgroundColor = `#000`;
    selectTool('wall');

    editorCanvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            if (Date.now() - lastTouchEndTime < 500) return;
            isPanning = false;
            initialPinchDistance = null;
            lastTouchX = e.clientX;
            lastTouchY = e.clientY;
            handleEditorClick(e);
        }
    });
    editorCanvas.addEventListener('mousemove', (e) => {
        if (e.buttons === 1) {
            if (editorPinchScale > 1) {
                isPanning = true;
                const dx = (e.clientX - lastTouchX) / editorScale;
                const dy = (e.clientY - lastTouchY) / editorScale;
                editorOffsetX += dx;
                editorOffsetY += dy;
                lastTouchX = e.clientX;
                lastTouchY = e.clientY;
                resizeEditorCanvas(true);
            } else {
                handleEditorClick(e);
            }
        }
    });

    editorCanvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialPinchScale = editorPinchScale;
            const rect = editorCanvas.getBoundingClientRect();
            pinchMidX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
            pinchMidY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
        } else if (e.touches.length === 1) {
            isPanning = false;
            initialPinchDistance = null;
            lastTouchX = e.touches[0].clientX;
            lastTouchY = e.touches[0].clientY;
            touchHasMoved = false;
        }
    }, { passive: false });
    editorCanvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && initialPinchDistance) {
            e.preventDefault();
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const zoomFactor = currentDistance / initialPinchDistance;
            const newPinchScale = Math.max(1, Math.min(5, initialPinchScale * zoomFactor));
            const reachedMinimum = newPinchScale === 1;
            const oldScale = editorScale;
            editorPinchScale = newPinchScale;
            if (reachedMinimum) {
                resizeEditorCanvas(false);
            } else {
                const newScale = baseEditorScale * editorPinchScale;
                editorOffsetX += pinchMidX * (1 / newScale - 1 / oldScale);
                editorOffsetY += pinchMidY * (1 / newScale - 1 / oldScale);
                resizeEditorCanvas(true);
            }
        } else if (e.touches.length === 1) {
            if (editorPinchScale > 1) {
                e.preventDefault();
                isPanning = true;
                const dx = (e.touches[0].clientX - lastTouchX) / editorScale;
                const dy = (e.touches[0].clientY - lastTouchY) / editorScale;
                editorOffsetX += dx;
                editorOffsetY += dy;
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
                resizeEditorCanvas(true);
            } else {
                touchHasMoved = true;
                const isPromptTool = ['teleporter', 'duplicator', 'ladderup', 'ladderdown'].includes(currentTool);
                if (!isPromptTool) {
                    handleEditorClick(e);
                }
            }
        }
    }, { passive: false });
    editorCanvas.addEventListener('touchend', (e) => {
        lastTouchEndTime = Date.now();
        const isPromptTool = ['teleporter', 'duplicator', 'ladderup', 'ladderdown'].includes(currentTool);
        if (e.touches.length === 0 && !isPanning && !initialPinchDistance && (!touchHasMoved || isPromptTool)) {
            handleEditorClick(e.changedTouches[0]);
        }
        if (e.touches.length < 2) {
            initialPinchDistance = null;
        }
        if (e.touches.length === 0 && editorPinchScale <= 1) {
            editorPinchScale = 1;
            isPanning = false;
            const fullGridWidth  = EDITOR_WIDTH  * GRID_SIZE;
            const fullGridHeight = EDITOR_HEIGHT * GRID_SIZE;
            editorOffsetX = (editorCanvas.width  / editorScale - fullGridWidth)  / 2;
            editorOffsetY = (editorCanvas.height / editorScale - fullGridHeight) / 2;
        }
        touchHasMoved = false;
    }, { passive: false });

    initEditorPinchZoom();

    const fallbackLevels = `Level 1:
Walls: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 1H, 1I, 1J, 2A, 2J, 3A, 3J, 4A, 4J, 5A, 5J, 6A, 6J, 7A, 7J, 8A, 8J, 9A, 9J, 10A, 10J, 11A, 11J, 12A, 12J, 13A, 13J, 14A, 14B, 14C, 14D, 14E, 14F, 14G, 14H, 14I, 14J
Boxes: 5D, 5F, 7G, 8G, 10F, 10D
Switches: 3D, 3F, 7I, 8I, 12D, 12F
Player: 7E

Level 2:
Walls: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 1H, 1I, 1J, 2A, 2D, 2G, 2J, 3A, 3D, 3G, 3J, 4A, 4D, 4G, 4J, 5A, 5H, 5J, 6A, 6J, 7A, 7D, 7H, 7J, 8A, 8D, 8F, 8J, 9A, 9D, 9H, 9J, 10A, 10D, 10J, 11A, 11D, 11H, 11I, 11J, 12A, 12J, 13A, 13J, 14A, 14B, 14C, 14D, 14E, 14F, 14G, 14H, 14I, 14J
Boxes: 5E, 6F, 7E, 12C, 13C, 6H
Switches: 2C, 2E, 6D, 9G, 12I, 13I
Floors: 2B, 2C, 2E, 2F, 2H, 2I, 3B, 3C, 3E, 3F, 3H, 3I, 4B, 4C, 4E, 4F, 4H, 4I, 5B, 5C, 5D, 5E, 5F, 5G, 5I, 6B, 6C, 6D, 6E, 6F, 6G, 6H, 6I, 7B, 7C, 7E, 7F, 7G, 7I, 8B, 8C, 8E, 8G, 8H, 8I, 9B, 9C, 9E, 9F, 9G, 9I, 10B, 10C, 10E, 10F, 10G, 10H, 10I, 11B, 11C, 11E, 11F, 11G, 12B, 12C, 12I, 13B, 13C, 13I
IceFloors: 12D, 12E, 12F, 12G, 12H, 13D, 13E, 13F, 13G, 13H
Player: 4E

Level 3:
Walls: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 1H, 1I, 1J, 2A, 2D, 2H, 2J, 3A, 3D, 3H, 3J, 4A, 4D, 4G, 4H, 4J, 5A, 5D, 5J, 6A, 6H, 6J, 7A, 7C, 7D, 7F, 7H, 7J, 8A, 8H, 8J, 9A, 9C, 9J, 10A, 10E, 10F, 10J, 11A, 11C, 11E, 11G, 11J, 12A, 12J, 13A, 13J, 14A, 14B, 14C, 14D, 14E, 14F, 14G, 14H, 14I, 14J
Boxes: 7B, 10C, 5F, 6F, 11I
Switches: 2B, 2I, 3I, 8I, 11F
Player: 4C

Level 4:
Walls: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 1H, 1I, 1J, 2A, 2J, 3A, 3B, 3C, 3D, 3E, 3G, 3H, 3J, 4A, 4D, 4H, 4J, 5A, 5J, 6A, 6H, 6J, 7A, 7B, 7C, 7H, 7J, 8A, 8H, 8J, 9A, 9C, 9H, 9J, 10A, 10D, 10E, 10H, 10J, 11A, 11C, 11F, 11G, 11H, 11J, 12A, 12C, 12J, 13A, 13H, 13J, 14A, 14B, 14C, 14D, 14E, 14F, 14G, 14H, 14I, 14J
Boxes: 7D, 8C, 3F, 5H, 13F
Switches: 2C, 4B, 10F, 10G, 13B
Player: 2B

Level 5:
Walls: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 1H, 1I, 1J, 2A, 2E, 2I, 2J, 3A, 3D, 3E, 3I, 3J, 4A, 4E, 4I, 4J, 5A, 5E, 5I, 5J, 6A, 6E, 6F, 6H, 6J, 7A, 7E, 7H, 7J, 8A, 8C, 8E, 8J, 9A, 9J, 10A, 10D, 10J, 11A, 11D, 11H, 11J, 12A, 12C, 12G, 12H, 12J, 13A, 13J, 14A, 14B, 14C, 14D, 14E, 14F, 14G, 14H, 14I, 14J
Boxes: 3C, 6D, 9D, 8H, 10H, 12F
Switches: 2F, 2G, 2H, 3F, 3G, 3H
Player: 2D

Level 6:
Walls: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 1H, 1I, 1J, 2A, 2J, 3A, 3J, 4A, 4J, 5A, 5J, 6A, 6J, 7A, 7B, 7C, 7D, 7E, 7F, 7G, 7H, 7J, 8A, 8J, 9A, 9D, 9J, 10A, 10F, 10G, 10H, 10J, 11A, 11B, 11C, 11J, 12A, 12F, 12J, 13A, 13F, 13J, 14A, 14B, 14C, 14D, 14E, 14F, 14G, 14H, 14I, 14J
Boxes: 11F, 9H, 12D, 3B, 5B, 2D, 3D, 3E, 4E, 5E, 5D, 6D, 2F, 3G, 4G, 5G, 6F
Switches: 2B, 6B, 8B, 10I, 13I
Player: 13B

Level 7:
Walls: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 1H, 1I, 1J, 2A, 2C, 2E, 2F, 2J, 3A, 3F, 3J, 4A, 4B, 4C, 4E, 4H, 4J, 5A, 5H, 5J, 6A, 6C, 6E, 6F, 6G, 6J, 7A, 7E, 7J, 8A, 8B, 8C, 8D, 8E, 8G, 8H, 8I, 8J, 9A, 9J, 10A, 10C, 10E, 10H, 10J, 11A, 11C, 11E, 11J, 12A, 12J, 13A, 13E, 13I, 13J, 14A, 14B, 14C, 14D, 14E, 14F, 14G, 14H, 14I, 14J
Boxes: 11B, 11D, 11G, 3H, 3C, 4D
Switches: 3E, 5G, 7I, 9I, 10B, 10D
Player: 2B

Level 8:
Walls: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 1H, 1I, 1J, 1K, 1L, 1M, 1N, 1O, 1P, 1Q, 1R, 1S, 1T, 1U, 1V, 1W, 1X, 1Y, 1Z, 2A, 2D, 2F, 2L, 2T, 2Z, 3A, 3F, 3J, 3L, 3N, 3T, 3W, 3Z, 4A, 4F, 4J, 4L, 4N, 4T, 4W, 4Z, 5A, 5B, 5D, 5E, 5F, 5J, 5L, 5N, 5O, 5R, 5T, 5W, 5Z, 6A, 6F, 6J, 6L, 6N, 6R, 6T, 6W, 6Z, 7A, 7F, 7J, 7L, 7N, 7O, 7P, 7S, 7T, 7W, 7X, 7Z, 8A, 8B, 8C, 8D, 8F, 8J, 8L, 8N, 8T, 8X, 8Z, 9A, 9D, 9F, 9J, 9L, 9N, 9P, 9Q, 9S, 9T, 9X, 9Z, 10A, 10D, 10F, 10J, 10N, 10T, 10X, 10Z, 11A, 11D, 11F, 11G, 11I, 11J, 11K, 11L, 11M, 11N, 11O, 11P, 11Q, 11R, 11S, 11T, 11X, 11Z, 12A, 12D, 12X, 12Z, 13A, 13D, 13F, 13G, 13H, 13I, 13J, 13K, 13L, 13M, 13N, 13O, 13P, 13Q, 13S, 13T, 13U, 13V, 13W, 13X, 13Y, 13Z, 14A, 14C, 14D, 14F, 14S, 14Z, 15A, 15C, 15F, 15K, 15L, 15M, 15N, 15O, 15P, 15Q, 15R, 15S, 15X, 15Z, 16A, 16C, 16F, 16K, 16X, 16Z, 17A, 17C, 17F, 17T, 17X, 17Z, 18A, 18C, 18D, 18F, 18G, 18H, 18I, 18J, 18K, 18L, 18M, 18N, 18O, 18P, 18R, 18T, 18U, 18W, 18Z, 19A, 19D, 19J, 19R, 19T, 19W, 19Z, 20A, 20D, 20E, 20F, 20G, 20H, 20J, 20L, 20M, 20N, 20O, 20P, 20Q, 20R, 20T, 20Z, 21A, 21J, 21L, 21R, 21T, 21U, 21V, 21W, 21X, 21Z, 22A, 22J, 22L, 22R, 22T, 22W, 22X, 22Z, 23A, 23C, 23D, 23E, 23H, 23J, 23L, 23T, 23X, 23Z, 24A, 24H, 24J, 24L, 24M, 24N, 24O, 24P, 24Q, 24R, 24T, 24Z, 25A, 25H, 25J, 25T, 25X, 25Z, 26A, 26B, 26C, 26D, 26E, 26F, 26G, 26H, 26I, 26J, 26K, 26L, 26M, 26N, 26O, 26P, 26Q, 26R, 26S, 26T, 26U, 26V, 26W, 26X, 26Y, 26Z
Boxes: 6D, 13E, 21H, 23F, 2H, 4R, 4Q, 3Y, 9V, 10U, 22P, 24S, 17Q, 24K, 24U, 19X, 20W
Switches: 2E, 2K, 6U, 6V, 8E, 8S, 9B, 10S, 11Y, 19Q, 21M, 22U, 23B, 24Y, 25K, 25S, 25Y
Player: 10G

Level 9:
Walls: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 1H, 1I, 1J, 2A, 2J, 3A, 3J, 4A, 4B, 4C, 4D, 4F, 4G, 4H, 4I, 4J, 5A, 5J, 6A, 6J, 7A, 7B, 7C, 7E, 7F, 7G, 7I, 7J, 8A, 8J, 9A, 9J, 10A, 10B, 10C, 10D, 10E, 10G, 10H, 10I, 10J, 11A, 11D, 11J, 12A, 12J, 13A, 13C, 13D, 13J, 14A, 14D, 14E, 14F, 14G, 14H, 14J, 14K, 15H, 15K, 16H, 16K, 17H, 17K, 18H, 18K, 19K, 20H, 20K, 21H, 21K, 22H, 22K, 23H, 23K, 23L, 24H, 26H, 26I, 26J, 26K, 26L
IceWalls: 1M, 1N, 1O, 1P, 1Q, 1R, 1S, 1T, 2M, 2T, 3M, 3S, 3T, 4M, 4T, 5M, 5T, 6M, 6T, 7M, 7T, 8M, 8T, 9M, 9T, 10M, 10T, 11M, 11T, 12M, 12T, 13M, 13T, 14M, 14T, 15B, 15D, 15M, 15T, 16B, 16D, 16M, 16T, 17B, 17D, 17M, 17T, 18B, 18D, 18M, 18T, 19B, 19M, 19T, 20B, 20D, 20M, 20T, 21B, 21D, 21M, 21T, 22B, 22D, 22M, 22T, 23B, 23D, 23E, 23M, 23T, 24B, 24D, 24E, 24F, 24G, 24T, 25B, 25T, 26B, 26C, 26D, 26E, 26F, 26G, 26M, 26N, 26O, 26P, 26Q, 26R, 26S, 26T
Boxes: 7D, 7H, 10F, 4E, 19D, 22F, 24P, 3O, 25Q, 4N
Switches: 2B, 2S, 4S, 5B, 11B, 14C, 15F, 25C, 25D, 25N
Floors: 2B, 2C, 2D, 2E, 2F, 2G, 2H, 2I, 3B, 3C, 3D, 3E, 3F, 3G, 3H, 3I, 4B, 4C, 4D, 4E, 4F, 4G, 4H, 4I, 5B, 5C, 5D, 5E, 5F, 5G, 5H, 5I, 6B, 6C, 6D, 6E, 6F, 6G, 6H, 6I, 7B, 7C, 7D, 7E, 7F, 7G, 7H, 7I, 8B, 8C, 8D, 8E, 8F, 8G, 8H, 8I, 9B, 9C, 9D, 9E, 9F, 9G, 9H, 9I, 10B, 10C, 10D, 10E, 10F, 10G, 10H, 10I, 11B, 11C, 11D, 11E, 11F, 11G, 11H, 11I, 12B, 12C, 12D, 12E, 12F, 12G, 12H, 12I, 13B, 13C, 13D, 13E, 13F, 13G, 13H, 13I, 14B, 14C, 14I, 15D, 15I, 15J, 16I, 16J, 17H, 17I, 17J, 18I, 18J, 19G, 19H, 19I, 19J, 20I, 20J, 21I, 21J, 22I, 22J, 23I, 23J, 24E, 24F, 24I, 24J, 24K, 24L, 25I, 25J, 25K, 25L
IceFloors: 2N, 2O, 2P, 2Q, 2R, 2S, 3N, 3O, 3P, 3Q, 3R, 3S, 4N, 4O, 4P, 4Q, 4R, 4S, 5N, 5O, 5P, 5Q, 5R, 5S, 6N, 6O, 6P, 6Q, 6R, 6S, 7N, 7O, 7P, 7Q, 7R, 7S, 8N, 8O, 8P, 8Q, 8R, 8S, 9N, 9O, 9P, 9Q, 9R, 9S, 10N, 10O, 10P, 10Q, 10R, 10S, 11N, 11O, 11P, 11Q, 11R, 11S, 12N, 12O, 12P, 12Q, 12R, 12S, 13N, 13O, 13P, 13Q, 13R, 13S, 14N, 14O, 14P, 14Q, 14R, 14S, 15C, 15E, 15F, 15G, 15N, 15O, 15P, 15Q, 15R, 15S, 16C, 16D, 16E, 16F, 16G, 16N, 16O, 16P, 16Q, 16R, 16S, 17C, 17D, 17E, 17F, 17G, 17N, 17O, 17P, 17Q, 17R, 17S, 18C, 18D, 18E, 18F, 18G, 18N, 18O, 18P, 18Q, 18R, 18S, 19C, 19D, 19E, 19F, 19N, 19O, 19P, 19Q, 19R, 19S, 20C, 20D, 20E, 20F, 20G, 20N, 20O, 20P, 20Q, 20R, 20S, 21C, 21D, 21E, 21F, 21G, 21N, 21O, 21P, 21Q, 21R, 21S, 22C, 22D, 22E, 22F, 22G, 22N, 22O, 22P, 22Q, 22R, 22S, 23C, 23D, 23E, 23F, 23G, 23N, 23O, 23P, 23Q, 23R, 23S, 24C, 24D, 24G, 24M, 24N, 24O, 24P, 24Q, 24R, 24S, 25C, 25D, 25E, 25F, 25G, 25H, 25M, 25N, 25O, 25P, 25Q, 25R, 25S
Player: 2I

Level 10:
Walls: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 1H, 1I, 1J, 1K, 1L, 1M, 1N, 2A, 2N, 3A, 3N, 4A, 4B, 4C, 4D, 4E, 4F, 4G, 4H, 4I, 4J, 4L, 4M, 4N, 5A, 5N, 6A, 6N, 7A, 7B, 7C, 7E, 7F, 7G, 7H, 7I, 7K, 7L, 7M, 7N, 8A, 8N, 9A, 9N, 10A, 10B, 10C, 10D, 10E, 10F, 10G, 10I, 10J, 10K, 10L, 10M, 10N, 11A, 11N, 12A, 12N, 13A, 13N, 14A, 14B, 14C, 14D, 14E, 14F, 14G, 14H, 14I, 14J, 14K, 14N, 15K, 15N, 16J, 16K, 16N, 16O
IceWalls: 1R, 1S, 1T, 1U, 1V, 1W, 1X, 1Y, 1Z, 2R, 2Z, 3R, 3Z, 4R, 4Z, 5R, 5Z, 6R, 6Z, 7R, 7Z, 8R, 8Z, 9R, 9Z, 10R, 10Z, 11R, 11Z, 12R, 12S, 12T, 12U, 12V, 12W, 12Z, 13W, 13Z, 14W, 14Z, 15W, 15Z, 16A, 16B, 16C, 16D, 16E, 16F, 16G, 16H, 16I, 16P, 16Q, 16R, 16W, 16Z, 17A, 17R, 17W, 17Z, 18A, 18R, 18W, 18Z, 19A, 19R, 19W, 19Z, 20A, 20R, 20W, 20Z, 21A, 21R, 21W, 21Z, 22A, 22R, 22S, 22T, 22U, 22V, 22W, 22Z, 23A, 23Z, 24A, 24R, 24S, 24T, 24U, 24V, 24W, 24Z, 25A, 25R, 25W, 25X, 25Y, 25Z, 26A, 26B, 26C, 26D, 26E, 26F, 26G, 26H, 26I, 26J, 26K, 26L, 26M, 26N, 26O, 26P, 26Q, 26R
Boxes: 3G, 4K, 7D, 7J, 8J, 10H, 12K, 13E, 3I, 12E
Switches: 2Y, 17C, 24B, 24P, 25M, 25P
Floors: 2B, 2C, 2D, 2E, 2F, 2G, 2H, 2I, 2J, 2K, 2L, 2M, 3B, 3C, 3D, 3E, 3F, 3G, 3H, 3I, 3J, 3K, 3L, 3M, 4B, 4C, 4D, 4E, 4F, 4G, 4H, 4I, 4J, 4K, 4L, 4M, 5B, 5C, 5D, 5E, 5F, 5G, 5H, 5I, 5J, 5K, 5L, 5M, 6B, 6C, 6D, 6E, 6F, 6G, 6H, 6I, 6J, 6K, 6L, 6M, 7B, 7C, 7D, 7E, 7F, 7G, 7H, 7I, 7J, 7K, 7L, 7M, 8B, 8C, 8D, 8E, 8F, 8G, 8H, 8I, 8J, 8K, 8L, 8M, 9B, 9C, 9D, 9E, 9F, 9G, 9H, 9I, 9J, 9K, 9L, 9M, 10B, 10C, 10D, 10E, 10F, 10G, 10H, 10I, 10J, 10K, 10L, 10M, 11B, 11C, 11D, 11E, 11F, 11G, 11H, 11I, 11J, 11K, 11L, 11M, 12A, 12B, 12C, 12D, 12E, 12F, 12G, 12H, 12I, 12J, 12K, 12L, 12M, 13A, 13B, 13C, 13D, 13E, 13F, 13G, 13H, 13I, 13J, 13K, 13L, 13M, 14L, 14M, 15L, 15M, 16L, 16M, 17K, 17L, 17M, 17N, 18L, 18M
IceFloors: 2S, 2T, 2U, 2V, 2W, 2X, 2Y, 3S, 3T, 3U, 3V, 3W, 3X, 3Y, 4S, 4T, 4U, 4V, 4W, 4X, 4Y, 5S, 5T, 5U, 5V, 5W, 5X, 5Y, 6S, 6T, 6U, 6V, 6W, 6X, 6Y, 7S, 7T, 7U, 7V, 7W, 7X, 7Y, 8S, 8T, 8U, 8V, 8W, 8X, 8Y, 9S, 9T, 9U, 9V, 9W, 9X, 9Y, 10S, 10T, 10U, 10V, 10W, 10X, 10Y, 11S, 11T, 11U, 11V, 11W, 11X, 11Y, 12S, 12T, 12U, 12V, 12W, 12X, 12Y, 13W, 13X, 13Y, 14W, 14X, 14Y, 15W, 15X, 15Y, 16W, 16X, 16Y, 17B, 17C, 17D, 17E, 17F, 17G, 17H, 17I, 17J, 17O, 17P, 17Q, 17W, 17X, 17Y, 18B, 18C, 18D, 18E, 18F, 18G, 18H, 18I, 18J, 18K, 18N, 18O, 18P, 18Q, 18W, 18X, 18Y, 19B, 19C, 19D, 19E, 19F, 19G, 19H, 19I, 19J, 19K, 19L, 19M, 19N, 19O, 19P, 19Q, 19W, 19X, 19Y, 20B, 20C, 20D, 20E, 20F, 20G, 20H, 20I, 20J, 20K, 20L, 20M, 20N, 20O, 20P, 20Q, 20W, 20X, 20Y, 21B, 21C, 21D, 21E, 21F, 21G, 21H, 21I, 21J, 21K, 21L, 21M, 21N, 21O, 21P, 21Q, 21W, 21X, 21Y, 22B, 22C, 22D, 22E, 22F, 22G, 22H, 22I, 22J, 22K, 22L, 22M, 22N, 22O, 22P, 22Q, 22S, 22T, 22U, 22V, 22W, 22X, 22Y, 23B, 23C, 23D, 23E, 23F, 23G, 23H, 23I, 23J, 23K, 23L, 23M, 23N, 23O, 23P, 23Q, 23R, 23S, 23T, 23U, 23V, 23W, 23X, 23Y, 24B, 24C, 24D, 24E, 24F, 24G, 24H, 24I, 24J, 24K, 24L, 24M, 24N, 24O, 24P, 24Q, 24X, 24Y, 25B, 25C, 25D, 25E, 25F, 25G, 25H, 25I, 25J, 25K, 25L, 25M, 25N, 25O, 25P, 25Q, 25X, 25Y
Player: 2B

Level 11:
Walls: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 1H, 1I, 2A, 2I, 3A, 3I, 4A, 4I, 5A, 5I, 6A, 6I, 7A, 7I, 8A, 8I, 9A, 9I, 10A, 10B, 10C, 10D, 10E, 12C, 12D, 12E, 13C, 14C, 15C, 16C, 17C, 18C, 19C, 20A, 20B, 20C, 20D, 20J, 20K, 20L, 21A, 21L, 22A, 23A, 24A, 25A, 25L, 26A, 26B, 26C, 26D, 26E, 26F, 26G, 26H, 26I, 26J, 26K, 26L
IceWalls: 3P, 3Q, 3R, 3S, 3T, 3U, 3V, 3W, 3X, 3Y, 4P, 4Y, 5P, 5Y, 6P, 6Y, 7P, 7Y, 8P, 8Y, 9P, 9Y, 10F, 10I, 10P, 10Y, 11F, 11I, 11P, 11Y, 12F, 12I, 12P, 12Y, 13F, 13I, 13P, 13Y, 14F, 14I, 14P, 14Q, 14R, 14S, 14T, 14V, 14W, 14X, 14Y, 15F, 15I, 15T, 15V, 16F, 16I, 16T, 16V, 17F, 17I, 17T, 17V, 18F, 18I, 18T, 18V, 19F, 19I, 19T, 19V, 20F, 20I, 20T, 20V, 21T, 21V, 22L, 22M, 22N, 22O, 22P, 22Q, 22R, 22S, 22T, 22V, 23V, 24L, 24M, 24N, 24O, 24P, 24Q, 24R, 24S, 24V, 25S, 25T, 25U, 25V
Boxes: 14E, 16E, 23C, 23E, 23G, 23I, 24J, 24H, 24F, 24D
Switches: 5Q, 6X, 7Q, 8X, 9B, 9Q, 10G, 10X, 11Q
Floors: 2B, 2C, 2D, 2E, 2F, 2G, 2H, 3B, 3C, 3D, 3E, 3F, 3G, 3H, 4B, 4C, 4D, 4E, 4F, 4G, 4H, 5B, 5C, 5D, 5E, 5F, 5G, 5H, 6B, 6C, 6D, 6E, 6F, 6G, 6H, 7B, 7C, 7D, 7E, 7F, 7G, 7H, 8B, 8C, 8D, 8E, 8F, 8G, 8H, 9B, 9C, 9D, 9E, 9F, 9G, 9H, 13C, 13D, 13E, 14C, 14D, 14E, 15C, 15D, 15E, 16C, 16D, 16E, 17C, 17D, 17E, 18C, 18D, 18E, 19C, 19D, 19E, 20E, 21B, 21C, 21D, 21E, 21F, 21G, 21H, 21I, 21J, 21K, 22B, 22C, 22D, 22E, 22F, 22G, 22H, 22I, 22J, 22K, 23B, 23C, 23D, 23E, 23F, 23G, 23H, 23I, 23J, 23K, 24B, 24C, 24D, 24E, 24F, 24G, 24H, 24I, 24J, 24K, 25B, 25C, 25D, 25E, 25F, 25G, 25H, 25I, 25J, 25K
IceFloors: 4Q, 4R, 4S, 4T, 4U, 4V, 4W, 4X, 5Q, 5R, 5S, 5T, 5U, 5V, 5W, 5X, 6Q, 6R, 6S, 6T, 6U, 6V, 6W, 6X, 7Q, 7R, 7S, 7T, 7U, 7V, 7W, 7X, 8Q, 8R, 8S, 8T, 8U, 8V, 8W, 8X, 9Q, 9R, 9S, 9T, 9U, 9V, 9W, 9X, 10G, 10H, 10Q, 10R, 10S, 10T, 10U, 10V, 10W, 10X, 11G, 11H, 11Q, 11R, 11S, 11T, 11U, 11V, 11W, 11X, 12G, 12H, 12Q, 12R, 12S, 12T, 12U, 12V, 12W, 12X, 13G, 13H, 13Q, 13R, 13S, 13T, 13U, 13V, 13W, 13X, 14G, 14H, 14P, 14Q, 14R, 14S, 14U, 15G, 15H, 15U, 16G, 16H, 16U, 17G, 17H, 17U, 18G, 18H, 18U, 19G, 19H, 19U, 20G, 20H, 20U, 21U, 22T, 22U, 23L, 23M, 23N, 23O, 23P, 23Q, 23R, 23S, 23T, 23U, 23V, 24T, 24U, 24V
Player: 2B

Level 12:
Walls: 10I, 10J, 10K, 10M, 10N, 10O, 10P, 10Q, 11I, 11Q, 12I, 12Q, 13I, 13Q, 14I, 14Q, 15I, 15Q, 16I, 16Q, 17I, 17Q, 18I, 18J, 18K, 18L, 18M, 18N, 18O, 18P, 18Q
IceWalls: 1V, 1W, 1X, 1Y, 2B, 2C, 2D, 2E, 2F, 2G, 2J, 2K, 2L, 2M, 2N, 2O, 2P, 2Q, 2R, 2S, 2T, 2U, 2V, 2Y, 3B, 3G, 3J, 3Y, 4B, 4G, 4J, 4M, 4N, 4O, 4P, 4Q, 4R, 4S, 4T, 4U, 4V, 4W, 4Y, 5B, 5C, 5G, 5J, 5K, 5M, 5R, 5W, 5Y, 6C, 6G, 6K, 6M, 6R, 6W, 6Y, 7C, 7G, 7K, 7M, 7R, 7S, 7W, 7Y, 8C, 8G, 8K, 8M, 8S, 8W, 8Y, 9C, 9G, 9K, 9M, 9S, 9W, 9Y, 10C, 10G, 10S, 10W, 10Y, 11C, 11G, 11S, 11W, 11Y, 12C, 12G, 12S, 12W, 12Y, 13C, 13G, 13S, 13W, 13Y, 14C, 14G, 14S, 14W, 14Y, 15C, 15G, 15S, 15W, 15Y, 15Z, 16C, 16G, 16S, 16W, 16Z, 17C, 17G, 17S, 17Z, 18C, 18G, 18S, 18V, 18W, 18X, 18Y, 18Z, 19C, 19G, 19S, 19U, 19V, 20C, 20G, 20H, 20I, 20J, 20K, 20L, 20M, 20N, 20O, 20P, 20Q, 20R, 20S, 20V, 21C, 21V, 22C, 22V, 23C, 23V, 24C, 24V, 25C, 25F, 25G, 25H, 25I, 25J, 25K, 25L, 25M, 25N, 25O, 25P, 25Q, 25R, 25S, 25T, 25U, 25V, 26C, 26D, 26E, 26F
Boxes: 14K, 12M, 14M, 16M, 14O
Switches: 3C, 3F, 5S, 24U, 25D
Floors: 11J, 11K, 11L, 11M, 11N, 11O, 11P, 12J, 12K, 12L, 12M, 12N, 12O, 12P, 13J, 13K, 13L, 13M, 13N, 13O, 13P, 14J, 14K, 14L, 14M, 14N, 14O, 14P, 15J, 15K, 15L, 15M, 15N, 15O, 15P, 16J, 16K, 16L, 16M, 16N, 16O, 16P, 17J, 17K, 17L, 17M, 17N, 17O, 17P
IceFloors: 2K, 2L, 2M, 2N, 2O, 2P, 2Q, 2R, 2S, 2T, 2U, 2V, 2W, 2X, 2Y, 3C, 3D, 3E, 3F, 3K, 3L, 3M, 3N, 3O, 3P, 3Q, 3R, 3S, 3T, 3U, 3V, 3W, 3X, 3Y, 4C, 4D, 4E, 4F, 4K, 4L, 4T, 4U, 4V, 4W, 4X, 4Y, 5D, 5E, 5F, 5L, 5S, 5T, 5U, 5V, 5W, 5X, 5Y, 6D, 6E, 6F, 6L, 6S, 6T, 6U, 6V, 6W, 6X, 6Y, 7D, 7E, 7F, 7L, 7T, 7U, 7V, 7W, 7X, 7Y, 8D, 8E, 8F, 8L, 8T, 8U, 8V, 8W, 8X, 8Y, 9D, 9E, 9F, 9L, 9T, 9U, 9V, 9W, 9X, 9Y, 10D, 10E, 10F, 10L, 10T, 10U, 10V, 10W, 10X, 10Y, 11D, 11E, 11F, 11T, 11U, 11V, 11W, 11X, 11Y, 12D, 12E, 12F, 12T, 12U, 12V, 12W, 12X, 12Y, 13D, 13E, 13F, 13T, 13U, 13V, 13W, 13X, 13Y, 14D, 14E, 14F, 14T, 14U, 14V, 14W, 14X, 14Y, 15D, 15E, 15F, 15T, 15U, 15V, 15W, 15X, 15Y, 16D, 16E, 16F, 16T, 16U, 16V, 16W, 16X, 16Y, 17D, 17E, 17F, 17T, 17U, 17V, 17W, 17X, 17Y, 18D, 18E, 18F, 18T, 18U, 19D, 19E, 19F, 19T, 20D, 20E, 20F, 20T, 20U, 21D, 21E, 21F, 21G, 21H, 21I, 21J, 21K, 21L, 21M, 21N, 21O, 21P, 21Q, 21R, 21S, 21T, 21U, 22D, 22E, 22F, 22G, 22H, 22I, 22J, 22K, 22L, 22M, 22N, 22O, 22P, 22Q, 22R, 22S, 22T, 22U, 23D, 23E, 23F, 23G, 23H, 23I, 23J, 23K, 23L, 23M, 23N, 23O, 23P, 23Q, 23R, 23S, 23T, 23U, 24D, 24E, 24F, 24G, 24H, 24I, 24J, 24K, 24L, 24M, 24N, 24O, 24P, 24Q, 24R, 24S, 24T, 24U, 25D, 25E, 25F, 25G, 25H, 25I, 25M, 25N, 25O, 25P, 25Q, 25R, 25S, 25T, 25U
Player: 14N

Level 13:
Walls: 7E, 7F, 7G, 7H, 7I, 7J, 8E, 8J, 9E, 9J, 10E, 10J, 11E, 11J, 12E, 13E, 13F, 13G, 13H, 13I, 13J
IceWalls: 10P, 10Q, 10R, 10S, 11K, 11L, 11M, 11N, 11O, 11P, 11S, 12S, 13K, 13L, 13M, 13N, 13O, 13P, 13Q, 13S, 14Q, 14S, 15Q, 15S, 16Q, 16S, 17Q, 17S, 18E, 18F, 18G, 18H, 18I, 18J, 18K, 18Q, 18S, 19E, 19K, 19Q, 19S, 20E, 20K, 20Q, 20S, 21E, 21K, 21Q, 21S, 21T, 22E, 22K, 22L, 22M, 22N, 22O, 22P, 22Q, 22T, 23E, 23T, 24E, 24K, 24L, 24M, 24N, 24O, 24P, 24Q, 24R, 24S, 24T, 25E, 25K, 26E, 26F, 26G, 26H, 26I, 26J, 26K
Boxes: 9G, 10G, 11G
Switches: 19F, 25F, 25J
Floors: 8F, 8G, 8H, 8I, 9F, 9G, 9H, 9I, 10E, 10F, 10G, 10H, 10I, 11E, 11F, 11G, 11H, 11I, 12F, 12G, 12H, 12I
IceFloors: 11Q, 11R, 12J, 12K, 12L, 12M, 12N, 12O, 12P, 12Q, 12R, 13R, 14R, 15R, 16R, 17R, 18R, 19F, 19G, 19H, 19I, 19J, 19R, 20F, 20G, 20H, 20I, 20J, 20R, 21F, 21G, 21H, 21I, 21J, 21R, 22F, 22G, 22H, 22I, 22J, 22R, 22S, 23F, 23G, 23H, 23I, 23J, 23K, 23L, 23M, 23N, 23O, 23P, 23Q, 23R, 23S, 24F, 24G, 24H, 24I, 24J, 25F, 25G, 25H, 25I, 25J
Player: 10F

Level 14:
Walls: 1D, 1E, 1F, 1G, 1H, 1I, 1J, 2D, 2J, 3D, 3J, 4D, 4J, 5D, 5J, 6D, 6J, 6K, 6L, 7D, 7J, 7M, 7Q, 7R, 7S, 8D, 8M, 8Q, 8S, 9D, 9J, 9K, 9M, 9Q, 9S, 10D, 10J, 10K, 10M, 10Q, 10S, 11D, 11J, 11K, 11M, 11Q, 11S, 12C, 12D, 12E, 12F, 12G, 12H, 12I, 12J, 12K, 12M, 12Q, 12S, 13B, 13J, 13K, 13M, 13N, 13P, 13Q, 13S, 14B, 14J, 14M, 14S, 15B, 15J, 15M, 15S, 16B, 16J, 16S, 17B, 17J, 17K, 17N, 17P, 17Q, 17R, 17S, 18B, 18C, 18J, 18N, 18P, 20K
IceWalls: 3O, 3P, 4N, 4Q, 4R, 4S, 4T, 4U, 4V, 5N, 5W, 6N, 6P, 6Q, 6R, 6S, 6T, 6W, 7N, 7P, 7T, 7V, 8N, 8P, 8T, 8V, 9N, 9P, 9T, 9V, 10N, 10P, 10T, 10V, 11N, 11P, 11T, 11V, 12N, 12P, 12T, 12V, 13T, 13V, 14K, 14T, 14V, 15K, 15T, 15V, 16K, 16M, 16T, 16V, 17M, 17T, 17V, 18E, 18F, 18G, 18H, 18I, 18Q, 18R, 18S, 18T, 18V, 19B, 19C, 19V, 20C, 20F, 20G, 20H, 20I, 20J, 20M, 20N, 20O, 20P, 20Q, 20R, 20S, 20V, 21D, 21E, 21F, 21K, 21M, 21S, 21T, 21U, 22K, 22M, 23K, 23M, 24K, 24L, 24M
Boxes: 8I, 3F, 5F, 7F, 9F, 4G, 6G, 8G, 10G, 3H, 5H, 7H
Switches: 8R, 13H, 15H, 17H, 18O, 20L
Floors: 2E, 2F, 2G, 2H, 2I, 3E, 3F, 3G, 3H, 3I, 4E, 4F, 4G, 4H, 4I, 5E, 5F, 5G, 5H, 5I, 6E, 6F, 6G, 6H, 6I, 7E, 7F, 7G, 7H, 7I, 7K, 7L, 7Q, 7R, 7S, 8E, 8F, 8G, 8H, 8I, 8J, 8K, 8L, 8Q, 8R, 8S, 9E, 9F, 9G, 9H, 9I, 9L, 9Q, 9R, 9S, 10E, 10F, 10G, 10H, 10I, 10J, 10L, 10Q, 10R, 10S, 11E, 11F, 11G, 11H, 11I, 11J, 11L, 11Q, 11R, 11S, 12J, 12L, 12R, 12S, 13C, 13L, 13N, 13O, 13R, 13S, 14C, 14D, 14N, 14O, 14P, 14Q, 14R, 14S, 15C, 15D, 15N, 15O, 15P, 15Q, 15R, 15S, 16C, 16D, 16N, 16O, 16P, 16Q, 16R, 16S, 17C, 17N, 17O, 17P, 17Q, 17R, 17S, 18K, 18L, 18O, 19K
IceFloors: 4O, 4P, 5O, 5P, 5Q, 5R, 5S, 5T, 5U, 5V, 6O, 6U, 6V, 7O, 7U, 8O, 8U, 9O, 9U, 10O, 10U, 11O, 11U, 12O, 12U, 13D, 13E, 13F, 13G, 13H, 13I, 13J, 13U, 14E, 14F, 14G, 14H, 14I, 14J, 14L, 14U, 15E, 15F, 15G, 15H, 15I, 15J, 15L, 15U, 16E, 16F, 16G, 16H, 16I, 16J, 16L, 16U, 17D, 17E, 17F, 17G, 17H, 17I, 17J, 17K, 17L, 17M, 17U, 18D, 18H, 18J, 18M, 18N, 18U, 19C, 19D, 19E, 19F, 19G, 19H, 19I, 19J, 19L, 19M, 19N, 19O, 19P, 19Q, 19R, 19S, 19T, 19U, 19V, 20C, 20D, 20E, 20L, 20T, 20U, 20V, 21L, 22L, 23L
Player: 8H

Level 15:
Walls: 1A, 1B, 1C, 1D, 1N, 1O, 1P, 1Q, 1R, 1S, 1T, 1U, 1V, 1W, 1X, 1Y, 1Z, 2A, 2D, 2N, 2R, 2T, 2W, 2Z, 3A, 3D, 3N, 3P, 3R, 3Z, 4A, 4B, 4C, 4D, 4N, 4P, 4R, 4T, 4Z, 5N, 5P, 5R, 5T, 5W, 5Z, 6N, 6P, 6R, 6T, 6U, 6V, 6W, 6Z, 7N, 7P, 7T, 7Z, 8N, 8O, 8P, 8Q, 8R, 8S, 8T, 8U, 8V, 8W, 8X, 8Y, 8Z, 13V, 13W, 13X, 13Y, 13Z, 14V, 14Z, 15V, 15Z, 16V, 16Z, 17V, 17Z, 18A, 18B, 18C, 18D, 18E, 18F, 18G, 18H, 18I, 18J, 18K, 18L, 18M, 18V, 18Z, 19A, 19M, 19V, 19Z, 20A, 20M, 20V, 20Z, 21A, 21M, 21V, 21Z, 22A, 22M, 22V, 22Z, 23A, 23M, 23Z, 24A, 24M, 24Z, 25A, 25M, 25Z, 26A, 26B, 26C, 26D, 26E, 26F, 26G, 26H, 26I, 26J, 26K, 26L, 26M, 26V, 26W, 26X, 26Y, 26Z
IceWalls: 5A, 5B, 5C, 5D, 5E, 5F, 5G, 5H, 5I, 5J, 5K, 5L, 6A, 6L, 7A, 7L, 8A, 8L, 9A, 9L, 9M, 9N, 9O, 9P, 9Q, 9R, 9S, 9T, 9U, 10A, 10Q, 10U, 11A, 11U, 12A, 12Q, 12U, 13A, 13L, 13M, 13N, 13O, 13P, 13Q, 13U, 14A, 14L, 14Q, 14U, 15A, 15L, 15Q, 15U, 16A, 16L, 16Q, 16U, 17A, 17B, 17C, 17D, 17E, 17F, 17G, 17H, 17I, 17J, 17K, 17L, 17Q, 17U, 18Q, 18U, 19Q, 19U, 20Q, 20U, 21Q, 21U, 22Q, 22U, 23Q, 24Q, 25Q, 26Q, 26R, 26S, 26T, 26U
Boxes: 20E, 24E, 20G, 24G, 20I, 24I, 23H, 21H, 21F, 23F, 3Q, 3X, 4V
Switches: 2Q, 7J, 7U, 7W, 15C, 15X, 24S
Teleporters: 3C 25B, 6C 22E, 16J 22G, 11S 22I, 3T 5Q, 2X 7V
Duplicators: 7O 10P
Floors: 2B, 2C, 2O, 2P, 2Q, 2R, 2S, 2T, 2U, 2V, 2W, 2X, 2Y, 3B, 3C, 3O, 3P, 3Q, 3R, 3S, 3T, 3U, 3V, 3W, 3X, 3Y, 4O, 4P, 4Q, 4R, 4S, 4T, 4U, 4V, 4W, 4X, 4Y, 5O, 5P, 5Q, 5R, 5S, 5T, 5U, 5V, 5W, 5X, 5Y, 6O, 6P, 6Q, 6R, 6S, 6T, 6U, 6V, 6W, 6X, 6Y, 7O, 7P, 7Q, 7R, 7S, 7T, 7U, 7V, 7W, 7X, 7Y, 8R, 8S, 14W, 14X, 14Y, 15W, 15X, 15Y, 16W, 16X, 16Y, 17W, 17X, 17Y, 18W, 18X, 18Y, 19B, 19C, 19D, 19E, 19F, 19G, 19H, 19I, 19J, 19K, 19L, 19W, 19X, 19Y, 20B, 20C, 20D, 20E, 20F, 20G, 20H, 20I, 20J, 20K, 20L, 20W, 20X, 20Y, 21B, 21C, 21D, 21E, 21F, 21G, 21H, 21I, 21J, 21K, 21L, 21W, 21X, 21Y, 22B, 22C, 22D, 22E, 22F, 22G, 22H, 22I, 22J, 22K, 22L, 22W, 22X, 22Y, 23B, 23C, 23D, 23E, 23F, 23G, 23H, 23I, 23J, 23K, 23L, 23V, 23W, 23X, 23Y, 24B, 24C, 24D, 24E, 24F, 24G, 24H, 24I, 24J, 24K, 24L, 24V, 24W, 24X, 24Y, 25B, 25C, 25D, 25E, 25F, 25G, 25H, 25I, 25J, 25K, 25L, 25V, 25W, 25X, 25Y
IceFloors: 6B, 6C, 6D, 6E, 6F, 6G, 6H, 6I, 6J, 6K, 7B, 7C, 7D, 7E, 7F, 7G, 7H, 7I, 7J, 7K, 8B, 8C, 8D, 8E, 8F, 8G, 8H, 8I, 8J, 8K, 9B, 9C, 9D, 9E, 9F, 9G, 9H, 9I, 9J, 9K, 10B, 10C, 10D, 10E, 10F, 10G, 10H, 10I, 10J, 10K, 10L, 10M, 10N, 10O, 10P, 10Q, 10R, 10S, 10T, 11B, 11C, 11D, 11E, 11F, 11G, 11H, 11I, 11J, 11K, 11L, 11M, 11N, 11O, 11P, 11Q, 11R, 11S, 11T, 12B, 12C, 12D, 12E, 12F, 12G, 12H, 12I, 12J, 12K, 12L, 12M, 12N, 12O, 12P, 12Q, 12R, 12S, 12T, 13B, 13C, 13D, 13E, 13F, 13G, 13H, 13I, 13J, 13K, 13R, 13S, 13T, 14B, 14C, 14D, 14E, 14F, 14G, 14H, 14I, 14J, 14K, 14R, 14S, 14T, 15B, 15C, 15D, 15E, 15F, 15G, 15H, 15I, 15J, 15K, 15R, 15S, 15T, 16B, 16C, 16D, 16E, 16F, 16G, 16H, 16I, 16J, 16K, 16R, 16S, 16T, 17B, 17C, 17D, 17E, 17F, 17R, 17S, 17T, 18R, 18S, 18T, 19R, 19S, 19T, 20R, 20S, 20T, 21R, 21S, 21T, 22R, 22S, 22T, 23R, 23S, 23T, 23U, 24R, 24S, 24T, 24U, 25R, 25S, 25T, 25U
Player: 2B

Level 16:
Walls: 1A, 1B, 1C, 1D, 1E, 2A, 3A, 4A, 5A, 6A, 7A, 8A, 8B, 8C, 8D, 8E, 15O, 15P, 15Q, 15R, 15S, 16S, 17S, 18O, 18P, 18Q, 18R, 18S
IceWalls: 1F, 1G, 1H, 1I, 1J, 1K, 1L, 1M, 1N, 2F, 2N, 3F, 3N, 4F, 4N, 5F, 5N, 6F, 6N, 7F, 7N, 8F, 8N, 9A, 9N, 10A, 10N, 11A, 11N, 12A, 12N, 13A, 13N, 14A, 14N, 15A, 15I, 15J, 15K, 15L, 15M, 15N, 16A, 16I, 17A, 17I, 18A, 18I, 18J, 18K, 18M, 18N, 19A, 19N, 20A, 20N, 21A, 21N, 22A, 22N, 23A, 23N, 24A, 24N, 25A, 25N, 26A, 26B, 26C, 26D, 26E, 26F, 26G, 26H, 26I, 26J, 26K, 26L, 26M, 26N
Boxes: 6C, 4C, 5C, 7C, 3E, 5D
Switches: 2L, 12B, 17J
Teleporters: 7E 12F 19M, 17O 25M
Floors: 2B, 2C, 2D, 2E, 3B, 3C, 3D, 3E, 4B, 4C, 4D, 4E, 5B, 5C, 5D, 5E, 6B, 6C, 6D, 6E, 7B, 7C, 7D, 7E, 16O, 16P, 16Q, 16R, 17O, 17P, 17Q, 17R
IceFloors: 2G, 2H, 2I, 2J, 2K, 2L, 2M, 3G, 3H, 3I, 3J, 3K, 3L, 3M, 4G, 4H, 4I, 4J, 4K, 4L, 4M, 5G, 5H, 5I, 5J, 5K, 5L, 5M, 6G, 6H, 6I, 6J, 6K, 6L, 6M, 7G, 7H, 7I, 7J, 7K, 7L, 7M, 8G, 8H, 8I, 8J, 8K, 8L, 8M, 9B, 9C, 9D, 9E, 9F, 9G, 9H, 9I, 9J, 9K, 9L, 9M, 10B, 10C, 10D, 10E, 10F, 10G, 10H, 10I, 10J, 10K, 10L, 10M, 11B, 11C, 11D, 11E, 11F, 11G, 11H, 11I, 11J, 11K, 11L, 11M, 12B, 12C, 12D, 12E, 12F, 12G, 12H, 12I, 12J, 12K, 12L, 12M, 13B, 13C, 13D, 13E, 13F, 13G, 13H, 13I, 13J, 13K, 13L, 13M, 14B, 14C, 14D, 14E, 14F, 14G, 14H, 14I, 14J, 14K, 14L, 14M, 15B, 15C, 15D, 15E, 15F, 15G, 15H, 16B, 16C, 16D, 16E, 16F, 16G, 16H, 16J, 16K, 16L, 16M, 16N, 17B, 17C, 17D, 17E, 17F, 17G, 17H, 17J, 17K, 17L, 17M, 17N, 18B, 18C, 18D, 18E, 18F, 18G, 18H, 18L, 19B, 19C, 19D, 19E, 19F, 19G, 19H, 19I, 19J, 19K, 19L, 19M, 20B, 20C, 20D, 20E, 20F, 20G, 20H, 20I, 20J, 20K, 20L, 20M, 21B, 21C, 21D, 21E, 21F, 21G, 21H, 21I, 21J, 21K, 21L, 21M, 22B, 22C, 22D, 22E, 22F, 22G, 22H, 22I, 22J, 22K, 22L, 22M, 23B, 23C, 23D, 23E, 23F, 23G, 23H, 23I, 23J, 23K, 23L, 23M, 24B, 24C, 24D, 24E, 24F, 24G, 24H, 24I, 24J, 24K, 24L, 24M, 25B, 25C, 25D, 25E, 25F, 25G, 25H, 25I, 25J, 25K, 25L, 25M
Player: 2B

Level 17:
Walls: 5C, 5D, 5E, 5F, 5G, 5H, 5I, 5J, 5K, 5L, 6C, 6L, 7C, 7D, 7E, 7F, 7G, 7H, 7J, 7K, 7L, 8C, 8L, 9C, 9L, 10C, 10D, 10E, 10G, 10H, 10I, 10K, 10L, 11C, 11I, 11L, 12C, 12E, 12I, 12L, 13C, 13E, 13I, 13L, 14C, 14E, 14I, 14L, 15C, 15D, 15L, 16C, 16H, 16I, 16J, 16K, 16L
IceWalls: 5R, 5S, 5T, 5U, 5V, 6R, 6V, 7R, 7V, 8R, 8V, 9R, 9V, 10R, 10V, 11R, 11V, 12R, 12V, 13R, 13V, 14R, 14V, 15R, 15V, 16M, 16N, 16O, 16P, 16Q, 16R, 16V, 17C, 17V, 18C, 18V, 19C, 19V, 20C, 20V, 21C, 21D, 21E, 21F, 21G, 21H, 21I, 21J, 21K, 21L, 21M, 21N, 21O, 21P, 21Q, 21R, 21S, 21T, 21U, 21V
Boxes: 7I, 10J, 15I, 12D, 10F
Switches: 6S, 6T, 6U
Teleporters: 9F 14D
Floors: 6D, 6E, 6F, 6G, 6H, 6I, 6J, 6K, 7D, 7E, 7F, 7G, 7H, 7I, 7J, 7K, 8D, 8E, 8F, 8G, 8H, 8I, 8J, 8K, 9D, 9E, 9F, 9G, 9H, 9I, 9J, 9K, 10D, 10E, 10F, 10G, 10H, 10I, 10J, 10K, 11D, 11E, 11F, 11G, 11H, 11I, 11J, 11K, 12D, 12E, 12F, 12G, 12H, 12I, 12J, 12K, 13D, 13E, 13F, 13G, 13H, 13I, 13J, 13K, 14D, 14E, 14F, 14G, 14H, 14I, 14J, 14K, 15D, 15E, 15F, 15G, 15H, 15I, 15J, 15K, 16D, 16E, 16F, 16G, 16H, 16I, 16J, 16K
IceFloors: 6S, 6T, 6U, 7S, 7T, 7U, 8S, 8T, 8U, 9S, 9T, 9U, 10S, 10T, 10U, 11S, 11T, 11U, 12S, 12T, 12U, 13S, 13T, 13U, 14S, 14T, 14U, 15S, 15T, 15U, 16S, 16T, 16U, 17D, 17E, 17F, 17G, 17H, 17I, 17J, 17K, 17L, 17M, 17N, 17O, 17P, 17Q, 17R, 17S, 17T, 17U, 18D, 18E, 18F, 18G, 18H, 18I, 18J, 18K, 18L, 18M, 18N, 18O, 18P, 18Q, 18R, 18S, 18T, 18U, 19D, 19E, 19F, 19G, 19H, 19I, 19J, 19K, 19L, 19M, 19N, 19O, 19P, 19Q, 19R, 19S, 19T, 19U, 20D, 20E, 20F, 20G, 20H, 20I, 20J, 20K, 20L, 20M, 20N, 20O, 20P, 20Q, 20R, 20S, 20T, 20U
Player: 6D

Level 18:
Walls: 10T, 10U, 10V, 10W, 10X, 10Y, 10Z, 11N, 11O, 11P, 11Q, 11R, 11S, 11T, 11Z, 12H, 12I, 12J, 12K, 12L, 12M, 12N, 12Z, 13B, 13D, 13E, 13F, 13G, 13H, 13R, 13S, 13T, 13U, 13V, 13W, 13Y, 13Z, 14B, 14L, 14M, 14N, 14R, 14T, 14Z, 15B, 15F, 15G, 15H, 15L, 15N, 15O, 15Q, 15R, 15T, 15Z, 16B, 16F, 16H, 16I, 16J, 16L, 16N, 16R, 16T, 16U, 16V, 16X, 16Y, 16Z, 17B, 17C, 17E, 17F, 17H, 17L, 17N, 17R, 17T, 17Z, 18B, 18F, 18H, 18L, 18N, 18P, 18R, 18T, 18U, 18W, 18Y, 18Z, 19B, 19F, 19H, 19K, 19L, 19N, 19R, 19T, 19Z, 20B, 20D, 20F, 20H, 20L, 20N, 20O, 20P, 20R, 20T, 20U, 20V, 20W, 20Y, 20Z, 21B, 21E, 21F, 21H, 21J, 21L, 21N, 21R, 21T, 21Z, 22B, 22C, 22F, 22H, 22J, 22L, 22N, 22R, 22T, 22Z, 23B, 23F, 23H, 23J, 23L, 23N, 23R, 23T, 23U, 23W, 23X, 23Z, 24B, 24F, 24H, 24I, 24L, 24N, 24R, 24T, 24V, 24W, 24X, 24Z, 25B, 25F, 25H, 25L, 25N, 25R, 25T, 25Z, 26B, 26C, 26D, 26E, 26F, 26H, 26I, 26J, 26K, 26L, 26N, 26O, 26P, 26Q, 26R, 26T, 26U, 26V, 26W, 26X, 26Y, 26Z
IceWalls: 4C, 4D, 4E, 4F, 4G, 5B, 5H, 5I, 5J, 5K, 5L, 5M, 5N, 5O, 5P, 5Q, 5R, 5S, 5T, 5U, 5V, 5W, 5X, 6B, 6X, 7B, 7H, 7I, 7J, 7K, 7L, 7M, 7N, 7O, 7P, 7Q, 7R, 7S, 7T, 7U, 7V, 7W, 7X, 8B, 8D, 8E, 8F, 8G, 9B, 9D, 10B, 10D, 11B, 11D, 12B, 12D
Boxes: 6H, 6L, 6P, 6T
Switches: 23I, 25E, 25O, 25Q, 25V
Teleporters: 6K 12V, 6O 13P, 6S 14J, 6W 15D, 18I 20E, 18K 19X, 19O 22K, 19Q 25K, 17W 22D, 23V 25X
Duplicators: 22O 22Q
Floors: 11U, 11V, 11W, 11X, 11Y, 12O, 12P, 12Q, 12R, 12S, 12T, 12U, 12V, 12W, 12X, 12Y, 13C, 13I, 13J, 13K, 13L, 13M, 13N, 13O, 13P, 13Q, 13S, 13U, 13V, 13W, 13X, 13Y, 14C, 14D, 14E, 14F, 14G, 14H, 14I, 14J, 14K, 14O, 14P, 14Q, 14U, 14V, 14W, 14X, 14Y, 15C, 15D, 15E, 15I, 15J, 15K, 15O, 15P, 15Q, 15U, 15V, 15W, 15X, 15Y, 16C, 16D, 16E, 16I, 16J, 16K, 16O, 16P, 16Q, 16U, 16V, 16W, 16X, 16Y, 17C, 17D, 17E, 17I, 17J, 17K, 17O, 17P, 17Q, 17U, 17V, 17W, 17X, 17Y, 18C, 18D, 18E, 18J, 18K, 18O, 18P, 18Q, 18U, 18V, 18W, 18X, 18Y, 19C, 19D, 19E, 19J, 19K, 19O, 19P, 19Q, 19U, 19V, 19W, 19X, 19Y, 20C, 20D, 20E, 20J, 20K, 20O, 20P, 20Q, 20U, 20V, 20W, 20X, 20Y, 21C, 21D, 21E, 21J, 21K, 21O, 21P, 21Q, 21U, 21V, 21W, 21X, 21Y, 22C, 22E, 22J, 22K, 22O, 22P, 22Q, 22U, 22V, 22W, 22X, 22Y, 23C, 23E, 23J, 23K, 23P, 23U, 23V, 23W, 23X, 23Y, 24C, 24E, 24I, 24J, 24K, 24P, 24U, 24V, 24W, 24X, 24Y, 25C, 25E, 25I, 25J, 25K, 25P, 25U, 25V, 25W, 25X, 25Y
IceFloors: 5C, 5D, 5E, 5F, 5G, 6C, 6D, 6E, 6F, 6G, 6H, 6I, 6J, 6K, 6L, 6M, 6N, 6O, 6P, 6Q, 6R, 6S, 6T, 6U, 6V, 6W, 7C, 7D, 7E, 7F, 7G, 8C, 9C, 10C, 11C, 12C, 18I, 19I, 20I, 21I, 22D, 22I, 23D, 23I, 23O, 23Q, 24D, 24O, 24Q, 25D, 25O, 25Q
Player: 6D

Level 19:
Walls: 12D, 12E, 12F, 12G, 12H, 12I, 12K, 13D, 13K, 14K, 15K, 15N, 15O, 16K, 18D, 18K, 19D, 19E, 19F, 19H, 19I, 19J, 19K
IceWalls: 5D, 5E, 5F, 5G, 5H, 5I, 5J, 5K, 5L, 6D, 6L, 7D, 7E, 7F, 7G, 7H, 7I, 7L, 8I, 8K, 8L, 9A, 9B, 9C, 9I, 9K, 10A, 10C, 10I, 10K, 11A, 11C, 11I, 11K, 11L, 11M, 12A, 12C, 12N, 12O, 12P, 12Q, 12R, 13A, 13C, 13S, 14A, 14C, 14D, 14M, 14N, 14O, 14P, 14S, 15A, 15M, 15P, 15R, 16A, 16D, 16L, 16M, 16N, 16O, 16P, 16R, 17A, 17B, 17C, 17D, 17R, 18L, 18M, 18N, 18O, 18R, 19P, 19Q, 20F, 20H, 21F, 21H, 22F, 22H, 23E, 23F, 23H, 24E, 24H, 24I, 24J, 24K, 24L, 24M, 25E, 25M, 26E, 26F, 26G, 26H, 26I, 26J, 26K, 26L, 26M
Boxes: 14G, 15G, 16G, 17G
Switches: 6F, 10B, 14L, 25K
Teleporters: 6E 15I, 15L 16I
Floors: 12J, 13E, 13F, 13G, 13H, 13I, 13J, 14E, 14F, 14G, 14H, 14I, 14J, 15E, 15F, 15G, 15H, 15I, 15J, 16E, 16F, 16G, 16H, 16I, 16J, 17E, 17F, 17G, 17H, 17I, 17J, 17K, 18E, 18F, 18G, 18H, 18I, 18J, 19G
IceFloors: 5D, 5E, 5F, 5G, 5H, 5I, 5J, 5K, 5L, 6D, 6E, 6F, 6G, 6H, 6I, 6J, 6K, 6L, 7D, 7E, 7F, 7G, 7H, 7I, 7J, 7K, 7L, 8I, 8J, 8K, 8L, 9I, 9J, 9K, 10B, 10I, 10J, 10K, 11B, 11I, 11J, 11K, 11L, 11M, 12B, 12L, 12M, 12N, 12O, 12P, 12Q, 12R, 13B, 13L, 13M, 13N, 13O, 13P, 13Q, 13R, 13S, 14B, 14L, 14M, 14N, 14O, 14P, 14Q, 14R, 14S, 15B, 15C, 15D, 15L, 15M, 15N, 15O, 15P, 15Q, 15R, 16B, 16C, 16L, 16M, 16N, 16O, 16P, 16Q, 16R, 17L, 17M, 17N, 17O, 17P, 17Q, 17R, 18L, 18M, 18N, 18O, 18P, 18Q, 18R, 19P, 19Q, 20F, 20G, 20H, 21F, 21G, 21H, 22F, 22G, 22H, 23E, 23F, 23G, 23H, 24E, 24F, 24G, 24H, 24I, 24J, 24K, 24L, 24M, 25E, 25F, 25G, 25H, 25I, 25J, 25K, 25L, 25M, 26E, 26F, 26G, 26H, 26I, 26J, 26K, 26L, 26M
Player: 15E

Level 20:
Walls: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 1H, 1I, 1J, 1K, 2A, 2K, 3A, 3K, 4A, 4K, 5A, 5K, 6A, 6K, 7A, 7C, 7D, 7F, 7G, 7H, 7I, 7J, 7K, 8A, 8C, 9A, 9C, 10A, 10C, 11A, 11C, 12A, 12C, 13A, 13C, 14A, 14C, 15A, 15B, 15C
IceWalls: 8D, 8F, 9D, 9F, 9H, 9I, 9J, 10D, 10F, 10H, 10J, 11D, 11F, 11H, 11J, 11K, 11L, 11M, 11N, 11O, 11P, 11Q, 12D, 12F, 12H, 12Q, 13D, 13F, 13H, 13K, 13L, 13M, 13Q, 14D, 14F, 14H, 14I, 14J, 14K, 14M, 14O, 14P, 14Q, 15D, 15F, 15M, 15O, 16D, 16F, 16M, 16O, 17D, 17F, 17M, 17O, 18D, 18F, 18M, 18O, 19D, 19F, 19M, 19O, 20D, 20F, 20M, 20O, 21B, 21C, 21D, 21F, 21M, 21O, 22B, 22F, 22G, 22H, 22I, 22J, 22K, 22L, 22M, 22O, 23B, 23O, 24B, 24C, 24D, 24E, 24F, 24G, 24H, 24I, 24J, 24K, 24L, 24O, 25L, 25M, 25N, 25O
Boxes: 13B, 6C, 5D, 4E, 6E, 3F, 5F
Switches: 7B, 11I, 13N, 22E, 23M
Teleporters: 4H 10I, 3H 12N, 5H 23N, 4I 23E
Floors: 2B, 2C, 2D, 2E, 2F, 2G, 2H, 2I, 2J, 3B, 3C, 3D, 3E, 3F, 3G, 3H, 3I, 3J, 4B, 4C, 4D, 4E, 4F, 4G, 4H, 4I, 4J, 5B, 5C, 5D, 5E, 5F, 5G, 5H, 5I, 5J, 6B, 6C, 6D, 6E, 6F, 6G, 6H, 6I, 6J, 7B, 7E, 8B, 9B, 10B, 11B, 12B, 13B, 14B
IceFloors: 8E, 9E, 10E, 10I, 11E, 11I, 12E, 12I, 12J, 12K, 12L, 12M, 12N, 12O, 12P, 13E, 13I, 13J, 13N, 13O, 13P, 14E, 14N, 15E, 15N, 16E, 16N, 17E, 17N, 18E, 18N, 19E, 19N, 20E, 20N, 21E, 21N, 22C, 22D, 22E, 22M, 22N, 23C, 23D, 23E, 23F, 23G, 23H, 23I, 23J, 23K, 23L, 23M, 23N, 24M, 24N
Player: 14B

Level 21:
FloorLevel 1:
Walls: 9J, 9K, 9L, 9M, 9N, 9O, 9P, 9Q, 9R, 10J, 10R, 11J, 11R, 12J, 12R, 13J, 13R, 14J, 15J, 15R, 16J, 16R, 17J, 17R, 18J, 18R, 19J, 19K, 19L, 19M, 19N, 19O, 19P, 19Q, 19R
SandstoneWalls: 8I, 9G, 9H, 9I, 10E, 11F, 12H, 12I, 14G, 15E, 15F, 15G, 15I, 18G, 18H, 18I
DeepWater: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 1H, 1I, 1J, 1K, 1L, 1M, 1N, 1O, 1P, 1Q, 1R, 1S, 1T, 1U, 1V, 1W, 1X, 1Y, 1Z, 2A, 2Z, 3A, 3Z, 4A, 4Z, 5A, 5Z, 6A, 6Z, 7A, 7Z, 8A, 8Z, 9A, 9Z, 10A, 10Z, 11A, 11Z, 12A, 12Z, 13A, 13Z, 14A, 14Z, 15A, 15Z, 16A, 16Z, 17A, 17Z, 18A, 18Z, 19A, 19Z, 20A, 20Z, 21A, 21Z, 22A, 22Z, 23A, 23Z, 24A, 24Z, 25A, 25Z, 26A, 26B, 26C, 26D, 26E, 26F, 26G, 26H, 26I, 26J, 26K, 26L, 26M, 26N, 26O, 26P, 26Q, 26R, 26S, 26T, 26U, 26V, 26W, 26X, 26Y, 26Z
Water: 2B, 2C, 2D, 2E, 2F, 2G, 2H, 2I, 2J, 2K, 2L, 2M, 2N, 2O, 2P, 2Q, 2R, 2S, 2T, 2U, 2V, 2W, 2X, 2Y, 3B, 3C, 3D, 3E, 3F, 3G, 3H, 3I, 3J, 3K, 3L, 3M, 3N, 3O, 3P, 3Q, 3R, 3S, 3T, 3U, 3V, 3W, 3X, 3Y, 4B, 4C, 4D, 4E, 4F, 4G, 4H, 4I, 4L, 4M, 4N, 4S, 4T, 4U, 4V, 4W, 4X, 4Y, 5B, 5C, 5D, 5E, 5F, 5G, 5S, 5T, 5U, 5V, 5W, 5X, 5Y, 6B, 6C, 6D, 6E, 6F, 6U, 6V, 6W, 6X, 6Y, 7B, 7C, 7D, 7E, 7W, 7X, 7Y, 8B, 8C, 8D, 8W, 8X, 8Y, 9B, 9C, 9D, 9W, 9X, 9Y, 10B, 10C, 10D, 10W, 10X, 10Y, 11B, 11C, 11D, 11W, 11X, 11Y, 12B, 12C, 12D, 12W, 12X, 12Y, 13B, 13C, 13D, 13W, 13X, 13Y, 14B, 14C, 14D, 14W, 14X, 14Y, 15B, 15C, 15D, 15W, 15X, 15Y, 16B, 16C, 16D, 16W, 16X, 16Y, 17B, 17C, 17D, 17W, 17X, 17Y, 18B, 18C, 18D, 18W, 18X, 18Y, 19B, 19C, 19D, 19W, 19X, 19Y, 20B, 20C, 20D, 20E, 20W, 20X, 20Y, 21B, 21C, 21D, 21E, 21V, 21W, 21X, 21Y, 22B, 22C, 22D, 22E, 22F, 22G, 22V, 22W, 22X, 22Y, 23B, 23C, 23D, 23E, 23F, 23G, 23H, 23I, 23U, 23V, 23W, 23X, 23Y, 24B, 24C, 24D, 24E, 24F, 24G, 24H, 24I, 24J, 24K, 24L, 24M, 24N, 24O, 24P, 24Q, 24R, 24S, 24T, 24U, 24V, 24W, 24X, 24Y, 25B, 25C, 25D, 25E, 25F, 25G, 25H, 25I, 25J, 25K, 25L, 25M, 25N, 25O, 25P, 25Q, 25R, 25S, 25T, 25U, 25V, 25W, 25X, 25Y
Switches: 10F, 10I, 14N
Floors: 10K, 10L, 10M, 10N, 10O, 10P, 10Q, 11K, 11L, 11M, 11N, 11O, 11P, 11Q, 12K, 12L, 12M, 12N, 12O, 12P, 12Q, 13K, 13L, 13M, 13N, 13O, 13P, 13Q, 14K, 14L, 14M, 14N, 14O, 14P, 14Q, 14R, 15K, 15L, 15M, 15N, 15O, 15P, 15Q, 16K, 16L, 16M, 16N, 16O, 16P, 16Q, 17K, 17L, 17M, 17N, 17O, 17P, 17Q, 18K, 18L, 18M, 18N, 18O, 18P, 18Q
SandFloors: 4J, 4K, 4O, 4P, 4Q, 4R, 5H, 5I, 5J, 5K, 5L, 5M, 5N, 5O, 5P, 5Q, 5R, 6G, 6H, 6I, 6J, 6K, 6L, 6M, 6N, 6O, 6P, 6Q, 6R, 6S, 6T, 7F, 7G, 7H, 7I, 7J, 7K, 7L, 7M, 7N, 7O, 7P, 7Q, 7R, 7S, 7T, 7U, 7V, 8E, 8F, 8G, 8H, 8I, 8J, 8K, 8L, 8M, 8N, 8O, 8P, 8Q, 8R, 8S, 8T, 8U, 8V, 9E, 9F, 9G, 9H, 9I, 9S, 9T, 9U, 9V, 10E, 10F, 10G, 10H, 10I, 10S, 10T, 10U, 10V, 11E, 11F, 11G, 11H, 11I, 11S, 11T, 11U, 11V, 12E, 12F, 12G, 12H, 12I, 12S, 12T, 12U, 12V, 13E, 13F, 13G, 13H, 13I, 13S, 13T, 13U, 13V, 14E, 14F, 14G, 14H, 14I, 14S, 14T, 14U, 14V, 15E, 15F, 15G, 15H, 15I, 15S, 15T, 15U, 15V, 16E, 16F, 16G, 16H, 16I, 16S, 16T, 16U, 16V, 17E, 17F, 17G, 17H, 17I, 17S, 17T, 17U, 17V, 18E, 18F, 18G, 18H, 18I, 18S, 18T, 18U, 18V, 19E, 19F, 19G, 19H, 19I, 19S, 19T, 19U, 19V, 20F, 20G, 20H, 20I, 20J, 20K, 20L, 20M, 20N, 20O, 20P, 20Q, 20R, 20S, 20T, 20U, 20V, 21F, 21G, 21H, 21I, 21J, 21K, 21L, 21M, 21N, 21O, 21P, 21Q, 21R, 21S, 21T, 21U, 22H, 22I, 22J, 22K, 22L, 22M, 22N, 22O, 22P, 22Q, 22R, 22S, 22T, 22U, 23J, 23K, 23L, 23M, 23N, 23O, 23P, 23Q, 23R, 23S, 23T
Player: 13K
FloorLevel 2:
Walls: 2A, 2B, 2C, 2D, 2E, 2F, 3A, 3F, 4A, 4F, 5A, 5F, 6A, 6F, 7A, 7F, 8A, 8E, 8F, 9J, 9K, 9L, 9M, 9N, 9O, 9P, 9Q, 9R, 10J, 10R, 11J, 11R, 12J, 12R, 13J, 13R, 14J, 14R, 15J, 15R, 16J, 16R, 17J, 17R, 18J, 18R, 19J, 19K, 19L, 19M, 19Q, 19R
IceWalls: 8B, 8D, 9B, 9D, 10B, 10D, 11B, 11D, 12B, 12D, 13B, 13D, 14B, 14D, 15B, 15D, 16B, 16D, 17B, 17D, 18B, 18D, 19B, 19D, 19N, 19P, 20B, 20D, 20N, 20P, 21B, 21D, 21N, 21P, 22A, 22B, 22D, 22N, 22P, 23A, 23D, 23E, 23F, 23G, 23H, 23I, 23J, 23K, 23L, 23M, 23N, 23P, 24A, 24P, 25A, 25B, 25C, 25D, 25E, 25F, 25G, 25H, 25I, 25J, 25K, 25L, 25M, 25P, 26M, 26N, 26O, 26P
FloorHoles: 14N
Floors: 3B, 3C, 3D, 3E, 4B, 4C, 4D, 4E, 5B, 5C, 5D, 5E, 6B, 6C, 6D, 6E, 7B, 7C, 7D, 7E, 10K, 10L, 10M, 10N, 10O, 10P, 10Q, 11K, 11L, 11M, 11N, 11O, 11P, 11Q, 12K, 12L, 12M, 12N, 12O, 12P, 12Q, 13K, 13L, 13M, 13N, 13O, 13P, 13Q, 14K, 14L, 14M, 14N, 14O, 14P, 14Q, 15K, 15L, 15M, 15N, 15O, 15P, 15Q, 16K, 16L, 16M, 16N, 16O, 16P, 16Q, 17K, 17L, 17M, 17N, 17O, 17P, 17Q, 18K, 18L, 18M, 18N, 18O, 18P, 18Q, 24C, 24O
IceFloors: 8B, 8C, 8D, 9B, 9C, 9D, 10B, 10C, 10D, 11B, 11C, 11D, 12B, 12C, 12D, 13B, 13C, 13D, 14B, 14C, 14D, 15B, 15C, 15D, 16B, 16C, 16D, 17B, 17C, 17D, 18B, 18C, 18D, 19B, 19C, 19D, 19N, 19O, 19P, 20B, 20C, 20D, 20N, 20O, 20P, 21B, 21C, 21D, 21N, 21O, 21P, 22A, 22B, 22C, 22D, 22N, 22O, 22P, 23A, 23B, 23C, 23D, 23E, 23F, 23G, 23H, 23I, 23J, 23K, 23L, 23M, 23N, 23O, 23P, 24A, 24B, 24D, 24E, 24F, 24G, 24H, 24I, 24J, 24K, 24L, 24M, 24N, 24P, 25A, 25B, 25C, 25D, 25E, 25F, 25G, 25H, 25I, 25J, 25K, 25L, 25M, 25N, 25O, 25P, 26M, 26N, 26O, 26P
FloorLevel 3:
Walls: 2A, 2B, 2C, 2D, 2E, 2F, 3A, 3F, 4A, 4F, 5A, 5F, 6A, 6F, 7A, 7F, 8A, 8B, 8D, 8E, 8F, 9B, 9D, 10B, 10D, 11B, 11D, 11R, 11S, 11T, 11U, 11V, 11W, 12B, 12D, 12Q, 12R, 12W, 12X, 13B, 13D, 13P, 13Q, 13X, 13Y, 14B, 14D, 14P, 14Y, 15B, 15D, 15P, 15Y, 16B, 16D, 16P, 16Y, 17B, 17D, 17P, 17Y, 18B, 18D, 18E, 18F, 18G, 18H, 18I, 18J, 18K, 18L, 18M, 18N, 18O, 18P, 18Y, 19B, 19Y, 20B, 20E, 20F, 20G, 20H, 20I, 20J, 20K, 20L, 20M, 20N, 20O, 20P, 20Y, 21B, 21C, 21D, 21P, 21Y, 22P, 22Y, 23P, 23Q, 23X, 23Y, 24Q, 24R, 24W, 24X, 25R, 25S, 25T, 25U, 25V, 25W
DeepWater: 19U, 20U, 21U
Water: 12T, 12U, 13T, 13U, 14T, 15T, 15U, 16T, 16U, 17T, 17U, 18T, 18U, 19T, 21T, 22T, 22U, 23T, 23U, 24T, 24U
FloorHoles: 5C
Boxes: 16W, 18W, 20W, 19R
Floors: 3B, 3C, 3D, 3E, 4B, 4C, 4D, 4E, 5B, 5C, 5D, 5E, 6B, 6C, 6D, 6E, 7B, 7C, 7D, 7E, 8C, 9C, 10C, 11C, 12C, 12S, 12V, 13C, 13R, 13S, 13V, 13W, 14C, 14Q, 14R, 14S, 14V, 14W, 14X, 15C, 15Q, 15R, 15S, 15V, 15W, 15X, 16C, 16Q, 16R, 16S, 16V, 16W, 16X, 17C, 17Q, 17R, 17S, 17V, 17W, 17X, 18C, 18Q, 18R, 18S, 18V, 18W, 18X, 19C, 19D, 19E, 19F, 19G, 19H, 19I, 19J, 19K, 19L, 19M, 19N, 19O, 19P, 19Q, 19R, 19S, 19V, 19W, 19X, 20C, 20D, 20Q, 20R, 20S, 20V, 20W, 20X, 21Q, 21R, 21S, 21V, 21W, 21X, 22Q, 22R, 22S, 22V, 22W, 22X, 23R, 23S, 23V, 23W, 24S, 24V
WaterBoxes: 14U, 20T
Ladders: FL1:11N FL2:11N, FL2:3C FL3:3C

Level 22:
FloorLevel 1:
Walls: 17P, 17Q, 17S, 17T, 18P, 18T, 19P, 19T, 20P, 20T, 21P, 21T, 22P, 22Q, 22R, 22S, 22T
DeepWater: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 1H, 1I, 1J, 1K, 1L, 1M, 1N, 1O, 1P, 1Q, 1R, 1S, 1T, 1U, 1V, 1W, 1X, 1Y, 1Z, 2A, 2Z, 3A, 3Z, 4A, 4Z, 5A, 5Z, 6A, 6Z, 7A, 7Z, 8A, 8Z, 9A, 9Z, 10A, 10Z, 11A, 11Z, 12A, 12Z, 13A, 13Z, 14A, 14Z, 15A, 15Z, 16A, 16Z, 17A, 17Z, 18A, 18Z, 19A, 19Z, 20A, 20Z, 21A, 21Z, 22A, 22Z, 23A, 23Z, 24A, 24Z, 25A, 25Z, 26A, 26B, 26C, 26D, 26E, 26F, 26G, 26H, 26I, 26J, 26K, 26L, 26M, 26N, 26O, 26P, 26Q, 26R, 26S, 26T, 26U, 26V, 26W, 26X, 26Y, 26Z
Water: 2B, 2C, 2D, 2E, 2F, 2G, 2H, 2I, 2J, 2K, 2L, 2M, 2N, 2O, 2P, 2Q, 2R, 2S, 2T, 2U, 2V, 2W, 2X, 2Y, 3B, 3C, 3D, 3E, 3G, 3H, 3I, 3J, 3K, 3L, 3M, 3N, 3O, 3P, 3Q, 3R, 3S, 3T, 3U, 3V, 3W, 3X, 3Y, 4B, 4C, 4D, 4H, 4I, 4J, 4K, 4L, 4M, 4N, 4O, 4P, 4Q, 4S, 4T, 4U, 4V, 4W, 4X, 4Y, 5B, 5C, 5I, 5J, 5K, 5L, 5M, 5N, 5O, 5P, 5T, 5U, 5V, 5W, 5X, 5Y, 6B, 6J, 6K, 6L, 6M, 6N, 6O, 6U, 6V, 6W, 6X, 6Y, 7K, 7L, 7M, 7N, 7V, 7W, 7X, 7Y, 8B, 8J, 8K, 8L, 8M, 8N, 8O, 8U, 8V, 8W, 8X, 8Y, 9B, 9C, 9I, 9J, 9K, 9L, 9M, 9N, 9O, 9P, 9T, 9U, 9V, 9W, 9X, 9Y, 10B, 10C, 10D, 10H, 10I, 10J, 10K, 10L, 10M, 10N, 10O, 10P, 10Q, 10S, 10T, 10U, 10V, 10W, 10X, 10Y, 11B, 11C, 11D, 11E, 11G, 11H, 11I, 11J, 11K, 11L, 11M, 11N, 11O, 11P, 11Q, 11R, 11S, 11T, 11U, 11V, 11W, 11X, 11Y, 12B, 12C, 12D, 12E, 12F, 12G, 12H, 12I, 12J, 12K, 12L, 12M, 12N, 12O, 12P, 12Q, 12R, 12S, 12T, 12U, 12V, 12W, 12X, 12Y, 13B, 13C, 13D, 13E, 13F, 13G, 13H, 13I, 13J, 13K, 13L, 13M, 13N, 13O, 13P, 13Q, 13R, 13S, 13T, 13U, 13V, 13W, 13X, 13Y, 14B, 14C, 14D, 14E, 14F, 14G, 14H, 14I, 14J, 14K, 14L, 14M, 14N, 14O, 14P, 14Q, 14S, 14T, 14U, 14V, 14W, 14X, 14Y, 15B, 15C, 15D, 15E, 15F, 15G, 15H, 15I, 15J, 15K, 15L, 15M, 15N, 15O, 15P, 15T, 15U, 15V, 15W, 15X, 15Y, 16B, 16C, 16D, 16E, 16F, 16G, 16H, 16I, 16J, 16K, 16L, 16M, 16N, 16O, 16U, 16V, 16W, 16X, 16Y, 17B, 17C, 17D, 17E, 17F, 17G, 17H, 17I, 17J, 17K, 17L, 17M, 17N, 17V, 17W, 17X, 17Y, 18B, 18C, 18D, 18E, 18F, 18G, 18H, 18I, 18J, 18K, 18L, 18M, 18N, 18V, 18W, 18X, 18Y, 19B, 19C, 19D, 19E, 19F, 19G, 19H, 19I, 19J, 19K, 19L, 19M, 19N, 19V, 19W, 19X, 19Y, 20B, 20C, 20D, 20E, 20F, 20G, 20H, 20I, 20J, 20K, 20L, 20M, 20N, 20V, 20W, 20X, 20Y, 21B, 21C, 21D, 21E, 21F, 21G, 21H, 21I, 21J, 21K, 21L, 21M, 21N, 21V, 21W, 21X, 21Y, 22B, 22C, 22D, 22E, 22F, 22G, 22H, 22I, 22J, 22K, 22L, 22M, 22N, 22V, 22W, 22X, 22Y, 23B, 23C, 23D, 23E, 23G, 23H, 23I, 23J, 23K, 23L, 23M, 23N, 23O, 23U, 23V, 23W, 23X, 23Y, 24B, 24C, 24D, 24E, 24F, 24G, 24H, 24I, 24J, 24K, 24L, 24M, 24N, 24O, 24P, 24T, 24U, 24V, 24W, 24X, 24Y, 25B, 25C, 25D, 25E, 25F, 25G, 25H, 25I, 25J, 25K, 25L, 25M, 25N, 25O, 25P, 25Q, 25S, 25T, 25U, 25V, 25W, 25X, 25Y
Boxes: 9R, 6R, 8Q, 6G, 6H, 9F, 8E, 5E
Switches: 18R, 23F
SandFloors: 3F, 4E, 4F, 4G, 4R, 5D, 5E, 5F, 5G, 5H, 5Q, 5R, 5S, 6C, 6D, 6E, 6F, 6G, 6H, 6I, 6P, 6Q, 6R, 6S, 6T, 7B, 7C, 7D, 7E, 7F, 7G, 7H, 7I, 7J, 7O, 7P, 7Q, 7R, 7S, 7T, 7U, 8C, 8D, 8E, 8F, 8G, 8H, 8I, 8P, 8Q, 8R, 8S, 8T, 9D, 9E, 9F, 9G, 9H, 9Q, 9R, 9S, 10E, 10F, 10G, 10R, 11F, 14R, 15Q, 15R, 15S, 16P, 16Q, 16R, 16S, 16T, 17O, 17R, 17U, 18O, 18Q, 18R, 18S, 18U, 19O, 19Q, 19R, 19S, 19U, 20O, 20Q, 20R, 20S, 20U, 21O, 21Q, 21R, 21S, 21U, 22O, 22U, 23F, 23P, 23Q, 23R, 23S, 23T, 24Q, 24R, 24S, 25R
Player: 7F
FloorLevel 2:
Walls: 17N, 17O, 17P, 17Q, 17S, 17T, 18P, 18T, 19P, 19T, 20P, 20T, 21P, 21T, 22E, 22F, 22G, 22P, 22Q, 22R, 22S, 22T, 23E, 23G, 24E, 24F, 24G
IceWalls: 4G, 4H, 4I, 4J, 4K, 4L, 4M, 4N, 4O, 4P, 4Q, 5G, 5N, 5Q, 5R, 5S, 5T, 6G, 6K, 6N, 6T, 7G, 7K, 7M, 7N, 7P, 7Q, 7T, 8G, 8K, 8M, 8N, 8P, 8Q, 8S, 8T, 9G, 9K, 9M, 9N, 9P, 9Q, 9S, 10G, 10H, 10I, 10J, 10K, 10M, 10N, 10P, 10Q, 10S, 11K, 11M, 11N, 11P, 11Q, 11S, 12K, 12M, 12N, 12P, 12Q, 12S, 13K, 13M, 13N, 13P, 13Q, 13S, 14K, 14M, 14N, 14Q, 14S, 15K, 15Q, 15S, 16K, 16N, 16O, 16P, 16Q, 16S, 17K, 17L, 17M
FloorHoles: 23F
Boxes: 18R
Floors: 18Q, 18R, 18S, 19Q, 19R, 19S, 20Q, 20R, 20S, 21Q, 21R, 21S
IceFloors: 4G, 4H, 4I, 4J, 4K, 4L, 4M, 4N, 4O, 4P, 4Q, 5G, 5H, 5I, 5J, 5K, 5L, 5M, 5N, 5O, 5P, 5Q, 5R, 5S, 5T, 6G, 6H, 6I, 6J, 6K, 6L, 6M, 6N, 6O, 6P, 6Q, 6R, 6S, 6T, 7G, 7H, 7I, 7J, 7K, 7L, 7M, 7N, 7O, 7P, 7Q, 7R, 7S, 7T, 8G, 8H, 8I, 8J, 8K, 8L, 8M, 8N, 8O, 8P, 8Q, 8R, 8S, 8T, 9G, 9H, 9I, 9J, 9K, 9L, 9M, 9N, 9O, 9P, 9Q, 9R, 9S, 10G, 10H, 10I, 10J, 10K, 10L, 10M, 10N, 10O, 10P, 10Q, 10R, 10S, 11K, 11L, 11M, 11N, 11O, 11P, 11Q, 11R, 11S, 12K, 12L, 12M, 12N, 12O, 12P, 12Q, 12R, 12S, 13K, 13L, 13M, 13N, 13O, 13P, 13Q, 13R, 13S, 14K, 14L, 14M, 14N, 14O, 14P, 14Q, 14R, 14S, 15K, 15L, 15M, 15N, 15O, 15P, 15Q, 15R, 15S, 16K, 16L, 16M, 16N, 16O, 16P, 16Q, 16R, 16S, 17K, 17L, 17M, 17R
FloorLevel 3:
Walls: 4G, 4H, 4I, 4J, 4K, 4L, 4M, 4N, 4O, 4P, 4Q, 4R, 5G, 5N, 5O, 5P, 5R, 6G, 6K, 6M, 6P, 6R, 7G, 7M, 7P, 7R, 8G, 8K, 8M, 8P, 8R, 9G, 9K, 9M, 9P, 9R, 10G, 10H, 10I, 10J, 10O, 10R, 11J, 11M, 11R, 12J, 12M, 12O, 12R, 13J, 13L, 13R, 14J, 14R, 15J, 15K, 15L, 15M, 15N, 15O, 15P, 15R, 16J, 16R, 17J, 17K, 17M, 17N, 17O, 17P, 17Q, 17R, 18K, 18L, 18M, 22E, 22F, 22G, 23E, 23G, 24E, 24F, 24G
FloorHoles: 23F
Boxes: 5K, 7K
Switches: 5Q, 16K
Duplicators: 13Q 16P
Floors: 5H, 5I, 5J, 5K, 5L, 5M, 5Q, 6H, 6I, 6J, 6L, 6N, 6O, 6Q, 7H, 7I, 7J, 7K, 7L, 7N, 7O, 7Q, 8H, 8I, 8J, 8L, 8N, 8O, 8Q, 9H, 9I, 9J, 9L, 9N, 9O, 9Q, 10K, 10L, 10M, 10N, 10P, 10Q, 11K, 11L, 11N, 11O, 11P, 11Q, 12K, 12L, 12N, 12P, 12Q, 13K, 13M, 13N, 13O, 13P, 13Q, 14K, 14L, 14M, 14N, 14O, 14P, 14Q, 15Q, 16K, 16L, 16M, 16N, 16O, 16P, 16Q, 17L, 23F
FloorLevel 4:
IceWalls: 15E, 15F, 15G, 15H, 16E, 16H, 16I, 16J, 16K, 16L, 16M, 17E, 17M, 18E, 18G, 18H, 18I, 18J, 18K, 18L, 18M, 19E, 19G, 20E, 20G, 21E, 21G, 22E, 22G, 23E, 23G, 24E, 24F, 24G
FloorHoles: 23F
Boxes: 17K
IceFloors: 16F, 16G, 17F, 17G, 17H, 17I, 17J, 17K, 17L, 18F, 19F, 20F, 21F, 22F, 23F
Ladders: FL1:21R FL2:21R, FL2:8I FL3:8I, FL3:17L FL4:17L

Level 23:
FloorLevel 1:
Walls: 8O, 8P, 8Q, 8R, 8S, 8T, 8U, 9J, 9K, 9L, 9M, 9N, 9O, 9U, 10J, 10N, 10O, 10U, 11J, 11N, 11O, 11U, 12J, 12N, 12O, 12P, 12Q, 12R, 12T, 12U, 13J, 13N, 14J, 15J, 15N, 16J, 16N, 17J, 17N, 18J, 18N, 19J, 19K, 19L, 19M, 19N
DeepWater: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 1H, 1I, 1J, 1K, 1L, 1M, 1N, 1O, 1P, 1Q, 1R, 1S, 1T, 1U, 1V, 1W, 1X, 1Y, 1Z, 2A, 2Z, 3A, 3Z, 4A, 4Z, 5A, 5Z, 6A, 6Z, 7A, 7Z, 8A, 8Z, 9A, 9Z, 10A, 10Z, 11A, 11Z, 12A, 12Z, 13A, 13Z, 14A, 14Z, 15A, 15Z, 16A, 16Z, 17A, 17Z, 18A, 18Z, 19A, 19Z, 20A, 20Z, 21A, 21Z, 22A, 22Z, 23A, 23Z, 24A, 24Z, 25A, 25Z, 26A, 26B, 26C, 26D, 26E, 26F, 26G, 26H, 26I, 26J, 26K, 26L, 26M, 26N, 26O, 26P, 26Q, 26R, 26S, 26T, 26U, 26V, 26W, 26X, 26Y, 26Z
Water: 2B, 2C, 2D, 2E, 2F, 2G, 2H, 2I, 2J, 2K, 2L, 2M, 2N, 2O, 2P, 2Q, 2R, 2S, 2T, 2U, 2V, 2W, 2X, 2Y, 3B, 3C, 3D, 3E, 3F, 3G, 3H, 3I, 3J, 3K, 3L, 3M, 3N, 3O, 3P, 3Q, 3R, 3S, 3T, 3U, 3V, 3W, 3X, 3Y, 4B, 4C, 4D, 4E, 4F, 4G, 4H, 4I, 4J, 4K, 4L, 4M, 4N, 4O, 4P, 4Q, 4R, 4S, 4T, 4U, 4V, 4W, 4X, 4Y, 5B, 5C, 5D, 5E, 5F, 5G, 5H, 5Q, 5R, 5S, 5T, 5U, 5V, 5W, 5X, 5Y, 6B, 6C, 6D, 6E, 6F, 6G, 6S, 6T, 6U, 6V, 6W, 6X, 6Y, 7B, 7C, 7D, 7E, 7F, 7T, 7U, 7V, 7W, 7X, 7Y, 8B, 8C, 8D, 8E, 8F, 8V, 8W, 8X, 8Y, 9B, 9C, 9D, 9E, 9W, 9X, 9Y, 10B, 10C, 10D, 10E, 10W, 10X, 10Y, 11B, 11C, 11D, 11E, 11W, 11X, 11Y, 12B, 12C, 12D, 12E, 12W, 12X, 12Y, 13B, 13C, 13D, 13E, 13W, 13X, 13Y, 14B, 14C, 14D, 14E, 14V, 14W, 14X, 14Y, 15B, 15C, 15D, 15E, 15V, 15W, 15X, 15Y, 16B, 16C, 16D, 16E, 16V, 16W, 16X, 16Y, 17B, 17C, 17D, 17E, 17F, 17U, 17V, 17Y, 18B, 18C, 18D, 18E, 18F, 18G, 18U, 19B, 19C, 19D, 19E, 19F, 19G, 19U, 20B, 20C, 20D, 20E, 20F, 20G, 20H, 20T, 20U, 20V, 20Y, 21B, 21C, 21D, 21E, 21F, 21G, 21H, 21I, 21S, 21T, 21U, 21V, 21W, 21X, 21Y, 22B, 22C, 22D, 22E, 22F, 22G, 22H, 22I, 22J, 22K, 22Q, 22R, 22S, 22T, 22U, 22V, 22W, 22X, 22Y, 23B, 23C, 23D, 23E, 23F, 23G, 23H, 23I, 23J, 23K, 23L, 23M, 23N, 23O, 23P, 23Q, 23R, 23S, 23T, 23U, 23V, 23W, 23X, 23Y, 24B, 24C, 24D, 24E, 24F, 24G, 24H, 24I, 24J, 24K, 24L, 24M, 24N, 24O, 24P, 24Q, 24R, 24S, 24T, 24U, 24V, 24W, 24X, 24Y, 25B, 25C, 25D, 25E, 25F, 25G, 25H, 25I, 25J, 25K, 25L, 25M, 25N, 25O, 25P, 25Q, 25R, 25S, 25T, 25U, 25V, 25W, 25X, 25Y
Switches: 18W, 18X, 19W, 19X
Floors: 9P, 9Q, 9R, 9S, 9T, 10K, 10L, 10M, 10P, 10Q, 10R, 10S, 10T, 11K, 11L, 11M, 11P, 11Q, 11R, 11S, 11T, 12K, 12L, 12M, 12S, 13K, 13L, 13M, 14K, 14L, 14M, 14N, 15K, 15L, 15M, 16K, 16L, 16M, 17K, 17L, 17M, 18K, 18L, 18M
SandFloors: 5I, 5J, 5K, 5L, 5M, 5N, 5O, 5P, 6H, 6I, 6J, 6K, 6L, 6M, 6N, 6O, 6P, 6Q, 6R, 7G, 7H, 7I, 7J, 7K, 7L, 7M, 7N, 7O, 7P, 7Q, 7R, 7S, 8G, 8H, 8I, 8J, 8K, 8L, 8M, 8N, 9F, 9G, 9H, 9I, 9V, 10F, 10G, 10H, 10I, 10V, 11F, 11G, 11H, 11I, 11V, 12F, 12G, 12H, 12I, 12V, 13F, 13G, 13H, 13I, 13O, 13P, 13Q, 13R, 13S, 13T, 13U, 13V, 14F, 14G, 14H, 14I, 14O, 14P, 14Q, 14R, 14S, 14T, 14U, 15F, 15G, 15H, 15I, 15O, 15P, 15Q, 15R, 15S, 15T, 15U, 16F, 16G, 16H, 16I, 16O, 16P, 16Q, 16R, 16S, 16T, 16U, 17G, 17H, 17I, 17O, 17P, 17Q, 17R, 17S, 17T, 17W, 17X, 18H, 18I, 18O, 18P, 18Q, 18R, 18S, 18T, 18V, 18W, 18X, 18Y, 19H, 19I, 19O, 19P, 19Q, 19R, 19S, 19T, 19V, 19W, 19X, 19Y, 20I, 20J, 20K, 20L, 20M, 20N, 20O, 20P, 20Q, 20R, 20S, 20W, 20X, 21J, 21K, 21L, 21M, 21N, 21O, 21P, 21Q, 21R, 22L, 22M, 22N, 22O, 22P
Player: 14P
FloorLevel 2:
Walls: 1P, 1Q, 1R, 1S, 1T, 1U, 1V, 2P, 2V, 3V, 4P, 4V, 5P, 5V, 6P, 6V, 7P, 7V, 8P, 8V, 9J, 9N, 9P, 9V, 10J, 10N, 10P, 10V, 11J, 11N, 11P, 11V, 12J, 12N, 12P, 12V, 13J, 13K, 13L, 13M, 13N, 13P, 13Q, 13R, 13S, 13T, 13U, 13V, 15J, 15K, 15L, 15M, 15N, 16J, 16N, 17J, 17N, 18J, 18N, 19A, 19B, 19C, 19D, 19E, 19F, 19J, 19N, 20A, 20F, 21A, 21F, 22A, 22F, 23A, 24A, 25A, 26A, 26B, 26C, 26D, 26E, 26F
IceWalls: 1L, 1M, 1N, 2K, 2N, 2O, 3J, 4J, 4M, 4N, 4O, 5J, 5K, 5M, 6K, 6M, 7K, 7M, 8K, 8M, 9K, 9M, 19K, 19M, 20K, 20M, 21K, 21M, 22K, 22M, 22N, 23F, 23G, 23H, 23I, 23J, 23K, 23N, 24N, 25F, 25G, 25H, 25I, 25J, 25M, 25N, 26J, 26K, 26L, 26M
Water: 8Q, 8R, 8S, 8T, 8U, 9Q, 9R, 9S, 9T, 9U
FloorHoles: 11S
Boxes: 10L, 5R, 6S, 3T
Switches: 12S
Floors: 2Q, 2R, 2S, 2T, 2U, 3L, 3P, 3Q, 3R, 3S, 3T, 3U, 4Q, 4R, 4S, 4T, 4U, 5Q, 5R, 5S, 5T, 5U, 6Q, 6R, 6S, 6T, 6U, 7Q, 7R, 7S, 7T, 7U, 10K, 10L, 10M, 10Q, 10R, 10S, 10T, 10U, 11K, 11L, 11M, 11Q, 11R, 11S, 11T, 11U, 12K, 12L, 12M, 12Q, 12R, 12S, 12T, 12U, 16K, 16L, 16M, 17K, 17L, 17M, 18K, 18L, 18M, 20B, 20C, 20D, 20E, 21B, 21C, 21D, 21E, 22B, 22C, 22D, 22E, 23B, 23C, 23D, 23E, 24B, 24C, 24D, 24E, 24L, 25B, 25C, 25D, 25E
IceFloors: 2L, 2M, 3K, 3M, 3N, 3O, 4K, 4L, 5L, 6L, 7L, 8L, 9L, 19L, 20L, 21L, 22L, 23L, 23M, 24F, 24G, 24H, 24I, 24J, 24K, 24M, 25K, 25L
FloorLevel 3:
Walls: 1A, 1B, 1C, 1D, 1E, 1F, 1G, 2A, 2G, 3A, 3G, 4A, 4G, 5A, 5G, 6A, 6G, 7A, 7B, 7C, 7E, 7F, 7G, 8C, 8E, 9C, 9E, 10C, 10E, 11B, 11C, 11E, 12B, 12E, 12F, 12G, 12H, 13B, 14B, 14E, 14F, 14G, 14H, 15B, 15C, 15E, 16C, 16E, 17C, 17E, 18C, 18E, 19A, 19B, 19C, 19E, 19F, 20A, 20F, 21A, 21F, 22A, 22F, 23A, 23F, 24A, 24F, 25A, 25F, 26A, 26B, 26C, 26D, 26E, 26F
IceWalls: 10R, 10S, 10T, 11I, 11J, 11K, 11L, 11R, 11T, 12I, 12L, 12R, 12T, 13L, 13R, 13T, 14I, 14J, 14L, 14R, 14T, 15J, 15L, 15R, 15T, 16J, 16L, 16R, 16T, 17J, 17L, 17R, 17T, 18J, 18L, 18R, 18T, 19H, 19I, 19J, 19L, 19M, 19N, 19O, 19P, 19Q, 19R, 19T, 19U, 20H, 20J, 20U, 21H, 21U, 22H, 22U, 23H, 23R, 23U, 24H, 24U, 25H, 25U, 26H, 26I, 26J, 26K, 26L, 26M, 26N, 26O, 26P, 26Q, 26R, 26S, 26T, 26U
FloorHoles: 11S
Boxes: 22C, 21D, 23D, 20C, 24D, 5C, 5E, 4D, 3E, 3C
Switches: 20I
Floors: 2B, 2C, 2D, 2E, 2F, 3B, 3C, 3D, 3E, 3F, 4B, 4C, 4D, 4E, 4F, 5B, 5C, 5D, 5E, 5F, 6B, 6C, 6D, 6E, 6F, 7D, 8D, 9D, 10D, 11D, 12C, 12D, 13C, 13D, 13E, 13F, 13G, 13H, 14C, 14D, 15D, 16D, 17D, 18D, 19D, 20B, 20C, 20D, 20E, 21B, 21C, 21D, 21E, 22B, 22C, 22D, 22E, 23B, 23C, 23D, 23E, 24B, 24C, 24D, 24E, 25B, 25C, 25D, 25E
IceFloors: 11S, 12J, 12K, 12S, 13I, 13J, 13K, 13S, 14K, 14S, 15K, 15S, 16K, 16S, 17K, 17S, 18K, 18S, 19K, 19S, 20I, 20K, 20L, 20M, 20N, 20O, 20P, 20Q, 20R, 20S, 20T, 21I, 21J, 21K, 21L, 21M, 21N, 21O, 21P, 21Q, 21R, 21S, 21T, 22I, 22J, 22K, 22L, 22M, 22N, 22O, 22P, 22Q, 22R, 22S, 22T, 23I, 23J, 23K, 23L, 23M, 23N, 23O, 23P, 23Q, 23S, 23T, 24I, 24J, 24K, 24L, 24M, 24N, 24O, 24P, 24Q, 24R, 24S, 24T, 25I, 25J, 25K, 25L, 25M, 25N, 25O, 25P, 25Q, 25R, 25S, 25T
Ladders: FL1:11L FL2:11L, FL1:17L FL2:17L, FL2:24C FL3:24C`;

    try {
        const response = await fetch('level.txt');
        if (response.ok) {
            const levelData = await response.text();
            parseLevels(levelData);
        } else {
            console.warn(`HTTP error! status: ${response.status}. Using fallbacks.`);
            parseLevels(fallbackLevels);
        }

        if (levels.length === 0) {
            console.warn('No levels found in level.txt, using fallbacks.');
            parseLevels(fallbackLevels);
        }
    } catch (error) {
        console.warn('Failed to load levels from level.txt, using fallbacks:', error);
        parseLevels(fallbackLevels);
    }
    createLevelMenu();
    window.addEventListener('keydown', handleInput);
    window.addEventListener('resize', () => {
        if (isEditing) resizeEditorCanvas();
        else fitCamera();
    });
    gameLoop();
    document.getElementById('level-file-input').addEventListener('change', handleFileSelect);
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            if (!isEditing && document.getElementById('gameCanvas').style.display !== 'none') {
                fitCamera();
            } else if (isEditing) {
                resizeEditorCanvas();
            }
        }, 400);
    });
}

function parseLevels(text, strict = true) {
    const regex = strict ? /(?:^|\n)\s*Level \d+:/i : /Level \d+:/i;
    const levelBlocks = text.split(regex).filter(b => b.trim());
    levelBlocks.forEach((block, index) => {
        levels.push({
            name: `Level ${index + 1}`,
            data: block.trim()
        });
    });
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        levels.length = 0;
        parseLevels(content);
        if (levels.length > 0) {
            createLevelMenu();
        } else {
            alert('No levels found in the selected file.');
        }
    };
    reader.readAsText(file);
}

function createLevelMenu() {
    const menu = document.getElementById('level-select');
    menu.innerHTML = '';
    levels.forEach((level, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.innerText = level.name;
        btn.onclick = () => startLevel(index);
        menu.appendChild(btn);
    });
}

function startLevel(index) {
    currentLevelIndex = index;
    isTesting = false;
    isWinning = false;
    document.getElementById('win-overlay').style.display = 'none';
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game-ui').style.display = 'flex';
    document.getElementById('gameCanvas').style.display = 'block';
    document.getElementById('back-to-menu-btn').style.display = 'inline-block';
    document.getElementById('back-to-editor-btn').style.display = 'none';
    document.getElementById('level-title').innerText = levels[index].name;

    resetDpadToCenter();
    closeEditorMenu();
    parseLevel(levels[index].data);

    if (!validateFloorData(floorData.map((f, i) => {
        const p = players.find(player => player.floor === i);
        return { grid: f.grid, floorGrid: f.floorGrid, boxes: f.boxes, player: p ? {x: p.x, y: p.y} : null, ladders: f.ladders };
    }), MAX_COL, MAX_ROW, "Main Menu")) return;

    setTimeout(fitCamera, 50);
    setTimeout(fitCamera, 300);
}

function showMenu() {
    closeEditorMenu();
    isEditing = false;
    isTesting = false;
    isWinning = false;
    document.getElementById('win-overlay').style.display = 'none';
    document.getElementById('menu').style.display = 'flex';
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('editor-ui').style.display = 'none';
    document.getElementById('gameCanvas').style.display = 'none';
    document.getElementById('menu').scrollTop = 0;
    document.getElementById('level-select').scrollTop = 0;
}

function openEditor() {
    isEditing = true;
    isTesting = false;
    document.getElementById('win-overlay').style.display = 'none';
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('editor-ui').style.display = 'flex';


    if (editorFloorData.length === 0) {
        editorGrid = Array.from({length: EDITOR_WIDTH}, () => Array(EDITOR_HEIGHT).fill(null));
        editorFloorGrid = Array.from({length: EDITOR_WIDTH}, () => Array(EDITOR_HEIGHT).fill(null));
        editorBoxes = [];
        editorPlayer = { x: 1, y: 1 };
        editorLadders = [];
        editorFloorData = [{
            grid: editorGrid,
            floorGrid: editorFloorGrid,
            boxes: editorBoxes,
            player: editorPlayer,
            ladders: editorLadders
        }];
        editorViewedFloor = 0;
    } else {
        const f = editorFloorData[editorViewedFloor];
        editorGrid = f.grid;
        editorFloorGrid = f.floorGrid;
        editorBoxes = f.boxes;
        editorPlayer = f.player;
        editorLadders = f.ladders;
    }

    resizeEditorCanvas();
}

function toggleEditorMenu() {
    const controls = document.querySelector('.editor-controls');
    const overlay  = document.getElementById('editor-menu-overlay');
    const isOpen   = controls.classList.contains('drawer-open');
    if (isOpen) {
        controls.classList.remove('drawer-open');
        overlay.classList.remove('overlay-open');
    } else {
        controls.classList.add('drawer-open');
        overlay.classList.add('overlay-open');
    }
}

function closeEditorMenu() {
    const controls = document.querySelector('.editor-controls');
    const overlay  = document.getElementById('editor-menu-overlay');
    controls.classList.remove('drawer-open');
    overlay.classList.remove('overlay-open');
}

function serializeLevel(g, fg, b, p, w, h, tpsInput = null, dpsInput = null) {
    let normalWalls = [], iceWalls = [], deepwaterWalls = [], sandstoneWalls = [], switches = [], floorHoles = [], boxesStr = [], normalFloors = [], iceFloors = [], sandFloors = [], waters = [], waterboxes = [];
    let tps = {}, dps = {};

    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            if (!g[x]) continue;
            const coord = `${x + 1}${String.fromCharCode(65 + y)}`;
            const cell = g[x][y];
            if (cell === 'wall') normalWalls.push(coord);
            else if (cell === 'icewall') iceWalls.push(coord);
            else if (cell === 'deepwater') deepwaterWalls.push(coord);
            else if (cell === 'sandstonewall') sandstoneWalls.push(coord);
            else if (cell === 'switch') switches.push(coord);
            else if (cell === 'floorhole') floorHoles.push(coord);
            else if (cell && cell.startsWith('teleporter:')) {
                const group = cell.split(':')[1];
                if (!tps[group]) tps[group] = [];
                tps[group].push(coord);
            } else if (cell && cell.startsWith('duplicator:')) {
                const group = cell.split(':')[1];
                if (!dps[group]) dps[group] = [];
                dps[group].push(coord);
            }

            if (fg[x][y] === 'floor') normalFloors.push(coord);
            else if (fg[x][y] === 'icefloor') iceFloors.push(coord);
            else if (fg[x][y] === 'sandfloor') sandFloors.push(coord);
            else if (fg[x][y] === 'water') waters.push(coord);
            else if (fg[x][y] === 'waterbox') waterboxes.push(coord);
        }
    }

    if (tpsInput) {
        tpsInput.forEach(tp => {
            const coord = `${tp.x + 1}${String.fromCharCode(65 + tp.y)}`;
            if (!tps['default']) tps['default'] = [];
            if (!tps['default'].includes(coord)) tps['default'].push(coord);
        });
    }
    if (dpsInput) {
        dpsInput.forEach(dp => {
            const coord = `${dp.x + 1}${String.fromCharCode(65 + dp.y)}`;
            if (!dps['default']) dps['default'] = [];
            if (!dps['default'].includes(coord)) dps['default'].push(coord);
        });
    }

    b.forEach(box => {
        boxesStr.push(`${box.x + 1}${String.fromCharCode(65 + box.y)}`);
    });
    const playerStr = p ? `${p.x + 1}${String.fromCharCode(65 + p.y)}` : "";

    let data = "";
    if (normalWalls.length > 0) data += `Walls: ${normalWalls.join(', ')}\n`;
    if (iceWalls.length > 0) data += `IceWalls: ${iceWalls.join(', ')}\n`;
    if (sandstoneWalls.length > 0) data += `SandstoneWalls: ${sandstoneWalls.join(', ')}\n`;
    if (deepwaterWalls.length > 0) data += `DeepWater: ${deepwaterWalls.join(', ')}\n`;
    if (waters.length > 0) data += `Water: ${waters.join(', ')}\n`;
    if (floorHoles.length > 0) data += `FloorHoles: ${floorHoles.join(', ')}\n`;
    if (boxesStr.length > 0) data += `Boxes: ${boxesStr.join(', ')}\n`;
    if (switches.length > 0) data += `Switches: ${switches.join(', ')}\n`;

    const tpEntries = Object.values(tps).map(group => group.join(' '));
    if (tpEntries.length > 0) data += `Teleporters: ${tpEntries.join(', ')}\n`;

    const dpEntries = Object.values(dps).map(group => group.join(' '));
    if (dpEntries.length > 0) data += `Duplicators: ${dpEntries.join(', ')}\n`;

    if (normalFloors.length > 0) data += `Floors: ${normalFloors.join(', ')}\n`;
    if (iceFloors.length > 0) data += `IceFloors: ${iceFloors.join(', ')}\n`;
    if (sandFloors.length > 0) data += `SandFloors: ${sandFloors.join(', ')}\n`;
    if (waterboxes.length > 0) data += `WaterBoxes: ${waterboxes.join(', ')}\n`;

    if (playerStr) data += `Player: ${playerStr}\n`;
    return data;
}

function serializeMultiFloorLevel() {
    let out = "";
    if (editorFloorData.length > 1) {
        editorFloorData.forEach((f, idx) => {
            out += `FloorLevel ${idx + 1}:\n`;
            out += serializeLevel(f.grid, f.floorGrid, f.boxes, f.player, EDITOR_WIDTH, EDITOR_HEIGHT, null, null);
        });
    } else {
        const f = editorFloorData[0];
        out += serializeLevel(f.grid, f.floorGrid, f.boxes, f.player, EDITOR_WIDTH, EDITOR_HEIGHT, null, null);
    }

    let ladderPairs = [];
    let allLadders = [];
    editorFloorData.forEach((f, floorIdx) => {
        f.ladders.forEach(l => {
            allLadders.push({...l, floor: floorIdx});
        });
    });

    const groups = {};
    allLadders.forEach(l => {
        if (!groups[l.group]) groups[l.group] = [];
        groups[l.group].push(l);
    });

    Object.values(groups).forEach(groupLadders => {
        if (groupLadders.length === 2) {
            const l1 = groupLadders[0];
            const l2 = groupLadders[1];
            const c1 = `FL${l1.floor + 1}:${l1.x + 1}${String.fromCharCode(65 + l1.y)}`;
            const c2 = `FL${l2.floor + 1}:${l2.x + 1}${String.fromCharCode(65 + l2.y)}`;
            ladderPairs.push(`${c1} ${c2}`);
        }
    });

    if (ladderPairs.length) {
        out += `Ladders: ${ladderPairs.join(', ')}\n`;
    }
    return out;
}


function addFloor() {
    const newGrid = Array.from({length: EDITOR_WIDTH}, () => Array(EDITOR_HEIGHT).fill(null));
    const newFloorGrid = Array.from({length: EDITOR_WIDTH}, () => Array(EDITOR_HEIGHT).fill(null));
    const newBoxes = [];
    const newPlayer = null;
    const newLadders = [];
    editorFloorData.push({
        grid: newGrid,
        floorGrid: newFloorGrid,
        boxes: newBoxes,
        player: newPlayer,
        ladders: newLadders
    });
    switchFloor(editorFloorData.length - 1);
}

function removeCurrentFloor() {
    if (editorFloorData.length <= 1) {
        alert("Cannot remove the last floor.");
        return;
    }
    if (confirm("Are you sure you want to remove the current floor?")) {
        editorFloorData.splice(editorViewedFloor, 1);
        switchFloor(Math.max(0, editorViewedFloor - 1));
    }
}

function nextFloor() {
    if (editorViewedFloor < editorFloorData.length - 1) {
        switchFloor(editorViewedFloor + 1);
    }
}

function prevFloor() {
    if (editorViewedFloor > 0) {
        switchFloor(editorViewedFloor - 1);
    }
}

function switchFloor(idx) {
    editorViewedFloor = idx;
    const f = editorFloorData[idx];
    editorGrid = f.grid;
    editorFloorGrid = f.floorGrid;
    editorBoxes = f.boxes;
    editorPlayer = f.player;
    editorLadders = f.ladders;
    drawEditor();
}

function applyInfill(g, fg, w, h) {
    const infillMapping = {
        'wall': 'floor',
        'icewall': 'icefloor',
        'deepwater': 'water',
        'sandstonewall': 'sandfloor'
    };

    const skipInfill = (cell) =>
        cell === 'floorhole' ||
        (typeof cell === 'string' && (cell.startsWith('teleporter:') || cell.startsWith('duplicator:')));

    const isOutside = Array.from({length: w}, () => Array(h).fill(false));
    const stackOutside = [];

    for (let y = 0; y < h; y++) {
        if (!infillMapping[g[0]?.[y]] && !skipInfill(g[0]?.[y])) stackOutside.push([0, y]);
        if (!infillMapping[g[w-1]?.[y]] && !skipInfill(g[w-1]?.[y])) stackOutside.push([w-1, y]);
    }
    for (let x = 0; x < w; x++) {
        if (!infillMapping[g[x]?.[0]] && !skipInfill(g[x]?.[0])) stackOutside.push([x, 0]);
        if (!infillMapping[g[x]?.[h-1]] && !skipInfill(g[x]?.[h-1])) stackOutside.push([x, h-1]);
    }

    while (stackOutside.length > 0) {
        const [cx, cy] = stackOutside.pop();
        if (cx < 0 || cx >= w || cy < 0 || cy >= h || isOutside[cx][cy]) continue;
        isOutside[cx][cy] = true;

        [[cx-1,cy], [cx+1,cy], [cx,cy-1], [cx,cy+1]].forEach(([nx, ny]) => {
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && !isOutside[nx][ny]) {
                const cell = g[nx]?.[ny];
                if (!infillMapping[cell] && !skipInfill(cell)) {
                    stackOutside.push([nx, ny]);
                }
            }
        });
    }

    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            if (isOutside[x][y] || skipInfill(g[x]?.[y]) || infillMapping[g[x]?.[y]]) continue;

            const enclosure = [];
            const stack = [[x, y]];
            const visited = Array.from({length: w}, () => Array(h).fill(false));
            visited[x][y] = true;

            let wallCounts = { wall: 0, icewall: 0, deepwater: 0, sandstonewall: 0 };

            while (stack.length > 0) {
                const [cx, cy] = stack.pop();
                enclosure.push([cx, cy]);

                [[cx-1,cy], [cx+1,cy], [cx,cy-1], [cx,cy+1]].forEach(([nx, ny]) => {
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[nx][ny]) {
                        const cell = g[nx]?.[ny];
                        if (infillMapping[cell]) {
                            wallCounts[cell]++;
                        } else if (!isOutside[nx][ny] && !skipInfill(cell)) {
                            visited[nx][ny] = true;
                            stack.push([nx, ny]);
                        }
                    }
                });
            }

            let defaultFloor = 'floor';
            const max = Math.max(...Object.values(wallCounts));
            if (max > 0) {
                if (max === wallCounts.deepwater) defaultFloor = 'water';
                else if (max === wallCounts.icewall) defaultFloor = 'icefloor';
                else if (max === wallCounts.sandstonewall) defaultFloor = 'sandfloor';
            }

            enclosure.forEach(([rx, ry]) => {
                if (fg[rx] && fg[rx][ry] == null) {
                    fg[rx][ry] = defaultFloor;
                }
            });
        }
    }
}

function testLevel() {
    if (!validateFloorData(editorFloorData, EDITOR_WIDTH, EDITOR_HEIGHT, "Return to Level Editor")) return;

    testLevelData = serializeMultiFloorLevel();

    isEditing = false;
    isTesting = true;
    isWinning = false;
    closeEditorMenu();
    document.getElementById('win-overlay').style.display = 'none';
    document.getElementById('editor-ui').style.display = 'none';
    document.getElementById('game-ui').style.display = 'flex';
    document.getElementById('gameCanvas').style.display = 'block';
    document.getElementById('back-to-menu-btn').style.display = 'none';
    document.getElementById('back-to-editor-btn').style.display = 'inline-block';
    document.getElementById('level-title').innerText = "Testing Level...";

    resetDpadToCenter();

    parseLevel(testLevelData);
    setTimeout(fitCamera, 50);
    setTimeout(fitCamera, 300);
}

function returnToEditor() {
    closeEditorMenu();
    isTesting = false;
    isEditing = true;
    document.getElementById('win-overlay').style.display = 'none';
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('editor-ui').style.display = 'flex';
    document.getElementById('gameCanvas').style.display = 'none';
    resizeEditorCanvas();
}

let editorOffsetX = 0, editorOffsetY = 0;
let lastTouchEndTime = 0;
let initialPinchDistance = null;
let pinchMidX = 0, pinchMidY = 0;
let touchHasMoved = false;
let initialPinchScale = 1;
let isPanning = false;
let lastTouchX = 0, lastTouchY = 0;

function resizeEditorCanvas(isUserInteraction = false) {
    const editorUi = document.getElementById('editor-ui');
    const wasHidden = editorUi.style.display === 'none' || editorUi.style.display === '';
    if (wasHidden) editorUi.style.display = 'flex';

    const fullGridWidth  = EDITOR_WIDTH  * GRID_SIZE;
    const fullGridHeight = EDITOR_HEIGHT * GRID_SIZE;

    const isPortraitMobile  = isMobile && window.innerWidth < window.innerHeight;
    const isLandscapeMobile = isMobile && window.innerWidth >= window.innerHeight;

    let viewWidth, viewHeight;

    if (isPortraitMobile) {
        const rightPanel   = document.querySelector('.editor-right-panel');
        const hamburgerBtn = document.getElementById('editor-hamburger-btn');
        const rightPanelH  = rightPanel   ? rightPanel.offsetHeight  + 8  : 200;
        const hamburgerH   = hamburgerBtn ? hamburgerBtn.offsetHeight + 8  : 46;
        viewWidth  = window.innerWidth - 12;
        viewHeight = Math.max(80, window.innerHeight - rightPanelH - hamburgerH - 20);
    } else if (isLandscapeMobile) {
        const hamburgerBtn = document.getElementById('editor-hamburger-btn');
        const rightPanel   = document.querySelector('.editor-right-panel');
        const hamburgerW   = hamburgerBtn ? hamburgerBtn.offsetWidth  + 8  : 58;
        const rightPanelW  = rightPanel   ? rightPanel.offsetWidth   + 8  : 160;
        viewWidth  = Math.max(80, window.innerWidth  - hamburgerW - rightPanelW - 16);
        viewHeight = window.innerHeight - 20;
    } else {
        const controlsWidth = document.querySelector('.editor-controls').offsetWidth;
        const paletteWidth  = document.querySelector('.palette').offsetWidth;
        const gap = window.innerWidth <= 600 ? 10 : 20;
        viewWidth  = window.innerWidth  - controlsWidth - paletteWidth - (gap * 2) - 20;
        viewHeight = window.innerHeight - 20;
    }

    baseEditorScale = Math.min(2, viewWidth / fullGridWidth, viewHeight / fullGridHeight);
    editorScale     = baseEditorScale * editorPinchScale;

    editorCanvas.width  = Math.max(1, viewWidth);
    editorCanvas.height = Math.max(1, viewHeight);
    editorCtx.imageSmoothingEnabled = false;
    editorCanvas.style.display = 'inline-block';

    if (!isUserInteraction) {
        editorOffsetX = (viewWidth  / editorScale - fullGridWidth)  / 2;
        editorOffsetY = (viewHeight / editorScale - fullGridHeight) / 2;
    }

    if (wasHidden) editorUi.style.display = 'none';
}

function initEditorPinchZoom() {
}


function selectTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.palette-item').forEach(el => el.classList.remove('selected'));
    document.getElementById(`p-${tool}`).classList.add('selected');
}

function handleEditorClick(e) {
    if (isPanning || initialPinchDistance) return;
    if (e.touches && e.touches.length > 1) return;
    if (editorPinchScale > 1 && (e.type === 'touchmove' || e.type === 'mousemove')) return;

    const promptTools = ['teleporter', 'duplicator', 'ladderup', 'ladderdown'];
    if (promptTools.includes(currentTool) && e.type === 'touchmove') return;

    const rect = editorCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const x = Math.floor(mouseX / (GRID_SIZE * editorScale) - editorOffsetX / GRID_SIZE);
    const y = Math.floor(mouseY / (GRID_SIZE * editorScale) - editorOffsetY / GRID_SIZE);

    if (x < 0 || x >= EDITOR_WIDTH || y < 0 || y >= EDITOR_HEIGHT) return;

    if (currentTool === 'wall') {
        editorGrid[x][y] = 'wall';
        editorFloorGrid[x][y] = null;
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'icewall') {
        editorGrid[x][y] = 'icewall';
        editorFloorGrid[x][y] = null;
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'sandstonewall') {
        editorGrid[x][y] = 'sandstonewall';
        editorFloorGrid[x][y] = null;
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'box') {
        if (editorFloorGrid[x][y] === 'water') return;
        editorGrid[x][y] = null;
        if (!editorBoxes.some(b => b.x === x && b.y === y)) {
            editorBoxes.push({x, y});
        }
        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'switch') {
        if (editorFloorGrid[x][y] === 'water') return;
        editorGrid[x][y] = 'switch';
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'player') {
        if (editorFloorGrid[x][y] === 'water') return;
        editorGrid[x][y] = null;
        editorPlayer = {x, y};
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'floor') {
        editorGrid[x][y] = null;
        editorFloorGrid[x][y] = 'floor';
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'icefloor') {
        editorGrid[x][y] = null;
        editorFloorGrid[x][y] = 'icefloor';
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'sandfloor') {
        editorGrid[x][y] = null;
        editorFloorGrid[x][y] = 'sandfloor';
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'teleporter') {
        if (editorFloorGrid[x][y] === 'water') return;
        const group = prompt("Enter Teleporter group (e.g., 1, 2, 3...):", "1") || "1";
        editorGrid[x][y] = `teleporter:${group}`;
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'duplicator') {
        if (editorFloorGrid[x][y] === 'water') return;
        const group = prompt("Enter Duplicator group (e.g., 1, 2, 3...):", "1") || "1";
        editorGrid[x][y] = `duplicator:${group}`;
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'water') {
        editorGrid[x][y] = null;
        editorFloorGrid[x][y] = 'water';
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'deepwater') {
        editorGrid[x][y] = 'deepwater';
        editorFloorGrid[x][y] = null;
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'waterbox') {
        editorGrid[x][y] = null;
        editorFloorGrid[x][y] = 'waterbox';
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'floorhole') {
        const cell = editorGrid[x]?.[y];
        const fg = editorFloorGrid[x]?.[y];

        const isInvalidTile =
            cell === 'wall' ||
            cell === 'icewall' ||
            cell === 'sandstonewall' ||
            cell === 'deepwater' ||
            fg === 'water' ||
            fg === 'waterbox';

        if (isInvalidTile) return;
        if (editorViewedFloor === 0) return;

        editorGrid[x][y] = 'floorhole';
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'erase') {
        editorGrid[x][y] = null;
        editorFloorGrid[x][y] = null;
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        editorLadders = editorLadders.filter(l => l.x !== x || l.y !== y);

        if (editorPlayer && editorPlayer.x === x && editorPlayer.y === y) {
            editorPlayer = null;
        }

        applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
    } else if (currentTool === 'ladderup') {
        editorGrid[x][y] = null;
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        editorLadders = editorLadders.filter(l => l.x !== x || l.y !== y);
        const group = prompt("Enter Ladder group (to pair with a ladder on another floor):", "1") || "1";
        editorLadders.push({x, y, type: 'up', group});
    } else if (currentTool === 'ladderdown') {
        editorGrid[x][y] = null;
        editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
        editorLadders = editorLadders.filter(l => l.x !== x || l.y !== y);
        const group = prompt("Enter Ladder group (to pair with a ladder on another floor):", "1") || "1";
        editorLadders.push({x, y, type: 'down', group});
    }

    const f = editorFloorData[editorViewedFloor];
    f.grid = editorGrid;
    f.floorGrid = editorFloorGrid;
    f.boxes = editorBoxes;
    f.player = editorPlayer;
    f.ladders = editorLadders;
}

async function saveLevel(onlyCurrent = false) {
    if (editorPlayer && !isPlayerEnclosed(editorGrid, EDITOR_WIDTH, EDITOR_HEIGHT, editorPlayer.x, editorPlayer.y)) {
        showLevelError("Error: Player must be in an enclosed space!", "Return to Level Editor");
        return;
    }

    const levelData = serializeMultiFloorLevel();

    const newLevel = {
        name: `Level ${levels.length + 1}`,
        data: levelData
    };
    levels.push(newLevel);

    if (onlyCurrent) {
        downloadSingleLevel(newLevel);
    } else {
        downloadLevelsFile();
    }

    createLevelMenu();
    showMenu();
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadSingleLevel(level) {
    const levelText = `${level.name}:\n${level.data}`;
    const blob = new Blob([levelText], { type: 'text/plain' });
    downloadBlob(blob, 'level.txt');
}


function downloadLevelsFile() {
    const allLevelsText = levels.map((l, i) => `Level ${i + 1}:\n${l.data}`).join('\n\n');
    const blob = new Blob([allLevelsText], { type: 'text/plain' });
    downloadBlob(blob, 'level.txt');
}

function clearEditorGrid() {
    if (confirm('Are you sure you want to clear the level? This will remove everything except the player.')) {
        editorGrid = Array.from({length: EDITOR_WIDTH}, () => Array(EDITOR_HEIGHT).fill(null));
        editorFloorGrid = Array.from({length: EDITOR_WIDTH}, () => Array(EDITOR_HEIGHT).fill(null));
        editorBoxes = [];
        editorLadders = [];

        if (!editorPlayer) {
            editorPlayer = { x: 0, y: 0 };
        }

        editorViewedFloor = 0;
        editorFloorData = [{
            grid: editorGrid,
            floorGrid: editorFloorGrid,
            boxes: editorBoxes,
            player: editorPlayer,
            ladders: editorLadders
        }];
        drawEditor();
    }
}
function loadLevelIntoEditor(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;


        editorFloorData = [];

        parseLevel(content);


        editorFloorData = floorData.map((f, i) => {
            const p = players.find(player => player.floor === i);
            return {
                grid: f.grid,
                floorGrid: f.floorGrid,
                boxes: f.boxes.map(b => ({x: b.x, y: b.y})),
                player: p ? {x: p.x, y: p.y} : null,
                ladders: f.ladders
            };
        });



        switchFloor(0);
        resizeEditorCanvas();

        alert(`Level loaded successfully! ${editorFloorData.length} floors`);
        input.value = "";
    };
    reader.readAsText(file);
}

async function deleteCurrentLevel() {
    const levelIdx = prompt(`Enter level number to delete (1-${levels.length}):`);
    if (!levelIdx) return;
    const idx = parseInt(levelIdx) - 1;
    if (isNaN(idx) || idx < 0 || idx >= levels.length) {
        alert('Invalid level number');
        return;
    }

    if (confirm(`Are you sure you want to delete Level ${idx + 1}?`)) {
        levels.splice(idx, 1);
        const allLevelsText = levels.map((l, i) => `Level ${i + 1}:\n${l.data}`).join('\n\n');

        alert('Level deleted from session!');

        levels.length = 0;
        parseLevels(allLevelsText, false);
        createLevelMenu();
        showMenu();
    }
}

function restartLevel() {
    isWinning = false;
    document.getElementById('win-overlay').style.display = 'none';
    if (isTesting) {
        closeEditorMenu();
        parseLevel(testLevelData);
        fitCamera();
    } else {
        startLevel(currentLevelIndex);
    }
}

function nextLevel() {
    if (currentLevelIndex < levels.length - 1) {
        startLevel(currentLevelIndex + 1);
    }
}

function previousLevel() {
    if (currentLevelIndex > 0) {
        startLevel(currentLevelIndex - 1);
    }
}

function replayLevel() {
    restartLevel();
}
function parseLevel(text) {
    let laddersStr = "";
    const ladderMatch = text.match(/Ladders:\s*(.*)$/is);
    if (ladderMatch) {
        laddersStr = ladderMatch[1].trim();
        text = text.replace(/Ladders:.*$/is, '').trim();
    }

    const hasFloors = /(?:^|\n)\s*FloorLevel \d+:/i.test(text);
    let floorTexts;

    if (hasFloors) {
        const parts = text.split(/(?:^|\n)\s*FloorLevel \d+:/i);
        floorTexts = parts.slice(1).map(b => b.trim()).filter(b => b.length > 0);
    } else {
        floorTexts = [text];
    }

    floorData = [];
    numFloors = floorTexts.length;
    currentFloor = 0;
    viewedFloor = 0;

    let maxW = 1, maxH = 1;

    let nextLadderGroup = 1;

    floorTexts.forEach((floorText, floorIndex) => {
        const lines = floorText.trim().split('\n').map(l => l.trim()).filter(l => l);

        let fNormalWalls = [], fIceWalls = [], fSandstoneWalls = [], fDeepwaterWalls = [], fFloorHoles = [],
            fTempBoxes = [], fTempSwitches = [], fPlayerPos = null;
        let fNormalFloors = [], fIceFloors = [], fSandFloors = [], fWaters = [], fWaterboxes = [];
        let fTempTeleporters = [], fTempDuplicators = [];
        let fUsedCols = 1, fUsedRows = 1;

        const parseSingleCoord = (c) => {
            const letter = c.slice(-1);
            const num = parseInt(c.slice(0, -1), 10);
            const col = num - 1;
            const row = letter.charCodeAt(0) - 'A'.charCodeAt(0);
            if (col < 0 || col >= MAX_COL || row < 0 || row >= MAX_ROW) return null;
            fUsedCols = Math.max(fUsedCols, col + 1);
            fUsedRows = Math.max(fUsedRows, row + 1);
            return {x: col, y: row};
        };

        for (const line of lines) {
            const parts = line.split(':');
            if (parts.length < 2) continue;
            const type = parts[0].trim();
            const coordsStr = parts[1].trim();

            const parseCoords = (str) => str.split(',').map(c => c.trim().toUpperCase())
                .filter(c => c.length >= 2 && /^\d+[A-Z]$/.test(c))
                .map(c => {
                    const pos = parseSingleCoord(c);
                    return pos ? { ...pos, label: c } : null;
                }).filter(Boolean);

            const parsePairs = (str) => {
                const pairs = [];
                const groups = str.split(',').map(g => g.trim()).filter(g => g);
                groups.forEach(group => {
                    const groupCoords = group.split(/\s+/).map(c => c.trim().toUpperCase())
                        .filter(c => c.length >= 2 && /^\d+[A-Z]$/.test(c))
                        .map(parseSingleCoord)
                        .filter(Boolean);
                    if (groupCoords.length > 0) pairs.push(groupCoords);
                });
                return pairs;
            };

            const lowerType = type.toLowerCase();
            if (lowerType === 'walls') fNormalWalls = parseCoords(coordsStr);
            else if (lowerType === 'icewalls') fIceWalls = parseCoords(coordsStr);
            else if (lowerType === 'sandstonewalls') fSandstoneWalls = parseCoords(coordsStr);
            else if (lowerType === 'deepwater') fDeepwaterWalls = parseCoords(coordsStr);
            else if (lowerType === 'boxes') fTempBoxes = parseCoords(coordsStr);
            else if (lowerType === 'switches') fTempSwitches = parseCoords(coordsStr);
            else if (lowerType === 'floors') fNormalFloors = parseCoords(coordsStr);
            else if (lowerType === 'icefloors') fIceFloors = parseCoords(coordsStr);
            else if (lowerType === 'sandfloors') fSandFloors = parseCoords(coordsStr);
            else if (lowerType === 'water') fWaters = parseCoords(coordsStr);
            else if (lowerType === 'waterboxes') fWaterboxes = parseCoords(coordsStr);
            else if (lowerType === 'floorholes') fFloorHoles = parseCoords(coordsStr);
            else if (lowerType === 'player') {
                const pCoords = parseCoords(coordsStr);
                if (pCoords.length > 0) fPlayerPos = pCoords[0];
            }
            else if (lowerType === 'teleporters') fTempTeleporters = parsePairs(coordsStr);
            else if (lowerType === 'duplicators') fTempDuplicators = parsePairs(coordsStr);
        }

        maxW = Math.max(maxW, fUsedCols);
        maxH = Math.max(maxH, fUsedRows);

        const fGrid = Array.from({length: MAX_COL}, () => Array(MAX_ROW).fill(null));
        const fFloorGrid = Array.from({length: MAX_COL}, () => Array(MAX_ROW).fill(null));

        fNormalWalls.forEach(pos => { fGrid[pos.x][pos.y] = 'wall'; });
        fIceWalls.forEach(pos => { fGrid[pos.x][pos.y] = 'icewall'; fFloorGrid[pos.x][pos.y] = 'icefloor'; });
        fDeepwaterWalls.forEach(pos => { fGrid[pos.x][pos.y] = 'deepwater'; });
        fFloorHoles.forEach(pos => { fGrid[pos.x][pos.y] = 'floorhole'; });
        fSandstoneWalls.forEach(pos => { fGrid[pos.x][pos.y] = 'sandstonewall'; fFloorGrid[pos.x][pos.y] = 'sandfloor'; });
        fWaters.forEach(pos => { fFloorGrid[pos.x][pos.y] = 'water'; });
        fTempSwitches.forEach(pos => { fGrid[pos.x][pos.y] = 'switch'; });
        fIceFloors.forEach(pos => { fFloorGrid[pos.x][pos.y] = 'icefloor'; });
        fNormalFloors.forEach(pos => { fFloorGrid[pos.x][pos.y] = 'floor'; });
        fSandFloors.forEach(pos => { fFloorGrid[pos.x][pos.y] = 'sandfloor'; });
        fWaterboxes.forEach(pos => { fFloorGrid[pos.x][pos.y] = 'waterbox'; });

        const fTeleporters = [];
        fTempTeleporters.forEach(group => {
            group.forEach((pos, i) => {
                const nextPos = group[(i + 1) % group.length];
                fTeleporters.push({
                    x: pos.x, y: pos.y,
                    targetX: nextPos.x, targetY: nextPos.y,
                    isOccupied: false,
                    group: group
                });
            });
        });

        const fDuplicators = [];
        fTempDuplicators.forEach(group => {
            group.forEach(pos => {
                fDuplicators.push({
                    x: pos.x, y: pos.y,
                    outputs: group.filter(p => p !== pos),
                    isBroken: false
                });
            });
        });

        const fBoxes = fTempBoxes.map(pos => ({
            x: pos.x, y: pos.y,
            pixelX: pos.x * GRID_SIZE, pixelY: pos.y * GRID_SIZE,
            targetX: pos.x, targetY: pos.y,
            isMoving: false, moveProgress: 0,
            slideDir: null, isSliding: false,
            floor: floorIndex
        }));

        let nextGroupId = 1;
        fTempTeleporters.forEach(groupCoords => {
            const groupStr = nextGroupId.toString();
            groupCoords.forEach(pos => {
                if (fGrid[pos.x] && fGrid[pos.x][pos.y] === null) {
                    fGrid[pos.x][pos.y] = `teleporter:${groupStr}`;
                }
            });
            nextGroupId++;
        });

        nextGroupId = 1;
        fTempDuplicators.forEach(groupCoords => {
            const groupStr = nextGroupId.toString();
            groupCoords.forEach(pos => {
                if (fGrid[pos.x] && fGrid[pos.x][pos.y] === null) {
                    fGrid[pos.x][pos.y] = `duplicator:${groupStr}`;
                }
            });
            nextGroupId++;
        });

        applyInfill(fGrid, fFloorGrid, fUsedCols, fUsedRows);

        floorData.push({
            grid: fGrid,
            floorGrid: fFloorGrid,
            boxes: fBoxes,
            teleporters: fTeleporters,
            duplicators: fDuplicators,
            playerPos: fPlayerPos,
            ladders: []
        });
    });

    if (laddersStr) {
        const ladderGroups = laddersStr.split(/\s*,\s*/).map(g => g.trim()).filter(g => g);

        ladderGroups.forEach(groupStr => {
            const parts = groupStr.split(/\s+/).filter(p => p);
            if (parts.length === 2) {
                const parsePart = (p) => {
                    const m = p.match(/FL\s*(\d+)\s*:\s*(\d+)\s*([A-Z])/i);
                    if (!m) {
                        return null;
                    }
                    return {
                        floor: parseInt(m[1], 10) - 1,
                        x: parseInt(m[2], 10) - 1,
                        y: m[3].toUpperCase().charCodeAt(0) - 65
                    };
                };
                const p1 = parsePart(parts[0]);
                const p2 = parsePart(parts[1]);

                if (p1 && p2 && p1.floor >= 0 && p1.floor < numFloors && p2.floor >= 0 && p2.floor < numFloors) {
                    const type1 = p1.floor < p2.floor ? 'up' : 'down';
                    const type2 = p2.floor < p1.floor ? 'up' : 'down';

                    floorData[p1.floor].ladders.push({
                        x: p1.x, y: p1.y, type: type1,
                        targetX: p2.x, targetY: p2.y,
                        group: nextLadderGroup
                    });
                    floorData[p2.floor].ladders.push({
                        x: p2.x, y: p2.y, type: type2,
                        targetX: p1.x, targetY: p1.y,
                        group: nextLadderGroup
                    });


                    nextLadderGroup++;
                } else {
                }
            } else {
            }
        });
    }


    width = Math.min(maxW, MAX_COL);
    height = Math.min(maxH, MAX_ROW);

    players = [];
    for (let i = 0; i < numFloors; i++) {
        if (floorData[i].playerPos) {
            const pPos = floorData[i].playerPos;
            const p = {
                x: pPos.x, y: pPos.y,
                pixelX: pPos.x * GRID_SIZE, pixelY: pPos.y * GRID_SIZE,
                targetX: pPos.x, targetY: pPos.y,
                isMoving: false, moveProgress: 0, walkStep: 0,
                facing: 'down', isSliding: false,
                floor: i
            };
            players.push(p);
        }
    }

    if (players.length > 0) {
        player = players[0];
        currentFloor = player.floor;
        viewedFloor = player.floor;
    } else {
        players.push({ x: 0, y: 0, pixelX: 0, pixelY: 0, targetX: 0, targetY: 0, isMoving: false, moveProgress: 0, walkStep: 0, facing: 'down', isSliding: false, floor: 0 });
        player = players[0];
        currentFloor = 0;
        viewedFloor = 0;
    }

    const cf = floorData[currentFloor];
    grid = cf.grid;
    floorGrid = cf.floorGrid;
    rebuildGlobalBoxes();
    teleporters = cf.teleporters;
    duplicators = cf.duplicators;
    moveQueue = [];
}

function isWall(x, y, forBoxPush = false, entFloor = null) {
    const fl = (entFloor !== null) ? entFloor : viewedFloor;
    if (x < 0 || x >= width || y < 0 || y >= height || !floorData[fl]?.grid?.[x]) return true;

    const cell = floorData[fl].grid[x][y];
    if (cell === 'wall' || cell === 'icewall' || cell === 'sandstonewall') return true;
    if (cell === 'deepwater' && !forBoxPush) return true;

    if (forBoxPush) {
        const ladder = floorData[fl].ladders?.find(l => l.x === x && l.y === y);
        if (ladder) return true;
    }
    return false;
}

function canSlideTo(nx, ny, dx, dy, movingEntity = null) {
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        return false;
    }

    const fl = movingEntity ? movingEntity.floor : viewedFloor;
    const thisGrid      = floorData[fl]?.grid      || [];
    const thisFloorGrid = floorData[fl]?.floorGrid || [];
    const thisBoxes     = floorData[fl]?.boxes     || [];

    const cell = thisGrid[nx]?.[ny];

    if (cell === 'wall' || cell === 'icewall' || cell === 'sandstonewall') {
        return false;
    }

    if (cell === 'deepwater' || thisFloorGrid[nx]?.[ny] === 'water') {
        return !!(movingEntity && !players.includes(movingEntity));
    }

    const blockingPlayer = players.find(p =>
        p.floor === fl &&
        p.x === nx &&
        p.y === ny &&
        p !== movingEntity
    );

    if (blockingPlayer) {
        const pDx = blockingPlayer.targetX - blockingPlayer.x;
        const pDy = blockingPlayer.targetY - blockingPlayer.y;

        if (blockingPlayer.isMoving && pDx === -dx && pDy === -dy) return false;
        if (!(blockingPlayer.isMoving && pDx === dx && pDy === dy)) return false;
    }

    const blockingBox = thisBoxes.find(b =>
        b.x === nx &&
        b.y === ny &&
        b !== movingEntity
    );

    if (blockingBox) {
        const bDx = blockingBox.targetX - blockingBox.x;
        const bDy = blockingBox.targetY - blockingBox.y;

        if (blockingBox.isMoving && bDx === -dx && bDy === -dy) return false;
        if (!(blockingBox.isMoving && bDx === dx && bDy === dy)) return false;
    }

    if (cell === 'floorhole') {
        return true;
    }

    return true;
}

let offsetX = 0, offsetY = 0;

function fitCamera() {
    const container = document.getElementById('game-canvas-container');
    const viewWidth = container.offsetWidth;
    const viewHeight = container.offsetHeight;

    let minX = width, minY = height, maxX = -1, maxY = -1;
    let hasContent = false;

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (grid[x] && (grid[x][y] === 'wall' || grid[x][y] === 'icewall' || grid[x][y] === 'sandstonewall' || grid[x][y] === 'switch' || grid[x][y] === 'water' || grid[x][y] === 'deepwater' || grid[x][y] === 'floorhole')) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
                hasContent = true;
            }
        }
    }

    if (floorData[viewedFloor] && floorData[viewedFloor].ladders) {
        floorData[viewedFloor].ladders.forEach(l => {
            minX = Math.min(minX, l.x); minY = Math.min(minY, l.y);
            maxX = Math.max(maxX, l.x); maxY = Math.max(maxY, l.y);
            hasContent = true;
        });
    }
    boxes.forEach(b => {
        minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x); maxY = Math.max(maxY, b.y);
        hasContent = true;
    });
    players.forEach(p => {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    });
    hasContent = true;

    if (!hasContent) {
        minX = 0; minY = 0; maxX = width - 1; maxY = height - 1;
    }

    const geoWidth = Math.max(GRID_SIZE, (maxX - minX + 1) * GRID_SIZE) || GRID_SIZE;
    const geoHeight = Math.max(GRID_SIZE, (maxY - minY + 1) * GRID_SIZE) || GRID_SIZE;

    const margin = isMobile ? 0.98 : 0.97;
    scale = Math.min(viewWidth / geoWidth * margin, viewHeight / geoHeight * margin);

    canvas.width = viewWidth;
    canvas.height = viewHeight;
    ctx.imageSmoothingEnabled = false;

    offsetX = (viewWidth / scale - geoWidth) / 2 - minX * GRID_SIZE;
    offsetY = (viewHeight / scale - geoHeight) / 2 - minY * GRID_SIZE;
}

function handleMobileMove(dir) {
    handleInput({ key: dir });
}

function handleInput(e) {
    if (isEditing) return;
    if (document.getElementById('gameCanvas').style.display === 'none') return;
    if (document.getElementById('win-overlay').style.display === 'block') return;

    let dir = null;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'up') dir = 'up';
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'down') dir = 'down';
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'left') dir = 'left';
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'right') dir = 'right';

    if (e.key === 'r' || e.key === 'R') {
        restartLevel();
        return;
    }

    if (e.key === 'f' || e.key === 'F') {
        viewedFloor = (viewedFloor + 1) % numFloors;
        const cf = floorData[viewedFloor];
        grid = cf.grid;
        floorGrid = cf.floorGrid;
        rebuildGlobalBoxes();
        teleporters = cf.teleporters;
        duplicators = cf.duplicators;
        fitCamera();
        return;
    }

    if (dir) {
        const anyPlayerCanMove = players.some(p => !p.isMoving);
        if (anyPlayerCanMove && moveQueue.length < 2) {
            moveQueue.push(dir);
        }
    }
}

function processMovement() {
    if (moveQueue.length === 0) return;

    const anyPlayerCanMove = players.some(p => !p.isMoving);
    if (!anyPlayerCanMove) return;

    let dir = moveQueue.shift();
    const dirData = directions[dir];
    let moves = [];

    for (const p of players) {
        if (p.isMoving) continue;
        if (p.floor !== currentFloor) continue;

        let nx = p.x + dirData.dx;
        let ny = p.y + dirData.dy;

        if (isWall(nx, ny, false, p.floor) ||
            (floorData[p.floor]?.floorGrid?.[nx]?.[ny] === 'water')) {
            p.facing = dir;
            continue;
        }

        const someoneTargetingTarget = [...players, ...boxes].find(e =>
            e.targetX === nx && e.targetY === ny && e.isMoving
        );
        if (someoneTargetingTarget) {
            p.facing = dir;
            continue;
        }

        const blockingPlayer = players.find(other =>
            other !== p &&
            other.floor === p.floor &&
            other.x === nx &&
            other.y === ny
        );
        if (blockingPlayer && !blockingPlayer.isMoving) {
            p.facing = dir;
            continue;
        }

        const floorBoxes = floorData[p.floor]?.boxes || [];
        const boxIndex = floorBoxes.findIndex(b => b.x === nx && b.y === ny);
        if (boxIndex !== -1) {
            const box = floorBoxes[boxIndex];
            if (box.isMoving) {
                const bDx = box.targetX - box.x;
                const bDy = box.targetY - box.y;
                if (bDx !== dirData.dx || bDy !== dirData.dy) {
                    p.facing = dir;
                    continue;
                }
            } else {
                let bnx = nx + dirData.dx;
                let bny = ny + dirData.dy;
                if (isWall(bnx, bny, true, p.floor) || !canSlideTo(bnx, bny, dirData.dx, dirData.dy, box)) {
                    p.facing = dir;
                    continue;
                }
                moves.push({entity: box, tx: bnx, ty: bny, dir: dir});
            }
        }
        moves.push({entity: p, tx: nx, ty: ny, dir: dir});
    }

    moves.forEach(m => startMoving(m.entity, m.tx, m.ty, m.dir));
}

function attemptFallThroughHole(entity) {
    if (entity.isMoving) return false;

    const startFloor = entity.floor;
    const startData  = floorData[startFloor];

    if (!startData || startData.grid?.[entity.x]?.[entity.y] !== 'floorhole') {
        return false;
    }

    const isBox = !players.includes(entity);
    const posX = entity.x;
    const posY = entity.y;


    if (isBox) {
        startData.boxes = startData.boxes.filter(b => b !== entity);
    }

    let landingFloor = startFloor - 1;
    while (landingFloor >= 0 && floorData[landingFloor]?.grid?.[posX]?.[posY] === 'floorhole') {
        landingFloor--;
    }
    landingFloor = Math.max(0, landingFloor);

    const finalData = floorData[landingFloor];
    const finalCell = finalData?.grid?.[posX]?.[posY];

    if (finalCell === 'wall' || finalCell === 'icewall' || finalCell === 'sandstonewall') {
        if (isBox) startData.boxes.push(entity);
        return false;
    }

    const occupiedByPlayer = players.some(p => p.floor === landingFloor && p.x === posX && p.y === posY && p !== entity);
    const occupiedByBox    = (finalData?.boxes || []).some(b => b.x === posX && b.y === posY && b !== entity);

    if (occupiedByPlayer || occupiedByBox) {
        if (isBox) startData.boxes.push(entity);
        return false;
    }

    const finalFloor = landingFloor;

    entity.floor    = finalFloor;
    entity.x        = posX;
    entity.y        = posY;
    entity.pixelX   = posX * GRID_SIZE;
    entity.pixelY   = posY * GRID_SIZE;
    entity.targetX  = posX;
    entity.targetY  = posY;

    if (isBox) {
        finalData.boxes.push(entity);
    }

    const viewChanged = (entity === player) || (viewedFloor === startFloor) || (viewedFloor === finalFloor);
    if (viewChanged) {
        if (entity === player) {
            currentFloor = finalFloor;
            viewedFloor  = finalFloor;
        }
        const cf = floorData[viewedFloor];
        grid         = cf.grid;
        floorGrid    = cf.floorGrid;
        rebuildGlobalBoxes();
        teleporters  = cf.teleporters || [];
        duplicators  = cf.duplicators || [];
        fitCamera();
    }

    const finalFloorType = finalData.floorGrid?.[posX]?.[posY];
    if (isBox) {
        if (finalCell === 'deepwater') {
            finalData.boxes = finalData.boxes.filter(b => b !== entity);
        } else if (finalFloorType === 'water' || finalCell === 'water') {
            finalData.grid[posX][posY] = null;
            finalData.floorGrid[posX][posY] = 'waterbox';
            finalData.boxes = finalData.boxes.filter(b => b !== entity);
        }
        if (viewedFloor === finalFloor) rebuildGlobalBoxes();
    } else if (finalCell === 'deepwater' || finalFloorType === 'water') {
        restartLevel();
        return true;
    }

    checkSpecialTiles(
        finalData.grid, finalData.floorGrid,
        [...players, ...finalData.boxes],
        finalData.teleporters || [], finalData.duplicators || []
    );

    rebuildGlobalBoxes();
    return true;
}

function checkLadder(entity) {
    if (!players.includes(entity)) return false;
    const ladder = floorData[entity.floor].ladders.find(l => l.x === entity.x && l.y === entity.y);
    if (ladder) {
        const oldFloor = entity.floor;
        if (ladder.type === 'up' && entity.floor < numFloors - 1) {
            entity.floor++;
        } else if (ladder.type === 'down' && entity.floor > 0) {
            entity.floor--;
        }

        if (entity.floor !== oldFloor) {
            if (ladder.targetX !== undefined && ladder.targetY !== undefined) {
                entity.x = ladder.targetX;
                entity.y = ladder.targetY;
                entity.targetX = ladder.targetX;
                entity.targetY = ladder.targetY;
                entity.pixelX = ladder.targetX * GRID_SIZE;
                entity.pixelY = ladder.targetY * GRID_SIZE;
            }

            if (entity === player) {
                currentFloor = entity.floor;
                viewedFloor = entity.floor;
                const cf = floorData[viewedFloor];
                grid = cf.grid;
                floorGrid = cf.floorGrid;
                rebuildGlobalBoxes();
                teleporters = cf.teleporters;
                duplicators = cf.duplicators;
                fitCamera();
            }
            return true;
        }
    }
    return false;
}

function updateAllEntities() {
    boxes.forEach(b => {
        if (b.isMoving) updateInterpolation(b);
    });
    players.forEach(p => {
        if (p.isMoving) updateInterpolation(p);
    });
}

function startMoving(entity, tx, ty, dir = null) {
    entity.targetX = tx;
    entity.targetY = ty;
    entity.isMoving = true;
    entity.moveProgress = 0;
    if (players.includes(entity)) {
        if (dir) entity.facing = dir;
    } else {
        if (dir) entity.slideDir = dir;
    }
}

function updateInterpolation(entity) {
    const speed = players.includes(entity) ? MOVE_SPEED : BOX_MOVE_SPEED;
    entity.moveProgress += speed;

    if (entity.moveProgress >= 1) {
        entity.moveProgress = 1;
        entity.pixelX = entity.targetX * GRID_SIZE;
        entity.pixelY = entity.targetY * GRID_SIZE;
        entity.x = entity.targetX;
        entity.y = entity.targetY;
        entity.isMoving = false;

        if (!players.includes(entity)) {
            const entityFloorData = floorData[entity.floor];
            const finalCell = entityFloorData?.grid?.[entity.x]?.[entity.y];
            const finalFloorType = entityFloorData?.floorGrid?.[entity.x]?.[entity.y];

            if (finalCell === 'deepwater') {
                entityFloorData.boxes = entityFloorData.boxes.filter(b => b !== entity);
                if (viewedFloor === entity.floor) rebuildGlobalBoxes();
                return;
            }
            else if (finalFloorType === 'water' || finalCell === 'water') {
                entityFloorData.grid[entity.x][entity.y] = null;
                entityFloorData.floorGrid[entity.x][entity.y] = 'waterbox';
                entityFloorData.boxes = entityFloorData.boxes.filter(b => b !== entity);
                if (viewedFloor === entity.floor) rebuildGlobalBoxes();
            }
        }

        checkSpecialTiles();

        let usedLadder = checkLadder(entity);

        const entityFloorData = floorData[entity.floor];
        if (!usedLadder && entityFloorData?.grid?.[entity.x]?.[entity.y] === 'floorhole') {
            attemptFallThroughHole(entity);
        }

        if (players.includes(entity)) {
            const currentFloorType = floorData[entity.floor]?.floorGrid?.[entity.x]?.[entity.y];
            if (currentFloorType === 'icefloor') {
                if (usedLadder) {
                    entity.isSliding = false;
                    entity.walkStep = (entity.walkStep + 1) % 2;
                } else {
                    entity.isSliding = true;
                    const dirData = directions[entity.facing];
                    const nx = entity.x + dirData.dx;
                    const ny = entity.y + dirData.dy;
                    if (canSlideTo(nx, ny, dirData.dx, dirData.dy, entity)) {
                        startMoving(entity, nx, ny, entity.facing);
                    } else {
                        entity.isSliding = false;
                        entity.walkStep = (entity.walkStep + 1) % 2;
                    }
                }
            } else {
                entity.isSliding = false;
                entity.walkStep = (entity.walkStep + 1) % 2;
            }
        } else {
            const currentFloorType = floorData[entity.floor]?.floorGrid?.[entity.x]?.[entity.y];
            if (currentFloorType === 'icefloor' && entity.slideDir) {
                const dirData = directions[entity.slideDir];
                const nx = entity.x + dirData.dx;
                const ny = entity.y + dirData.dy;
                if (canSlideTo(nx, ny, dirData.dx, dirData.dy, entity)) {
                    startMoving(entity, nx, ny, entity.slideDir);
                } else {
                    entity.slideDir = null;
                }
            } else {
                entity.slideDir = null;
            }
        }
    }
    else {
        const startX = entity.x * GRID_SIZE;
        const startY = entity.y * GRID_SIZE;
        const endX = entity.targetX * GRID_SIZE;
        const endY = entity.targetY * GRID_SIZE;
        entity.pixelX = startX + (endX - startX) * entity.moveProgress;
        entity.pixelY = startY + (endY - startY) * entity.moveProgress;

        const midMoveCollision = [...players, ...boxes].find(other =>
            other !== entity &&
            other.isMoving &&
            other.x === entity.targetX &&
            other.y === entity.targetY &&
            other.targetX === entity.x &&
            other.targetY === entity.y
        );

        if (midMoveCollision) {
            entity.moveProgress = 0;
            entity.isMoving = false;
            entity.pixelX = entity.x * GRID_SIZE;
            entity.pixelY = entity.y * GRID_SIZE;
            if (!players.includes(entity)) entity.slideDir = null;
            else entity.isSliding = false;
        }
    }
}

function rebuildGlobalBoxes() {
    boxes = [];
    if (floorData[viewedFloor] && Array.isArray(floorData[viewedFloor].boxes)) {
        boxes.push(...floorData[viewedFloor].boxes);
    }
}

function checkSpecialTiles(localGrid = grid, localFloorGrid = floorGrid, localEntities = [...players, ...boxes], localTeleporters = teleporters, localDuplicators = duplicators) {
    const entities = localEntities;

    localTeleporters.forEach(tp => {
        const anyoneOnTp = entities.some(e => e.x === tp.x && e.y === tp.y);
        const anyoneMovingToTp = entities.some(e => e.isMoving && e.targetX === tp.x && e.targetY === tp.y);
        if (!anyoneOnTp && !anyoneMovingToTp) tp.isOccupied = false;
    });

    const teleportActions = [];
    const blockedGroups = new Set();
    localTeleporters.forEach(tp => {
        const entitiesHeadingToGroup = entities.filter(e => {
            if (!e.isMoving) return false;
            return tp.group.some(gtp => gtp.x === e.targetX && gtp.y === e.targetY);
        });
        if (entitiesHeadingToGroup.length > 1) blockedGroups.add(tp.group);
    });

    entities.forEach(entity => {
        if (entity.isMoving) return;
        const tp = localTeleporters.find(t => t.x === entity.x && t.y === entity.y);
        if (tp && !tp.isOccupied && !blockedGroups.has(tp.group)) {
            const targetTp = localTeleporters.find(t => t.x === tp.targetX && t.y === tp.targetY);
            if (targetTp) {
                const anyoneOnTarget = entities.some(e => e.x === targetTp.x && e.y === targetTp.y);
                const anyoneMovingToTarget = entities.some(e => e.isMoving && e.targetX === targetTp.x && e.targetY === targetTp.y);
                if (!anyoneOnTarget && !anyoneMovingToTarget) {
                    teleportActions.push({ entity, tp, targetTp });
                }
            }
        }
    });

    const finalTeleports = [];
    teleportActions.forEach(action => {
        const isTargetBeingTeleportedTo = finalTeleports.some(a => a.targetTp === action.targetTp);
        const isEntityTeleportingFromTarget = teleportActions.some(a => a.tp === action.targetTp);
        if (!isTargetBeingTeleportedTo && !isEntityTeleportingFromTarget) {
            finalTeleports.push(action);
        }
    });

    finalTeleports.forEach(action => {
        action.entity.x = action.targetTp.x;
        action.entity.y = action.targetTp.y;
        action.entity.targetX = action.targetTp.x;
        action.entity.targetY = action.targetTp.y;
        action.entity.pixelX = action.targetTp.x * GRID_SIZE;
        action.entity.pixelY = action.targetTp.y * GRID_SIZE;
        action.targetTp.isOccupied = true;
    });

    let shouldRebuildBoxes = false;

    entities.forEach(entity => {
        if (entity.isMoving) return;

        const dp = localDuplicators.find(d => d.x === entity.x && d.y === entity.y);
        if (dp && !dp.isBroken) {
            const group = localDuplicators.filter(d =>
                (d.x === dp.x && d.y === dp.y) ||
                dp.outputs.some(o => o.x === d.x && o.y === d.y)
            );
            group.forEach(d => d.isBroken = true);

            dp.outputs.forEach(out => {
                const anyoneOnOut = entities.some(e => e.x === out.x && e.y === out.y);
                if (!anyoneOnOut) {
                    if (players.includes(entity)) {
                        const newPlayer = JSON.parse(JSON.stringify(entity));
                        newPlayer.x = out.x;
                        newPlayer.y = out.y;
                        newPlayer.targetX = out.x;
                        newPlayer.targetY = out.y;
                        newPlayer.pixelX = out.x * GRID_SIZE;
                        newPlayer.pixelY = out.y * GRID_SIZE;
                        newPlayer.isMoving = false;
                        newPlayer.floor = entity.floor;
                        players.push(newPlayer);
                    } else {
                        const newBox = JSON.parse(JSON.stringify(entity));
                        newBox.x = out.x;
                        newBox.y = out.y;
                        newBox.targetX = out.x;
                        newBox.targetY = out.y;
                        newBox.pixelX = out.x * GRID_SIZE;
                        newBox.pixelY = out.y * GRID_SIZE;
                        newBox.isMoving = false;
                        newBox.floor = entity.floor;
                        floorData[entity.floor].boxes.push(newBox);

                        if (entity.floor === viewedFloor) {
                            shouldRebuildBoxes = true;
                        }
                    }
                }
            });
        }
    });

    if (shouldRebuildBoxes) {
        rebuildGlobalBoxes();
    }
}

function checkWin() {
    if (isEditing || (document.getElementById('game-ui').style.display === 'none')) return;

    let allSwitchesCovered = true;
    let totalSwitches = 0;

    floorData.forEach(f => {
        const switches = [];
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                if (f.grid[x][y] === 'switch') {
                    switches.push({x, y});
                }
            }
        }
        totalSwitches += switches.length;
        const floorSwitchesCovered = switches.every(s =>
            f.boxes.some(b => b.x === s.x && b.y === s.y)
        );
        if (!floorSwitchesCovered) allSwitchesCovered = false;
    });

    if (allSwitchesCovered && totalSwitches > 0) {
        if (isWinning) return;
        isWinning = true;

        const overlay = document.getElementById('win-overlay');
        const message = document.getElementById('win-message');
        const nextBtn = document.getElementById('next-lvl-btn');
        const replayBtn = document.getElementById('replay-lvl-btn');
        const prevBtn = document.getElementById('prev-lvl-btn');
        const menuBtn = document.getElementById('win-menu-btn');
        const editorBtn = document.getElementById('win-editor-btn');

        if (isTesting) {
            message.innerText = "Test complete!";
            nextBtn.style.display = 'none';
            replayBtn.style.display = 'none';
            prevBtn.style.display = 'none';
            menuBtn.innerText = "Return to Main Menu";
            menuBtn.style.display = 'inline-block';
            editorBtn.innerText = "Return to Level Editor";
            editorBtn.style.display = 'inline-block';
        } else {
            message.innerText = "You win!";
            nextBtn.style.display = (currentLevelIndex < levels.length - 1) ? 'inline-block' : 'none';
            replayBtn.style.display = 'inline-block';
            prevBtn.style.display = (currentLevelIndex > 0) ? 'inline-block' : 'none';
            menuBtn.innerText = "Main Menu";
            menuBtn.style.display = 'inline-block';
            editorBtn.style.display = 'none';
        }
        overlay.style.display = 'block';
    }
}

function gameLoop() {
    processMovement();
    updateAllEntities();


    let fallCandidates = [];

    for (let floorIdx = 0; floorIdx < numFloors; floorIdx++) {
        if (!floorData[floorIdx]?.grid) continue;

        const floorEntities = [
            ...players.filter(p => !p.isMoving && p.floor === floorIdx),
            ...(floorData[floorIdx].boxes || []).filter(b => !b.isMoving)
        ];

        floorEntities.forEach(entity => {
            if (!entity || typeof entity.x !== 'number' || typeof entity.y !== 'number') return;

            const thisFloorData = floorData[floorIdx];
            if (thisFloorData.grid?.[entity.x]?.[entity.y] === 'floorhole') {
                fallCandidates.push({ entity, fromFloor: floorIdx });
            }
        });
    }

    fallCandidates.sort((a, b) => b.fromFloor - a.fromFloor);

    const actuallyFell = [];

    fallCandidates.forEach(({ entity }) => {
        if (floorData[entity.floor]?.grid?.[entity.x]?.[entity.y] === 'floorhole') {
            const didFall = attemptFallThroughHole(entity);
            if (didFall) {
                actuallyFell.push(entity);
            }
        }
    });

    if (actuallyFell.length > 0) {
        rebuildGlobalBoxes();
    }

    if (isEditing) {
        drawEditor();
    } else {
        draw();
        if (!isEditing) checkWin();
    }

    requestAnimationFrame(gameLoop);
}

function drawEditor() {
    if (document.getElementById('editor-ui').style.display === 'none') return;
    editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
    editorCtx.save();
    editorCtx.scale(editorScale || 1, editorScale || 1);
    editorCtx.translate(editorOffsetX || 0, editorOffsetY || 0);

    if (!isTesting) {
        editorCtx.strokeStyle = '#333';
        editorCtx.lineWidth = 0.5;
        for (let x = 0; x <= EDITOR_WIDTH; x++) {
            editorCtx.beginPath();
            editorCtx.moveTo(x * GRID_SIZE, 0);
            editorCtx.lineTo(x * GRID_SIZE, EDITOR_HEIGHT * GRID_SIZE);
            editorCtx.stroke();
        }
        for (let y = 0; y <= EDITOR_HEIGHT; y++) {
            editorCtx.beginPath();
            editorCtx.moveTo(0, y * GRID_SIZE);
            editorCtx.lineTo(EDITOR_WIDTH * GRID_SIZE, y * GRID_SIZE);
            editorCtx.stroke();
        }

        editorCtx.fillStyle = "rgba(255, 255, 0, 0.5)";
        editorCtx.font = "12px Arial";
        editorCtx.fillText(`Floor ${editorViewedFloor + 1}`, 5, 15);
    }

    const visited = calculateVisitedGrid(editorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);

    for (let x = 0; x < EDITOR_WIDTH; x++) {
        for (let y = 0; y < EDITOR_HEIGHT; y++) {
            if (editorFloorGrid[x] && editorFloorGrid[x][y]) {
                let floorImg;
                if (editorFloorGrid[x][y] === 'icefloor') {
                    floorImg = images.icefloor;
                } else if (editorFloorGrid[x][y] === 'sandfloor') {
                    floorImg = images.sandfloor;
                } else if (editorFloorGrid[x][y] === 'waterbox') {
                    const waterboxIndex = Math.floor(performance.now() / 200) % 2;
                    floorImg = images.waterboxFrames[waterboxIndex];
                } else if (editorFloorGrid[x][y] === 'water') {
                    const waterFrameIndex = Math.floor(performance.now() / 200) % 4;
                    floorImg = images.waterFrames[waterFrameIndex];
                } else {
                    floorImg = images.floor;
                }
                editorCtx.drawImage(floorImg, x * GRID_SIZE, y * GRID_SIZE);
            }
        }
    }

    const waterFrameIndex = Math.floor(performance.now() / 200) % 4;

    for (let x = 0; x < EDITOR_WIDTH; x++) {
        for (let y = 0; y < EDITOR_HEIGHT; y++) {
            if (!editorGrid[x]) continue;
            const cell = editorGrid[x][y];
            if (cell === 'wall') {
                if (!visited[x][y]) editorCtx.drawImage(images.floor, x * GRID_SIZE, y * GRID_SIZE);
                editorCtx.drawImage(images.wall, x * GRID_SIZE, y * GRID_SIZE);
            } else if (cell === 'icewall') {
                if (!visited[x][y]) editorCtx.drawImage(images.icefloor, x * GRID_SIZE, y * GRID_SIZE);
                editorCtx.drawImage(images.icewall, x * GRID_SIZE, y * GRID_SIZE);
            } else if (cell === 'sandstonewall') {
                if (!visited[x][y]) editorCtx.drawImage(images.sandfloor, x * GRID_SIZE, y * GRID_SIZE);
                editorCtx.drawImage(images.sandstonewall, x * GRID_SIZE, y * GRID_SIZE);
            } else if (cell === 'switch') {
                if (!visited[x][y]) {
                    let floorImg;
                    if (editorFloorGrid[x] && editorFloorGrid[x][y] === 'icefloor') {
                        floorImg = images.icefloor;
                    } else if (editorFloorGrid[x] && editorFloorGrid[x][y] === 'sandfloor') {
                        floorImg = images.sandfloor;
                    } else if (editorFloorGrid[x] && editorFloorGrid[x][y] === 'waterbox') {
                        const waterboxIndex = Math.floor(performance.now() / 200) % 2;
                        floorImg = images.waterboxFrames[waterboxIndex];
                    } else if (editorFloorGrid[x] && editorFloorGrid[x][y] === 'water') {
                        floorImg = images.waterFrames[waterFrameIndex];
                    } else {
                        floorImg = images.floor;
                    }
                    editorCtx.drawImage(floorImg, x * GRID_SIZE, y * GRID_SIZE);
                }
                editorCtx.drawImage(images.switch, x * GRID_SIZE, y * GRID_SIZE);
            } else if (cell === 'water') {
            } else if (cell === 'deepwater') {
                if (!visited[x][y]) {
                    editorCtx.drawImage(images.waterFrames[waterFrameIndex], x * GRID_SIZE, y * GRID_SIZE);
                }
                editorCtx.drawImage(images.deepwaterFrames[waterFrameIndex], x * GRID_SIZE, y * GRID_SIZE);
            } else if (cell === 'floorhole') {
                let floorImg;
                const fgType = editorFloorGrid[x]?.[y] || 'floor';

                if (fgType === 'icefloor') {
                    floorImg = images.icefloor;
                } else if (fgType === 'sandfloor') {
                    floorImg = images.sandfloor;
                } else if (fgType === 'waterbox') {
                    const waterboxIndex = Math.floor(performance.now() / 200) % 2;
                    floorImg = images.waterboxFrames[waterboxIndex];
                } else if (fgType === 'water') {
                    floorImg = images.waterFrames[Math.floor(performance.now() / 200) % 4];
                } else {
                    floorImg = images.floor;
                }

                editorCtx.drawImage(floorImg, x * GRID_SIZE, y * GRID_SIZE);
                editorCtx.drawImage(images.floorhole, x * GRID_SIZE, y * GRID_SIZE);
            } else if (cell && cell.startsWith('teleporter:')) {
                editorCtx.drawImage(images.teleporter, x * GRID_SIZE, y * GRID_SIZE);
                editorCtx.fillStyle = "white";
                editorCtx.font = "8px Arial";
                editorCtx.fillText(cell.split(':')[1], x * GRID_SIZE + 2, y * GRID_SIZE + 10);
            } else if (cell && cell.startsWith('duplicator:')) {
                editorCtx.drawImage(images.duplicator, x * GRID_SIZE, y * GRID_SIZE);
                editorCtx.fillStyle = "white";
                editorCtx.font = "8px Arial";
                editorCtx.fillText(cell.split(':')[1], x * GRID_SIZE + 2, y * GRID_SIZE + 10);
            }
        }
    }

    const fIdx = editorViewedFloor;
    if (editorFloorData[fIdx] && editorFloorData[fIdx].ladders) {
        editorFloorData[fIdx].ladders.forEach(ladder => {
            const img = ladder.type === 'up' ? images.ladderup : images.ladderdown;
            if (img.complete && img.naturalHeight !== 0) {
                editorCtx.drawImage(img, ladder.x * GRID_SIZE, ladder.y * GRID_SIZE);
            }
        });
    }

    editorBoxes.forEach(b => {
        if (editorFloorGrid[b.x] && editorFloorGrid[b.x][b.y]) {
            let floorImg;
            if (editorFloorGrid[b.x][b.y] === 'icefloor') {
                floorImg = images.icefloor;
            } else if (editorFloorGrid[b.x][b.y] === 'sandfloor') {
                floorImg = images.sandfloor;
            } else if (editorFloorGrid[b.x][b.y] === 'waterbox') {
                const waterboxIndex = Math.floor(performance.now() / 200) % 2;
                floorImg = images.waterboxFrames[waterboxIndex];
            } else if (editorFloorGrid[b.x][b.y] === 'water') {
                floorImg = images.waterFrames[waterFrameIndex];
            } else {
                floorImg = images.floor;
            }
            editorCtx.drawImage(floorImg, b.x * GRID_SIZE, b.y * GRID_SIZE);
        } else if (!visited[b.x][b.y]) {
            editorCtx.drawImage(images.floor, b.x * GRID_SIZE, b.y * GRID_SIZE);
        }
        editorCtx.drawImage(images.box, b.x * GRID_SIZE, b.y * GRID_SIZE);
    });

    if (editorPlayer) {
        if (editorFloorGrid[editorPlayer.x] && editorFloorGrid[editorPlayer.x][editorPlayer.y]) {
            let floorImg;
            if (editorFloorGrid[editorPlayer.x][editorPlayer.y] === 'icefloor') {
                floorImg = images.icefloor;
            } else if (editorFloorGrid[editorPlayer.x][editorPlayer.y] === 'sandfloor') {
                floorImg = images.sandfloor;
            } else if (editorFloorGrid[editorPlayer.x][editorPlayer.y] === 'waterbox') {
                const waterboxIndex = Math.floor(performance.now() / 200) % 2;
                floorImg = images.waterboxFrames[waterboxIndex];
            } else if (editorFloorGrid[editorPlayer.x][editorPlayer.y] === 'water') {
                floorImg = images.waterFrames[waterFrameIndex];
            } else {
                floorImg = images.floor;
            }
            editorCtx.drawImage(floorImg, editorPlayer.x * GRID_SIZE, editorPlayer.y * GRID_SIZE);
        } else if (!visited[editorPlayer.x][editorPlayer.y]) {
            editorCtx.drawImage(images.floor, editorPlayer.x * GRID_SIZE, editorPlayer.y * GRID_SIZE);
        }
        editorCtx.drawImage(images.lookdown, editorPlayer.x * GRID_SIZE, editorPlayer.y * GRID_SIZE);
    }

    editorCtx.restore();
}

function draw() {
    if (document.getElementById('gameCanvas').style.display === 'none') return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(scale || 1, scale || 1);
    ctx.translate(offsetX || 0, offsetY || 0);

    const frameIndex = Math.floor(performance.now() / 200) % 5;
    const waterFrameIndex = Math.floor(performance.now() / 200) % 4;

    const visited = calculateVisitedGrid(grid, width, height);

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (floorGrid[x] && floorGrid[x][y]) {
                let floorImg;
                if (floorGrid[x][y] === 'icefloor') {
                    floorImg = images.icefloor;
                } else if (floorGrid[x][y] === 'sandfloor') {
                    floorImg = images.sandfloor;
                } else if (floorGrid[x][y] === 'waterbox') {
                    const waterboxIndex = Math.floor(performance.now() / 200) % 2;
                    floorImg = images.waterboxFrames[waterboxIndex];
                } else if (floorGrid[x][y] === 'water') {
                    floorImg = images.waterFrames[waterFrameIndex];
                } else {
                    floorImg = images.floor;
                }
                ctx.drawImage(floorImg, x * GRID_SIZE, y * GRID_SIZE);
            }
            else if (grid[x] && grid[x][y] !== 'wall' && grid[x][y] !== 'icewall' &&
                grid[x][y] !== 'deepwater' && grid[x][y] !== 'sandstonewall' && !visited[x][y]) {
                let floorImg = images.floor;
                if (floorGrid[x] && floorGrid[x][y] === 'icefloor') floorImg = images.icefloor;
                else if (floorGrid[x] && floorGrid[x][y] === 'sandfloor') floorImg = images.sandfloor;
                else if (floorGrid[x] && floorGrid[x][y] === 'water') floorImg = images.waterFrames[waterFrameIndex];
                ctx.drawImage(floorImg, x * GRID_SIZE, y * GRID_SIZE);
            }
        }
    }

    if (floorData[viewedFloor] && floorData[viewedFloor].ladders) {
        floorData[viewedFloor].ladders.forEach(ladder => {
            const img = ladder.type === 'up' ? images.ladderup : images.ladderdown;
            if (img.complete && img.naturalHeight !== 0) {
                ctx.drawImage(img, ladder.x * GRID_SIZE, ladder.y * GRID_SIZE);
            }
        });
    }

    teleporters.forEach(tp => {
        const entitiesHeadingToGroup = [...players, ...boxes].filter(e => {
            if (!e.isMoving) return false;
            return tp.group.some(gtp => gtp.x === e.targetX && gtp.y === e.targetY);
        });

        let isBlocked = entitiesHeadingToGroup.length > 1;

        const anyoneOnTp = players.some(p => p.x === tp.x && p.y === tp.y) ||
            boxes.some(b => b.x === tp.x && b.y === tp.y);
        const anyoneMovingToTp = [...players, ...boxes].some(e => e.isMoving && e.targetX === tp.x && e.targetY === tp.y);

        const availableInGroup = tp.group.filter(gtp => {
            const anyoneOnGtp = players.some(p => p.x === gtp.x && p.y === gtp.y) ||
                boxes.some(b => b.x === gtp.x && b.y === gtp.y);
            const anyoneMovingToGtp = [...players, ...boxes].some(e => e.isMoving && e.targetX === gtp.x && e.targetY === gtp.y);
            return !(gtp.isOccupied || anyoneOnGtp || anyoneMovingToGtp);
        });

        const isDeactivated = tp.isOccupied || anyoneOnTp || anyoneMovingToTp || isBlocked || availableInGroup.length <= 1;

        const img = isDeactivated ? images.teleporterPaused : images.teleporterFrames[frameIndex];
        ctx.drawImage(img, tp.x * GRID_SIZE, tp.y * GRID_SIZE);
    });

    duplicators.forEach(dp => {
        const img = dp.isBroken ? images.duplicatorPaused : images.duplicatorFrames[frameIndex];
        ctx.drawImage(img, dp.x * GRID_SIZE, dp.y * GRID_SIZE);
    });

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (!grid[x]) continue;
            const cell = grid[x][y];
            if (cell === 'wall') {
                if (!visited[x][y]) ctx.drawImage(images.floor, x * GRID_SIZE, y * GRID_SIZE);
                ctx.drawImage(images.wall, x * GRID_SIZE, y * GRID_SIZE);
            } else if (cell === 'icewall') {
                if (!visited[x][y]) ctx.drawImage(images.icefloor, x * GRID_SIZE, y * GRID_SIZE);
                ctx.drawImage(images.icewall, x * GRID_SIZE, y * GRID_SIZE);
            } else if (cell === 'sandstonewall') {
                if (!visited[x][y]) ctx.drawImage(images.sandfloor, x * GRID_SIZE, y * GRID_SIZE);
                ctx.drawImage(images.sandstonewall, x * GRID_SIZE, y * GRID_SIZE);
            } else if (cell === 'switch') {
                if (!visited[x][y]) {
                    let floorImg;
                    if (floorGrid[x] && floorGrid[x][y] === 'icefloor') {
                        floorImg = images.icefloor;
                    } else if (floorGrid[x] && floorGrid[x][y] === 'sandfloor') {
                        floorImg = images.sandfloor;
                    } else if (floorGrid[x] && floorGrid[x][y] === 'waterbox') {
                        const waterboxIndex = Math.floor(performance.now() / 200) % 2;
                        floorImg = images.waterboxFrames[waterboxIndex];
                    } else if (floorGrid[x] && floorGrid[x][y] === 'water') {
                        floorImg = images.waterFrames[waterFrameIndex];
                    } else {
                        floorImg = images.floor;
                    }
                    ctx.drawImage(floorImg, x * GRID_SIZE, y * GRID_SIZE);
                }
                ctx.drawImage(images.switch, x * GRID_SIZE, y * GRID_SIZE);
            } else if (cell === 'deepwater') {
                if (!visited[x][y]) {
                    ctx.drawImage(images.waterFrames[waterFrameIndex], x * GRID_SIZE, y * GRID_SIZE);
                }
                ctx.drawImage(images.deepwaterFrames[waterFrameIndex], x * GRID_SIZE, y * GRID_SIZE);
            } else if (cell === 'floorhole') {
                if (!visited[x][y]) {
                    let floorImg;
                    if (floorGrid[x] && floorGrid[x][y] === 'icefloor') {
                        floorImg = images.icefloor;
                    } else if (floorGrid[x] && floorGrid[x][y] === 'sandfloor') {
                        floorImg = images.sandfloor;
                    } else if (floorGrid[x] && floorGrid[x][y] === 'waterbox') {
                        const waterboxIndex = Math.floor(performance.now() / 200) % 2;
                        floorImg = images.waterboxFrames[waterboxIndex];
                    } else if (floorGrid[x] && floorGrid[x][y] === 'water') {
                        floorImg = images.waterFrames[waterFrameIndex];
                    } else {
                        floorImg = images.floor;
                    }
                    ctx.drawImage(floorImg, x * GRID_SIZE, y * GRID_SIZE);
                }
                ctx.drawImage(images.floorhole, x * GRID_SIZE, y * GRID_SIZE);
            }
        }
    }

    boxes.forEach(b => {
        if (floorGrid[b.x] && floorGrid[b.x][b.y]) {
            let floorImg;
            if (floorGrid[b.x][b.y] === 'icefloor') {
                floorImg = images.icefloor;
            } else if (floorGrid[b.x][b.y] === 'sandfloor') {
                floorImg = images.sandfloor;
            } else if (floorGrid[b.x][b.y] === 'waterbox') {
                const waterboxIndex = Math.floor(performance.now() / 200) % 2;
                floorImg = images.waterboxFrames[waterboxIndex];
            } else if (floorGrid[b.x][b.y] === 'water') {
                floorImg = images.waterFrames[waterFrameIndex];
            } else {
                floorImg = images.floor;
            }
            ctx.drawImage(floorImg, b.x * GRID_SIZE, b.y * GRID_SIZE);
        } else if (!visited[b.x][b.y]) {
            ctx.drawImage(images.floor, b.x * GRID_SIZE, b.y * GRID_SIZE);
        }
        ctx.drawImage(images.box, b.pixelX, b.pixelY);
    });

    players.forEach(p => {
        if (p.floor !== viewedFloor) return;
        if (p.x !== undefined && p.y !== undefined) {
            if (floorGrid[p.x] && floorGrid[p.x][p.y]) {
                let floorImg;
                if (floorGrid[p.x][p.y] === 'icefloor') {
                    floorImg = images.icefloor;
                } else if (floorGrid[p.x][p.y] === 'sandfloor') {
                    floorImg = images.sandfloor;
                } else if (floorGrid[p.x][p.y] === 'waterbox') {
                    const waterboxIndex = Math.floor(performance.now() / 200) % 2;
                    floorImg = images.waterboxFrames[waterboxIndex];
                } else if (floorGrid[p.x][p.y] === 'water') {
                    const waterFrameIndex = Math.floor(performance.now() / 200) % 4;
                    floorImg = images.waterFrames[waterFrameIndex];
                } else {
                    floorImg = images.floor;
                }
                ctx.drawImage(floorImg, p.x * GRID_SIZE, p.y * GRID_SIZE);
            } else if (!visited[p.x][p.y]) {
                ctx.drawImage(images.floor, p.x * GRID_SIZE, p.y * GRID_SIZE);
            }

            let playerImg;
            if (p.isMoving && !p.isSliding) {
                const step = p.walkStep + 1;
                if (p.moveProgress < 0.25 || p.moveProgress > 0.75) {
                    playerImg = images[directions[p.facing].look];
                } else {
                    playerImg = images[`walk${p.facing}${step}`];
                }
            } else if (p.isMoving && p.isSliding) {
                const step = p.walkStep + 1;
                playerImg = images[`walk${p.facing}${step}`];
            } else {
                playerImg = images[directions[p.facing].look];
            }

            ctx.drawImage(playerImg, p.pixelX, p.pixelY);
        }
    });

    ctx.restore();
}

function openControls() {
    document.getElementById('controls-overlay').style.display = 'block';
    document.getElementById('controls-overlay-backdrop').style.display = 'block';
}
function closeControls() {
    document.getElementById('controls-overlay').style.display = 'none';
    document.getElementById('controls-overlay-backdrop').style.display = 'none';
}
