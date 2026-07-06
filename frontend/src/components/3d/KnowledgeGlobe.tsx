import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshWobbleMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

export const KnowledgeGlobe: React.FC = () => {
  const globeRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (globeRef.current) {
      globeRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      globeRef.current.rotation.x = state.clock.elapsedTime * 0.1;
    }
    if (coreRef.current) {
      coreRef.current.rotation.y = -state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={globeRef} position={[0, 0, 0]} scale={1.5}>
        {/* Outer wireframe sphere */}
        <Sphere args={[2, 32, 32]}>
          <meshStandardMaterial 
            color="#4f46e5" 
            wireframe 
            transparent 
            opacity={0.3} 
            side={THREE.DoubleSide} 
          />
        </Sphere>
        
        {/* Inner solid wobbling core */}
        <Sphere ref={coreRef} args={[1.5, 64, 64]}>
          <MeshWobbleMaterial
            color="#818cf8"
            factor={0.4}
            speed={2}
            roughness={0.2}
            metalness={0.8}
            envMapIntensity={1}
            wireframe={false}
          />
        </Sphere>

        {/* Orbiting data points */}
        {Array.from({ length: 20 }).map((_, i) => {
          const radius = 2.5 + Math.random() * 1.5;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos((Math.random() * 2) - 1);
          
          const x = radius * Math.sin(phi) * Math.cos(theta);
          const y = radius * Math.sin(phi) * Math.sin(theta);
          const z = radius * Math.cos(phi);

          return (
            <mesh key={i} position={[x, y, z]}>
              <boxGeometry args={[0.1, 0.1, 0.1]} />
              <meshStandardMaterial color="#c7d2fe" emissive="#818cf8" emissiveIntensity={2} />
            </mesh>
          );
        })}
      </group>
    </Float>
  );
};
