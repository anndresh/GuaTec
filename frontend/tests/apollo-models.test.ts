import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildStandModel, standCollisionProxies, type StandModelKind } from '../src/apollo/ApolloStandModels';
import { buildCar, CAR_SPECS } from '../src/apollo/ApolloVehicles';
import {STAND_DESIGNS} from '../src/apollo/ApolloStandDesigns';
import {buildCrawler} from '../src/apollo/ApolloCrawler';
import {buildTrackingDish} from '../src/apollo/ApolloTrackingDish';
import {buildAssemblyBuilding} from '../src/apollo/ApolloAssemblyBuilding';
import {buildSupportBuilding} from '../src/apollo/ApolloSupportBuildings';
import {SITE_BUILDINGS} from '../src/apollo/ApolloSiteLayout';

test('architectural detail fits closed building proxies with shared materials and bounded geometry', () => {
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const factory = (name: string, color: number, roughness = .8, metalness = 0) => {
    if (!materials.has(name)) materials.set(name, new THREE.MeshStandardMaterial({color, roughness, metalness}));
    return materials.get(name)!;
  };
  const inspect = (model: THREE.Group, maxBatches: number, maxTriangles: number) => {
    const used = new Set<THREE.Material>(); let triangles = 0;
    model.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      assert.ok(!Array.isArray(node.material));
      const material = node.material as THREE.MeshStandardMaterial;
      assert.ok([...materials.values()].includes(material));
      assert.equal(material.map, null, 'architectural detail allocates no textures');
      assert.ok(!used.has(material), 'one rigid batch per material'); used.add(material);
      assert.equal(node.geometry.groups.length, 0);
      const vertices = node.geometry.getAttribute('position');
      triangles += (node.geometry.index?.count ?? vertices.count) / 3;
      for (const attribute of Object.values(node.geometry.attributes)) {
        for (const value of attribute.array) assert.ok(Number.isFinite(value));
      }
      node.geometry.dispose();
    });
    assert.ok(used.size <= maxBatches); assert.ok(triangles <= maxTriangles);
    return triangles;
  };
  for (const [index, spec] of SITE_BUILDINGS.entries()) {
    const model = buildSupportBuilding(spec, index, factory), bounds = new THREE.Box3().setFromObject(model);
    assert.ok(bounds.min.y >= -.01 && bounds.max.y <= spec.height + 2.1);
    assert.ok(bounds.min.x >= -spec.width / 2 - .7 && bounds.max.x <= spec.width / 2 + .7, 'side details stay inside the existing collider');
    assert.ok(bounds.min.z >= -spec.depth / 2 - .7 && bounds.max.z <= spec.depth / 2 + .7, 'rain hoods and back details stay inside the collider');
    inspect(model, 7, 7500);
  }
  assert.ok(materials.size <= 7, 'four variants use one shared seven-material kit');
  const near = buildAssemblyBuilding(factory), far = buildAssemblyBuilding(factory, false);
  const nearBounds = new THREE.Box3().setFromObject(near), farBounds = new THREE.Box3().setFromObject(far);
  for (const bounds of [nearBounds, farBounds]) {
    assert.ok(bounds.min.y >= -1e-5 && bounds.max.y >= 160 && bounds.max.y <= 162.1);
    assert.ok(bounds.max.x <= 80.1 && bounds.min.x >= -80.1);
    assert.ok(bounds.max.z <= 68.1 && bounds.min.z >= -68.1);
  }
  assert.ok(Math.abs(nearBounds.max.y - farBounds.max.y) < .3, 'LOD preserves the skyline');
  const nearTriangles = inspect(near, 6, 8000), farTriangles = inspect(far, 3, 500);
  assert.ok(farTriangles < nearTriangles / 10, 'distant architecture drops small details');
  materials.forEach(material => material.dispose());
});

test('ground support machinery preserves its footprint and bounded untextured batches', () => {
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const factory = (name: string, color: number, roughness = .8, metalness = 0) => {
    if (!materials.has(name)) materials.set(name, new THREE.MeshStandardMaterial({color, roughness, metalness}));
    return materials.get(name)!;
  };
  for (const {model, maxBatches, maxTriangles, minHeight, maxHeight, width, depth} of [
    {model: buildCrawler(factory), maxBatches: 8, maxTriangles: 22_000, minHeight: 7, maxHeight: 9, width: 43, depth: 38},
    {model: buildTrackingDish(factory), maxBatches: 4, maxTriangles: 12_000, minHeight: 9, maxHeight: 12, width: 7.6, depth: 7.6},
  ]) {
    const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3());
    assert.ok(bounds.min.y >= -.01 && size.y >= minHeight && bounds.max.y <= maxHeight, model.name + ': supported metre-scale height');
    assert.ok(Math.abs(bounds.min.x) <= width / 2 && Math.abs(bounds.max.x) <= width / 2, model.name + ': width fits existing footprint');
    assert.ok(Math.abs(bounds.min.z) <= depth / 2 && Math.abs(bounds.max.z) <= depth / 2, model.name + ': depth fits existing footprint');
    const used = new Set<THREE.Material>(); let triangles = 0;
    model.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      assert.ok(!Array.isArray(node.material));
      const material = node.material as THREE.MeshStandardMaterial;
      assert.ok([...materials.values()].includes(material));
      assert.equal(material.map, null, 'mechanical detail does not allocate textures');
      assert.ok(!used.has(material), 'rigid detail is merged once per material'); used.add(material);
      assert.equal(node.geometry.groups.length, 0, 'batches have no hidden material draw groups');
      const vertices = node.geometry.getAttribute('position');
      triangles += (node.geometry.index?.count ?? vertices.count) / 3;
      for (const attribute of Object.values(node.geometry.attributes)) {
        for (const value of attribute.array) assert.ok(Number.isFinite(value), model.name + ': finite attribute data');
      }
      node.geometry.dispose();
    });
    assert.ok(used.size <= maxBatches, model.name + ': bounded draw calls');
    assert.ok(triangles <= maxTriangles, model.name + ': bounded triangle cost');
  }
  materials.forEach(material => material.dispose());
});

test('every stand builds finite human-scale geometry with bounded shared material batches', () => {
  const atlas = new THREE.Texture(), materials = new Map<string,THREE.MeshStandardMaterial>();
  const factory = (name:string,color:number,roughness=.8,metalness=0) => {
    if(!materials.has(name))materials.set(name,new THREE.MeshStandardMaterial({color,roughness,metalness}));
    return materials.get(name)!;
  };
  const kinds:StandModelKind[]=['sequence','flight-plan','telemetry','cables','crew-manifest','weather','beacons','orientation','survey','records','radio','crew','tracking'];
  let kitTriangles=0;
  for(const kind of kinds){
    const model=buildStandModel(kind,factory,atlas,0),bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
    assert.ok(size.x>=5&&size.x<7,`${kind}: width is in metres`);assert.ok(size.y>1.8&&size.y<5,`${kind}: height is in metres`);
    assert.ok(model.children.length<=9,`${kind}: material batches stay bounded`);
    const usedMaterials=new Set<THREE.Material>();let triangles=0;
    model.traverse(node=>{if(node instanceof THREE.Mesh){
      assert.ok(!Array.isArray(node.material),`${kind}: each batch has a single material`);
      const material=node.material as THREE.MeshStandardMaterial;
      assert.ok([...materials.values()].includes(material),`${kind}: detail reuses factory materials`);
      assert.ok(!usedMaterials.has(material),`${kind}: static parts merge once per material`);usedMaterials.add(material);
      assert.equal(material.map,material===materials.get('stand-instrument-atlas')?atlas:null,`${kind}: only the shared atlas is textured`);
      assert.equal(node.geometry.groups.length,0,`${kind}: detail cannot add hidden material draw groups`);
      const position=node.geometry.getAttribute('position'),uv=node.geometry.getAttribute('uv');
      triangles+=(node.geometry.index?.count??position.count)/3;
      for(let i=0;i<position.array.length;i++)assert.ok(Number.isFinite(position.array[i]),`${kind}: finite vertices`);
      assert.equal(uv.count,position.count,`${kind}: all detail retains UVs for merging`);
      for(let i=0;i<uv.array.length;i++){
        assert.ok(Number.isFinite(uv.array[i]),`${kind}: finite UVs`);
        if(material.map)assert.ok(uv.array[i]>=0&&uv.array[i]<=1,`${kind}: atlas UVs stay inside the shared texture`);
      }
      node.geometry.dispose();
    }});
    assert.ok(triangles<=10_000,`${kind}: functional detail stays within the 10k triangle station budget`);kitTriangles+=triangles;
  }
  assert.ok(kitTriangles<=60_000,'the complete station kit stays within its triangle budget');
  assert.ok(materials.size<=9);materials.forEach(material=>material.dispose());atlas.dispose();
});

test('working forms differ by function and open instruments have no phantom canopy posts',()=>{
  assert.equal(new Set(Object.values(STAND_DESIGNS).map(design=>design.silhouette)).size,13);
  for(const kind of Object.keys(STAND_DESIGNS) as StandModelKind[]){
    const design=STAND_DESIGNS[kind],proxies=standCollisionProxies(kind,0,0);
    assert.ok(proxies.some(c=>c.x===design.deskX&&c.w>=design.width/2));
    const hasAwningPosts=proxies.some(c=>Math.abs(c.x)===1.88&&c.z===-1.2);
    assert.equal(hasAwningPosts,design.canopy!=='none',kind+' canopy collision follows visible structure');
  }
});

test('stand proxies cover side equipment while leaving the approach open',()=>{
  const cabinet=standCollisionProxies('telemetry',40,290);
  assert.ok(cabinet.some(c=>Math.abs(c.x-42.02)<.01));
  const tripod=standCollisionProxies('survey',-70,165);
  assert.ok(tripod.some(c=>Math.abs(c.x+72.13)<.01));
  for(const c of [...cabinet,...tripod]){
    assert.ok([c.x,c.z,c.w,c.d].every(Number.isFinite));assert.ok(c.w>0&&c.d>0);
    assert.ok(!(Math.abs(c.x-40)<=c.w&&Math.abs(c.z-295)<=c.d),'front approach is clear');
  }
});

test('period support vehicles retain their wheelbase and fit their collision dimensions',()=>{
  const materials=new Map<string,THREE.MeshStandardMaterial>();
  const factory=(name:string,color:number,roughness=.8,metalness=0)=>{if(!materials.has(name))materials.set(name,new THREE.MeshStandardMaterial({color,roughness,metalness}));return materials.get(name)!;};
  for(const kind of ['sedan','van'] as const){
    const spec=CAR_SPECS[kind],car=buildCar(spec,{kind,paint:0xd9d6bd,periodStyle:true},factory),bounds=new THREE.Box3().setFromObject(car),size=bounds.getSize(new THREE.Vector3());
    assert.ok(size.z<spec.length+.5);assert.ok(size.x<spec.width+.6);assert.ok(size.y<spec.height+.4);
    assert.equal(spec.lightBar,false);
    car.traverse(node=>{if(node instanceof THREE.Mesh)node.geometry.dispose();});
  }materials.forEach(material=>material.dispose());
});
