import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Group,
  Clock,
  DirectionalLight,
  TextureLoader,
  Points
} from './three.module.js'

import { OrbitControls } from './OrbitControls.js'
import { Shaders } from './shaders.js'
import { GLTFLoader } from './GLTFLoader.js';

const particle_size = 0.002;

class Sketch {
  constructor() {
    this.renderer = new WebGLRenderer({
      antialias: false,
      stencil: false
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    this.camera = new PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 0, 1)

    this.scene = new Scene()
    this.elements = {}
    this.canvas = null

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)

    this.clock = new Clock(true)
    this.deltaTime = 0.1;

    this.fps = 20;
    this.now;
    this.then = Date.now();
    this.interval = 1000 / this.fps;
    this.delta;

    this.init()
    this.resize()
  }

  init() {
    this.addCanvas()
    this.addEvents()
    this.addElements()
    this.render()
  }

  addCanvas() {
    this.canvas = this.renderer.domElement
    document.body.appendChild(this.canvas)
  }

  addEvents() {
    window.addEventListener('resize', this.resize.bind(this))
  }

  addElements() {
    const directionalLight = new DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0.2, 1.0, 0.4);
    this.scene.add(directionalLight);
    this.elements.light = directionalLight;

    sortByName(gltf_scene.children);
    const cat = gltf_scene.children[0];
    const goggles = gltf_scene.children[1];

    //particles
    this.catMaterial = Shaders.brushMaterial;
    this.catMaterial.uniforms.brushMap.value = brushTexture;
    this.catMaterial.uniforms.stencilMap.value = cookieTexture;
    this.catMaterial.uniforms.patternMap.value = patternTexture;

    this.goggleMaterial = this.catMaterial.clone();
    this.goggleMaterial.uniforms.brushMap.value = brushTexture;
    this.goggleMaterial.uniforms.stencilMap.value = cookieTexture;
    this.goggleMaterial.uniforms.patternMap.value = patternTexture;

    const cat_particles = new Points(cat.geometry, this.catMaterial);
    const goggles_particles = new Points(goggles.geometry, this.goggleMaterial);

    let group = new Group();
    group.position.y = -0.2;
    group.add(cat_particles);
    group.add(goggles_particles);
    this.scene.add(group);
  }

  resize() {
    this.renderer.setSize(window.innerWidth * 2, window.innerHeight * 2)
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()

    this.catMaterial.uniforms.size.value = window.innerHeight * particle_size;
    this.goggleMaterial.uniforms.size.value = window.innerHeight * particle_size * 0.5;
  }

  render() {
    requestAnimationFrame(this.render.bind(this));

    this.now = Date.now();
    this.delta = this.now - this.then;

    if (this.delta < this.interval) return;
    this.then = this.now - (this.delta % this.interval);
    this.deltaTime = this.clock.getDelta();
    this.controls.update()

    // update materials
    this.catMaterial.uniforms.time.value = this.clock.elapsedTime;
    this.goggleMaterial.uniforms.time.value = this.clock.elapsedTime;

    this.renderer.render(this.scene, this.camera);
  }
}

// load assets
var brushTexture;
var cookieTexture;
var patternTexture;

var gltf_scene;

const gltf_loader = new GLTFLoader();
gltf_loader.crossOrigin = true;

const textureLoader = new TextureLoader();

gltf_loader.load('assets/cat.glb', gltf => {
  gltf_scene = gltf.scene.children[0];
  // console.log(gltf_scene);

  // textures
  brushTexture = textureLoader.load('assets/brushes.png', () => {
    cookieTexture = textureLoader.load('assets/cookie.png', () => {
      patternTexture = textureLoader.load('assets/pattern.png', () => {
        new Sketch()
      });
    });
  });
});


var nameA;
var nameB;
function sortByName(objectAray) {
  objectAray.sort(function (a, b) {
    nameA = a.name.toUpperCase(); // ignore upper and lowercase
    nameB = b.name.toUpperCase(); // ignore upper and lowercase
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    // names must be equal
    return 0;
  });
}