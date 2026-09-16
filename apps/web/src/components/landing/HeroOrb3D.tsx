import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Float, Environment } from '@react-three/drei';
import * as THREE from 'three';

function Blob() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.y = t * 0.18;
    ref.current.rotation.x = Math.sin(t * 0.25) * 0.08;
  });
  return (
    <Float speed={1.1} rotationIntensity={0.3} floatIntensity={0.9}>
      {/* Camera at z=6, fov 38° → visible half-height ≈ 2.07; keep scale + distortion inside that */}
      <mesh ref={ref} scale={1.15}>
        <sphereGeometry args={[1, 128, 128]} />
        <MeshDistortMaterial
          color="#3D3BBF"
          distort={0.42}
          speed={1.4}
          roughness={0.22}
          metalness={0.35}
          emissive="#6C6AE0"
          emissiveIntensity={0.18}
        />
      </mesh>
    </Float>
  );
}

function InnerRing() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.z = s.clock.getElapsedTime() * -0.12;
  });
  return (
    <mesh ref={ref} position={[0, 0, -0.3]}>
      <torusGeometry args={[1.55, 0.004, 8, 128]} />
      <meshBasicMaterial color="#A5A4EF" transparent opacity={0.35} />
    </mesh>
  );
}

export default function HeroOrb3D() {
  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 6], fov: 38 }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} color="#ffffff" />
      <directionalLight position={[-4, -2, -3]} intensity={0.4} color="#A5A4EF" />
      <Suspense fallback={null}>
        <Environment preset="city" />
        <Blob />
        <InnerRing />
      </Suspense>
    </Canvas>
  );
}
