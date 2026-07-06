import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const SpeedLines3D = () => {
  const count = 400; // Number of light trails
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Create geometric data for the lines
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      // Random position in a wide tunnel
      const x = (Math.random() - 0.5) * 40;
      const y = (Math.random() - 0.5) * 20;
      // Start them distributed along the Z axis
      const z = (Math.random() - 0.5) * 100;
      
      // Speed multiplier
      const speed = Math.random() * 0.8 + 0.2;
      
      // Assign a racing neon color (Red, Electric Blue, White)
      const colors = ['#ff003c', '#00f3ff', '#ffffff', '#ff4d00'];
      const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
      
      // Stretched length
      const length = Math.random() * 8 + 2;

      temp.push({ x, y, z, speed, length, color });
    }
    return temp;
  }, [count]);

  const colorArray = useMemo(() => {
    const array = new Float32Array(count * 3);
    particles.forEach((p, i) => {
      p.color.toArray(array, i * 3);
    });
    return array;
  }, [particles, count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Animate the particles moving fast towards the camera (positive Z)
    particles.forEach((particle, i) => {
      // Move on Z axis
      particle.z += particle.speed * delta * 150; // VERY fast
      
      // Reset if they pass the camera
      if (particle.z > 20) {
        particle.z = -100; // send back
        // Optionally randomize x and y again on reset to keep it dynamic
        particle.x = (Math.random() - 0.5) * 40;
        particle.y = (Math.random() - 0.5) * 20;
      }

      dummy.position.set(particle.x, particle.y, particle.z);
      // Scale on Z axis to stretch into lines based on speed
      dummy.scale.set(0.05, 0.05, particle.length);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {/* A simple box geometry stretched by the dummy scale */}
      <boxGeometry args={[1, 1, 1]}>
        <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
      </boxGeometry>
      <meshBasicMaterial 
        vertexColors={true}
        transparent={true} 
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
};
