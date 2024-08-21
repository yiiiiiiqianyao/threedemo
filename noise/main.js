import { animate, init, addLights } from './initFunc.js'
(function() {
    const seed = 'test-seed';
    const { simplex, scene, camera, avatar, chunkManager } = init(seed);

    animate();

    var axisHelper = new THREE.AxesHelper(10);
    scene.add(axisHelper);
   
    addLights();
  
   
    const chunkId1 = chunkManager.initChunkID(1, 1);
    const chunkId2 = chunkManager.initChunkID(1, -1);
    const chunkId3 = chunkManager.initChunkID(-1, -1);
    const chunkId4 = chunkManager.initChunkID(-1, 1);
    chunkManager.updateChunk(chunkId1);
    chunkManager.updateChunk(chunkId2);
    chunkManager.updateChunk(chunkId3);
    chunkManager.updateChunk(chunkId4);
})()
