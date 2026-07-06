import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const FlyingPages3D = () => {
  const count = 50; // Number of flying pages
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Dummy object to calculate positions
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Initialize page data
  const pages = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      // Random starting positions
      const x = (Math.random() - 0.5) * 40;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      
      // Random rotations
      const rx = Math.random() * Math.PI;
      const ry = Math.random() * Math.PI;
      const rz = Math.random() * Math.PI;

      // Unique flutter offsets and speeds
      const offset = Math.random() * 100;
      const speed = Math.random() * 0.5 + 0.5;

      temp.push({ x, y, z, rx, ry, rz, offset, speed });
    }
    return temp;
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();

    pages.forEach((page, i) => {
      // Move slowly upwards and across
      page.y += delta * 0.5 * page.speed;
      page.x += Math.sin(time * page.speed + page.offset) * 0.02;
      
      // Reset if they float too high
      if (page.y > 15) {
        page.y = -15;
        page.x = (Math.random() - 0.5) * 40;
      }

      // Add flutter (rotation over time based on sine waves)
      const flutterX = Math.sin(time * 2 + page.offset) * 0.05;
      const flutterY = Math.cos(time * 1.5 + page.offset) * 0.05;
      const flutterZ = Math.sin(time * 3 + page.offset) * 0.02;

      page.rx += flutterX;
      page.ry += flutterY;
      page.rz += flutterZ;

      dummy.position.set(page.x, page.y, page.z);
      dummy.rotation.set(page.rx, page.ry, page.rz);
      
      // Scale to look like standard paper (A4 ratio)
      dummy.scale.set(0.7, 1, 0.01);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial 
        color="#f8f9fa" 
        roughness={0.9} 
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
};
