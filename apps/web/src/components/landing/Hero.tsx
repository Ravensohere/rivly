
import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei"; 
import gsap from "gsap";
import SplitType from "split-type";
import * as THREE from 'three';
import { useAuthContext } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

function AnimatedGradient() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame((state) => {
    if (materialRef.current) {
        // Adjust speed here if needed
      materialRef.current.uniforms.time.value = state.clock.getElapsedTime() * 0.5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={{ time: { value: 0 } }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float time;
          varying vec2 vUv;

          vec3 colorA = vec3(0.843, 0.753, 1.0); // lavender
          vec3 colorB = vec3(0.659, 0.878, 0.761); // sage
          vec3 colorC = vec3(1.0, 0.827, 0.761);   // peach

          void main() {
            vec2 uv = vUv;
            float wave = sin(uv.x * 4.0 + time * 0.6) * 0.08;
            vec3 mix1 = mix(colorA, colorB, uv.y + wave);
            vec3 final = mix(mix1, colorC, uv.x * 0.4 + cos(time * 0.4) * 0.05);
            gl_FragColor = vec4(final, 1.0);
          }
        `}
      />
    </mesh>
  );
}

export default function Hero() {
  const { user } = useAuthContext();
  const flowRef = useRef<HTMLHeadingElement>(null);
  const burnoutRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!flowRef.current || !burnoutRef.current) return;

    // Split for better kinetic control (optional advanced: per-char stagger)
    const splitFlow = new SplitType(flowRef.current, { types: "chars" });
    const splitBurnout = new SplitType(burnoutRef.current, { types: "chars" });

    gsap.fromTo(
      splitFlow.chars,
      { opacity: 0, y: 40, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, stagger: 0.04, duration: 1.4, ease: "power3.out" }
    );

    gsap.fromTo(
      splitBurnout.chars,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1.2, delay: 0.6, stagger: 0.05, ease: "power2.out" }
    );

    // Gentle breathing loop
    gsap.to(flowRef.current, {
      scale: 1.03,
      duration: 6,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });

    return () => {
      splitFlow.revert();
      splitBurnout.revert();
    };
  }, []);

  return (
    <section className="relative h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Canvas orthographic camera={{ position: [0, 0, 1], zoom: 80 }}>
          <AnimatedGradient />
          {/* <OrbitControls enableZoom={false} /> – remove in prod */}
        </Canvas>
      </div>

      <div className="relative z-10 max-w-5xl pointer-events-none">
        <h1 ref={flowRef} className="text-6xl md:text-8xl lg:text-9xl font-bold leading-none tracking-tight text-indigo-900 mix-blend-multiply">
          Find your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">flow</span>.
        </h1>

        <h1 ref={burnoutRef} className="mt-4 text-5xl md:text-7xl lg:text-8xl font-bold leading-none text-gray-800/80 mix-blend-multiply">
          Drop the burnout.
        </h1>

        <p className="mt-8 text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto font-light leading-relaxed">
          Rivly transforms your chaotic to-do list into a living landscape. Plan gently, focus deeply, and reflect kindly.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center pointer-events-auto items-center">
          {user ? (
            <Link to="/app">
              <button className="px-10 py-5 bg-indigo-600 text-white rounded-full text-xl font-medium hover:scale-105 hover:shadow-2xl transition-all duration-300 flex items-center gap-2">
                Open Dashboard <ArrowRight className="w-6 h-6" />
              </button>
            </Link>
          ) : (
            <a href="https://ravenso.in/#/" target="_blank" rel="noopener noreferrer">
              <button className="px-10 py-5 bg-indigo-600 text-white rounded-full text-xl font-medium hover:scale-105 hover:shadow-2xl transition-all duration-300 flex items-center gap-2">
                Join Waitlist <ArrowRight className="w-6 h-6" />
              </button>
            </a>
          )}
          
          <button 
            onClick={() => {
              const el = document.getElementById('showcase');
              if(el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-10 py-5 border-2 border-indigo-600/30 text-indigo-800 rounded-full text-xl font-medium hover:bg-indigo-50/50 transition-all backdrop-blur-sm"
          >
            See how it works ↓
          </button>
        </div>
      </div>
    </section>
  );
}
