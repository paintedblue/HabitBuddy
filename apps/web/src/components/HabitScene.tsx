import { Environment, useTexture } from '@react-three/drei';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { CharacterMood } from '../state/useRoutineSession';

interface HabitSceneProps {
  stage: 'main' | 'bathroom';
  mood: CharacterMood;
  drawerOpen: boolean;
  rewardPulse: boolean;
  variant?: 'full' | 'home' | 'routine';
}

const characterFiles: Record<CharacterMood, { url: string; type: 'fbx' | 'glb' }> = {
  idle: { url: '/assets/characters/FoxStopped.fbx', type: 'fbx' },
  appear: { url: '/assets/characters/FoxStopped.fbx', type: 'fbx' },
  walk: { url: '/assets/characters/Waving.fbx', type: 'fbx' },
  wave: { url: '/assets/characters/Waving.fbx', type: 'fbx' },
  brush: { url: '/assets/characters/fox_brushing_teeth_v4.glb', type: 'glb' },
  eat: { url: '/assets/characters/squirrel/squirrel_eating_vegetable_v1.glb', type: 'glb' },
  celebrate: { url: '/assets/characters/RumbaDancing.fbx', type: 'fbx' },
  reward: { url: '/assets/characters/RumbaDancing.fbx', type: 'fbx' }
};

export function HabitScene({ stage, mood, drawerOpen, rewardPulse, variant = 'full' }: HabitSceneProps) {
  return (
    <Canvas orthographic camera={{ position: [0, 0, 10], zoom: 120 }} shadows>
      <Suspense fallback={null}>
        <RoomBackground stage={stage} />
        <ambientLight intensity={0.62} />
        <directionalLight position={[2, 5, 5]} intensity={stage === 'bathroom' ? 1.15 : 1} />
        <CharacterModel stage={stage} mood={mood} drawerOpen={drawerOpen} variant={variant} />
        {rewardPulse ? <RewardConfetti /> : null}
        <Environment preset="apartment" environmentIntensity={0.4} />
      </Suspense>
    </Canvas>
  );
}

function RoomBackground({ stage }: { stage: 'main' | 'bathroom' }) {
  const main = useTexture('/assets/backgrounds/main_room.png');
  const bathroom = useTexture('/assets/backgrounds/bathroom.png');
  const texture = stage === 'bathroom' ? bathroom : main;
  texture.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh position={[0, 0, -2]}>
      <planeGeometry args={[12, 6.75]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

function CharacterModel({ stage, mood, drawerOpen, variant }: { stage: 'main' | 'bathroom'; mood: CharacterMood; drawerOpen: boolean; variant: 'full' | 'home' | 'routine' }) {
  const characterFile = characterFiles[mood];
  const source = useLoader(characterFile.type === 'glb' ? GLTFLoader : FBXLoader, characterFile.url);
  const texture = useTexture('/assets/characters/texture_0.png');
  const sourceModel = 'scene' in source ? source.scene : source;
  const animations = source.animations;
  const model = useMemo(() => clone(sourceModel) as THREE.Group, [sourceModel]);
  const group = useRef<THREE.Group>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);
  const rightArm = useRef<THREE.Object3D | null>(null);
  const leftArm = useRef<THREE.Object3D | null>(null);
  const head = useRef<THREE.Object3D | null>(null);
  const base = stage === 'bathroom'
    ? { position: new THREE.Vector3(-0.65, -2.35, 0), scale: 0.000195, rotationY: 0 }
    : { position: new THREE.Vector3(0, -2, 0), scale: 0.00016875, rotationY: 0 };
  const modelSettings = mood === 'brush'
    ? { position: new THREE.Vector3(-0.65, -2.35, 0), scale: 1.95, rotationY: 0 }
    : mood === 'eat'
      ? { position: new THREE.Vector3(0, -2.1, 0), scale: 1.95, rotationY: 0 }
      : base;
  const variantOffset = variant === 'routine'
    ? new THREE.Vector3(-1.45, 0, 0)
    : new THREE.Vector3(0, variant === 'home' ? -0.05 : 0, 0);
  const variantScale = variant === 'home' ? 1.1 : 1;

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    rightArm.current = null;
    leftArm.current = null;
    head.current = null;

    model.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.SkinnedMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        if (characterFile.type === 'glb') return;

        object.material = new THREE.MeshStandardMaterial({
          map: texture,
          color: '#eee2d3',
          roughness: 0.85,
          metalness: 0,
          side: THREE.DoubleSide
        });
      }

      const normalized = object.name.toLowerCase().replace(/^mixamorig:/, '');
      if (!rightArm.current && normalized === 'rightarm') rightArm.current = object;
      if (!leftArm.current && normalized === 'leftarm') leftArm.current = object;
      if (!head.current && normalized === 'head') head.current = object;
    });
  }, [characterFile.type, model, texture]);

  useEffect(() => {
    mixer.current?.stopAllAction();
    mixer.current = new THREE.AnimationMixer(model);
    const clip = mood === 'brush'
      ? animations.find((item) => item.name.toLowerCase().includes('brushing') && item.tracks.length > 0)
        ?? animations.find((item) => item.tracks.length > 0)
      : mood === 'eat'
        ? animations.find((item) => item.name.toLowerCase().includes('eat') && item.tracks.length > 0)
        ?? animations.find((item) => item.tracks.length > 0)
      : animations.find((item) => item.tracks.length > 0);

    if (clip) {
      const action = mixer.current.clipAction(clip);
      action.reset();
      action.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY);
      action.clampWhenFinished = false;
      action.timeScale = mood === 'walk' ? 0.85 : mood === 'brush' ? 1.05 : 1;
      action.play();
    }

    return () => {
      mixer.current?.stopAllAction();
      mixer.current = null;
    };
  }, [animations, model, mood]);

  useFrame(({ clock }, delta) => {
    mixer.current?.update(delta);
    if (!group.current) return;
    const t = clock.getElapsedTime();
    const drawerShift = drawerOpen ? -1.35 : 0;
    const activeBounce = mood === 'brush' || mood === 'eat' ? 0 : Math.abs(Math.sin(t * 7.4)) * (mood === 'reward' ? 0.2 : 0.1);
    const sway = mood === 'celebrate' || mood === 'reward'
      ? Math.sin(t * 4.5) * 0.13
      : mood === 'walk'
        ? Math.sin(t * 5.5) * 0.18
        : 0;
    const spin = mood === 'reward'
      ? Math.sin(t * 7.2) * 0.22
      : mood === 'celebrate'
        ? Math.sin(t * 4.8) * 0.15
        : 0;

    group.current.position.set(modelSettings.position.x + variantOffset.x + drawerShift + sway, modelSettings.position.y + variantOffset.y + activeBounce, modelSettings.position.z + variantOffset.z);
    group.current.rotation.set(0, modelSettings.rotationY + spin, 0);
    group.current.scale.setScalar(modelSettings.scale * variantScale);

    if (mood !== 'idle' && mood !== 'appear' && mood !== 'brush' && mood !== 'eat') {
      animateRigPart(rightArm.current, mood, t, 'right');
      animateRigPart(leftArm.current, mood, t, 'left');
    }
    if (head.current && mood !== 'idle' && mood !== 'appear' && mood !== 'brush' && mood !== 'eat') {
      head.current.rotation.x += Math.sin(t * 2.2) * 0.025;
      head.current.rotation.z += Math.sin(t * 1.7) * 0.02;
    }
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

function animateRigPart(part: THREE.Object3D | null, mood: CharacterMood, t: number, side: 'left' | 'right') {
  if (!part) return;
  const mirror = side === 'right' ? 1 : -1;
  if (mood === 'wave') {
    part.rotation.x += -0.55;
    part.rotation.z += mirror * (0.45 + Math.sin(t * 10) * 0.34);
    return;
  }
  if (mood === 'celebrate' || mood === 'reward') {
    part.rotation.x += -0.18 + Math.sin(t * 7) * 0.24;
    part.rotation.z += mirror * (0.2 + Math.sin(t * 8) * 0.16);
  }
}

function RewardConfetti() {
  const group = useRef<THREE.Group>(null);
  const pieces = useMemo(() => Array.from({ length: 34 }, (_, index) => ({
    color: ['#F5962A', '#FFCC2E', '#83D13B', '#43CDB6', '#F57EA6'][index % 5],
    x: (Math.random() - 0.5) * 7,
    y: Math.random() * 4,
    z: Math.random() * 0.4
  })), []);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.children.forEach((child, index) => {
      child.position.y = ((pieces[index].y - clock.getElapsedTime() * (0.45 + index * 0.006)) % 4.2) - 0.2;
      child.rotation.z += 0.03;
    });
  });

  return (
    <group ref={group}>
      {pieces.map((piece, index) => (
        <mesh key={index} position={[piece.x, piece.y, piece.z]}>
          <boxGeometry args={[0.08, 0.18, 0.02]} />
          <meshBasicMaterial color={piece.color} />
        </mesh>
      ))}
    </group>
  );
}
