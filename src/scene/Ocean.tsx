import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  DoubleSide,
  PlaneGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three'
import { env } from '../lib/env'
import type { Quality } from '../lib/quality'

/* ============================================================================
 *  The sea — which is also the sky.
 *
 *  Under an orthographic projection tilted down at the world, every ray in the
 *  frustum hits the ground plane, so there is no horizon and a sky dome is
 *  never visible. The distant, fully-fogged water therefore does the sky's job:
 *  it takes the sky colour from the fog, and at night it picks up a field of
 *  reflected stars that only resolve where fog has taken over.
 *
 *  Layered sine swells displace the plane and drive an analytic normal, which
 *  feeds a cheap sun specular.
 * ========================================================================== */

const vertexShader = /* glsl */ `
  #include <fog_pars_vertex>

  uniform float uTime;
  uniform float uAmplitude;

  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying float vHeight;

  // Four swells at increasing frequency and decreasing amplitude.
  const vec2 D0 = vec2( 1.00,  0.15);
  const vec2 D1 = vec2(-0.55,  0.84);
  const vec2 D2 = vec2( 0.35, -0.94);
  const vec2 D3 = vec2(-0.85, -0.52);

  float wave(vec2 p, vec2 dir, float freq, float speed, float amp) {
    return sin(dot(p, dir) * freq + uTime * speed) * amp;
  }

  float surface(vec2 p) {
    float h = 0.0;
    h += wave(p, D0, 0.300, 0.85, 1.00);
    h += wave(p, D1, 0.520, 1.15, 0.52);
    h += wave(p, D2, 0.960, 1.65, 0.20);
    h += wave(p, D3, 1.700, 2.30, 0.09);
    return h * uAmplitude;
  }

  void main() {
    vec3 pos = position;
    vec2 p = pos.xy;

    float h = surface(p);
    pos.z += h;
    vHeight = h;

    // Central-difference normal. Cheaper and steadier than derivatives here.
    float e = 0.6;
    float hx = surface(p + vec2(e, 0.0)) - surface(p - vec2(e, 0.0));
    float hy = surface(p + vec2(0.0, e)) - surface(p - vec2(0.0, e));
    vec3 n = normalize(vec3(-hx / (2.0 * e), -hy / (2.0 * e), 1.0));

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorld = worldPos.xyz;
    vNormalW = normalize(mat3(modelMatrix) * n);

    vec4 mvPosition = viewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`

const fragmentShader = /* glsl */ `
  #include <fog_pars_fragment>

  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uSkyColor;
  uniform float uNight;
  uniform float uTime;

  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying float vHeight;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // Sparse points on a jittered grid, sized in world units.
  float starField(vec2 p) {
    vec2 g = p * 0.42;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    float h = hash21(id);
    if (h < 0.9) return 0.0;
    vec2 off = vec2(hash21(id + 7.1), hash21(id + 13.7)) - 0.5;
    return smoothstep(0.16, 0.0, length(f - off * 0.7)) * (0.4 + (h - 0.9) * 6.0);
  }

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 viewDir = normalize(cameraPosition - vWorld);

    // Crests catch the light colour, troughs sit in the deep colour.
    float crest = smoothstep(-0.85, 0.85, vHeight);
    vec3 base = mix(uDeep, uShallow, crest);

    // Fresnel: shallow viewing angles pick up the sky.
    float fres = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 3.0);
    base = mix(base, uSkyColor, fres * 0.28);

    // A single blunt specular lobe reads as a sun or moon glitter path.
    vec3 h = normalize(uSunDir + viewDir);
    float spec = pow(max(dot(n, h), 0.0), 90.0);
    base += uSunColor * spec * mix(1.5, 0.55, uNight);

    // Broad sheen so the whole sea tilts toward the light source.
    float sheen = pow(max(dot(n, normalize(uSunDir)), 0.0), 4.0);
    base += uSunColor * sheen * 0.06;

    gl_FragColor = vec4(base, 1.0);

    #include <fog_fragment>

    // Stars belong to the sky, so they only emerge where fog has fully taken
    // the water over — which is exactly the part of the frame reading as sky.
    #ifdef USE_FOG
      float sky = smoothstep(fogNear, fogFar, vFogDepth);
      float twinkle = 0.75 + 0.25 * sin(uTime * 1.6 + vWorld.x * 0.5 + vWorld.z * 0.3);
      gl_FragColor.rgb += vec3(0.86, 0.9, 1.0)
        * starField(vWorld.xz) * twinkle * sky * sky * smoothstep(0.3, 0.9, uNight);
    #endif

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function Ocean({ quality }: { quality: Quality }) {
  const material = useMemo(() => {
    const uniforms = UniformsUtils.merge([
      UniformsUtils.clone(UniformsLib.fog),
      {
        uTime: { value: 0 },
        uAmplitude: { value: 0.62 },
        uShallow: { value: new Color('#63a8c8') },
        uDeep: { value: new Color('#2f6e93') },
        uSunDir: { value: new Vector3(0.5, 0.6, 0.5) },
        uSunColor: { value: new Color('#fff6e4') },
        uSkyColor: { value: new Color('#cfe6f4') },
        uNight: { value: 0 },
      },
    ])

    return new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      fog: true,
      side: DoubleSide,
    })
  }, [])

  const geometry = useMemo(
    () => new PlaneGeometry(700, 700, quality.waterSegments, quality.waterSegments),
    [quality.waterSegments],
  )

  const sunDir = useRef(new Vector3())

  useFrame((_, delta) => {
    const u = material.uniforms
    u.uTime.value += delta
    u.uShallow.value.copy(env.waterShallow)
    u.uDeep.value.copy(env.waterDeep)
    u.uSunColor.value.copy(env.sun)
    u.uSkyColor.value.copy(env.skyBottom)
    u.uNight.value = env.night
    sunDir.current.set(...env.sunPosition).normalize()
    u.uSunDir.value.copy(sunDir.current)
  })

  return (
    <mesh
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow={false}
      frustumCulled={false}
    />
  )
}
