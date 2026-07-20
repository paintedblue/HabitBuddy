import { Environment, useTexture } from '@react-three/drei';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { CharacterMood } from '../state/useRoutineSession';

const characterAssetBaseUrl = (import.meta.env.VITE_CHARACTER_ASSET_BASE_URL ?? '').replace(/\/$/, '');

function characterAssetUrl(path: string) {
  return characterAssetBaseUrl ? `${characterAssetBaseUrl}/${path}` : `/assets/characters/${path}`;
}

interface HabitSceneProps {
  stage: 'main' | 'bathroom';
  mood: CharacterMood;
  drawerOpen: boolean;
  rewardPulse: boolean;
  variant?: 'full' | 'home' | 'routine';
}

const characterFiles: Record<CharacterMood, { url: string; type: 'fbx' | 'glb' }> = {
  idle: { url: characterAssetUrl('FoxStopped.fbx'), type: 'fbx' },
  appear: { url: characterAssetUrl('FoxStopped.fbx'), type: 'fbx' },
  walk: { url: characterAssetUrl('Waving.fbx'), type: 'fbx' },
  wave: { url: characterAssetUrl('Waving.fbx'), type: 'fbx' },
  reach_forward: { url: characterAssetUrl('FoxStopped.fbx'), type: 'fbx' },
  look_around: { url: characterAssetUrl('FoxStopped.fbx'), type: 'fbx' },
  point: { url: characterAssetUrl('FoxStopped.fbx'), type: 'fbx' },
  thumbs_up: { url: characterAssetUrl('Waving.fbx'), type: 'fbx' },
  stretch: { url: characterAssetUrl('Waving.fbx'), type: 'fbx' },
  yawn: { url: characterAssetUrl('FoxStopped.fbx'), type: 'fbx' },
  mouth_open_wide: { url: characterAssetUrl('FoxStopped.fbx'), type: 'fbx' },
  brush_prep: { url: characterAssetUrl('fox_brushing_teeth_v4_prep_anims.glb'), type: 'glb' },
  brush: { url: characterAssetUrl('final_squirrel_brushing_teeth.glb'), type: 'glb' },
  wash: { url: characterAssetUrl('movement/fox_washing_hands.glb'), type: 'glb' },
  eat: { url: characterAssetUrl('squirrel/squirrel_eat_chew_v1.glb'), type: 'glb' },
  mop: { url: characterAssetUrl('char1_mopping_loop_fixed.fbx'), type: 'fbx' },
  celebrate: { url: characterAssetUrl('RumbaDancing.fbx'), type: 'fbx' },
  reward: { url: characterAssetUrl('RumbaDancing.fbx'), type: 'fbx' }
};
const brushPrepFallbackFile = { url: characterAssetUrl('fox_brushing_teeth_v4.glb'), type: 'glb' as const };

class CharacterModelBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { hasError: boolean; resetKey: string }
> {
  state = { hasError: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  static getDerivedStateFromProps(props: { resetKey: string }, state: { hasError: boolean; resetKey: string }) {
    if (props.resetKey !== state.resetKey) return { hasError: false, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('Character model failed to render.', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export function HabitScene({ stage, mood, drawerOpen, rewardPulse, variant = 'full' }: HabitSceneProps) {
  return (
    <Canvas orthographic camera={{ position: [0, 0, 10], zoom: 120 }} shadows>
      <Suspense fallback={null}>
        <RoomBackground stage={stage} />
        <ambientLight intensity={0.62} />
        <directionalLight position={[2, 5, 5]} intensity={stage === 'bathroom' ? 1.15 : 1} />
        <CharacterModelBoundary resetKey={`${stage}-${mood}`}>
          <CharacterModel stage={stage} mood={mood} drawerOpen={drawerOpen} variant={variant} />
        </CharacterModelBoundary>
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
  const characterFile = useCharacterFile(mood);
  const source = useLoader(characterFile.type === 'glb' ? GLTFLoader : FBXLoader, characterFile.url);
  const texture = useTexture(characterAssetUrl('texture_0.png'));
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
  const isGlbRoutineAnimation = mood === 'brush_prep' || mood === 'brush' || mood === 'wash' || mood === 'eat';
  const modelSettings = mood === 'brush_prep' || mood === 'brush'
    ? { position: new THREE.Vector3(-0.65, -2.35, 0), scale: 1.95, rotationY: 0 }
    : mood === 'wash'
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

        const isMop = object.name.toLowerCase().startsWith('mop');
        object.material = isMop
          ? new THREE.MeshStandardMaterial({
              color: '#ffffff',
              roughness: 0.9,
              metalness: 0,
              side: THREE.DoubleSide
            })
          : new THREE.MeshStandardMaterial({
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

    const clip = mood === 'mop'
      ? animations.find((item) => item.name.toLowerCase() === 'scene' && item.tracks.length > 0)
      : mood === 'wash'
        ? animations.find((item) => item.name.toLowerCase() === 'handwash' && item.tracks.length > 0)
      : mood === 'brush_prep' || mood === 'brush'
          ? animations.find((item) => item.name.toLowerCase().includes('brushing') && item.tracks.length > 0)
            ?? animations.find((item) => item.name.toLowerCase().includes('brush') && item.tracks.length > 0)
            ?? animations.find((item) => item.tracks.length > 0)
          : mood === 'eat'
            ? animations.find((item) => item.name.toLowerCase().includes('eat') && item.tracks.length > 0)
              ?? animations.find((item) => item.tracks.length > 0)
            : animations.find((item) => item.tracks.length > 0);
    const clips = clip ? [clip] : [];

    clips.forEach((item) => {
      const action = mixer.current!.clipAction(item);
      action.reset();
      action.setLoop(THREE.LoopRepeat, Number.POSITIVE_INFINITY);
      action.clampWhenFinished = false;
      action.timeScale = mood === 'walk' ? 0.85 : mood === 'brush_prep' || mood === 'brush' ? 1.05 : 1;
      action.play();
    });

    if (clips.length === 0 && mood === 'mop') {
      console.warn('The mopping FBX does not contain a playable Scene animation clip.');
    } else if (clips.length === 0 && mood === 'wash') {
      console.warn('The hand-washing GLB does not contain a playable HandWash animation clip.');
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
    const activeBounce = variant === 'home' || isGlbRoutineAnimation || mood === 'mop'
      ? 0
      : Math.abs(Math.sin(t * 7.4)) * (mood === 'reward' ? 0.2 : 0.1);
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

    if (mood !== 'idle' && mood !== 'appear' && !isGlbRoutineAnimation && mood !== 'mop') {
      animateRigPart(rightArm.current, mood, t, 'right');
      animateRigPart(leftArm.current, mood, t, 'left');
    }
    if (head.current && mood !== 'idle' && mood !== 'appear' && !isGlbRoutineAnimation && mood !== 'mop') {
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

function useCharacterFile(mood: CharacterMood) {
  const primary = characterFiles[mood];
  const initial = mood === 'brush_prep' ? brushPrepFallbackFile : primary;
  const [resolved, setResolved] = useState(initial);

  useEffect(() => {
    if (mood !== 'brush_prep') {
      setResolved(primary);
      return;
    }

    let cancelled = false;
    setResolved(brushPrepFallbackFile);
    fetch(primary.url, { method: 'HEAD', cache: 'no-store' })
      .then((response) => {
        if (!cancelled && response.ok) setResolved(primary);
      })
      .catch(() => {
        if (!cancelled) setResolved(brushPrepFallbackFile);
      });

    return () => {
      cancelled = true;
    };
  }, [mood, primary]);

  return resolved;
}

function animateRigPart(part: THREE.Object3D | null, mood: CharacterMood, t: number, side: 'left' | 'right') {
  if (!part) return;
  const mirror = side === 'right' ? 1 : -1;
  if (mood === 'wave') {
    part.rotation.x += -0.55;
    part.rotation.z += mirror * (0.45 + Math.sin(t * 10) * 0.34);
    return;
  }
  if (mood === 'reach_forward') {
    part.rotation.x += -0.95 + Math.sin(t * 4) * 0.05;
    part.rotation.z += mirror * 0.18;
    return;
  }
  if (mood === 'look_around') {
    part.rotation.x += -0.05;
    part.rotation.z += mirror * 0.08;
    return;
  }
  if (mood === 'point') {
    part.rotation.x += side === 'right' ? -1.0 : -0.18;
    part.rotation.z += side === 'right' ? 0.55 + Math.sin(t * 3) * 0.04 : -0.1;
    return;
  }
  if (mood === 'thumbs_up') {
    part.rotation.x += -0.7;
    part.rotation.z += mirror * (0.5 + Math.sin(t * 8) * 0.08);
    return;
  }
  if (mood === 'stretch') {
    part.rotation.x += -1.35;
    part.rotation.z += mirror * 0.55;
    return;
  }
  if (mood === 'yawn' || mood === 'mouth_open_wide') {
    part.rotation.x += -0.42 + Math.sin(t * 2.8) * 0.04;
    part.rotation.z += mirror * 0.18;
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
