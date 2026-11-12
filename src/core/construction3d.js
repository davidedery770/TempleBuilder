import * as THREE from '../vendor/three/three.module.min.js';
import { BUILD_PARTS, PLAN, targetPoint, acceptsDrop, canPlace } from '../data/level02.js';
import { buildMishkanModel, planToWorld, worldToPlan } from '../data/mishkan3d.js';
import { niqqud } from './niqqud.js';

/** WebGL is drawn into the existing 2D game canvas; no extra loop or DOM overlay. */
export class Construction3D {
  constructor({ pixelRatio = 1 } = {}) {
    this.canvas = document.createElement('canvas');
    this.disposed = false;
    this.failed = false;
    this.cutaway = false;
    this.width = 590; this.height = 310;
    this.geometryCache = new Map();
    this.textures = new Set();
    this.groups = new Map();
    this.placed = new Set();
    this.animations = new Map();
    this.ghost = null;
    this.ghostId = null;
    this.locationTarget = null;
    this.locationTargetId = null;
    this._contextLost = e => { e.preventDefault(); this.failed = true; };
    this.canvas.addEventListener('webglcontextlost', this._contextLost);
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas, antialias: true, alpha: false,
        preserveDrawingBuffer: true, powerPreference: 'low-power',
      });
      this.renderer.setPixelRatio(Math.min(pixelRatio, 1.75));
      this.renderer.setSize(this.width, this.height, false);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.35;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#b6cfce');
      this.scene.fog = new THREE.Fog('#b6cfce', 180, 360);
      this.camera = new THREE.PerspectiveCamera(36, this.width / this.height, 0.1, 500);
      this.raycaster = new THREE.Raycaster();
      this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      this.target = new THREE.Vector3();
      this.materials = this._materials();
      this._lighting();
      this._ground();
      this.model = buildMishkanModel();
      for (const [id, nodes] of Object.entries(this.model)) {
        const group = this._group(nodes, id);
        group.name = id;
        group.visible = false;
        this.groups.set(id, group);
        this.scene.add(group);
      }
      this.focus('court');
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  _clothTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ddd0a9'; ctx.fillRect(0, 0, 128, 128);
    const colors = ['#315b8a', '#734471', '#9a3e46', '#dcc9a3'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colors[i]; ctx.fillRect(i * 32, 0, 21, 128);
      ctx.strokeStyle = '#d6b86d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(i * 32 + 10, 10); ctx.lineTo(i * 32 + 18, 24);
      ctx.lineTo(i * 32 + 10, 38); ctx.lineTo(i * 32 + 2, 24); ctx.closePath(); ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 1);
    this.textures.add(texture);
    return texture;
  }

  _materials() {
    const standard = (color, metalness = 0, roughness = 0.65, extra = {}) =>
      new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
    const patterned = this._clothTexture();
    return {
      gold: standard('#e2b65c', 0.68, 0.3),
      darkGold: standard('#aa7934', 0.6, 0.4),
      silver: standard('#cbd5dc', 0.65, 0.35),
      bronze: standard('#ba7443', 0.65, 0.4),
      wood: standard('#79512f'),
      linenPlain: standard('#efe2c1', 0, 0.94, { side: THREE.DoubleSide }),
      linen: standard('#fff2d6', 0, 0.9, { map: patterned, side: THREE.DoubleSide }),
      curtain: standard('#fff2d6', 0, 0.9, { map: patterned, side: THREE.DoubleSide }),
      goat: standard('#655644', 0, 1),
      rams: standard('#9a4541', 0, 0.95),
      tachash: standard('#657e79', 0, 0.9),
      bread: standard('#bf9657'),
      coal: standard('#2d2925'),
      water: standard('#69b8d4', 0.3, 0.18),
      flame: new THREE.MeshBasicMaterial({ color: '#ffdd81' }),
      ghost: new THREE.MeshBasicMaterial({
        color: '#9cdddb', transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide,
      }),
      target: new THREE.MeshBasicMaterial({
        color: '#56ceff', transparent: true, opacity: 0.4, depthWrite: false,
        depthTest: false, side: THREE.DoubleSide,
      }),
      cutCloth: standard('#bdb69a', 0, 0.95, { transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
    };
  }

  _lighting() {
    this.scene.add(new THREE.HemisphereLight('#fff1d3', '#647b83', 2.6));
    const sun = new THREE.DirectionalLight('#ffe6ae', 3.1);
    sun.position.set(20, 80, 45);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 50, bottom: -50, near: 1, far: 200 });
    sun.shadow.normalBias = 0.08;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight('#a8d5ea', 1.4);
    fill.position.set(-40, 35, -45);
    this.scene.add(fill);
  }

  _ground() {
    const geometry = new THREE.BoxGeometry(112, 1, 62);
    this.geometryCache.set('ground', geometry);
    this.materials.sand = new THREE.MeshStandardMaterial({ color: '#c4a36b', roughness: 1 });
    const ground = new THREE.Mesh(geometry, this.materials.sand);
    ground.position.y = -0.55;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const points = [];
    for (const z of [-25, 25]) points.push(new THREE.Vector3(-50, 0.02, z), new THREE.Vector3(50, 0.02, z));
    for (const x of [-50, 50]) points.push(new THREE.Vector3(x, 0.02, -25), new THREE.Vector3(x, 0.02, 25));
    const borderGeometry = new THREE.BufferGeometry().setFromPoints(points);
    this.geometryCache.set('border', borderGeometry);
    this.materials.border = new THREE.LineDashedMaterial({ color: '#eedbb3', dashSize: 1, gapSize: 0.7 });
    const border = new THREE.LineSegments(borderGeometry, this.materials.border);
    border.computeLineDistances();
    this.scene.add(border);
    for (const [word, x, z] of [['צפון', 0, -29], ['דרום', 0, 29], ['מזרח', 54, 0], ['מערב', -54, 0]]) {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 80;
      const ctx = canvas.getContext('2d');
      ctx.font = 'bold 46px Arial'; ctx.textAlign = 'center'; ctx.direction = 'rtl';
      ctx.lineWidth = 7; ctx.strokeStyle = '#23343b'; ctx.strokeText(niqqud(word), 128, 57);
      ctx.fillStyle = '#f5e8c2'; ctx.fillText(niqqud(word), 128, 57);
      const texture = new THREE.CanvasTexture(canvas);
      this.textures.add(texture);
      const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
      this.materials['label_' + word] = material;
      const sprite = new THREE.Sprite(material);
      sprite.position.set(x, 1.5, z); sprite.scale.set(8, 2.5, 1);
      this.scene.add(sprite);
    }
  }

  _mesh(node) {
    const key = JSON.stringify([node.kind, node.size, node.points, node.radius]);
    let geometry = this.geometryCache.get(key);
    if (!geometry) {
      if (node.kind === 'box') geometry = new THREE.BoxGeometry(...node.size);
      else if (node.kind === 'cylinder') geometry = new THREE.CylinderGeometry(...node.size, 16);
      else if (node.kind === 'sphere') geometry = new THREE.SphereGeometry(1, 10, 8);
      else if (node.kind === 'tube') {
        const curve = new THREE.CatmullRomCurve3(node.points.map(p => new THREE.Vector3(...p)));
        geometry = new THREE.TubeGeometry(curve, 16, node.radius, 6, false);
      } else throw new Error('Unknown 3D geometry');
      this.geometryCache.set(key, geometry);
    }
    const mesh = new THREE.Mesh(geometry, this.materials[node.material]);
    mesh.position.set(...node.position);
    if (node.kind === 'sphere') mesh.scale.set(...node.size);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = node;
    return mesh;
  }

  focus(preset = 'court') {
    this.target.set(preset === 'tent' ? -15 : -4, preset === 'tent' ? 3 : 0, 0);
    this.distance = preset === 'tent' ? 48 : 145;
    this.azimuth = 0.78;
    this.elevation = preset === 'tent' ? 0.72 : 0.68;
    this._camera();
  }
  orbit(dx, dy) {
    this.azimuth -= dx * 0.009;
    this.elevation = THREE.MathUtils.clamp(this.elevation + dy * 0.006, 0.25, 1.44);
    this._camera();
  }
  zoom(direction) {
    this.distance = THREE.MathUtils.clamp(this.distance * Math.exp(direction * 0.12), 22, 190);
    this._camera();
  }
  _camera() {
    const r = this.distance * Math.cos(this.elevation);
    this.camera.position.set(this.target.x + Math.sin(this.azimuth) * r,
      this.target.y + Math.sin(this.elevation) * this.distance, this.target.z + Math.cos(this.azimuth) * r);
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }

  _group(nodes, id, ghost = false) {
    const group = new THREE.Group(), batches = new Map();
    for (const node of nodes) {
      const mesh = this._mesh(node);
      if (ghost) mesh.material = this.materials.ghost;
      const key = [mesh.geometry.uuid, mesh.material.uuid, node.role,
        id === 'bars' && node.position[2] > 5].join(':');
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push({ node, mesh });
    }
    for (const entries of batches.values()) {
      if (entries.length <= 2) {
        for (const { mesh } of entries) { mesh.castShadow = !ghost; group.add(mesh); }
        continue;
      }
      const first = entries[0];
      const mesh = new THREE.InstancedMesh(first.mesh.geometry, first.mesh.material, entries.length);
      mesh.userData = first.node; mesh.castShadow = !ghost; mesh.receiveShadow = !ghost;
      for (let i = 0; i < entries.length; i++) {
        entries[i].mesh.updateMatrix();
        mesh.setMatrixAt(i, entries[i].mesh.matrix);
      }
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
    return group;
  }

  /** Coordinates are local to the WebGL rectangle, not browser or physical pixels. */
  pickPlan(x, y) {
    if (this.disposed || this.failed || x < 0 || y < 0 || x > this.width || y > this.height) return null;
    this.raycaster.setFromCamera(new THREE.Vector2(x / this.width * 2 - 1, 1 - y / this.height * 2), this.camera);
    const point = this.raycaster.ray.intersectPlane(this.plane, new THREE.Vector3());
    if (!point || Math.abs(point.x) > 52 || Math.abs(point.z) > 27) return null;
    return worldToPlan(point.x, point.z);
  }
  projectPart(id) {
    const part = BUILD_PARTS.find(p => p.id === id);
    if (!part) return null;
    const { x, z } = planToWorld(...part.target);
    const p = new THREE.Vector3(x, 0, z).project(this.camera);
    return { x: (p.x + 1) * this.width / 2, y: (1 - p.y) * this.height / 2 };
  }

  setDrag(part, point) {
    this.dragPreview = part && point ? {part,point} : null;
  }

  sync(placed, selected, hint, t) {
    const initial = !this.synced;
    this.synced = true;
    for (const [id, group] of this.groups) {
      group.visible = placed.has(id);
      if (group.visible && !this.placed.has(id) && !initial) this.animations.set(id, t);
      const age = t - (this.animations.get(id) ?? t - 1);
      group.scale.y = age >= 0.55 ? 1 : 0.04 + 0.96 * (1 - Math.pow(1 - Math.max(0, age) / 0.55, 3));
      if (age >= 0.55) this.animations.delete(id);
      for (const mesh of group.children) {
        const n = mesh.userData;
        const roof = ['roof', 'drape'].includes(n.role);
        const southWall = id === 'south' || id === 'bars' && n.position[2] > 5;
        mesh.visible = !(this.cutaway && (roof || southWall));
        mesh.material = this.cutaway && ['fence', 'curtain', 'gate'].includes(n.role)
          ? this.materials.cutCloth : this.materials[n.material];
      }
    }
    this.placed = new Set(placed);
    const targetId = hint && selected && canPlace(selected, placed) ? selected.id : null;
    if (targetId !== this.locationTargetId) {
      if (this.locationTarget) {
        this.locationTarget.traverse(node => { if (node.isInstancedMesh) node.dispose(); });
        this.scene.remove(this.locationTarget);
      }
      this.locationTarget = null;
      this.locationTargetId = targetId;
      if (targetId) {
        this.locationTarget = this._group(this.model[targetId], targetId, true);
        this.locationTarget.traverse(node => {
          if (node.isMesh) {
            node.material = this.materials.target;
            node.renderOrder = 3;
            node.castShadow = node.receiveShadow = false;
          }
        });
        let ringGeometry = this.geometryCache.get('location-ring');
        if (!ringGeometry) {
          ringGeometry = new THREE.RingGeometry(2, 3.2, 40);
          this.geometryCache.set('location-ring', ringGeometry);
        }
        const ring = new THREE.Mesh(ringGeometry, this.materials.target);
        const world = planToWorld(...selected.target);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(world.x, 0.08, world.z);
        ring.renderOrder = 4;
        this.locationTarget.add(ring);
        this.scene.add(this.locationTarget);
      }
    }
    const preview=this.dragPreview;
    const ghostId = preview?.part.id || null;
    if (ghostId !== this.ghostId) {
      if (this.ghost) {
        this.ghost.traverse(node => { if (node.isInstancedMesh) node.dispose(); });
        this.scene.remove(this.ghost);
      }
      this.ghost = null; this.ghostId = ghostId;
      if (ghostId) {
        this.ghost = this._group(this.model[ghostId], ghostId, true);
        this.scene.add(this.ghost);
      }
    }
    if(this.ghost){
      const target=preview?targetPoint(preview.part):null;
      this.ghost.position.set(preview?(preview.point.x-target.x)/PLAN.scale:0,0,
        preview?(preview.point.y-target.y)/PLAN.scale:0);
      this.materials.ghost.color.set(preview?(acceptsDrop(preview.part,preview.point.x,preview.point.y,6)?'#75d89c':'#edc17a'):'#9cdddb');
    }
  }

  draw(ctx, rect, placed, selected, hint, t, pixelRatio = 1) {
    if (this.disposed || this.failed) throw new Error('תצוגת התלת־ממד אינה זמינה');
    const ratio = Math.min(pixelRatio, 1.75);
    if (this.renderer.getPixelRatio() !== ratio) {
      this.renderer.setPixelRatio(ratio);
      this.renderer.setSize(this.width, this.height, false);
    }
    this.sync(placed, selected, hint, t);
    this.renderer.render(this.scene, this.camera);
    ctx.drawImage(this.canvas, rect.x, rect.y, rect.w, rect.h);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.canvas?.removeEventListener('webglcontextlost', this._contextLost);
    this.scene?.traverse(node => { if (node.isInstancedMesh) node.dispose(); });
    for (const geometry of this.geometryCache.values()) geometry.dispose();
    for (const material of Object.values(this.materials || {})) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.groups.clear(); this.animations.clear();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }
}
