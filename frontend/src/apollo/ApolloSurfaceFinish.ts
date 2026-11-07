import * as THREE from 'three';

/** Shared, metre-scaled finishes. No UV maps, extra draws or time uniforms. */
export function finishApolloMaterial(name: string, material: THREE.MeshStandardMaterial): void {
  const concrete = /^(building|service-building-trim|support-building-brick|concrete|curb|service-walkway)$/.test(name);
  const enamel = /^(stand-painted-enamel|stand-ivory-enamel|stand-safety-ochre|roof)$/.test(name);
  const brushed = /^(stand-brushed-steel|galvanized|utility-pipe|car-chrome|car-rim)$/.test(name);
  const fabric = /^(technician-shirt-|technician-pants$)/.test(name);
  const terrain = name === 'terrain';
  if (!concrete && !enamel && !brushed && !terrain && !fabric) return;
  const coarseScale = fabric ? 12 : terrain ? .035 : concrete ? 1.6 : enamel ? 2.4 : 5;
  const variation = fabric ? .08 : terrain ? .20 : concrete ? .13 : enamel ? .055 : .035;
  const grainScale = fabric ? 180 : terrain ? 30 : concrete ? 90 : brushed ? 220 : 140;
  const grainStrength = fabric ? .018 : concrete ? .055 : .025;
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying highp vec3 vApolloFinish;\n' + shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvApolloFinish = position;');
    shader.fragmentShader = /* glsl */`
      varying highp vec3 vApolloFinish;
      float apolloHash(vec3 p) {
        p = fract(p * .1031); p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      float apolloNoise(vec3 p) {
        vec3 a = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(apolloHash(a),apolloHash(a+vec3(1,0,0)),f.x),
          mix(apolloHash(a+vec3(0,1,0)),apolloHash(a+vec3(1,1,0)),f.x),f.y),
          mix(mix(apolloHash(a+vec3(0,0,1)),apolloHash(a+vec3(1,0,1)),f.x),
          mix(apolloHash(a+vec3(0,1,1)),apolloHash(a+vec3(1,1,1)),f.x),f.y),f.z);
      }
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', /* glsl */`
      #include <color_fragment>
      float apolloMottle = apolloNoise(vApolloFinish * ${coarseScale.toFixed(4)}) - .5;
      // Fade subpixel grain rather than letting a moving camera produce sparkle.
      vec3 apolloFootprint = fwidth(vApolloFinish) * ${grainScale.toFixed(1)};
      float apolloGrainFade = 1.0 - smoothstep(.3, .95, max(apolloFootprint.x,max(apolloFootprint.y,apolloFootprint.z)));
      // Bound fine-grain inputs before scaling: distant terrain coordinates
      // must not overflow mediump fragment arithmetic on conservative GPUs.
      float apolloGrain = (apolloHash(floor(mod(vApolloFinish,256.0) * ${grainScale.toFixed(1)}))-.5) * apolloGrainFade;
      diffuseColor.rgb *= 1.0 + apolloMottle * ${variation.toFixed(3)} + apolloGrain * ${grainStrength.toFixed(3)};
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', /* glsl */`
      #include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor + apolloMottle * .10 + apolloGrain * .04,.12,1.0);
    `);
  };
  material.customProgramCacheKey = () => `apollo-finish-v2-${coarseScale}-${variation}-${grainScale}-${grainStrength}`;
}

/** Daylight and ground bounce in place of indoor softbox reflections. */
export function createApolloDaylight(renderer: THREE.WebGLRenderer, sunDirection: THREE.Vector3): THREE.WebGLRenderTarget {
  const environment = new THREE.Scene();
  const skyMaterial = new THREE.ShaderMaterial({side: THREE.BackSide, uniforms:{uSunDirection:{value:sunDirection.clone()}}, vertexShader: /* glsl */`
    varying vec3 vSky; void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
  `, fragmentShader: /* glsl */`
    varying vec3 vSky; uniform vec3 uSunDirection;
    void main(){
      vec3 d=normalize(vSky);
      vec3 horizon=vec3(.64,.75,.78), zenith=vec3(.17,.36,.58), soil=vec3(.31,.29,.22);
      vec3 light=d.y>0.0?mix(horizon,zenith,pow(d.y,.45)):mix(horizon*.48,soil,pow(-d.y,.30));
      float sun=max(0.0,dot(d,normalize(uSunDirection)));
      light+=vec3(1.0,.88,.65)*pow(sun,180.0)*2.5;
      gl_FragColor=vec4(light,1.0);
    }
  `});
  const skyGeometry = new THREE.SphereGeometry(20, 24, 12);
  environment.add(new THREE.Mesh(skyGeometry, skyMaterial));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(environment, .06, .1, 100);
  pmrem.dispose(); skyGeometry.dispose(); skyMaterial.dispose();
  return target;
}
