class ConwayBoard {
    constructor(size) {
        this.size = size;
        this.board = Array(size).fill().map(() => Array(size).fill(false));
        this.height = 0;
        
        // Initialize random board
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                this.board[i][j] = Math.random() < 0.5;
            }
        }
    }

    updateBoard() {
        const newBoard = Array(this.size).fill().map(() => Array(this.size).fill(false));
        
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const count = this.countNeighbors(i, j);
                if (this.board[i][j]) {
                    newBoard[i][j] = count === 2 || count === 3;
                } else {
                    newBoard[i][j] = count === 3;
                }
            }
        }
        
        const newConwayBoard = new ConwayBoard(this.size);
        newConwayBoard.board = newBoard;
        return newConwayBoard;
    }

    countNeighbors(x, y) {
        let count = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const i = (x + dx + this.size) % this.size;
                const j = (y + dy + this.size) % this.size;
                if (this.board[i][j]) count++;
            }
        }
        return count;
    }

    equals(other) {
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.board[i][j] !== other.board[i][j]) return false;
            }
        }
        return true;
    }
}

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
    canvas: document.getElementById('gameCanvas'),
    antialias: true
});

// Simplified renderer settings
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
scene.background = new THREE.Color(0x202020);

// Simple lighting setup
const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
mainLight.position.set(1, 1, 1);
scene.add(mainLight);

// Ambient light for consistent illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

// Game constants
const BOARD_SIZE = 25;    // Larger board
const CUBE_SIZE = 1.8;    // Slightly smaller cubes
const SPACING = 2.2;      // Adjusted spacing
const EDGE_SIZE = 0.08;    // Slightly thinner edges

// Materials
const cubeMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFFFF0,  // Ivory color
    metalness: 0.1,
    roughness: 0.2
});

const edgeMaterial = new THREE.MeshBasicMaterial({
    color: 0xD3D3D3,  // Light grey edges
    transparent: false
});

// Optimized cube creation with instancing
const createInstancedCubeWithEdges = (maxInstances) => {
    const group = new THREE.Group();
    
    // Main cube geometry
    const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const instancedCubes = new THREE.InstancedMesh(cubeGeometry, cubeMaterial, maxInstances);
    group.add(instancedCubes);
    
    // Optimized edge geometry
    const edgeGeometry = new THREE.BufferGeometry();
    const positions = [];
    const indices = [];
    
    // Create edge frame vertices
    const half = CUBE_SIZE / 2;
    const corners = [
        [-half, -half, -half], [half, -half, -half],
        [-half, half, -half], [half, half, -half],
        [-half, -half, half], [half, -half, half],
        [-half, half, half], [half, half, half]
    ];
    
    // Add vertices and indices for edges
    corners.forEach((corner, i) => {
        positions.push(...corner);
    });
    
    // Connect corners to form edges
    const edgeIndices = [
        0,1, 1,3, 3,2, 2,0,  // Front face
        4,5, 5,7, 7,6, 6,4,  // Back face
        0,4, 1,5, 2,6, 3,7   // Connecting edges
    ];
    indices.push(...edgeIndices);
    
    edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    edgeGeometry.setIndex(indices);
    
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    group.add(edges);
    
    return { group, instancedCubes };
};

// Create optimized cube pool
const maxCubes = BOARD_SIZE * BOARD_SIZE * 35;
const { group, instancedCubes } = createInstancedCubeWithEdges(maxCubes);
scene.add(group);

// Adjust camera for larger grid
camera.position.set(100, 100, 100);
camera.lookAt(0, -15, 0);

// Initialize game state
const tower = [new ConwayBoard(BOARD_SIZE)];
let frame = 0;
let poolIndex = 0;

// Optimization: Create matrices outside animation loop
const matrix = new THREE.Matrix4();
let instanceCount = 0;

function animate() {
    requestAnimationFrame(animate);
    frame++;

    if (frame % 15 === 0) { // Adjusted animation speed
        if (tower.length > 35) tower.pop();
        tower.unshift(tower[0].updateBoard());
        
        instanceCount = 0;
        
        tower.forEach((board, index) => {
            const height = -index * SPACING * 1.5;

            for (let i = 0; i < board.size; i++) {
                for (let j = 0; j < board.size; j++) {
                    if (board.board[i][j]) {
                        matrix.setPosition(
                            (i - board.size/2) * SPACING,
                            height,
                            (j - board.size/2) * SPACING
                        );
                        instancedCubes.setMatrixAt(instanceCount++, matrix);
                    }
                }
            }
        });
        
        instancedCubes.count = instanceCount;
        instancedCubes.instanceMatrix.needsUpdate = true;
    }

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});