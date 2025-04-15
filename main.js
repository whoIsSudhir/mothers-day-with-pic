import { GLTFLoader } from './libs/three.js-r132/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from './libs/three.js-r132/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from './libs/three.js-r132/examples/jsm/loaders/RGBELoader.js';
const THREE = window.MINDAR.IMAGE.THREE;

document.addEventListener('DOMContentLoaded', async () => {
  const mindarThree = new window.MINDAR.IMAGE.MindARThree({
    container: document.body,
    imageTargetSrc: './new.mind',
    uiScanning: "#scanning-overlay",
  });

  const { renderer, scene, camera } = mindarThree;

  // Set renderer encoding and tone mapping
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.5;

  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  // Load HDR environment map
  const rgbeLoader = new RGBELoader();
  const envMap = await rgbeLoader.loadAsync('./assets/venice_sunset_1k.hdr');
  envMap.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = envMap; // Apply envMap to the scene

  // Load GLTF model with Draco compression
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('./libs/three.js-r132/examples/js/libs/draco/');
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  const panda = await new Promise((resolve, reject) => {
    gltfLoader.load('./assets/preset.glb', resolve, undefined, reject);
  });
  panda.scene.scale.set(0.022, 0.022, 0.022);
  panda.scene.position.set(-0.12, 0.05, -0.05);
  panda.scene.rotation.set(Math.PI / 2, 0, 0);

  // Disable envMap for the GLTF model
  panda.scene.traverse((child) => {
    if (child.isMesh) {
      child.material.envMap = null;
      child.material.needsUpdate = true;
    }
  });

  const anchor = mindarThree.addAnchor(0);
  anchor.group.add(panda.scene);

  const mixer = new THREE.AnimationMixer(panda.scene);
  panda.animations.forEach((clip) => {
    const action = mixer.clipAction(clip);
    action.clampWhenFinished = true;
    action.play();
  });

  const clock = new THREE.Clock();

  await mindarThree.start();
  renderer.setAnimationLoop(() => {
    mixer.update(clock.getDelta());
    renderer.render(scene, camera);
  });

  /**
   * Function to create a circular plane with an image texture and HDR lighting.
   * @param {string} imageUrl - Path to the image file.
   * @param {Object} position - Position object {x, y, z}.
   * @param {number} radius - Radius of the circular plane.
   * @param {THREE.Texture} envMap - Environment map for lighting.
   * @returns {THREE.Mesh} - Circular plane mesh with the image texture and HDR lighting applied.
   */
  function createCircularPlaneWithImage(imageUrl, position, radius, envMap) {
    // Load the image texture
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(imageUrl);

    // Create a circular plane geometry
    const geometry = new THREE.CircleGeometry(radius, 64); // Circle with given radius and 64 segments

    // Create a material with the loaded texture and envMap
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      envMap: envMap, // Apply the HDR environment map
      envMapIntensity: 1.0, // Control the intensity of reflections
      side: THREE.DoubleSide, // Ensure both sides are visible if needed
      metalness: 0.5, // Adjust metallic properties for reflections
      roughness: 0.5, // Adjust roughness for shininess
      transparent: true, // Enable transparency for PNG
      alphaTest: 0.5 // Use alphaTest to discard transparent pixels
    });

    // Create the mesh from geometry and material
    const planeMesh = new THREE.Mesh(geometry, material);
    planeMesh.position.set(position.x, position.y, position.z);

    // Rotate so it faces correctly (if necessary)
    //planeMesh.rotation.x = -Math.PI / 2; // Default rotation to face upwards

    return planeMesh;
  }

  // Modify the font loader callback to use the new circular plane function instead of text
  const fontLoader = new THREE.FontLoader();
  fontLoader.load('./Edwardian.json', function (font) {
    console.log('Font loaded:', font);

    // Replace text meshes with circular planes
    const happyPlane = createCircularPlaneWithImage(
      "./assets/new1.jpg", 
      { x: 0, y: 0.05, z: 0.2 }, 
      0.3, 
      envMap // Pass the HDR environment map
    );

    anchor.group.add(happyPlane);
  });
});