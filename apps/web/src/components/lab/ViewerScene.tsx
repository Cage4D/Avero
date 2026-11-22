'use client';

import { Environment, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

/** Placeholder scene proving the R3F setup works. */
export default function ViewerScene() {
  return (
    <Canvas camera={{ position: [3, 2, 4], fov: 45 }}>
      <mesh>
        <boxGeometry args={[1.6, 0.6, 0.8]} />
        <meshStandardMaterial color="#b8bcc2" metalness={0.9} roughness={0.25} />
      </mesh>
      <OrbitControls enableDamping />
      <Environment preset="studio" />
    </Canvas>
  );
}
