'use client';

import { useEffect, useRef, useState } from 'react';
import { EmbedShell } from '../_shared/EmbedShell';
import styles from './wizard-survivor.module.css';

type Vec = {
  x: number;
  y: number;
};

type Enemy = {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  tint: string;
  xpValue: number;
};

type Projectile = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  tint: string;
};

type Pickup = {
  id: number;
  x: number;
  y: number;
  radius: number;
  kind: 'xp' | 'spell';
  value: number;
  label?: string;
};

type UpgradeKey =
  | 'bolt_damage'
  | 'bolt_count'
  | 'bolt_speed'
  | 'move_speed'
  | 'orb_unlock'
  | 'orb_count'
  | 'nova_unlock'
  | 'nova_damage'
  | 'pickup_radius'
  | 'max_health';

type UpgradeOption = {
  key: UpgradeKey;
  title: string;
  description: string;
};

type HudState = {
  level: number;
  wave: number;
  hp: number;
  maxHp: number;
  xp: number;
  nextXp: number;
  enemies: number;
  unlockedSpells: string[];
  gameOver: boolean;
  refundPoints: number;
};

type RuntimeState = {
  player: {
    x: number;
    y: number;
    speed: number;
    hp: number;
    maxHp: number;
    level: number;
    xp: number;
    nextXp: number;
    pickupRadius: number;
    boltCount: number;
    boltDamage: number;
    boltSpeed: number;
    boltCooldown: number;
    boltTimer: number;
    orbCount: number;
    orbDamage: number;
    orbRadius: number;
    orbRotation: number;
    orbSpeed: number;
    novaUnlocked: boolean;
    novaDamage: number;
    novaCooldown: number;
    novaTimer: number;
    spellUnlocks: string[];
    invulnerableTimer: number;
  };
  enemies: Enemy[];
  projectiles: Projectile[];
  pickups: Pickup[];
  nextId: number;
  elapsed: number;
  spawnTimer: number;
  wave: number;
  spellDropTimer: number;
  gameOver: boolean;
  refundPoints: number;
  upgradeLevels: Record<UpgradeKey, number>;
};

type MenuMode = 'closed' | 'paused' | 'powers' | 'levelup';

type UpgradeMeta = {
  key: UpgradeKey;
  title: string;
  description: string;
  category: 'arc' | 'mobility' | 'sigil' | 'nova' | 'survival';
  maxLevel?: number;
  requires?: UpgradeKey;
  blocksRefundIfOwned?: UpgradeKey[];
};

const TAU = Math.PI * 2;
const SPELL_PICKUPS = ['Orbiting Sigil', 'Starfall Nova'];
const UPGRADE_CATALOG: UpgradeMeta[] = [
  {
    key: 'bolt_damage',
    title: 'Charged Bolt',
    description: '+6 arc bolt damage.',
    category: 'arc',
  },
  {
    key: 'bolt_count',
    title: 'Forked Volley',
    description: '+1 bolt per cast.',
    category: 'arc',
  },
  {
    key: 'bolt_speed',
    title: 'Quick Chant',
    description: 'Arc bolts travel faster and fire sooner.',
    category: 'arc',
  },
  {
    key: 'move_speed',
    title: 'Windstep',
    description: '+30 movement speed.',
    category: 'mobility',
  },
  {
    key: 'pickup_radius',
    title: 'Magnet Charm',
    description: 'Collect gems from farther away.',
    category: 'mobility',
  },
  {
    key: 'max_health',
    title: 'Moon Tonic',
    description: '+20 max health and heal 12.',
    category: 'survival',
  },
  {
    key: 'orb_unlock',
    title: 'Orbiting Sigil',
    description: 'Summon a damaging orbiting sigil.',
    category: 'sigil',
    maxLevel: 1,
    blocksRefundIfOwned: ['orb_count'],
  },
  {
    key: 'orb_count',
    title: 'Twin Sigils',
    description: '+1 orbiting sigil.',
    category: 'sigil',
    requires: 'orb_unlock',
  },
  {
    key: 'nova_unlock',
    title: 'Starfall Nova',
    description: 'Unleash a timed ring burst.',
    category: 'nova',
    maxLevel: 1,
    blocksRefundIfOwned: ['nova_damage'],
  },
  {
    key: 'nova_damage',
    title: 'Astral Surge',
    description: '+10 nova damage and shorter cooldown.',
    category: 'nova',
    requires: 'nova_unlock',
  },
];

function createUpgradeLevels(): Record<UpgradeKey, number> {
  return {
    bolt_damage: 0,
    bolt_count: 0,
    bolt_speed: 0,
    move_speed: 0,
    orb_unlock: 0,
    orb_count: 0,
    nova_unlock: 0,
    nova_damage: 0,
    pickup_radius: 0,
    max_health: 0,
  };
}

function getUpgradeMeta(key: UpgradeKey) {
  return UPGRADE_CATALOG.find((entry) => entry.key === key)!;
}

function makeInitialState(): RuntimeState {
  return {
    player: {
      x: 0,
      y: 0,
      speed: 230,
      hp: 100,
      maxHp: 100,
      level: 1,
      xp: 0,
      nextXp: 16,
      pickupRadius: 42,
      boltCount: 1,
      boltDamage: 16,
      boltSpeed: 470,
      boltCooldown: 0.42,
      boltTimer: 0.1,
      orbCount: 0,
      orbDamage: 10,
      orbRadius: 72,
      orbRotation: 0,
      orbSpeed: 1.9,
      novaUnlocked: false,
      novaDamage: 18,
      novaCooldown: 6,
      novaTimer: 3.5,
      spellUnlocks: ['Arc Bolt'],
      invulnerableTimer: 0,
    },
    enemies: [],
    projectiles: [],
    pickups: [],
    nextId: 1,
    elapsed: 0,
    spawnTimer: 0,
    wave: 1,
    spellDropTimer: 10,
    gameOver: false,
    refundPoints: 0,
    upgradeLevels: createUpgradeLevels(),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distanceSquared(a: Vec, b: Vec) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function normalize(vec: Vec) {
  const length = Math.hypot(vec.x, vec.y) || 1;
  return { x: vec.x / length, y: vec.y / length };
}

function createHud(state: RuntimeState): HudState {
  return {
    level: state.player.level,
    wave: state.wave,
    hp: Math.ceil(state.player.hp),
    maxHp: state.player.maxHp,
    xp: Math.floor(state.player.xp),
    nextXp: state.player.nextXp,
    enemies: state.enemies.length,
    unlockedSpells: state.player.spellUnlocks,
    gameOver: state.gameOver,
    refundPoints: state.refundPoints,
  };
}

function randomUpgrade(state: RuntimeState): UpgradeOption[] {
  const pool = UPGRADE_CATALOG.filter((upgrade) => {
    const owned = state.upgradeLevels[upgrade.key];
    if (upgrade.maxLevel !== undefined && owned >= upgrade.maxLevel) return false;
    if (upgrade.requires && state.upgradeLevels[upgrade.requires] === 0) return false;
    if (upgrade.key === 'orb_count' && state.player.orbCount === 0) return false;
    if (upgrade.key === 'nova_damage' && !state.player.novaUnlocked) return false;
    return true;
  }).map((upgrade) => ({
    key: upgrade.key,
    title: upgrade.title,
    description: upgrade.description,
  }));

  const picks: UpgradeOption[] = [];
  const seen = new Set<UpgradeKey>();
  while (picks.length < 3 && seen.size < pool.length) {
    const option = pool[Math.floor(Math.random() * pool.length)];
    if (seen.has(option.key)) continue;
    seen.add(option.key);
    picks.push(option);
  }

  return picks;
}

function applyUpgrade(state: RuntimeState, key: UpgradeKey) {
  state.upgradeLevels[key] += 1;
  switch (key) {
    case 'bolt_damage':
      state.player.boltDamage += 6;
      break;
    case 'bolt_count':
      state.player.boltCount += 1;
      break;
    case 'bolt_speed':
      state.player.boltSpeed += 70;
      state.player.boltCooldown = Math.max(0.18, state.player.boltCooldown - 0.05);
      break;
    case 'move_speed':
      state.player.speed += 30;
      break;
    case 'orb_unlock':
      state.player.orbCount = Math.max(1, state.player.orbCount);
      if (!state.player.spellUnlocks.includes('Orbiting Sigil')) {
        state.player.spellUnlocks.push('Orbiting Sigil');
      }
      break;
    case 'orb_count':
      state.player.orbCount += 1;
      state.player.orbDamage += 3;
      break;
    case 'nova_unlock':
      state.player.novaUnlocked = true;
      state.player.novaTimer = 1.5;
      if (!state.player.spellUnlocks.includes('Starfall Nova')) {
        state.player.spellUnlocks.push('Starfall Nova');
      }
      break;
    case 'nova_damage':
      state.player.novaDamage += 10;
      state.player.novaCooldown = Math.max(2.2, state.player.novaCooldown - 0.5);
      break;
    case 'pickup_radius':
      state.player.pickupRadius += 18;
      break;
    case 'max_health':
      state.player.maxHp += 20;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 12);
      break;
  }
}

function revertUpgrade(state: RuntimeState, key: UpgradeKey) {
  if (state.upgradeLevels[key] <= 0) return;
  state.upgradeLevels[key] -= 1;

  switch (key) {
    case 'bolt_damage':
      state.player.boltDamage -= 6;
      break;
    case 'bolt_count':
      state.player.boltCount = Math.max(1, state.player.boltCount - 1);
      break;
    case 'bolt_speed':
      state.player.boltSpeed -= 70;
      state.player.boltCooldown = Math.min(0.42, state.player.boltCooldown + 0.05);
      break;
    case 'move_speed':
      state.player.speed -= 30;
      break;
    case 'orb_unlock':
      state.player.orbCount = 0;
      state.player.spellUnlocks = state.player.spellUnlocks.filter((spell) => spell !== 'Orbiting Sigil');
      break;
    case 'orb_count':
      state.player.orbCount = Math.max(1, state.player.orbCount - 1);
      state.player.orbDamage = Math.max(10, state.player.orbDamage - 3);
      break;
    case 'nova_unlock':
      state.player.novaUnlocked = false;
      state.player.spellUnlocks = state.player.spellUnlocks.filter((spell) => spell !== 'Starfall Nova');
      break;
    case 'nova_damage':
      state.player.novaDamage = Math.max(18, state.player.novaDamage - 10);
      state.player.novaCooldown = Math.min(6, state.player.novaCooldown + 0.5);
      break;
    case 'pickup_radius':
      state.player.pickupRadius = Math.max(42, state.player.pickupRadius - 18);
      break;
    case 'max_health':
      state.player.maxHp = Math.max(100, state.player.maxHp - 20);
      state.player.hp = Math.min(state.player.hp, state.player.maxHp);
      break;
  }
}

function canBuyUpgrade(state: RuntimeState, key: UpgradeKey) {
  const meta = getUpgradeMeta(key);
  const owned = state.upgradeLevels[key];
  if (state.refundPoints <= 0) return false;
  if (meta.maxLevel !== undefined && owned >= meta.maxLevel) return false;
  if (meta.requires && state.upgradeLevels[meta.requires] === 0) return false;
  return true;
}

function canSellUpgrade(state: RuntimeState, key: UpgradeKey) {
  const meta = getUpgradeMeta(key);
  if (state.upgradeLevels[key] <= 0) return false;
  if (meta.blocksRefundIfOwned?.some((dep) => state.upgradeLevels[dep] > 0)) return false;
  return true;
}

function nextLevelThreshold(level: number) {
  return Math.round(16 + level * 10 + level * level * 2.5);
}

function spawnEnemy(state: RuntimeState) {
  const angle = Math.random() * TAU;
  const distance = 540 + Math.random() * 220;
  const tough = state.elapsed > 35 && Math.random() < Math.min(0.35, 0.12 + state.elapsed / 180);
  const speed = tough ? 58 + Math.random() * 26 : 72 + Math.random() * 36;
  const hp = tough ? 48 + state.wave * 6 : 24 + state.wave * 4;
  const radius = tough ? 22 : 16;

  state.enemies.push({
    id: state.nextId++,
    x: state.player.x + Math.cos(angle) * distance,
    y: state.player.y + Math.sin(angle) * distance,
    hp,
    maxHp: hp,
    radius,
    speed,
    tint: tough ? '#f97316' : '#ef4444',
    xpValue: tough ? 5 : 2,
  });
}

function spawnSpellPickup(state: RuntimeState) {
  const available = SPELL_PICKUPS.filter((name) => !state.player.spellUnlocks.includes(name));
  if (available.length === 0) return;
  const angle = Math.random() * TAU;
  const distance = 180 + Math.random() * 160;
  const label = available[Math.floor(Math.random() * available.length)];

  state.pickups.push({
    id: state.nextId++,
    x: state.player.x + Math.cos(angle) * distance,
    y: state.player.y + Math.sin(angle) * distance,
    radius: 16,
    kind: 'spell',
    value: 1,
    label,
  });
}

function drawRune(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = `rgba(137, 221, 255, ${alpha})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, TAU);
  ctx.moveTo(-size, 0);
  ctx.lineTo(size, 0);
  ctx.moveTo(0, -size);
  ctx.lineTo(0, size);
  ctx.stroke();
  ctx.restore();
}

export default function WizardSurvivorPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<RuntimeState>(makeInitialState());
  const pausedRef = useRef(false);
  const keysRef = useRef<Record<string, boolean>>({});
  const animationRef = useRef<number | null>(null);
  const [hud, setHud] = useState<HudState>(() => createHud(gameRef.current));
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([]);
  const [menuMode, setMenuMode] = useState<MenuMode>('closed');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let lastTime = performance.now();
    let hudTimer = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const castBolts = (state: RuntimeState) => {
      if (state.enemies.length === 0) return;

      let target = state.enemies[0];
      let bestDistance = distanceSquared(state.player, target);
      for (const enemy of state.enemies) {
        const dist = distanceSquared(state.player, enemy);
        if (dist < bestDistance) {
          bestDistance = dist;
          target = enemy;
        }
      }

      const baseDirection = normalize({
        x: target.x - state.player.x,
        y: target.y - state.player.y,
      });
      const spreadCount = state.player.boltCount;
      for (let i = 0; i < spreadCount; i += 1) {
        const offset = spreadCount === 1 ? 0 : (i - (spreadCount - 1) / 2) * 0.18;
        const angle = Math.atan2(baseDirection.y, baseDirection.x) + offset;
        state.projectiles.push({
          id: state.nextId++,
          x: state.player.x,
          y: state.player.y,
          vx: Math.cos(angle) * state.player.boltSpeed,
          vy: Math.sin(angle) * state.player.boltSpeed,
          radius: 5,
          damage: state.player.boltDamage,
          life: 1.3,
          tint: '#7dd3fc',
        });
      }
    };

    const castNova = (state: RuntimeState) => {
      const count = 14;
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * TAU;
        state.projectiles.push({
          id: state.nextId++,
          x: state.player.x,
          y: state.player.y,
          vx: Math.cos(angle) * 260,
          vy: Math.sin(angle) * 260,
          radius: 7,
          damage: state.player.novaDamage,
          life: 0.8,
          tint: '#f9a8d4',
        });
      }
    };

    const damageEnemy = (state: RuntimeState, enemyId: number, damage: number) => {
      const enemy = state.enemies.find((entry) => entry.id === enemyId);
      if (!enemy) return;
      enemy.hp -= damage;
      if (enemy.hp > 0) return;

      state.pickups.push({
        id: state.nextId++,
        x: enemy.x,
        y: enemy.y,
        radius: 8,
        kind: 'xp',
        value: enemy.xpValue,
      });
      state.enemies = state.enemies.filter((entry) => entry.id !== enemyId);
    };

    const update = (delta: number) => {
      const state = gameRef.current;
      if (pausedRef.current || state.gameOver) return;

      state.elapsed += delta;
      state.wave = 1 + Math.floor(state.elapsed / 20);
      state.player.invulnerableTimer = Math.max(0, state.player.invulnerableTimer - delta);

      const move = {
        x: (keysRef.current.KeyD || keysRef.current.ArrowRight ? 1 : 0) - (keysRef.current.KeyA || keysRef.current.ArrowLeft ? 1 : 0),
        y: (keysRef.current.KeyS || keysRef.current.ArrowDown ? 1 : 0) - (keysRef.current.KeyW || keysRef.current.ArrowUp ? 1 : 0),
      };
      if (move.x !== 0 || move.y !== 0) {
        const direction = normalize(move);
        state.player.x += direction.x * state.player.speed * delta;
        state.player.y += direction.y * state.player.speed * delta;
      }

      state.spawnTimer -= delta;
      const spawnRate = clamp(1.1 - state.elapsed * 0.01, 0.22, 1.1);
      if (state.spawnTimer <= 0) {
        spawnEnemy(state);
        if (state.wave >= 3 && Math.random() < 0.35) {
          spawnEnemy(state);
        }
        state.spawnTimer = spawnRate;
      }

      state.spellDropTimer -= delta;
      if (state.spellDropTimer <= 0) {
        spawnSpellPickup(state);
        state.spellDropTimer = 16 + Math.random() * 8;
      }

      state.player.boltTimer -= delta;
      if (state.player.boltTimer <= 0) {
        castBolts(state);
        state.player.boltTimer = state.player.boltCooldown;
      }

      if (state.player.orbCount > 0) {
        state.player.orbRotation += delta * state.player.orbSpeed;
        for (let i = 0; i < state.player.orbCount; i += 1) {
          const angle = state.player.orbRotation + (i / state.player.orbCount) * TAU;
          const orbX = state.player.x + Math.cos(angle) * state.player.orbRadius;
          const orbY = state.player.y + Math.sin(angle) * state.player.orbRadius;
          for (const enemy of state.enemies) {
            const orbHitRadius = 9 + enemy.radius;
            const collision = orbHitRadius * orbHitRadius;
            if (distanceSquared({ x: orbX, y: orbY }, enemy) < collision) {
              damageEnemy(state, enemy.id, state.player.orbDamage * delta * 6);
            }
          }
        }
      }

      if (state.player.novaUnlocked) {
        state.player.novaTimer -= delta;
        if (state.player.novaTimer <= 0) {
          castNova(state);
          state.player.novaTimer = state.player.novaCooldown;
        }
      }

      for (const enemy of state.enemies) {
        const direction = normalize({
          x: state.player.x - enemy.x,
          y: state.player.y - enemy.y,
        });
        enemy.x += direction.x * enemy.speed * delta;
        enemy.y += direction.y * enemy.speed * delta;

        const hitDistance = enemy.radius + 16;
        if (distanceSquared(enemy, state.player) < hitDistance * hitDistance && state.player.invulnerableTimer <= 0) {
          state.player.hp -= 12;
          state.player.invulnerableTimer = 0.7;
          if (state.player.hp <= 0) {
            state.player.hp = 0;
            state.gameOver = true;
          }
        }
      }

      for (const projectile of state.projectiles) {
        projectile.x += projectile.vx * delta;
        projectile.y += projectile.vy * delta;
        projectile.life -= delta;
      }

      for (const projectile of state.projectiles) {
        if (projectile.life <= 0) continue;
        for (const enemy of state.enemies) {
          const hitDistance = projectile.radius + enemy.radius;
          if (distanceSquared(projectile, enemy) <= hitDistance * hitDistance) {
            damageEnemy(state, enemy.id, projectile.damage);
            projectile.life = 0;
            break;
          }
        }
      }
      state.projectiles = state.projectiles.filter((projectile) => projectile.life > 0);

      for (const pickup of state.pickups) {
        const toPlayer = {
          x: state.player.x - pickup.x,
          y: state.player.y - pickup.y,
        };
        const dist = Math.hypot(toPlayer.x, toPlayer.y);
        if (dist < state.player.pickupRadius + 48) {
          const pull = normalize(toPlayer);
          const strength = clamp(220 - dist, 60, 240);
          pickup.x += pull.x * strength * delta;
          pickup.y += pull.y * strength * delta;
        }
      }

      const retainedPickups: Pickup[] = [];
      for (const pickup of state.pickups) {
        const hitDistance = pickup.radius + 16;
        if (distanceSquared(pickup, state.player) > hitDistance * hitDistance) {
          retainedPickups.push(pickup);
          continue;
        }

        if (pickup.kind === 'xp') {
          state.player.xp += pickup.value;
        } else if (pickup.label === 'Orbiting Sigil') {
          if (state.upgradeLevels.orb_unlock === 0) {
            applyUpgrade(state, 'orb_unlock');
          }
        } else if (pickup.label === 'Starfall Nova') {
          if (state.upgradeLevels.nova_unlock === 0) {
            applyUpgrade(state, 'nova_unlock');
            state.player.novaTimer = 1.2;
          }
        }
      }
      state.pickups = retainedPickups;

      if (state.player.xp >= state.player.nextXp) {
        state.player.xp -= state.player.nextXp;
        state.player.level += 1;
        state.player.nextXp = nextLevelThreshold(state.player.level);
        pausedRef.current = true;
        setMenuMode('levelup');
        setUpgradeOptions(randomUpgrade(state));
      }
    };

    const render = () => {
      const state = gameRef.current;
      ctx.clearRect(0, 0, width, height);

      const background = ctx.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, '#0f172a');
      background.addColorStop(1, '#07111f');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const tile = 56;
      const offsetX = ((-state.player.x % tile) + tile) % tile;
      const offsetY = ((-state.player.y % tile) + tile) % tile;

      ctx.strokeStyle = 'rgba(96, 165, 250, 0.12)';
      ctx.lineWidth = 1;
      for (let x = -tile; x < width + tile; x += tile) {
        ctx.beginPath();
        ctx.moveTo(x + offsetX, 0);
        ctx.lineTo(x + offsetX, height);
        ctx.stroke();
      }
      for (let y = -tile; y < height + tile; y += tile) {
        ctx.beginPath();
        ctx.moveTo(0, y + offsetY);
        ctx.lineTo(width, y + offsetY);
        ctx.stroke();
      }
      for (let x = -tile; x < width + tile; x += tile * 3) {
        for (let y = -tile; y < height + tile; y += tile * 3) {
          drawRune(ctx, x + offsetX, y + offsetY, 10, 0.14);
        }
      }

      const toScreen = (world: Vec) => ({
        x: world.x - state.player.x + centerX,
        y: world.y - state.player.y + centerY,
      });

      for (const pickup of state.pickups) {
        const pos = toScreen(pickup);
        ctx.beginPath();
        ctx.fillStyle = pickup.kind === 'xp' ? '#a3e635' : '#f5d0fe';
        ctx.arc(pos.x, pos.y, pickup.radius, 0, TAU);
        ctx.fill();
        if (pickup.kind === 'spell' && pickup.label) {
          ctx.fillStyle = 'rgba(244, 244, 245, 0.9)';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(pickup.label, pos.x, pos.y - 22);
        }
      }

      for (const projectile of state.projectiles) {
        const pos = toScreen(projectile);
        ctx.beginPath();
        ctx.fillStyle = projectile.tint;
        ctx.arc(pos.x, pos.y, projectile.radius, 0, TAU);
        ctx.fill();
      }

      if (state.player.orbCount > 0) {
        for (let i = 0; i < state.player.orbCount; i += 1) {
          const angle = state.player.orbRotation + (i / state.player.orbCount) * TAU;
          const pos = toScreen({
            x: state.player.x + Math.cos(angle) * state.player.orbRadius,
            y: state.player.y + Math.sin(angle) * state.player.orbRadius,
          });
          ctx.beginPath();
          ctx.fillStyle = '#c084fc';
          ctx.arc(pos.x, pos.y, 9, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.35)';
          ctx.arc(pos.x, pos.y, 16, 0, TAU);
          ctx.stroke();
        }
      }

      for (const enemy of state.enemies) {
        const pos = toScreen(enemy);
        ctx.beginPath();
        ctx.fillStyle = enemy.tint;
        ctx.arc(pos.x, pos.y, enemy.radius, 0, TAU);
        ctx.fill();

        ctx.fillStyle = 'rgba(2, 6, 23, 0.5)';
        ctx.fillRect(pos.x - 18, pos.y - enemy.radius - 14, 36, 5);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(pos.x - 18, pos.y - enemy.radius - 14, 36 * clamp(enemy.hp / enemy.maxHp, 0, 1), 5);
      }

      if (state.player.novaUnlocked) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(244, 114, 182, 0.15)';
        ctx.lineWidth = 2;
        ctx.arc(centerX, centerY, 28 + Math.max(0, 1 - state.player.novaTimer) * 16, 0, TAU);
        ctx.stroke();
      }

      ctx.save();
      if (state.player.invulnerableTimer > 0 && Math.floor(state.player.invulnerableTimer * 14) % 2 === 0) {
        ctx.globalAlpha = 0.45;
      }
      ctx.beginPath();
      ctx.fillStyle = '#38bdf8';
      ctx.arc(centerX, centerY, 16, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = '#e0f2fe';
      ctx.arc(centerX, centerY - 18, 9, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - 10, centerY + 14);
      ctx.lineTo(centerX, centerY - 28);
      ctx.lineTo(centerX + 10, centerY + 14);
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(163, 230, 53, 0.35)';
      ctx.arc(centerX, centerY, state.player.pickupRadius, 0, TAU);
      ctx.stroke();

      if (state.gameOver) {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.74)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('The tower falls', centerX, centerY - 12);
        ctx.font = '18px sans-serif';
        ctx.fillText('Press space to begin another run.', centerX, centerY + 24);
      }
    };

    const frame = (timestamp: number) => {
      const delta = Math.min(0.033, (timestamp - lastTime) / 1000);
      lastTime = timestamp;
      update(delta);
      render();

      hudTimer += delta;
      if (hudTimer > 0.12) {
        hudTimer = 0;
        setHud(createHud(gameRef.current));
      }

      animationRef.current = window.requestAnimationFrame(frame);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && gameRef.current.gameOver) {
        gameRef.current = makeInitialState();
        setUpgradeOptions([]);
        pausedRef.current = false;
        setMenuMode('closed');
        setHud(createHud(gameRef.current));
        return;
      }
      if (event.code === 'Escape' && !gameRef.current.gameOver && menuMode !== 'levelup') {
        setMenuMode((current) => {
          const nextMode = current === 'closed' ? 'paused' : 'closed';
          pausedRef.current = nextMode !== 'closed';
          return nextMode;
        });
        return;
      }
      keysRef.current[event.code] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.code] = false;
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    animationRef.current = window.requestAnimationFrame(frame);

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [menuMode]);

  const chooseUpgrade = (option: UpgradeOption) => {
    applyUpgrade(gameRef.current, option.key);
    setUpgradeOptions([]);
    pausedRef.current = false;
    setMenuMode('closed');
    setHud(createHud(gameRef.current));
  };

  const openPauseMenu = () => {
    if (gameRef.current.gameOver || menuMode === 'levelup') return;
    pausedRef.current = true;
    setMenuMode('paused');
    setHud(createHud(gameRef.current));
  };

  const resumeGame = () => {
    if (menuMode === 'levelup') return;
    pausedRef.current = false;
    setMenuMode('closed');
    setHud(createHud(gameRef.current));
  };

  const openPowersMenu = () => {
    if (gameRef.current.gameOver || menuMode === 'levelup') return;
    pausedRef.current = true;
    setMenuMode('powers');
    setHud(createHud(gameRef.current));
  };

  const sellUpgrade = (key: UpgradeKey) => {
    const state = gameRef.current;
    if (!canSellUpgrade(state, key)) return;
    revertUpgrade(state, key);
    state.refundPoints += 1;
    setHud(createHud(state));
  };

  const buyUpgrade = (key: UpgradeKey) => {
    const state = gameRef.current;
    if (!canBuyUpgrade(state, key)) return;
    state.refundPoints -= 1;
    applyUpgrade(state, key);
    setHud(createHud(state));
  };

  return (
    <EmbedShell>
      <main className={styles.shell}>
        <canvas ref={canvasRef} className={styles.canvas} />

        <section className={styles.hud}>
          <div className={styles.controls}>
            <button type="button" className={styles.controlButton} onClick={menuMode === 'closed' ? openPauseMenu : resumeGame}>
              {menuMode === 'closed' ? 'Pause' : 'Resume'}
            </button>
            <button type="button" className={styles.controlButton} onClick={openPowersMenu}>
              Powers
            </button>
          </div>

          <div className={styles.panel}>
            <div className={styles.eyebrow}>Wizard Survivor</div>
            <h1>Hold the circle.</h1>
            <p>Move with WASD or arrow keys. Stay alive, collect gems, and walk into spell relics.</p>
          </div>

          <div className={styles.stats}>
            <div>
              <span>Wave</span>
              <strong>{hud.wave}</strong>
            </div>
            <div>
              <span>Level</span>
              <strong>{hud.level}</strong>
            </div>
            <div>
              <span>Health</span>
              <strong>
                {hud.hp}/{hud.maxHp}
              </strong>
            </div>
            <div>
              <span>XP</span>
              <strong>
                {hud.xp}/{hud.nextXp}
              </strong>
            </div>
            <div>
              <span>Enemies</span>
              <strong>{hud.enemies}</strong>
            </div>
          </div>

          <div className={styles.spells}>
            {hud.unlockedSpells.map((spell) => (
              <span key={spell}>{spell}</span>
            ))}
          </div>
        </section>

        {menuMode === 'levelup' && upgradeOptions.length > 0 ? (
          <section className={styles.overlay}>
            <div className={styles.levelCard}>
              <div className={styles.eyebrow}>Level Up</div>
              <h2>Choose your next enchantment</h2>
              <div className={styles.upgrades}>
                {upgradeOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={styles.upgradeButton}
                    onClick={() => chooseUpgrade(option)}
                  >
                    <strong>{option.title}</strong>
                    <span>{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {menuMode === 'paused' ? (
          <section className={styles.overlay}>
            <div className={styles.menuCard}>
              <div className={styles.eyebrow}>Paused</div>
              <h2>Catch your breath</h2>
              <p>Resume the run or open the powers ledger to refund upgrades and spend those points elsewhere.</p>
              <div className={styles.menuActions}>
                <button type="button" className={styles.primaryButton} onClick={resumeGame}>
                  Resume
                </button>
                <button type="button" className={styles.secondaryButton} onClick={openPowersMenu}>
                  Edit Powers
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {menuMode === 'powers' ? (
          <section className={styles.overlay}>
            <div className={styles.powerCard}>
              <div className={styles.menuHeader}>
                <div>
                  <div className={styles.eyebrow}>Powers Menu</div>
                  <h2>Reforge your build</h2>
                </div>
                <div className={styles.refundBadge}>{hud.refundPoints} refund point{hud.refundPoints === 1 ? '' : 's'}</div>
              </div>
              <p className={styles.menuText}>
                Sell owned upgrades to create refund points. Spend those points on any unlocked branch. Sell child upgrades before selling a spell unlock.
              </p>
              <div className={styles.powerGrid}>
                {UPGRADE_CATALOG.map((upgrade) => {
                  const level = gameRef.current.upgradeLevels[upgrade.key];
                  const canBuy = canBuyUpgrade(gameRef.current, upgrade.key);
                  const canSell = canSellUpgrade(gameRef.current, upgrade.key);
                  return (
                    <div key={upgrade.key} className={styles.powerRow}>
                      <div>
                        <strong>{upgrade.title}</strong>
                        <p>{upgrade.description}</p>
                        <span className={styles.powerMeta}>
                          Level {level}
                          {upgrade.maxLevel === 1 ? ' • unique' : ''}
                          {upgrade.requires ? ` • needs ${getUpgradeMeta(upgrade.requires).title}` : ''}
                        </span>
                      </div>
                      <div className={styles.powerActions}>
                        <button type="button" className={styles.smallButton} onClick={() => sellUpgrade(upgrade.key)} disabled={!canSell}>
                          Sell
                        </button>
                        <button type="button" className={styles.smallButton} onClick={() => buyUpgrade(upgrade.key)} disabled={!canBuy}>
                          Upgrade
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={styles.menuActions}>
                <button type="button" className={styles.primaryButton} onClick={resumeGame}>
                  Back to Run
                </button>
                <button type="button" className={styles.secondaryButton} onClick={openPauseMenu}>
                  Pause Menu
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </EmbedShell>
  );
}
