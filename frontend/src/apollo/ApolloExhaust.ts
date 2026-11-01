import * as THREE from 'three';

const ENGINES = [[0, 0], [-2.9, -2.9], [-2.9, 2.9], [2.9, -2.9], [2.9, 2.9]];

/** Two shared plume batches: hot core and turbulent envelope, anchored at all five bells. */
export class ApolloExhaust extends THREE.Group {
  private time = { value: 0 };
  private throttle = { value: 0 };

  constructor() {
    super();
    this.name = 'F-1 exhaust — five anchored cores and turbulent envelopes';
    this.visible = false;
    for (const core of [false, true]) {
      const length = core ? 15 : 29;
      const profile = core ? [[0, -1], [.28, -.85], [.65, -.55], [.95, -.2], [1.16, 0]] : [[0, -1], [.45, -.88], [1, -.66], [1.65, -.4], [1.9, -.16], [1.5, 0]];
      const geometry = new THREE.LatheGeometry(profile.map(([radius, height]) => new THREE.Vector2(radius, height * length)), 24);
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: core ? .8 : .62, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, forceSinglePass: true });
      material.onBeforeCompile = shader => {
        shader.uniforms.uPlumeTime = this.time;
        shader.uniforms.uPlumeThrottle = this.throttle;
        shader.vertexShader = 'uniform float uPlumeTime;\nuniform float uPlumeThrottle;\nvarying vec2 vPlumeUv;\nvarying float vPlumePhase;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          vPlumeUv = uv;
          vPlumePhase = 0.0;
          #ifdef USE_INSTANCING
            vPlumePhase = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;
          #endif
          float downstream = 1.0 - uv.y;
          float turbulence = sin(uv.y * 28.0 - uPlumeTime * 21.0 + vPlumePhase) * downstream * 0.045;
          transformed.xz *= (0.82 + uPlumeThrottle * 0.18) * (1.0 + turbulence);
          transformed.y *= uPlumeThrottle;
        `);
        shader.fragmentShader = 'uniform float uPlumeTime;\nuniform float uPlumeThrottle;\nvarying vec2 vPlumeUv;\nvarying float vPlumePhase;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
          float hot = smoothstep(0.0, 0.9, vPlumeUv.y);
          vec3 plumeColor = mix(vec3(1.0, 0.09, 0.006), vec3(1.0, 0.61, 0.14), hot);
          plumeColor = mix(plumeColor, vec3(1.0, 0.96, 0.72), pow(vPlumeUv.y, 4.0));
          ${core ? 'plumeColor = mix(plumeColor, vec3(1.0, 0.94, 0.68), 0.65);' : ''}
          float flow = 0.83 + 0.17 * sin(vPlumeUv.y * 49.0 - uPlumeTime * 28.0 + sin(vPlumeUv.x * 19.0) + vPlumePhase);
          diffuseColor.rgb *= plumeColor;
          diffuseColor.a *= smoothstep(0.0, 0.32, vPlumeUv.y) * flow * uPlumeThrottle;
        `);
      };
      material.customProgramCacheKey = () => `apollo-F1-plume-${core ? 'core' : 'envelope'}-v1`;
      const batch = new THREE.InstancedMesh(geometry, material, ENGINES.length);
      batch.name = core ? 'F-1 hot cores' : 'F-1 turbulent envelopes';
      const matrix = new THREE.Matrix4();
      ENGINES.forEach(([x, z], i) => batch.setMatrixAt(i, matrix.makeTranslation(x, 1.02, z)));
      batch.instanceMatrix.needsUpdate = true;
      // Throttle only shrinks the authored geometry; its full bounds stay valid.
      batch.computeBoundingSphere();
      this.add(batch);
    }
  }

  pose(time: number, throttle: number, reducedMotion: boolean): void {
    this.visible = throttle > 0;
    this.time.value = reducedMotion ? 0 : time;
    this.throttle.value = THREE.MathUtils.clamp(throttle, 0, 1);
  }
}
