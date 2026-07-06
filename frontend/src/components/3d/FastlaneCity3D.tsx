import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

// ---------------------------------------------------------------------------
// Game State Manager
// ---------------------------------------------------------------------------
const simState = {
  trafficStatus: 'NORMAL' as 'NORMAL' | 'CRASH' | 'CLEARING',
  crashZ: 0,
  crashLane: 0,
  timer: 3, 
  rocketLaunchTimer: Math.random() * 20 + 10,
  rocketY: 0,
  rocketActive: false
};

// ---------------------------------------------------------------------------
// Procedural Vehicle Component (GTA Style)
// ---------------------------------------------------------------------------
const Vehicle3D = ({ type, lane, initialZ, color }: { id: number, type: string, lane: number, initialZ: number, color: string }) => {
  const groupRef = useRef<THREE.Group>(null);
  const data = useRef({
    x: lane * 3,
    y: -4.5,
    z: initialZ,
    speed: Math.random() * 0.3 + 0.2, 
    baseSpeed: Math.random() * 0.4 + 0.3, // Faster base speed
    lane: lane,
    crashed: false,
    spinX: 0,
    spinY: 0,
    spinZ: 0,
    bounceY: 0,
    bounceVel: 0,
    isPolice: type === 'police'
  });

  const lightOffset = useMemo(() => Math.random() * Math.PI, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    const v = data.current;

    if (simState.trafficStatus === 'NORMAL') {
      v.crashed = false;
      v.bounceY = 0;
      v.spinX = v.spinY = v.spinZ = 0;
      v.speed = THREE.MathUtils.lerp(v.speed, v.baseSpeed, 0.05);
      if (v.isPolice) v.speed = v.baseSpeed * 2.2; // Police drives very fast
    }

    if (simState.trafficStatus === 'CRASH') {
      // The crashed vehicle
      if (!v.isPolice && Math.abs(v.z - simState.crashZ) < 6 && v.lane === simState.crashLane && !v.crashed) {
        v.crashed = true;
        v.speed = v.speed * 0.5;
        v.bounceVel = 15; // Shoot up into the air
      } 
      else if (v.crashed) {
        v.speed = THREE.MathUtils.lerp(v.speed, 0, 0.05);
        v.bounceY += v.bounceVel * delta;
        v.bounceVel -= 40 * delta; // Gravity
        if (v.bounceY < 0) {
          v.bounceY = 0;
          v.bounceVel = -v.bounceVel * 0.5; // Bounce
        }
        v.spinY += delta * 10;
        v.spinX += delta * 5;
        v.spinZ += delta * 8;
      }
      // Traffic jam: stop vehicles behind
      else if (!v.isPolice && v.z < simState.crashZ && Math.abs(v.z - simState.crashZ) < 40) {
        v.speed = THREE.MathUtils.lerp(v.speed, 0, 0.1); 
      }
      
      // Police weaving and rushing
      if (v.isPolice) {
        v.speed = v.baseSpeed * 2.8; 
        if (Math.abs(v.z - simState.crashZ) < 20) {
           // Weave to another lane
           const targetX = (simState.crashLane > 0 ? -1.5 : 1.5) * 3;
           v.x = THREE.MathUtils.lerp(v.x, targetX, 0.1);
        } else {
           v.x = THREE.MathUtils.lerp(v.x, v.lane * 3, 0.05);
        }
      }
    }
    
    if (simState.trafficStatus === 'CLEARING') {
      if (!v.crashed) {
        v.speed = THREE.MathUtils.lerp(v.speed, v.baseSpeed, 0.02);
      } else {
        v.speed = v.baseSpeed * 3; // Tow away fast
        v.spinX = v.spinY = v.spinZ = v.bounceY = 0;
      }
    }

    v.z += v.speed * delta * 25; // Faster multiplier for realistic movement

    if (v.z > 100) {
      v.z = -200;
      v.crashed = false;
      v.bounceY = 0;
      v.spinX = v.spinY = v.spinZ = 0;
      if (!v.isPolice) {
         v.lane = (Math.floor(Math.random() * 4) - 1.5);
         v.x = v.lane * 3;
      }
    }

    groupRef.current.position.set(v.x, -4.5 + v.bounceY, v.z);
    groupRef.current.rotation.set(v.crashed ? v.spinX : 0, v.crashed ? v.spinY : 0, v.crashed ? v.spinZ : 0);
    
    // Police Siren Animation
    if (v.isPolice) {
      const flash = Math.sin(time * 15 + lightOffset) > 0;
      const siren1 = groupRef.current.getObjectByName('siren1') as THREE.Mesh | undefined;
      const siren2 = groupRef.current.getObjectByName('siren2') as THREE.Mesh | undefined;
      const glow1 = groupRef.current.getObjectByName('glow1') as THREE.PointLight | undefined;
      const glow2 = groupRef.current.getObjectByName('glow2') as THREE.PointLight | undefined;
      
      if (siren1 && siren2 && glow1 && glow2) {
        (siren1.material as THREE.MeshBasicMaterial).color.setHex(flash ? 0xff0000 : 0x000000);
        glow1.intensity = flash ? 50 : 0;
        
        (siren2.material as THREE.MeshBasicMaterial).color.setHex(flash ? 0x000000 : 0x0000ff);
        glow2.intensity = flash ? 0 : 50;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* TRUCK */}
      {type === 'truck' && (
        <group>
          <mesh position={[0, 1.2, 2.5]}><boxGeometry args={[2.4, 2.0, 2.5]} /><meshStandardMaterial color={color} roughness={0.4} metalness={0.6} /></mesh>
          <mesh position={[0, 1.4, -2.5]}><boxGeometry args={[2.6, 2.8, 8]} /><meshStandardMaterial color="#222" roughness={0.7} metalness={0.2} /></mesh>
        </group>
      )}

      {/* SPORTS CAR (Sleeker profile) */}
      {type === 'car' && (
        <group>
          <mesh position={[0, 0.35, 0]}><boxGeometry args={[2.0, 0.6, 4.2]} /><meshStandardMaterial color={color} roughness={0.1} metalness={0.8} /></mesh>
          <mesh position={[0, 0.75, -0.4]}><boxGeometry args={[1.5, 0.4, 2.0]} /><meshStandardMaterial color="#000" transparent opacity={0.9} roughness={0.0} /></mesh>
          {/* Spoiler */}
          <mesh position={[0, 0.8, -1.8]}><boxGeometry args={[1.8, 0.1, 0.4]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[-0.8, 0.6, -1.8]}><boxGeometry args={[0.1, 0.4, 0.2]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[0.8, 0.6, -1.8]}><boxGeometry args={[0.1, 0.4, 0.2]} /><meshStandardMaterial color="#111" /></mesh>
        </group>
      )}

      {/* POLICE CRUISER */}
      {type === 'police' && (
        <group>
          <mesh position={[0, 0.4, 0]}><boxGeometry args={[2.0, 0.7, 4.4]} /><meshStandardMaterial color="#0a0a0a" roughness={0.2} metalness={0.8} /></mesh>
          <mesh position={[0, 0.85, -0.3]}><boxGeometry args={[1.6, 0.5, 2.2]} /><meshStandardMaterial color="#111" transparent opacity={0.9} /></mesh>
          {/* Lightbar */}
          <group position={[0, 1.2, -0.3]}>
            <mesh position={[0, 0, 0]}><boxGeometry args={[1.8, 0.1, 0.3]} /><meshStandardMaterial color="#333" /></mesh>
            <mesh name="siren1" position={[-0.6, 0.15, 0]}><boxGeometry args={[0.5, 0.2, 0.3]} /><meshBasicMaterial color="#ff0000" /></mesh>
            <mesh name="siren2" position={[0.6, 0.15, 0]}><boxGeometry args={[0.5, 0.2, 0.3]} /><meshBasicMaterial color="#0000ff" /></mesh>
            <pointLight name="glow1" position={[-0.6, 0.5, 0]} color="#ff0000" distance={15} intensity={0} decay={2} />
            <pointLight name="glow2" position={[0.6, 0.5, 0]} color="#0000ff" distance={15} intensity={0} decay={2} />
          </group>
        </group>
      )}

      {/* HEADLIGHTS (Bloom triggers) */}
      <mesh position={[-0.7, 0.4, 2.15]}><planeGeometry args={[0.4, 0.2]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
      <mesh position={[0.7, 0.4, 2.15]}><planeGeometry args={[0.4, 0.2]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
      {/* TAILLIGHTS */}
      <mesh position={[-0.7, 0.4, -2.15]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.5, 0.15]} /><meshBasicMaterial color="#ff0000" toneMapped={false} /></mesh>
      <mesh position={[0.7, 0.4, -2.15]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.5, 0.15]} /><meshBasicMaterial color="#ff0000" toneMapped={false} /></mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Dynamic Camera (GTA Chase Cam Style)
// ---------------------------------------------------------------------------
const DynamicCamera = () => {
  const { camera } = useThree();
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    // Slight shake and drift for intense speed feel
    if (simState.trafficStatus === 'NORMAL') {
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, Math.sin(time * 0.5) * 1.5, 0.05);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 4 + Math.sin(time * 2) * 0.2, 0.05);
    } else if (simState.trafficStatus === 'CRASH') {
      // Intense shake
      camera.position.x += (Math.random() - 0.5) * 0.5;
      camera.position.y += (Math.random() - 0.5) * 0.5;
    }
  });
  return null;
};

// ---------------------------------------------------------------------------
// Animated Pedestrians / First Responders (GTA Panic Style)
// ---------------------------------------------------------------------------
const Pedestrians = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (simState.trafficStatus === 'CRASH') {
      groupRef.current.visible = true;
      // Panic running away from crash
      const targetX = 15; // Run to the sides
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, delta * 3);
      groupRef.current.position.z += Math.sin(state.clock.elapsedTime * 10) * 0.1; // Wobbly run
    } else {
      groupRef.current.visible = false;
      groupRef.current.position.set(0, -4.8, simState.crashZ + 10);
    }
  });

  return (
    <group ref={groupRef} visible={false} position={[0, -4.8, 0]}>
      {/* People running */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.2, 0.2, 1.2]} /><meshStandardMaterial color="#ff22aa"/></mesh>
        <mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.2]} /><meshStandardMaterial color="#e0ac69"/></mesh>
      </group>
      <group position={[1.5, 0, 1]}>
        <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.2, 0.2, 1.2]} /><meshStandardMaterial color="#00ffaa"/></mesh>
        <mesh position={[0, 1.3, 0]}><sphereGeometry args={[0.2]} /><meshStandardMaterial color="#8d5524"/></mesh>
      </group>
    </group>
  );
};

// ---------------------------------------------------------------------------
// Vice City Palm Tree
// ---------------------------------------------------------------------------
const PalmTree = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh position={[0, 4, 0]}><cylinderGeometry args={[0.3, 0.5, 8, 8]} /><meshStandardMaterial color="#1a1105" roughness={0.9} /></mesh>
    <mesh position={[0, 8, 0]}><sphereGeometry args={[2.5, 7, 7]} /><meshStandardMaterial color="#0a2a1a" roughness={0.6} /></mesh>
  </group>
);

// ---------------------------------------------------------------------------
// Shader Road (Dark Asphalt Highway)
// ---------------------------------------------------------------------------
const HighwayRoad = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const shaderArgs = useMemo(() => {
    return {
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec3 asphalt = vec3(0.04, 0.04, 0.05); // Dark, almost wet asphalt
          float speed = uTime * 8.0;
          
          // White dashed lane dividers
          float lane1 = step(0.995, 1.0 - abs(vUv.x - 0.25) * 50.0);
          float lane2 = step(0.995, 1.0 - abs(vUv.x - 0.5) * 50.0);
          float lane3 = step(0.995, 1.0 - abs(vUv.x - 0.75) * 50.0);
          
          float dash = step(0.6, fract(vUv.y * 15.0 - speed));
          
          vec3 finalColor = mix(asphalt, vec3(0.8, 0.8, 0.8), (lane1 + lane2 + lane3) * dash);
          
          // Add some fake wet reflection
          float wetness = sin(vUv.x * 20.0) * cos(vUv.y * 30.0) * 0.02;
          finalColor += vec3(wetness);
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    };
  }, []);

  return (
    <group>
      {/* Main Road Surface */}
      <mesh position={[0, -4.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 300]} />
        <shaderMaterial ref={materialRef} {...shaderArgs} />
      </mesh>
      
      {/* Neon/Reflective Guardrails */}
      <mesh position={[-9.2, -4.5, 0]}>
        <boxGeometry args={[0.4, 1.2, 300]} />
        <meshStandardMaterial color="#111" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[9.2, -4.5, 0]}>
        <boxGeometry args={[0.4, 1.2, 300]} />
        <meshStandardMaterial color="#111" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Highway Overpasses */}
      {Array.from({ length: 10 }).map((_, i) => (
        <group key={i} position={[0, 8, -150 + i * 40]}>
           <mesh position={[0, 0, 0]}>
             <boxGeometry args={[24, 2, 4]} />
             <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
           </mesh>
           <mesh position={[-11, -7, 0]}>
             <cylinderGeometry args={[1, 1, 14, 16]} />
             <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
           </mesh>
           <mesh position={[11, -7, 0]}>
             <cylinderGeometry args={[1, 1, 14, 16]} />
             <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
           </mesh>
        </group>
      ))}

      {/* Palm Trees along the edges */}
      {Array.from({ length: 20 }).map((_, i) => (
        <React.Fragment key={'palms' + i}>
          <PalmTree position={[-12, -5, -150 + i * 15]} />
          <PalmTree position={[12, -5, -150 + i * 15]} />
        </React.Fragment>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Main Environment Master Component
// ---------------------------------------------------------------------------
export const FastlaneCity3D = () => {
  const buildingCount = 60; 
  const buildingMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const fleet = useMemo(() => {
    const temp = [];
    // Bright neon-ish colors for sports cars
    const colors = ['#ff003c', '#00f3ff', '#ffaa00', '#bb00ff', '#ffffff'];
    
    // Police Cruiser
    temp.push({ id: 0, type: 'police', lane: -1.5, initialZ: -200, color: '#000' }); 
    
    // Traffic
    for(let i=1; i<=2; i++) temp.push({ id: i, type: 'truck', lane: i > 1 ? 1.5 : -1.5, initialZ: Math.random() * 80, color: '#333' });
    for(let i=3; i<=10; i++) temp.push({ id: i, type: 'car', lane: (Math.floor(Math.random() * 4) - 1.5), initialZ: (Math.random() - 0.5) * 150, color: colors[i%colors.length] });
    
    return temp;
  }, []);

  const buildings = useMemo(() => {
    const temp = [];
    for (let i = 0; i < buildingCount; i++) {
      const isLeft = Math.random() > 0.5;
      const x = (isLeft ? -1 : 1) * (Math.random() * 40 + 20); 
      const z = (Math.random() - 0.5) * 400; 
      const width = Math.random() * 15 + 10;
      const depth = Math.random() * 15 + 10;
      const height = Math.random() * 100 + 30; // Taller skyscrapers
      const y = height / 2 - 10; 
      temp.push({ x, y, z, width, height, depth });
    }
    return temp;
  }, [buildingCount]);

  useFrame((_state, delta) => {
    simState.timer -= delta;

    if (simState.timer <= 0) {
      if (simState.trafficStatus === 'NORMAL') {
        simState.trafficStatus = 'CRASH';
        simState.timer = 8; 
        simState.crashZ = 20; 
        simState.crashLane = Math.random() > 0.5 ? 0.5 : -0.5; 
      } else if (simState.trafficStatus === 'CRASH') {
        simState.trafficStatus = 'CLEARING';
        simState.timer = 5; 
      } else if (simState.trafficStatus === 'CLEARING') {
        simState.trafficStatus = 'NORMAL';
        simState.timer = Math.random() * 15 + 10; 
      }
    }

    if (buildingMeshRef.current) {
      buildings.forEach((b, i) => {
        dummy.position.set(b.x, b.y, b.z);
        dummy.scale.set(b.width, b.height, b.depth);
        dummy.updateMatrix();
        buildingMeshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      buildingMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <DynamicCamera />
      
      {/* Lighting for that dusk/neon vibe */}
      <ambientLight intensity={0.2} color="#444466" />
      <directionalLight position={[50, 20, -50]} intensity={1.5} color="#ff8844" /> {/* Sunset orange */}
      <hemisphereLight groundColor="#000000" color="#4455aa" intensity={0.5} />

      <group>
        <HighwayRoad />
        
        {/* Skyscrapers with reflective glass look */}
        <instancedMesh ref={buildingMeshRef} args={[undefined, undefined, buildingCount]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#080c1a" roughness={0.2} metalness={0.9} />
        </instancedMesh>
        
        {fleet.map((v) => (
          <Vehicle3D key={v.id} id={v.id} type={v.type} lane={v.lane} initialZ={v.initialZ} color={v.color} />
        ))}
        
        <Pedestrians />
      </group>

      {/* Post Processing for Neon Bloom */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};
