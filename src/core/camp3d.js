import * as THREE from '../vendor/three/three.module.min.js';
import { CAMP, CAMP_TENTS, CAMP_OBSTACLES, ALL_CAMP_STATIONS, CAMP_SPARKS } from '../data/camp01.js';
import { findCampPath } from '../game/campWorld.js';
import { MATERIALS, MATERIAL_GROUPS } from '../data/materials.js';

export class Camp3D {
  constructor({ pixelRatio = 1 } = {}) {
    this.canvas = document.createElement('canvas');
    this.disposed = false; this.failed = false;
    this.geometries = new Map(); this.materials = new Map(); this.people = new Map(); this.markers = new Map();
    this.gifts = [];
    this._lost = e => { e.preventDefault(); this.failed = true; };
    this.canvas.addEventListener('webglcontextlost', this._lost);
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
      this.renderer.setPixelRatio(Math.min(pixelRatio, 1.5)); this.renderer.setSize(960, 540, false);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
      this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.shadowMap.autoUpdate = false; this.renderer.shadowMap.needsUpdate = true;
      this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#92adb5');
      this.scene.fog = new THREE.Fog('#92adb5', 85, 180);
      this.target = new THREE.Vector3(0, 0, 13);
      this.camera = new THREE.OrthographicCamera(-30, 30, 16.875, -16.875, 0.1, 220);
      this.ray = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      this.static = new THREE.Group(); this.scene.add(this.static);
      this.scene.add(new THREE.HemisphereLight('#fff4d9', '#7b8e91', 2.0));
      const sun = new THREE.DirectionalLight('#ffe1a7', 2.3);
      sun.position.set(-25, 55, 30); sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -65, right: 65, top: 50, bottom: -50, near: 1, far: 160 });
      sun.shadow.normalBias = 0.08; this.scene.add(sun);
      this._build();
      for (const s of ALL_CAMP_STATIONS) {
        const person = this._person(s.id === 'moshe' ? '#eee4cc' : s.color, '#d3b268', s.id === 'moshe');
        person.group.position.set(s.at[0], 0, s.at[1]); person.group.scale.setScalar(1.1);
        this.people.set(s.id, person); this.scene.add(person.group);
        const ring = this._mesh('ring', [0.85, 1.1], '#e4c575', s.at[0], 0.035, s.at[1], this.scene);
        ring.rotation.x = -Math.PI / 2; this.markers.set(s.id, ring);
      }
      this.hero = this._person('#e5d4af', '#397b9b', true);
      this.hero.group.scale.setScalar(1.25);
      this.scene.add(this.hero.group);
      this.beam = this._mesh('box', [3.6, 0.3, 0.36], '#956b3d', 0, 1.25, 0.45, this.hero.group);
      this.beam.visible = false;
      this.aura = this._mesh('ring', [1.3, 1.42], '#ffe198', 0, 0.05, 0, this.hero.group);
      this.aura.rotation.x = -Math.PI / 2; this.aura.visible = false;
      this.sparks = CAMP_SPARKS.map(s => {
        const mesh = this._mesh('octa', [0.3], '#ffe6a0', s.x, s.y, s.z, this.scene);
        return { id: s.id, mesh, y: s.y };
      });
      this.supplies = MATERIALS.map((m, i) => this._mesh('box', [1, 0.65, 1],
        MATERIAL_GROUPS[m.group].color, -2.5 + i % 5 * 1.25, 0.4 + Math.floor(i / 5) * 0.7, 8.5, this.scene));
      this._batchStatic();
      this._camera();
    } catch (error) { this.dispose(); throw error; }
  }
  _material(color, transparent = false) {
    const key = color + (transparent ? '_glass' : '');
    if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial({
      color, roughness: 0.88, transparent, opacity: transparent ? 0.32 : 1,
      depthWrite: !transparent, side: THREE.DoubleSide,
    }));
    return this.materials.get(key);
  }
  _mesh(kind, size, color, x, y, z, parent = this.static, transparent = false) {
    const key = kind + JSON.stringify(size);
    let geometry = this.geometries.get(key);
    if (!geometry) {
      if (kind === 'box') geometry = new THREE.BoxGeometry(...size);
      else if (kind === 'sphere') geometry = new THREE.SphereGeometry(size[0], 10, 8);
      else if (kind === 'cylinder') geometry = new THREE.CylinderGeometry(...size, 10);
      else if (kind === 'ring') geometry = new THREE.RingGeometry(...size, 24);
      else if (kind === 'octa') geometry = new THREE.OctahedronGeometry(size[0]);
      else if (kind === 'tent') {
        const [w, h, d] = size, a = [-w / 2, 0, -d / 2], b = [w / 2, 0, -d / 2], c = [0, h, -d / 2];
        const aa = [-w / 2, 0, d / 2], bb = [w / 2, 0, d / 2], cc = [0, h, d / 2];
        const points = [a, c, b, aa, bb, cc, a, aa, cc, a, cc, c, b, c, cc, b, cc, bb];
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3)); geometry.computeVertexNormals();
      } else throw new Error('Unknown camp geometry');
      this.geometries.set(key, geometry);
    }
    const mesh = new THREE.Mesh(geometry, this._material(color, transparent));
    mesh.position.set(x, y, z); mesh.castShadow = parent === this.static; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  _build() {
    this._mesh('box', [98, 0.7, 78], '#bc9a64', 0, -0.4, 0);
    const roads = new Set();
    for (const s of ALL_CAMP_STATIONS) {
      for (const p of findCampPath({ x: CAMP.spawn[0], z: CAMP.spawn[1] }, { x: s.at[0], z: s.at[1] + 1 })) roads.add(`${p.x},${p.z}`);
    }
    for (const k of roads) {
      const [x, z] = k.split(',').map(Number);
      this._mesh('box', [1.4, 0.025, 1.4], '#d2b47b', x, -0.01, z);
    }
    for (const t of CAMP_TENTS) {
      this._mesh('tent', [t.w, t.h, t.d], t.color, t.x, 0, t.z, this.static, t.id === 'store');
      this._mesh('tent', [t.w * 0.26, t.h * 0.6, 0.025], '#302a25', t.x, 0.01, t.z + t.d / 2 + 0.025);
      for (const dx of [-1, 1]) {
        this._mesh('cylinder', [0.07, 0.08, t.h], '#8a623c', t.x, t.h / 2, t.z + dx * t.d / 2);
        this._mesh('box', [0.15, 0.7, 0.15], '#795d39', t.x + dx * (t.w / 2 + 0.45), 0.35, t.z + t.d / 2);
      }
    }
    for (const o of CAMP_OBSTACLES.filter(o => o.id.startsWith('crate'))) {
      this._mesh('box', [o.w, o.height, o.d], '#9d7548', o.x, o.height / 2, o.z);
      this._mesh('box', [o.w + 0.05, 0.1, o.d + 0.05], '#b8945e', o.x, o.height, o.z);
    }
    for (let i = 0; i < 6; i++) {
      const log = this._mesh('cylinder', [0.32, 0.32, 5.6], '#a17a48', 28, 0.35 + Math.floor(i / 3) * 0.56, -15 + (i % 3 - 1) * 0.6);
      log.rotation.z = Math.PI / 2;
    }
    this._mesh('box', [4, 0.25, 2], '#a77b48', 27, 1.1, 2);
    for (const dx of [-1.6, 1.6]) for (const dz of [-0.7, 0.7]) this._mesh('box', [0.25, 1, 0.25], '#795635', 27 + dx, 0.5, 2 + dz);
    // Loom and spools at the weavers' station.
    for (const x of [-8.4, -5.6]) this._mesh('box', [0.15, 2.5, 0.2], '#8a633b', x, 1.25, -21.6);
    this._mesh('box', [3, 0.14, 0.2], '#8a633b', -7, 2.5, -21.6);
    for (let i = 0; i < 4; i++) {
      this._mesh('box', [0.66, 1.65, 0.08], ['#3a8ee0', '#9755ae', '#bd4b4d', '#e6dfc6'][i], -8 + i * 0.67, 1.4, -21.6);
    }
    for (let i = 0; i < 3; i++) {
      this._mesh('cylinder', [0.28, 0.45, 0.8], '#bf9a60', 20 + i, 0.4, 16.5);
      this._mesh('cylinder', [0.17, 0.17, 0.17], '#d5bd88', 20 + i, 0.9, 16.5);
    }
    for (let i = 0; i < 9; i++) {
      this._mesh('tent', [22, 15 + i % 3 * 5, 17], i % 2 ? '#8b867b' : '#aaa08b',
        -70 + i * 18, -1, -60 - i % 2 * 10);
    }
  }
  _person(robe, sash, staff = false) {
    const group = new THREE.Group();
    this._mesh('cylinder', [0.28, 0.44, 1.05], robe, 0, 1.05, 0, group);
    this._mesh('cylinder', [0.33, 0.35, 0.13], sash, 0, 1.15, 0, group);
    this._mesh('sphere', [0.25], '#d4a47b', 0, 1.84, 0, group);
    this._mesh('cylinder', [0.28, 0.29, 0.14], '#f0e9d6', 0, 2.04, 0, group);
    for (const dx of [-0.085, 0.085]) this._mesh('sphere', [0.025], '#342f2a', dx, 1.86, 0.23, group);
    const legs = [], arms = [];
    for (const sign of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(sign * 0.16, 0.58, 0);
      this._mesh('cylinder', [0.1, 0.11, 0.55], '#bba27e', 0, -0.27, 0, leg);
      this._mesh('box', [0.22, 0.1, 0.34], '#69503a', 0, -0.53, 0.05, leg);
      legs.push(leg); group.add(leg);
      const arm = new THREE.Group(); arm.position.set(sign * 0.38, 1.45, 0);
      this._mesh('cylinder', [0.09, 0.1, 0.65], robe, 0, -0.25, 0, arm);
      this._mesh('sphere', [0.095], '#d4a47b', 0, -0.6, 0, arm);
      arms.push(arm); group.add(arm);
    }
    if (staff) {
      this._mesh('cylinder', [0.035, 0.045, 2.7], '#936c37', -0.63, 1.35, 0.18, group);
      for (let i = -3; i <= 3; i++) {
        this._mesh('cylinder', [0.017, 0.017, 0.15 + Math.abs(i) * 0.04], '#d9b254', -0.63 + i * 0.065, 2.7, 0.18, group);
        this._mesh('sphere', [0.035], '#ffe39a', -0.63 + i * 0.065, 2.83 + Math.abs(i) * 0.02, 0.18, group);
      }
    }
    const shadow = this._mesh('ring', [0, 0.48], '#786342', 0, 0.03, 0, group);
    shadow.rotation.x = -Math.PI / 2; shadow.material = this._material('#786342', true);
    return { group, legs, arms };
  }
  _batchStatic() {
    const buckets = new Map(), temporary = [...this.static.children];
    this.static.clear();
    for (const mesh of temporary) {
      const key = mesh.geometry.uuid + mesh.material.uuid;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(mesh);
    }
    for (const entries of buckets.values()) {
      if (entries.length < 3) { entries.forEach(m => this.static.add(m)); continue; }
      const mesh = new THREE.InstancedMesh(entries[0].geometry, entries[0].material, entries.length);
      entries.forEach((m, i) => { m.updateMatrix(); mesh.setMatrixAt(i, m.matrix); });
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); this.static.add(mesh);
    }
  }
  _camera() {
    this.camera.position.copy(this.target).add(new THREE.Vector3(28, 32, 28));
    this.camera.lookAt(this.target); this.camera.updateMatrixWorld();
  }
  project(x, y, z) {
    const p = new THREE.Vector3(x, y, z).project(this.camera);
    if (p.z < -1 || p.z > 1) return null;
    return { x: (p.x + 1) * 480, y: (1 - p.y) * 270 };
  }
  pickWorld(x, y) {
    this.ray.setFromCamera(new THREE.Vector2(x / 480 - 1, 1 - y / 270), this.camera);
    const p = this.ray.ray.intersectPlane(this.plane, new THREE.Vector3());
    return p && p.x >= CAMP.minX && p.x <= CAMP.maxX && p.z >= CAMP.minZ && p.z <= CAMP.maxZ ? { x: p.x, z: p.z } : null;
  }
  draw(ctx, world, t, pixelRatio = 1) {
    if (this.failed || this.disposed) throw new Error('Camp WebGL context unavailable');
    const ratio = Math.min(pixelRatio, 1.5);
    if (this.renderer.getPixelRatio() !== ratio) { this.renderer.setPixelRatio(ratio); this.renderer.setSize(960, 540, false); }
    const p = world.player;
    this.target.lerp(new THREE.Vector3(THREE.MathUtils.clamp(p.x, -20, 20), 0, THREE.MathUtils.clamp(p.z, -13, 17)), 0.08);
    this._camera();
    this.hero.group.position.set(p.x, p.y, p.z); this.hero.group.rotation.y = p.facing;
    this.beam.visible = world.carrying;
    this.aura.visible = world.light > 0;
    this.aura.scale.setScalar(1 + (0.5 - world.light) * 2);
    if (!this.lastDone) this.lastDone = new Set(world.done);
    for (const id of world.done) {
      if (this.lastDone.has(id)) continue;
      const station = ALL_CAMP_STATIONS.find(s => s.id === id);
      const mesh = this._mesh('box', [0.4, 0.3, 0.4], station.color, station.at[0], 1.4, station.at[1], this.scene);
      this.gifts.push({ mesh, start: t, from: station.at });
    }
    this.lastDone = new Set(world.done);
    this.gifts = this.gifts.filter(g => {
      const u = Math.min(1, (t - g.start) / 1.1);
      g.mesh.position.set(THREE.MathUtils.lerp(g.from[0], p.x, u),
        1.4 + Math.sin(u * Math.PI) * 1.5, THREE.MathUtils.lerp(g.from[1], p.z, u));
      if (u >= 1) { this.scene.remove(g.mesh); return false; }
      return true;
    });
    const swing = p.walking ? Math.sin(t * (world.carrying ? 8 : 12)) * 0.55 : 0;
    this.hero.legs.forEach((m, i) => { m.rotation.x = swing * (i ? -1 : 1); });
    this.hero.arms.forEach((m, i) => { m.rotation.x = world.carrying ? -1.0 : -swing * (i ? -1 : 1); });
    for (const [id, npc] of this.people) {
      npc.arms[0].rotation.z = Math.sin(t * 1.7 + id.length) * 0.09;
      npc.group.rotation.y = Math.atan2(p.x - npc.group.position.x, p.z - npc.group.position.z) * 0.15;
    }
    for (const [id, ring] of this.markers) {
      ring.material = this._material(world.done.has(id) ? '#7cbb86' : id === world.nextObjective.id ? '#f1d17f' : '#baa16b');
      const scale = id === world.nextObjective.id ? 1 + Math.sin(t * 3) * 0.08 : 1; ring.scale.setScalar(scale);
    }
    this.sparks.forEach(s => { s.mesh.visible = !world.sparks.has(s.id); s.mesh.rotation.y = t; s.mesh.position.y = s.y + Math.sin(t * 3) * 0.1; });
    this.supplies.forEach((m, i) => { m.visible = world.materials.has(MATERIALS[i].id); });
    this.renderer.render(this.scene, this.camera); ctx.drawImage(this.canvas, 0, 0, 960, 540);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.canvas?.removeEventListener('webglcontextlost', this._lost);
    this.scene?.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
    this.geometries.forEach(g => g.dispose()); this.materials.forEach(m => m.dispose());
    this.renderer?.dispose(); this.renderer?.forceContextLoss();
  }
}
