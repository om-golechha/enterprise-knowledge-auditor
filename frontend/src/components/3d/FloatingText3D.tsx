import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

interface FloatingText3DProps {
  text: string;
}

export const FloatingText3D: React.FC<FloatingText3DProps> = ({ text }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <group>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <Text
          ref={meshRef}
          fontSize={4}
          maxWidth={200}
          lineHeight={1}
          letterSpacing={0.02}
          textAlign={'center'}
          font="https://fonts.gstatic.com/s/raleway/v14/1Ptrg8zYS_SKggPNwK4vaqI.woff"
          anchorX="center"
          anchorY="middle"
          position={[0, 0, 0]}
        >
          {text}
          <MeshDistortMaterial
            color="#818cf8"
            envMapIntensity={0.8}
            clearcoat={1}
            clearcoatRoughness={0.1}
            metalness={0.8}
            roughness={0.2}
            distort={0.2}
            speed={2}
          />
        </Text>
      </Float>
      
      {/* Add some magical sparkles around the text */}
      <Sparkles count={100} scale={12} size={6} speed={0.4} opacity={0.5} color="#c7d2fe" />
    </group>
  );
};
