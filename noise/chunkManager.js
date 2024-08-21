import { EventSystem } from "./emmit.js";
// terrain      地形
// Biome        生物群落
// elevation    海拔
// moisture     潮湿、水汽

const MaxElevation = 20;
const MinElevation = -20;

class Chunk extends EventSystem {
    id;
    originXZ;
    bounds = {
        x: [0, 1],
        y: [MaxElevation, MinElevation],
        z: [0, 1],
    };
    chunkRange;
    simplex;
    cacheBlocks = new Map();
    blockCount = 0;
    constructor(id, originXZ, chunkRange, simplex) {
        super();
        this.id = id;
        this.originXZ = originXZ;
        this.chunkRange = chunkRange;
        this.simplex = simplex;
        this.bounds.x = [originXZ[0], originXZ[0] + this.chunkRange];
        this.bounds.z = [originXZ[1], originXZ[1] + this.chunkRange];
    }

    initChunk() {
        const originXZ = this.originXZ;
        for(let x = originXZ[0]; x < originXZ[0] + this.chunkRange;x++) {
            for(let z = originXZ[1]; z < originXZ[1] + this.chunkRange;z++) {
                const elevation = this.generateElevation(this.simplex, x, z);
                const yLimit = Math.min(elevation, MaxElevation);
                
                this.bounds.y[0] = Math.min(this.bounds.y[0], yLimit);
                this.bounds.y[1] = Math.max(this.bounds.y[1], yLimit);

                for(let y = MinElevation; y <= yLimit; y++) {
                    this.addBlock(x, y, z, 'blank');
                }
                // this.addBlock(x, elevation, z, 'blank');
            }
        }
        this.removeVisibleBlock();
        console.log('blockCount', this.blockCount);

        this.emit('CHUNK_INIT_END');
    }

    removeVisibleBlock() {
        const getAllBlocks = this.getAllBlocks();
        getAllBlocks.forEach(block => {
            // clip by bounds
            if(block.y < this.bounds.y[0]) {
                this.removeBlockById(block.id);
            }
        })
    }

    getLeftBlockByID(blockId) {
        const [x, y, z] = blockId.split('-');

    }

    addBlock(x, y, z, type) {
        const id = this.initBlockID(x, y, z);
        if(!this.cacheBlocks.has(id)) {
            this.cacheBlocks.set(id, {
                id, x, y, z, type
            });
            this.blockCount++;
        }
    }

    addBlockById() {

    }

    removeBlock(x, y, z) {

    }

    removeBlockById(id) {
        if(this.cacheBlocks.has(id)) {
            this.cacheBlocks.delete(id);
            this.blockCount--;
        }
    }

    initBlockID(x, y, z) {
        return `${x}-${y}-${z}`;
    }
    
    getAllBlocks() {
        return [...this.cacheBlocks.values()];
    }
    /**
     * 
     * @param {*} simplex 
     * @param {*} x 
     * @param {*} z 
     * @param {*} min 最低海拔
     * @param {*} max 最高海拔
     * @returns 
     */
    generateElevation(simplex, x, z) {
        const E1d = 8;
        const E1 = simplex.noise2D(x / E1d, z / E1d);
    
        const E2d = 20;
        const E2 = simplex.noise2D(x / E2d, z / E2d);
    
        const E3d = 80;
        const E3 = simplex.noise2D(x / E3d, z / E3d);
    
        const E = (E1 * 0.2 + E2 * 0.3 + E3 * 0.5) * 12;
        
        return Math.floor(E);
    }
}

export class ChunkManager extends EventSystem {
    chunkRange = 25;
    chunkCache = new Map();
    simplex;
    scene;
    geometry = new THREE.BoxGeometry( 1, 1, 1, 1, 1 );
    material = new THREE.MeshPhongMaterial();
    constructor(simplex, scene) {
        super();
        this.simplex = simplex;
        this.scene = scene;
        
    }

    updateChunk(chunkId) {
        if(this.chunkCache.has(chunkId)) {
            return;
        }
        const origin = this.parseChunkId(chunkId);
        const chunk = new Chunk(chunkId, origin, this.chunkRange, this.simplex);
        chunk.on('CHUNK_INIT_END', () => {
            const blocks = chunk.getAllBlocks();
            blocks.forEach(block => {
                const { x, y, z } = block;
                const blockMesh = this.initMesh(255, y);
                blockMesh.position.set(x, y, z);
                this.scene.add(blockMesh)
            })
            
        });
        chunk.initChunk();
        this.chunkCache.set(chunkId, chunk);
    }

    initMesh(r, g, b) {
        const material = this.material.clone();
        material.color = new THREE.Color(g / 5, (g + 10) / 10, 0);
        return new THREE.Mesh( this.geometry, material );
    }

    initChunkID(x, z) {
        const chunkX = Math.floor(x / this.chunkRange);
        const chunkZ = Math.floor(z / this.chunkRange);
        return `${chunkX}.${chunkZ}`
    }
    
    parseChunkId(chunkId) {
        const [x, z] = chunkId.split('.');
        const px = x * this.chunkRange;
        const pz = z * this.chunkRange;
        return [px, pz]
    }

    getAroundChunkIds(chunkId) {
        const [ cx, cz ] = chunkId.split('.');
        return [
            `${+cx - 1}.${+cz - 1}`,
            `${+cx}.${+cz - 1}`,
            `${+cx + 1}.${+cz - 1}`,

            `${+cx - 1}.${+cz}`,
            `${+cx + 1}.${+cz}`,

            `${+cx - 1}.${+cz + 1}`,
            `${+cx}.${+cz + 1}`,
            `${+cx + 1}.${+cz + 1}`,
        ]
    }
}