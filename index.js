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
        duplicatorFrames: [new Image(), new Image(), new Image(), new Image(), new Image()]
    };

    images.floor.src = 'floor.png';
    images.icefloor.src = 'icefloor.png';
    images.wall.src = 'wall.png';
    images.icewall.src = 'icewall.png';
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

    for (let i = 0; i < 5; i++) {
        images.teleporterFrames[i].src = `teleporterframe${i}.png`;
        images.duplicatorFrames[i].src = `duplicatorframe${i}.png`;
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
        const container = document.getElementById('mobile-controls');
        const mobileBtns = document.querySelectorAll('.mobile-btn');
        
        container.addEventListener('touchstart', () => {
            container.classList.add('touch-active');
        });
        container.addEventListener('touchend', () => {
            container.classList.remove('touch-active');
        });
        container.addEventListener('touchcancel', () => {
            container.classList.remove('touch-active');
        });

        mobileBtns.forEach(btn => {
            const dir = btn.getAttribute('data-dir');
            
            const handlePress = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleMobileMove(dir);
            };

            btn.addEventListener('mousedown', handlePress);
            btn.addEventListener('touchstart', handlePress);
        });
    }

    window.addEventListener('DOMContentLoaded', initMobileControls);

    const EDITOR_WIDTH = 26;
    const EDITOR_HEIGHT = 26;
    let editorGrid = [];
    let editorFloorGrid = [];
    let editorBoxes = [];
    let editorPlayer = { x: 1, y: 1 };

    const directions = {
        up: { dx: 0, dy: -1, look: 'lookup' },
        down: { dx: 0, dy: 1, look: 'lookdown' },
        left: { dx: -1, dy: 0, look: 'lookleft' },
        right: { dx: 1, dy: 0, look: 'lookright' }
    };

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
                    !gridArray[cx] || gridArray[cx][cy] === 'wall' || gridArray[cx][cy] === 'icewall' || visited[cx][cy]) continue;
                visited[cx][cy] = true;
                stack.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]);
            }
        };
        floodFromEdges(widthToUse, heightToUse, (x, y) => !gridArray[x] || gridArray[x][y] === 'wall' || gridArray[x][y] === 'icewall', (x, y) => {
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
        return !visited[px][py] && gridArray[px][py] !== 'wall' && gridArray[px][py] !== 'icewall';
    }

    function showEnclosureWarning(returnMode) {
        const overlay = document.getElementById('win-overlay');
        const message = document.getElementById('win-message');
        const nextBtn = document.getElementById('next-lvl-btn');
        const replayBtn = document.getElementById('replay-lvl-btn');
        const prevBtn = document.getElementById('prev-lvl-btn');
        const menuBtn = document.getElementById('win-menu-btn');
        const editorBtn = document.getElementById('win-editor-btn');

        message.innerText = "Error: Player must be in an enclosed space!";
        nextBtn.style.display = 'none';
        replayBtn.style.display = 'none';
        prevBtn.style.display = 'none';
        
        if (returnMode === "Return to Level Editor") {
            menuBtn.style.display = 'none';
            editorBtn.innerText = "Return to Level Editor";
            editorBtn.style.display = 'inline-block';
        } else {
            menuBtn.innerText = "Main Menu";
            menuBtn.style.display = 'inline-block';
            editorBtn.style.display = 'none';
        }
        
        overlay.style.display = 'block';
    }

    let loadedImages = 0;
    const imageKeys = Object.keys(images).filter(key => !Array.isArray(images[key]));
    const totalImages = imageKeys.length + images.teleporterFrames.length + images.duplicatorFrames.length;

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

    images.teleporterFrames.forEach(img => {
        img.onload = onImageLoaded;
        img.onerror = () => {
            console.error(`Failed to load image: ${img.src}`);
            onImageLoaded();
        };
    });

    images.duplicatorFrames.forEach(img => {
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
        document.getElementById('p-teleporter').style.backgroundImage = `url(${images.teleporter.src})`;
        document.getElementById('p-duplicator').style.backgroundImage = `url(${images.duplicator.src})`;
        document.getElementById('p-erase').style.backgroundColor = `#000`;
        selectTool('wall');

        editorCanvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
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
            } else if (e.touches.length === 1) {
                isPanning = false;
                initialPinchDistance = null;
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
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
                editorPinchScale = Math.max(1, Math.min(5, initialPinchScale * zoomFactor));
                resizeEditorCanvas(true);
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
                    handleEditorClick(e);
                }
            }
        }, { passive: false });
        editorCanvas.addEventListener('touchend', (e) => {
            if (e.touches.length === 0 && !isPanning && !initialPinchDistance) {

                handleEditorClick(e.changedTouches[0]);
            }
            if (e.touches.length < 2) {
                initialPinchDistance = null;
            }
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
Player: 2B`;

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
    }

    function parseLevels(text) {
        const levelBlocks = text.split(/Level \d+:/i).filter(b => b.trim());
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
        
        if (isMobile) {
            document.getElementById('mobile-controls').style.display = 'flex';
            document.getElementById('mobile-controls').style.flexDirection = 'column';
            setTimeout(fitCamera, 100);
        } else {
            document.getElementById('mobile-controls').style.display = 'none';
        }

        parseLevel(levels[index].data);

        if (!isPlayerEnclosed(grid, width, height, player.x, player.y)) {
            showEnclosureWarning("Main Menu");
            return;
        }

        fitCamera();
    }

    function showMenu() {
        isEditing = false;
        isTesting = false;
        isWinning = false;
        document.getElementById('win-overlay').style.display = 'none';
        document.getElementById('menu').style.display = 'flex';
        document.getElementById('game-ui').style.display = 'none';
        document.getElementById('editor-ui').style.display = 'none';
        document.getElementById('gameCanvas').style.display = 'none';
        document.getElementById('mobile-controls').style.display = 'none';
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
        

        if (editorGrid.length === 0) {
            editorGrid = Array.from({length: EDITOR_WIDTH}, () => Array(EDITOR_HEIGHT).fill(null));
            editorFloorGrid = Array.from({length: EDITOR_WIDTH}, () => Array(EDITOR_HEIGHT).fill(null));
            editorBoxes = [];
            editorPlayer = { x: 1, y: 1 };
        }
        
        resizeEditorCanvas();
    }

    function serializeLevel(g, fg, b, p, w, h) {
        let normalWalls = [], iceWalls = [], switches = [], boxesStr = [], normalFloors = [], iceFloors = [];
        let tps = {}, dps = {};

        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                if (!g[x]) continue;
                const coord = `${x + 1}${String.fromCharCode(65 + y)}`;
                const cell = g[x][y];
                if (cell === 'wall') normalWalls.push(coord);
                else if (cell === 'icewall') iceWalls.push(coord);
                else if (cell === 'switch') switches.push(coord);
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
                if (fg[x][y] === 'icefloor') iceFloors.push(coord);
            }
        }
        b.forEach(box => {
            boxesStr.push(`${box.x + 1}${String.fromCharCode(65 + box.y)}`);
        });
        const playerStr = `${p.x + 1}${String.fromCharCode(65 + p.y)}`;

        let data = "";
        if (normalWalls.length > 0) data += `Walls: ${normalWalls.join(', ')}\n`;
        if (iceWalls.length > 0) data += `IceWalls: ${iceWalls.join(', ')}\n`;
        if (boxesStr.length > 0) data += `Boxes: ${boxesStr.join(', ')}\n`;
        if (switches.length > 0) data += `Switches: ${switches.join(', ')}\n`;

        const tpEntries = Object.values(tps).map(group => group.join(' '));
        if (tpEntries.length > 0) data += `Teleporters: ${tpEntries.join(', ')}\n`;

        const dpEntries = Object.values(dps).map(group => group.join(' '));
        if (dpEntries.length > 0) data += `Duplicators: ${dpEntries.join(', ')}\n`;

        if (normalFloors.length > 0) data += `Floors: ${normalFloors.join(', ')}\n`;
        if (iceFloors.length > 0) data += `IceFloors: ${iceFloors.join(', ')}\n`;

        data += `Player: ${playerStr}`;
        return data;
    }

    function applyInfill(g, fg, w, h) {
        const visitedTotal = Array.from({length: w || 1}, () => Array(h || 1).fill(false));
        
        const isOutside = Array.from({length: w || 1}, () => Array(h || 1).fill(false));
        const stackOutside = [];
        for (let y = 0; y < h; y++) {
            if (!g[0] || (g[0][y] !== 'wall' && g[0][y] !== 'icewall')) stackOutside.push([0, y]);
            if (!g[w - 1] || (g[w - 1][y] !== 'wall' && g[w - 1][y] !== 'icewall')) stackOutside.push([w - 1, y]);
        }
        for (let x = 0; x < w; x++) {
            if (!g[x] || (g[x][0] !== 'wall' && g[x][0] !== 'icewall')) stackOutside.push([x, 0]);
            if (!g[x] || (g[x][h - 1] !== 'wall' && g[x][h - 1] !== 'icewall')) stackOutside.push([x, h - 1]);
        }
        
        while (stackOutside.length > 0) {
            const [cx, cy] = stackOutside.pop();
            if (cx < 0 || cx >= w || cy < 0 || cy >= h || isOutside[cx][cy] || !g[cx] || g[cx][cy] === 'wall' || g[cx][cy] === 'icewall') continue;
            isOutside[cx][cy] = true;
            stackOutside.push([cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]);
        }

        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                if (!isOutside[x][y] && g[x][y] !== 'wall' && g[x][y] !== 'icewall' && !visitedTotal[x][y]) {
                    const enclosure = [];
                    const stack = [[x, y]];
                    visitedTotal[x][y] = true;
                    let wallCounts = { wall: 0, icewall: 0 };
                    let floorCounts = { floor: 0, icefloor: 0 };
                    
                    while (stack.length > 0) {
                        const [cx, cy] = stack.pop();
                        enclosure.push([cx, cy]);
                        
                        if (fg[cx] && fg[cx][cy] === 'floor') floorCounts.floor++;
                        else if (fg[cx] && fg[cx][cy] === 'icefloor') floorCounts.icefloor++;

                        const neighbors = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
                        for (const [nx, ny] of neighbors) {
                            if (nx < 0 || nx >= w || ny < 0 || ny >= h || !g[nx]) continue;
                            const cell = g[nx][ny];
                            if (cell === 'wall') {
                                wallCounts.wall++;
                            } else if (cell === 'icewall') {
                                wallCounts.icewall++;
                            } else if (!visitedTotal[nx][ny] && !isOutside[nx][ny]) {
                                visitedTotal[nx][ny] = true;
                                stack.push([nx, ny]);
                            }
                        }
                    }
                    
                    let defaultFloor;
                    if (floorCounts.icefloor > 0 || floorCounts.floor > 0) {
                        defaultFloor = floorCounts.icefloor > floorCounts.floor ? 'icefloor' : 'floor';
                    } else {
                        defaultFloor = wallCounts.icewall > wallCounts.wall ? 'icefloor' : 'floor';
                    }
                    
                    enclosure.forEach(([rx, ry]) => {
                        if (fg[rx] && (fg[rx][ry] === null || fg[rx][ry] === undefined)) {
                            fg[rx][ry] = defaultFloor;
                        }
                    });
                }
            }
        }
    }

    function testLevel() {
        if (!isPlayerEnclosed(editorGrid, EDITOR_WIDTH, EDITOR_HEIGHT, editorPlayer.x, editorPlayer.y)) {
            showEnclosureWarning("Return to Level Editor");
            return;
        }

        testLevelData = serializeLevel(editorGrid, editorFloorGrid, editorBoxes, editorPlayer, EDITOR_WIDTH, EDITOR_HEIGHT);

        isEditing = false;
        isTesting = true;
        isWinning = false;
        document.getElementById('win-overlay').style.display = 'none';
        document.getElementById('editor-ui').style.display = 'none';
        document.getElementById('game-ui').style.display = 'flex';
        document.getElementById('gameCanvas').style.display = 'block';
        document.getElementById('back-to-menu-btn').style.display = 'none';
        document.getElementById('back-to-editor-btn').style.display = 'inline-block';
        document.getElementById('level-title').innerText = "Testing Level...";
        
        if (isMobile) {
            document.getElementById('mobile-controls').style.display = 'flex';
            document.getElementById('mobile-controls').style.flexDirection = 'column';
            setTimeout(fitCamera, 100);
        } else {
            document.getElementById('mobile-controls').style.display = 'none';
        }
        
        parseLevel(testLevelData);
        fitCamera();
    }

    function returnToEditor() {
        isTesting = false;
        isEditing = true;
        document.getElementById('win-overlay').style.display = 'none';
        document.getElementById('game-ui').style.display = 'none';
        document.getElementById('editor-ui').style.display = 'flex';
        document.getElementById('gameCanvas').style.display = 'none';
        document.getElementById('mobile-controls').style.display = 'none';
        resizeEditorCanvas();
    }

    let editorOffsetX = 0, editorOffsetY = 0;
    let initialPinchDistance = null;
    let initialPinchScale = 1;
    let isPanning = false;
    let lastTouchX = 0, lastTouchY = 0;

    function resizeEditorCanvas(isUserInteraction = false) {
        const editorUi = document.getElementById('editor-ui');
        const wasHidden = editorUi.style.display === 'none' || editorUi.style.display === '';
        if (wasHidden) editorUi.style.display = 'flex';

        const controlsWidth = document.querySelector('.editor-controls').offsetWidth;
        const paletteWidth = document.querySelector('.palette').offsetWidth;
        const gap = window.innerWidth <= 600 ? 10 : 20; 
        const viewWidth = window.innerWidth - controlsWidth - paletteWidth - (gap * 2) - 20;
        const viewHeight = window.innerHeight - 20;

        const targetScale = 2;
        const fullGridWidth = EDITOR_WIDTH * GRID_SIZE;
        const fullGridHeight = EDITOR_HEIGHT * GRID_SIZE;
        
        baseEditorScale = Math.min(targetScale, viewWidth / fullGridWidth, viewHeight / fullGridHeight);
        editorScale = baseEditorScale * editorPinchScale;

        editorCanvas.width = viewWidth;
        editorCanvas.height = viewHeight;
        editorCtx.imageSmoothingEnabled = false;
        editorCanvas.style.display = 'inline-block';

        if (!isUserInteraction) {
            editorOffsetX = (viewWidth / editorScale - fullGridWidth) / 2;
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
            editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
            applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
        } else if (currentTool === 'icewall') {
            editorGrid[x][y] = 'icewall';
            editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
            applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
        } else if (currentTool === 'box') {
            editorGrid[x][y] = null;
            if (!editorBoxes.some(b => b.x === x && b.y === y)) {
                editorBoxes.push({x, y});
            }
            applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
        } else if (currentTool === 'switch') {
            editorGrid[x][y] = 'switch';
            editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
            applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
        } else if (currentTool === 'player') {
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
        } else if (currentTool === 'teleporter') {
            const group = prompt("Enter Teleporter group (e.g., 1, 2, 3...):", "1") || "1";
            editorGrid[x][y] = `teleporter:${group}`;
            editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
            applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
        } else if (currentTool === 'duplicator') {
            const group = prompt("Enter Duplicator group (e.g., 1, 2, 3...):", "1") || "1";
            editorGrid[x][y] = `duplicator:${group}`;
            editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
            applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
        } else if (currentTool === 'erase') {
            editorGrid[x][y] = null;
            editorFloorGrid[x][y] = null; 
            editorBoxes = editorBoxes.filter(b => b.x !== x || b.y !== y);
            applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
        }
    }

    async function saveLevel(onlyCurrent = false) {
        if (!isPlayerEnclosed(editorGrid, EDITOR_WIDTH, EDITOR_HEIGHT, editorPlayer.x, editorPlayer.y)) {
            showEnclosureWarning("Return to Level Editor");
            return;
        }

        const levelData = serializeLevel(editorGrid, editorFloorGrid, editorBoxes, editorPlayer, EDITOR_WIDTH, EDITOR_HEIGHT);

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
        alert(onlyCurrent ? 'Current level downloaded and added to your session!' : 'Level added to your session and downloaded!');
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
        }
    }

    function loadLevelIntoEditor(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const levelMatches = content.match(/Level \d+:/gi);
            
            if (levelMatches && levelMatches.length > 1) {
                alert("You can only load one level at a time");
                input.value = "";
                return;
            }

            let levelData = content;
            const headerMatch = content.match(/Level \d+:\s*([\s\S]*)/i);
            if (headerMatch) {
                levelData = headerMatch[1].trim();
            }

            try {
                const lines = levelData.split('\n').map(l => l.trim()).filter(l => l);
                let tempNormalWalls = [], tempIceWalls = [], tempBoxes = [], tempSwitches = [], tempPlayer = {x: 0, y: 0};
                let tempNormalFloors = [], tempIceFloors = [];
                let tempTps = [], tempDps = [];

                for (const line of lines) {
                    const parts = line.split(':');
                    if (parts.length < 2) continue;
                    const type = parts[0].trim().toLowerCase();
                    const coordsStr = parts[1].trim();

                    if (type === 'teleporters' || type === 'duplicators') {
                        const groups = coordsStr.split(',').map(g => g.trim()).filter(g => g);
                        groups.forEach((group, idx) => {
                            const groupCoords = group.split(/\s+/).map(c => c.trim().toUpperCase())
                                .filter(c => c.length >= 2 && /^\d+[A-Z]$/.test(c))
                                .map(c => {
                                    const letter = c.slice(-1);
                                    const num = parseInt(c.slice(0, -1), 10);
                                    return {x: num - 1, y: letter.charCodeAt(0) - 'A'.charCodeAt(0)};
                                });
                            groupCoords.forEach(p => {
                                if (type === 'teleporters') tempTps.push({...p, group: idx + 1});
                                else tempDps.push({...p, group: idx + 1});
                            });
                        });
                        continue;
                    }

                    const coords = coordsStr.split(',').map(c => c.trim().toUpperCase())
                        .filter(c => c.length >= 2 && /^\d+[A-Z]$/.test(c))
                        .map(c => {
                            const letter = c.slice(-1);
                            const num = parseInt(c.slice(0, -1), 10);
                            const col = num - 1;
                            const row = letter.charCodeAt(0) - 'A'.charCodeAt(0);
                            if (col < 0 || col >= EDITOR_WIDTH || row < 0 || row >= EDITOR_HEIGHT) return null;
                            return {x: col, y: row};
                        }).filter(Boolean);

                    if (type === 'walls') tempNormalWalls = coords;
                    else if (type === 'icewalls') tempIceWalls = coords;
                    else if (type === 'boxes') tempBoxes = coords;
                    else if (type === 'switches') tempSwitches = coords;
                    else if (type === 'floors') tempNormalFloors = coords;
                    else if (type === 'icefloors') tempIceFloors = coords;
                    else if (type === 'player' && coords.length > 0) tempPlayer = coords[0];
                }

                editorGrid = Array.from({length: EDITOR_WIDTH}, () => Array(EDITOR_HEIGHT).fill(null));
                editorFloorGrid = Array.from({length: EDITOR_WIDTH}, () => Array(EDITOR_HEIGHT).fill(null));
                
                tempNormalWalls.forEach(p => editorGrid[p.x][p.y] = 'wall');
                tempIceWalls.forEach(p => {
                    editorGrid[p.x][p.y] = 'icewall';
                    editorFloorGrid[p.x][p.y] = 'icefloor';
                });
                tempSwitches.forEach(p => editorGrid[p.x][p.y] = 'switch');
                tempIceFloors.forEach(p => editorFloorGrid[p.x][p.y] = 'icefloor');
                tempNormalFloors.forEach(p => editorFloorGrid[p.x][p.y] = 'floor');
                tempTps.forEach(p => editorGrid[p.x][p.y] = `teleporter:${p.group}`);
                tempDps.forEach(p => editorGrid[p.x][p.y] = `duplicator:${p.group}`);

                editorBoxes = tempBoxes;
                editorPlayer = tempPlayer;

                applyInfill(editorGrid, editorFloorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);
                
                alert("Level loaded into editor!");
            } catch (err) {
                console.error(err);
                alert("Error parsing level data.");
            }
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
            
            const newLevels = [];
            const blocks = allLevelsText.split(/Level \d+:/i).filter(b => b.trim());
            blocks.forEach((block, index) => {
                newLevels.push({
                    name: `Level ${index + 1}`,
                    data: block.trim()
                });
            });
            levels.length = 0;
            levels.push(...newLevels);
            createLevelMenu();
            showMenu();
        }
    }

    function restartLevel() {
        isWinning = false;
        document.getElementById('win-overlay').style.display = 'none';
        if (isTesting) {
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
        const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
        let normalWalls = [], iceWalls = [], tempBoxes = [], tempSwitches = [], playerPos = null;
        let normalFloors = [], iceFloors = [];
        let tempTeleporters = [], tempDuplicators = [];
        let usedCols = 1, usedRows = 1;

        const parseSingleCoord = (c) => {
            const letter = c.slice(-1);
            const num = parseInt(c.slice(0, -1), 10);
            const col = num - 1;
            const row = letter.charCodeAt(0) - 'A'.charCodeAt(0);
            if (col < 0 || col >= MAX_COL || row < 0 || row >= MAX_ROW) return null;
            usedCols = Math.max(usedCols, col + 1);
            usedRows = Math.max(usedRows, row + 1);
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
            if (lowerType === 'walls') normalWalls = parseCoords(coordsStr);
            else if (lowerType === 'icewalls') iceWalls = parseCoords(coordsStr);
            else if (lowerType === 'boxes') tempBoxes = parseCoords(coordsStr);
            else if (lowerType === 'switches') tempSwitches = parseCoords(coordsStr);
            else if (lowerType === 'floors') normalFloors = parseCoords(coordsStr);
            else if (lowerType === 'icefloors') iceFloors = parseCoords(coordsStr);
            else if (lowerType === 'player') {
                const pCoords = parseCoords(coordsStr);
                if (pCoords.length > 0) playerPos = pCoords[0];
            }
            else if (lowerType === 'teleporters') tempTeleporters = parsePairs(coordsStr);
            else if (lowerType === 'duplicators') tempDuplicators = parsePairs(coordsStr);
        }

        width = Math.max(1, Math.min(usedCols, MAX_COL));
        height = Math.max(1, Math.min(usedRows, MAX_ROW));

        grid = Array.from({length: width}, () => Array(height).fill(null));
        floorGrid = Array.from({length: width}, () => Array(height).fill(null));

        normalWalls.forEach(pos => { grid[pos.x][pos.y] = 'wall'; });
        iceWalls.forEach(pos => {
            grid[pos.x][pos.y] = 'icewall';
            floorGrid[pos.x][pos.y] = 'icefloor';
        });
        tempSwitches.forEach(pos => { grid[pos.x][pos.y] = 'switch'; });
        iceFloors.forEach(pos => { floorGrid[pos.x][pos.y] = 'icefloor'; });
        normalFloors.forEach(pos => { floorGrid[pos.x][pos.y] = 'floor'; });

        teleporters = [];
        tempTeleporters.forEach(group => {
            group.forEach((pos, i) => {
                const nextPos = group[(i + 1) % group.length];
                teleporters.push({
                    x: pos.x, y: pos.y,
                    targetX: nextPos.x, targetY: nextPos.y,
                    isOccupied: false,
                    group: group
                });
            });
        });

        duplicators = [];
        tempDuplicators.forEach(group => {
            group.forEach(pos => {
                duplicators.push({
                    x: pos.x, y: pos.y,
                    outputs: group.filter(p => p !== pos),
                    isBroken: false
                });
            });
        });

        boxes = tempBoxes.map(pos => ({
            x: pos.x, y: pos.y,
            pixelX: pos.x * GRID_SIZE, pixelY: pos.y * GRID_SIZE,
            targetX: pos.x, targetY: pos.y,
            isMoving: false, moveProgress: 0,
            slideDir: null
        }));

        applyInfill(grid, floorGrid, width, height);

        players = [];
        if (playerPos) {
            const p = {
                x: playerPos.x, y: playerPos.y,
                pixelX: playerPos.x * GRID_SIZE, pixelY: playerPos.y * GRID_SIZE,
                targetX: playerPos.x, targetY: playerPos.y,
                isMoving: false, moveProgress: 0, walkStep: 0,
                facing: 'down', isSliding: false
            };
            players.push(p);
            player = players[0];
            moveQueue = [];
        }
    }

    function isWall(x, y) {
        if (x < 0 || x >= width || y < 0 || y >= height || !grid[x]) return true;
        return grid[x][y] === 'wall' || grid[x][y] === 'icewall';
    }
function canSlideTo(nx, ny, dx, dy, movingEntity = null) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || isWall(nx, ny)) return false;
        
        const blockingPlayer = players.find(p => p.x === nx && p.y === ny);
        if (blockingPlayer && blockingPlayer !== movingEntity) {
            const pDx = blockingPlayer.targetX - blockingPlayer.x;
            const pDy = blockingPlayer.targetY - blockingPlayer.y;
            
            if (blockingPlayer.isMoving && pDx === -dx && pDy === -dy) {
                return false;
            }

            if (!(blockingPlayer.isMoving && pDx === dx && pDy === dy)) {
                return false;
            }
        }

        const blockingBox = boxes.find(b => b.x === nx && b.y === ny);
        if (blockingBox && blockingBox !== movingEntity) {
            const boxDx = blockingBox.targetX - blockingBox.x;
            const boxDy = blockingBox.targetY - blockingBox.y;

            if (blockingBox.isMoving && boxDx === -dx && boxDy === -dy) {
                return false;
            }

            if (!(blockingBox.isMoving && boxDx === dx && boxDy === dy)) {
                return false;
            }
        }

        if (movingEntity) {
            const ex = movingEntity.x;
            const ey = movingEntity.y;
            const headOnEntity = [...players, ...boxes].find(e => 
                e !== movingEntity && e.x === nx && e.y === ny && e.targetX === ex && e.targetY === ey && e.isMoving
            );
            if (headOnEntity) return false;

            const sameTargetEntity = [...players, ...boxes].find(e =>
                e !== movingEntity && e.targetX === nx && e.targetY === ny && e.isMoving
            );
            if (sameTargetEntity) {
                return false;
            }
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
                if (grid[x][y] === 'wall' || grid[x][y] === 'icewall' || grid[x][y] === 'switch') {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                    hasContent = true;
                }
            }
        }
        boxes.forEach(b => {
            minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
            maxX = Math.max(maxX, b.x); maxY = Math.max(maxY, b.y);
            hasContent = true;
        });
        minX = Math.min(minX, player.x); minY = Math.min(minY, player.y);
        maxX = Math.max(maxX, player.x); maxY = Math.max(maxY, player.y);
        hasContent = true;

        if (!hasContent) {
            minX = 0; minY = 0; maxX = width - 1; maxY = height - 1;
        }

        const geoWidth = Math.max(GRID_SIZE, (maxX - minX + 1) * GRID_SIZE) || GRID_SIZE;
        const geoHeight = Math.max(GRID_SIZE, (maxY - minY + 1) * GRID_SIZE) || GRID_SIZE;

        const margin = isMobile ? 0.98 : 0.9;
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
        if (player.isMoving) return;

        let dir = null;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'up') dir = 'up';
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'down') dir = 'down';
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'left') dir = 'left';
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'right') dir = 'right';

        if (dir) {
            if (moveQueue.length < 2) {
                moveQueue.push(dir);
            }
        }
    }

    function processMovement() {
        let dir = moveQueue.shift();
        if (!dir) return;

        const dirData = directions[dir];
        let moves = [];


        for (const p of players) {
            if (p.isMoving) continue;
            let nx = p.x + dirData.dx;
            let ny = p.y + dirData.dy;

            if (nx < 0 || nx >= width || ny < 0 || ny >= height || isWall(nx, ny)) {
                p.facing = dir;
                continue;
            }

            const someoneTargetingTarget = [...players, ...boxes].find(e => e.targetX === nx && e.targetY === ny && e.isMoving);
            if (someoneTargetingTarget) {
                 p.facing = dir;
                 continue;
            }

            const blockingPlayer = players.find(other => other !== p && other.x === nx && other.y === ny);
            if (blockingPlayer) {
                if (!blockingPlayer.isMoving) {
                    p.facing = dir;
                    continue;
                }
            }

            const boxIndex = boxes.findIndex(b => b.x === nx && b.y === ny);
            if (boxIndex !== -1) {
                const box = boxes[boxIndex];
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
                    if (!canSlideTo(bnx, bny, dirData.dx, dirData.dy, p)) {
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

            checkSpecialTiles();

            if (players.includes(entity)) {
                if (floorGrid[entity.x][entity.y] === 'icefloor') {
                    entity.isSliding = true;
                    const dirData = directions[entity.facing];
                    let nx = entity.x + dirData.dx;
                    let ny = entity.y + dirData.dy;
                    if (canSlideTo(nx, ny, dirData.dx, dirData.dy, entity)) {
                        startMoving(entity, nx, ny, entity.facing);
                    } else {
                        entity.isSliding = false;
                        entity.walkStep = (entity.walkStep + 1) % 2;
                    }
                } else {
                    entity.isSliding = false;
                    entity.walkStep = (entity.walkStep + 1) % 2;
                }
            } else {
                if (floorGrid[entity.x][entity.y] === 'icefloor' && entity.slideDir) {
                    const dirData = directions[entity.slideDir];
                    let nx = entity.x + dirData.dx;
                    let ny = entity.y + dirData.dy;
                    if (canSlideTo(nx, ny, dirData.dx, dirData.dy, entity)) {
                        startMoving(entity, nx, ny, entity.slideDir);
                    } else {
                        entity.slideDir = null;
                    }
                } else {
                    entity.slideDir = null;
                }
            }
        } else {
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
                return;
            }

            const startX = entity.x * GRID_SIZE;
            const startY = entity.y * GRID_SIZE;
            const endX = entity.targetX * GRID_SIZE;
            const endY = entity.targetY * GRID_SIZE;
            entity.pixelX = startX + (endX - startX) * entity.moveProgress;
            entity.pixelY = startY + (endY - startY) * entity.moveProgress;
        }
    }

    function checkSpecialTiles() {
        const entities = [...players, ...boxes];
        teleporters.forEach(tp => {
            const anyoneOnTp = entities.some(e => e.x === tp.x && e.y === tp.y);
            const anyoneMovingToTp = entities.some(e => e.isMoving && e.targetX === tp.x && e.targetY === tp.y);
            if (!anyoneOnTp && !anyoneMovingToTp) tp.isOccupied = false;
        });

        const teleportActions = [];

        const blockedGroups = new Set();
        teleporters.forEach(tp => {
            const entitiesHeadingToGroup = entities.filter(e => {
                if (!e.isMoving) return false;
                return tp.group.some(gtp => gtp.x === e.targetX && gtp.y === e.targetY);
            });
            if (entitiesHeadingToGroup.length > 1) {
                blockedGroups.add(tp.group);
            }
        });

        entities.forEach(entity => {
            if (entity.isMoving) return;
            const tp = teleporters.find(t => t.x === entity.x && t.y === entity.y);
            if (tp && !tp.isOccupied && !blockedGroups.has(tp.group)) {
                const targetTp = teleporters.find(t => t.x === tp.targetX && t.y === tp.targetY);
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

        entities.forEach(entity => {
            if (entity.isMoving) return;
            const dp = duplicators.find(d => d.x === entity.x && d.y === entity.y);
            if (dp && !dp.isBroken) {
                const group = duplicators.filter(d =>
                    (d.x === dp.x && d.y === dp.y) || dp.outputs.some(o => o.x === d.x && o.y === d.y)
                );
                group.forEach(d => d.isBroken = true);

                dp.outputs.forEach(out => {
                    const anyoneOnOut = players.some(p => p.x === out.x && p.y === out.y) || 
                                       boxes.some(b => b.x === out.x && b.y === out.y);
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
                            boxes.push(newBox);
                        }
                    }
                });
            }
        });
    }

    function checkWin() {
        if (isEditing || (document.getElementById('game-ui').style.display === 'none')) return;
        const switches = [];
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                if (grid[x][y] === 'switch') {
                    switches.push({x, y});
                }
            }
        }

        const allSwitchesCovered = switches.every(s => 
            boxes.some(b => b.x === s.x && b.y === s.y)
        );

        if (allSwitchesCovered && switches.length > 0) {
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
        if (isEditing) drawEditor();
        else draw();
        if (!isEditing) checkWin();
        requestAnimationFrame(gameLoop);
    }

    function drawEditor() {
        if (document.getElementById('editor-ui').style.display === 'none') return;
        editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
        editorCtx.save();
        editorCtx.scale(editorScale || 1, editorScale || 1);
        editorCtx.translate(editorOffsetX || 0, editorOffsetY || 0);

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

        const visited = calculateVisitedGrid(editorGrid, EDITOR_WIDTH, EDITOR_HEIGHT);

        for (let x = 0; x < EDITOR_WIDTH; x++) {
            for (let y = 0; y < EDITOR_HEIGHT; y++) {
                if (editorFloorGrid[x] && editorFloorGrid[x][y]) {
                    const floorImg = editorFloorGrid[x][y] === 'icefloor' ? images.icefloor : images.floor;
                    editorCtx.drawImage(floorImg, x * GRID_SIZE, y * GRID_SIZE);
                }
            }
        }

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
                } else if (cell === 'switch') {
                    if (!visited[x][y]) {
                        const floorImg = editorFloorGrid[x] && editorFloorGrid[x][y] === 'icefloor' ? images.icefloor : images.floor;
                        editorCtx.drawImage(floorImg, x * GRID_SIZE, y * GRID_SIZE);
                    }
                    editorCtx.drawImage(images.switch, x * GRID_SIZE, y * GRID_SIZE);
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

        editorBoxes.forEach(b => {
            if (editorFloorGrid[b.x] && editorFloorGrid[b.x][b.y]) {
                const floorImg = editorFloorGrid[b.x][b.y] === 'icefloor' ? images.icefloor : images.floor;
                editorCtx.drawImage(floorImg, b.x * GRID_SIZE, b.y * GRID_SIZE);
            } else if (!visited[b.x][b.y]) {
                editorCtx.drawImage(images.floor, b.x * GRID_SIZE, b.y * GRID_SIZE);
            }
            editorCtx.drawImage(images.box, b.x * GRID_SIZE, b.y * GRID_SIZE);
        });

        if (editorFloorGrid[editorPlayer.x] && editorFloorGrid[editorPlayer.x][editorPlayer.y]) {
            const floorImg = editorFloorGrid[editorPlayer.x][editorPlayer.y] === 'icefloor' ? images.icefloor : images.floor;
            editorCtx.drawImage(floorImg, editorPlayer.x * GRID_SIZE, editorPlayer.y * GRID_SIZE);
        } else if (!visited[editorPlayer.x][editorPlayer.y]) {
            editorCtx.drawImage(images.floor, editorPlayer.x * GRID_SIZE, editorPlayer.y * GRID_SIZE);
        }
        editorCtx.drawImage(images.lookdown, editorPlayer.x * GRID_SIZE, editorPlayer.y * GRID_SIZE);

        editorCtx.restore();
    }

    function draw() {
        if (document.getElementById('gameCanvas').style.display === 'none') return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(scale || 1, scale || 1);
        ctx.translate(offsetX || 0, offsetY || 0);


        const visited = calculateVisitedGrid(grid, width, height);

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                if (floorGrid[x] && floorGrid[x][y]) {
                    const floorImg = floorGrid[x][y] === 'icefloor' ? images.icefloor : images.floor;
                    ctx.drawImage(floorImg, x * GRID_SIZE, y * GRID_SIZE);
                } 
                else if (grid[x] && grid[x][y] !== 'wall' && grid[x][y] !== 'icewall' && !visited[x][y]) {
                    const floorImg = (floorGrid[x] && floorGrid[x][y] === 'icefloor') ? images.icefloor : images.floor;
                    ctx.drawImage(floorImg, x * GRID_SIZE, y * GRID_SIZE);
                }
            }
        }

        const frameIndex = Math.floor(performance.now() / 200) % 5;

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
                } else if (cell === 'switch') {
                    if (!visited[x][y]) {
                        const floorImg = floorGrid[x] && floorGrid[x][y] === 'icefloor' ? images.icefloor : images.floor;
                        ctx.drawImage(floorImg, x * GRID_SIZE, y * GRID_SIZE);
                    }
                    ctx.drawImage(images.switch, x * GRID_SIZE, y * GRID_SIZE);
                }
            }
        }

        boxes.forEach(b => {
            if (floorGrid[b.x] && floorGrid[b.x][b.y]) {
                const floorImg = floorGrid[b.x][b.y] === 'icefloor' ? images.icefloor : images.floor;
                ctx.drawImage(floorImg, b.x * GRID_SIZE, b.y * GRID_SIZE);
            } else if (!visited[b.x][b.y]) {
                const floorImg = (floorGrid[b.x] && floorGrid[b.x][b.y] === 'icefloor') ? images.icefloor : images.floor;
                ctx.drawImage(floorImg, b.x * GRID_SIZE, b.y * GRID_SIZE);
            }
            ctx.drawImage(images.box, b.pixelX, b.pixelY);
        });

        players.forEach(p => {
            if (p.x !== undefined && p.y !== undefined) {
                if (floorGrid[p.x] && floorGrid[p.x][p.y]) {
                    const floorImg = floorGrid[p.x][p.y] === 'icefloor' ? images.icefloor : images.floor;
                    ctx.drawImage(floorImg, p.x * GRID_SIZE, p.y * GRID_SIZE);
                } else if (!visited[p.x][p.y]) {
                    const floorImg = (floorGrid[p.x] && floorGrid[p.x][p.y] === 'icefloor') ? images.icefloor : images.floor;
                    ctx.drawImage(floorImg, p.x * GRID_SIZE, p.y * GRID_SIZE);
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
