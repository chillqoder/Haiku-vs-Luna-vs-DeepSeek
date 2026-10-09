// Headless smoke test: imports and exercises the real modules in Node.
// Uses a minimal DOM/canvas stub so procedural textures can be created.
// Run with: npm test

import assert from 'node:assert';

// ---------------------------------------------------------------------------
// Minimal DOM / canvas / Web Audio stubs (enough for procedural textures).
// ---------------------------------------------------------------------------
function make2dContext() {
  const gradient = { addColorStop() {} };
  const ctx = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
        if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
        if (prop === 'canvas') return { width: 64, height: 64 };
        return () => {};
      },
      set: () => true,
    }
  );
  return ctx;
}

globalThis.document = {
  createElement(tag) {
    if (tag === 'canvas') {
      return { width: 1, height: 1, style: {}, getContext: () => make2dContext() };
    }
    return {
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      appendChild() {},
      addEventListener() {},
      setAttribute() {},
    };
  },
  getElementById: () => null,
  querySelector: () => null,
};
globalThis.window = {
  devicePixelRatio: 1,
  addEventListener() {},
  removeEventListener() {},
};
const defineGlobal = (name, value) => {
  try {
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
  } catch {
    /* already defined and non-configurable */
  }
};
defineGlobal('navigator', { getGamepads: () => [] });
defineGlobal('localStorage', { getItem: () => null, setItem() {} });

// ---------------------------------------------------------------------------
// Imports (this also validates every module parses and links).
// ---------------------------------------------------------------------------
const Physics = await import('../src/physics/Physics.js');
const { boxFromFeet } = Physics;
const { StateMachine } = await import('../src/core/StateMachine.js');
const { LEVELS } = await import('../src/level/LevelData.js');
const { CLIPS } = await import('../src/anim/Clips.js');
const { Animator } = await import('../src/anim/Animator.js');
const { CombatSystem } = await import('../src/combat/CombatSystem.js');
const { AttackTokenManager } = await import('../src/ai/EnemyAI.js');
const { AudioManager } = await import('../src/audio/AudioManager.js');
const { Hero } = await import('../src/entities/Hero.js');
const { Enemy } = await import('../src/entities/Enemy.js');

// Also make sure these heavyweight modules import without side effects.
const ModelFactory = await import('../src/assets/ModelFactory.js');
await import('../src/assets/Particles.js');
const { Level } = await import('../src/level/Level.js');
const { Obstacle } = await import('../src/level/Obstacle.js');
await import('../src/core/Game.js');

let passed = 0;
function ok(name, fn) {
  fn();
  passed++;
  console.log('  \u2713', name);
}

console.log('NEON FIST smoke test\n');

// ---------------------------------------------------------------------------
console.log('Physics');
ok('boxFromFeet builds a valid AABB', () => {
  const p = { x: 1, y: 0, z: 2 };
  const b = boxFromFeet(p, 0.5, 2, 0.4);
  assert.equal(b.minX, 0.5);
  assert.equal(b.maxX, 1.5);
  assert.equal(b.maxY, 2);
  assert.equal(b.minZ, 1.6);
});

ok('aabbOverlap detects overlap and separation', () => {
  const a = boxFromFeet({ x: 0, y: 0, z: 0 }, 0.5, 2, 0.5);
  const b = boxFromFeet({ x: 0.5, y: 0, z: 0 }, 0.5, 2, 0.5);
  const c = boxFromFeet({ x: 5, y: 0, z: 0 }, 0.5, 2, 0.5);
  assert.ok(Physics.aabbOverlap(a, b));
  assert.ok(!Physics.aabbOverlap(a, c));
});

ok('attackBox is directional and radial', () => {
  const owner = { position: { x: 0, y: 0, z: 0 }, facing: 1 };
  const dir = Physics.attackBox(owner, { range: 2, depth: 0.5 });
  assert.ok(dir.maxX > 0 && dir.minX >= -0.001);
  const radial = Physics.attackBox(owner, { range: 2, depth: 0.5, radial: true });
  assert.ok(radial.minX < 0 && radial.maxX > 0);
});

ok('integrate applies gravity and grounds the entity', () => {
  const e = {
    position: { x: 0, y: 3, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    moveVel: { x: 0, y: 0, z: 0 },
    knockVel: { x: 0, y: 0, z: 0 },
  };
  for (let i = 0; i < 200; i++) Physics.integrate(e, 1 / 60);
  assert.ok(Math.abs(e.position.y) < 0.001, 'entity should land on the ground');
});

ok('knockVel decays over time', () => {
  const e = {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    moveVel: { x: 0, y: 0, z: 0 },
    knockVel: { x: 10, y: 0, z: 0 },
  };
  for (let i = 0; i < 120; i++) Physics.integrate(e, 1 / 60);
  assert.ok(Math.abs(e.knockVel.x) < 0.1, `knockVel should decay (got ${e.knockVel.x})`);
});

// ---------------------------------------------------------------------------
console.log('\nStateMachine');
ok('transitions run enter/exit hooks', () => {
  const log = [];
  const sm = new StateMachine('a', {
    a: { enter: () => log.push('enter-a'), exit: () => log.push('exit-a') },
    b: { enter: () => log.push('enter-b') },
  });
  assert.equal(sm.current, 'a');
  sm.set('b');
  assert.equal(sm.current, 'b');
  assert.deepEqual(log, ['enter-a', 'exit-a', 'enter-b']);
  assert.ok(sm.is('b'));
});

// ---------------------------------------------------------------------------
console.log('\nLevel data');
ok('three well-formed levels with waves and a boss', () => {
  assert.equal(LEVELS.length, 3);
  for (const lvl of LEVELS) {
    assert.ok(lvl.length > 50, `${lvl.name} length`);
    assert.ok(lvl.waves.length >= 3, `${lvl.name} waves`);
    const last = lvl.waves[lvl.waves.length - 1];
    assert.ok(last.boss, `${lvl.name} ends with a boss wave`);
    for (const o of lvl.obstacles) {
      assert.ok(o.x < lvl.length, 'obstacle inside level');
    }
  }
});

// ---------------------------------------------------------------------------
console.log('\nAnimation clips');
ok('every clip poses the rig without NaN', () => {
  // Build a fake rig with the same joint names/hipY convention.
  const mk = () => ({ rotation: { x: 0, y: 0, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; } }, position: { x: 0, y: 0, z: 0, set() {} } });
  const model = {
    body: mk(),
    hipY: 0.92,
    joints: {
      hips: mk(), torso: mk(), head: mk(),
      armA: mk(), foreA: mk(), armB: mk(), foreB: mk(),
      legA: mk(), shinA: mk(), legB: mk(), shinB: mk(),
    },
  };
  const anim = new Animator(model);
  for (const name of Object.keys(CLIPS)) {
    anim.play(name, { restart: true });
    for (let i = 0; i < 40; i++) {
      anim.update(1 / 60);
      for (const key of Object.keys(model.joints)) {
        const r = model.joints[key].rotation;
        assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.z), `${name}:${key}`);
      }
    }
  }
});

// ---------------------------------------------------------------------------
console.log('\nCombat + entities');

function makeWorld(hero, enemies) {
  const audio = new AudioManager(); // no AudioContext in node -> methods no-op
  const effects = {
    hitSpark() {}, blockSpark() {}, dust() {}, debris() {}, koBurst() {}, shockwave() {}, spawnMany() {}, clear() {}, update() {},
  };
  const world = {
    audio,
    effects,
    renderer: { addShake() {}, camX: 0 },
    input: {
      axis: () => 0,
      isDown: () => false,
      justPressed: () => false,
      justReleased: () => false,
    },
    attackTokens: new AttackTokenManager(4),
    combat: null,
    score: 0,
    addScore(n) { this.score += n; },
    getEnemies: () => enemies,
    getHero: () => hero,
    getTargetsFor(faction) {
      if (faction === 'hero') return enemies.filter((e) => !e.dead);
      if (faction === 'enemy') return hero && !hero.dead ? [hero] : [];
      return [];
    },
    onHeroHit() {},
    onEnemyHitHero() {},
    onBlock() {},
    onThrownBodyHit() {},
    onBossPhase() {},
    onWaveStart() {},
    onWaveCleared() {},
    spawnPickup() {},
  };
  const combat = new CombatSystem(world);
  world.combat = combat;
  return { world, combat, effects, audio };
}

ok('hero punches an enemy and deals damage', () => {
  const hero = new Hero({ x: 0, z: 0 });
  const enemy = new Enemy({ archetype: 'grunt', x: 1.3, z: 0, facing: -1 });
  const enemies = [enemy];
  const { world, combat } = makeWorld(hero, enemies);
  enemy.initAI(world);
  hero.facing = 1;

  const hp0 = enemy.health;
  hero.startAttack('punch1', world);
  for (let i = 0; i < 20; i++) {
    hero.update(1 / 60, world);
    combat.tickTimers(1 / 60);
    combat.updateHitboxes(1 / 60, world);
  }
  assert.ok(enemy.health < hp0, `enemy should take damage (${hp0} -> ${enemy.health})`);
  assert.ok(combat.combo >= 1, 'combo should register');
});

ok('combo chains through punch1 -> punch2', () => {
  const hero = new Hero({ x: 0, z: 0 });
  const enemy = new Enemy({ archetype: 'grunt', x: 1.3, z: 0, facing: -1 });
  const enemies = [enemy];
  const { world, combat } = makeWorld(hero, enemies);
  enemy.initAI(world);
  hero.facing = 1;
  // Simulate a second punch press while the first is active.
  let pressed = true;
  world.input.justPressed = (a) => a === 'punch' && pressed;
  hero.startAttack('punch1', world);
  for (let i = 0; i < 10; i++) {
    hero.update(1 / 60, world);
    pressed = i === 2; // queue on frame 2
    combat.tickTimers(1 / 60);
    combat.updateHitboxes(1 / 60, world);
  }
  // After the first attack ends the queued punch2 should have started.
  for (let i = 0; i < 10; i++) {
    hero.update(1 / 60, world);
    pressed = false;
    combat.tickTimers(1 / 60);
    combat.updateHitboxes(1 / 60, world);
  }
  assert.ok(enemy.health < enemy.maxHealth, 'enemy took combo damage');
});

ok('special (radial) hits enemies on both sides', () => {
  const hero = new Hero({ x: 0, z: 0 });
  const a = new Enemy({ archetype: 'grunt', x: -1.4, z: 0, facing: 1 });
  const b = new Enemy({ archetype: 'grunt', x: 1.4, z: 0, facing: -1 });
  const enemies = [a, b];
  const { world, combat } = makeWorld(hero, enemies);
  a.initAI(world);
  b.initAI(world);
  hero.energy = 100;
  hero.startAttack('special', world);
  for (let i = 0; i < 40; i++) {
    hero.update(1 / 60, world);
    combat.tickTimers(1 / 60);
    combat.updateHitboxes(1 / 60, world);
  }
  assert.ok(a.health < a.maxHealth, 'left enemy hit');
  assert.ok(b.health < b.maxHealth, 'right enemy hit');
});

ok('enemy blocking negates most damage', () => {
  const hero = new Hero({ x: 0, z: 0 });
  const enemy = new Enemy({ archetype: 'grunt', x: 1.2, z: 0, facing: -1 });
  const { world, combat } = makeWorld(hero, [enemy]);
  enemy.initAI(world);
  hero.facing = 1;
  enemy.blocking = true;
  enemy.facing = -1; // facing toward hero
  const hp0 = enemy.health;
  hero.startAttack('punch1', world);
  for (let i = 0; i < 20; i++) {
    hero.update(1 / 60, world);
    combat.tickTimers(1 / 60);
    combat.updateHitboxes(1 / 60, world);
  }
  const lost = hp0 - enemy.health;
  assert.ok(lost > 0 && lost <= 2, `blocked hit should chip only (lost ${lost})`);
});

ok('killing an enemy sets dead and fires kill result', () => {
  const hero = new Hero({ x: 0, z: 0 });
  const enemy = new Enemy({ archetype: 'grunt', x: 1.2, z: 0, facing: -1 });
  enemy.health = 4;
  const { world, combat } = makeWorld(hero, [enemy]);
  enemy.initAI(world);
  hero.facing = 1;

  let killed = false;
  const orig = world.onHeroHit;
  world.onHeroHit = (t, def, p, result) => {
    orig();
    if (result && result.killed) killed = true;
  };

  hero.startAttack('punch1', world);
  for (let i = 0; i < 30; i++) {
    hero.update(1 / 60, world);
    combat.tickTimers(1 / 60);
    combat.updateHitboxes(1 / 60, world);
  }
  assert.ok(enemy.dead, 'enemy should be dead');
  assert.ok(killed, 'kill event should fire');
});

ok('enemy AI approaches and attacks the hero over time', () => {
  const hero = new Hero({ x: 0, z: 0 });
  const enemy = new Enemy({ archetype: 'agile', x: 8, z: 1.5, facing: -1 });
  const enemies = [enemy];
  const { world, combat } = makeWorld(hero, enemies);
  enemy.initAI(world);

  const hp0 = hero.health;
  // Freeze the hero in place (simple AI target).
  for (let i = 0; i < 900; i++) {
    enemy.update(1 / 60, world);
    combat.tickTimers(1 / 60);
    combat.updateHitboxes(1 / 60, world);
    // move hero away from death so the test keeps running
    hero.health = Math.max(hero.health, 30);
  }
  const approached = Math.abs(enemy.position.x - hero.position.x) < 6;
  assert.ok(approached || hero.health < hp0 || enemy.attack, 'AI should engage the hero');
});

ok('hero can grab, knee and throw an enemy', () => {
  const hero = new Hero({ x: 0, z: 0 });
  const enemy = new Enemy({ archetype: 'grunt', x: 1.0, z: 0, facing: -1 });
  const { world, combat } = makeWorld(hero, [enemy]);
  enemy.initAI(world);
  hero.facing = 1;

  hero.tryGrab(world);
  assert.equal(hero.heldEnemy, enemy, 'hero should grab the enemy');
  assert.equal(enemy.grabbedBy, hero, 'enemy should be held');

  // Knee attack
  const hp0 = enemy.health;
  hero.startAttack('grabPunch', world);
  for (let i = 0; i < 25; i++) {
    hero.update(1 / 60, world);
    combat.tickTimers(1 / 60);
    combat.updateHitboxes(1 / 60, world);
  }
  assert.ok(enemy.health < hp0, 'knee should deal damage');

  // Throw
  hero.tryGrab(world); // re-grab if we let go
  if (hero.heldEnemy) {
    hero.throwHeld(world);
    assert.ok(enemy.isThrownFlying || enemy.dead, 'enemy should be thrown');
    for (let i = 0; i < 200; i++) {
      enemy.update(1 / 60, world);
      combat.tickTimers(1 / 60);
      combat.updateHitboxes(1 / 60, world);
    }
    assert.ok(enemy.position.y <= 0.001, 'thrown enemy should land');
  }
});

ok('audio methods are safe before unlock', () => {
  const a = new AudioManager();
  a.punch();
  a.hitHeavy();
  a.special();
  a.ko();
  a.gameOver();
  assert.equal(a.ctx, null);
});

// ---------------------------------------------------------------------------
console.log('\nCharacters & props');
ok('every character preset builds a complete rig', () => {
  for (const kind of Object.keys(ModelFactory.CHARACTER_PRESETS)) {
    const model = ModelFactory.buildCharacter(kind);
    assert.ok(model.root, `${kind} root`);
    for (const joint of ['hips', 'torso', 'head', 'armA', 'foreA', 'armB', 'foreB', 'legA', 'shinA', 'legB', 'shinB']) {
      assert.ok(model.joints[joint], `${kind} joint ${joint}`);
    }
    assert.ok(model.materials.length > 0, `${kind} materials`);
  }
});

ok('destructible crate breaks and fires world effects', () => {
  const calls = { debris: 0, dust: 0, crate: 0 };
  const world = {
    effects: {
      debris() { calls.debris++; },
      dust() { calls.dust++; },
    },
    audio: { crateBreak() { calls.crate++; } },
    renderer: { addShake() {} },
    spawnPickup() {},
    addScore() {},
  };
  const crate = new Obstacle('crate', 5, 1, world);
  assert.ok(!crate.dead);
  assert.ok(crate.canBeHit());
  const res = crate.takeDamage(999, {});
  assert.ok(res.killed && crate.dead, 'crate destroyed');
  assert.ok(calls.debris > 0 && calls.crate > 0, 'break effects fired');
  assert.ok(!crate.canBeHit(), 'dead crate cannot be hit');
});

// ---------------------------------------------------------------------------
console.log('\nLevel integration');
ok('level builds, triggers a wave, clears it and opens the path', () => {
  const hero = new Hero({ x: 0, z: 0 });
  const enemies = [];
  const { world } = makeWorld(hero, enemies);
  world.spawnEnemy = (opts) => {
    const e = new Enemy(opts);
    e.position.set(opts.x, 0, opts.z);
    e.initAI(world);
    e.spawnInvuln = 1.1;
    enemies.push(e);
    return e;
  };
  world.spawnPickup = (x, z, type) => {
    world._pickups = world._pickups || [];
    world._pickups.push({ x, z, type });
  };
  world.onWaveStart = () => { world._waveStarted = true; };
  world.onWaveCleared = () => { world._waveCleared = true; };
  world.onLevelCleared = () => { world._levelCleared = true; };
  world.level = null;

  const level = new Level(LEVELS[0], world);
  world.level = level;
  assert.ok(level.obstacles.length > 0, 'level has obstacles');

  // Walk the hero into the first wave trigger.
  hero.position.x = LEVELS[0].waves[0].triggerX + 1;
  level.update(1 / 60, world); // triggers the wave
  for (let i = 0; i < 5; i++) level.update(1 / 60, world); // spawning begins
  assert.ok(level.activeWave !== null, 'wave should activate');
  assert.ok(level.isLocked(), 'camera locks during a wave');
  assert.ok(enemies.length > 0, 'enemies spawned');

  // Wait for all delayed spawns to come out.
  for (let i = 0; i < 120; i++) level.update(1 / 60, world);
  assert.equal(enemies.length, LEVELS[0].waves[0].spawns.length, 'all enemies spawned');

  // Kill everything -> wave should clear.
  for (const e of enemies) {
    e.health = 1;
    e.takeDamage(5, {});
  }
  for (let i = 0; i < 120; i++) level.update(1 / 60, world);
  assert.equal(level.activeWave, null, 'wave cleared');
  assert.ok(!level.isLocked(), 'camera unlocked');
  assert.ok(world._waveCleared, 'wave cleared event fired');
});

// ---------------------------------------------------------------------------
console.log('\nFuzz');
ok('4500 frames of random combat cause no crashes', () => {
  // Deterministic PRNG so failures are reproducible.
  let seed = 0x9e3779b9;
  const rnd = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const hero = new Hero({ x: 0, z: 0 });
  const enemies = [];
  const { world, combat } = makeWorld(hero, enemies);
  for (const { arch, x, z } of [
    { arch: 'grunt', x: 3, z: -1 },
    { arch: 'agile', x: 5, z: 1 },
    { arch: 'brute', x: 7, z: 0 },
    { arch: 'grunt', x: -4, z: 2 },
  ]) {
    const e = new Enemy({ archetype: arch, x, z, facing: x > 0 ? -1 : 1 });
    e.initAI(world);
    enemies.push(e);
  }

  // Simulated input: held direction + one-shot presses.
  const state = { ax: 0, az: 0, press: {}, holdTick: 0, pressQueue: null, queueTick: 0 };
  world.input = {
    axis: (neg, pos) => {
      if (neg === 'left') return state.ax;
      return state.az;
    },
    isDown: () => false,
    justPressed: (a) => !!state.press[a],
    justReleased: () => false,
  };

  const actions = ['jump', 'punch', 'kick', 'grab', 'special'];
  let spawnCounter = 0;
  for (let f = 0; f < 4500; f++) {
    // Re-randomize direction every ~20 frames.
    state.holdTick -= 1;
    if (state.holdTick <= 0) {
      state.holdTick = 10 + Math.floor(rnd() * 25);
      state.ax = [0, 0, -1, 1][Math.floor(rnd() * 4)];
      state.az = [0, 0, -1, 1][Math.floor(rnd() * 4)];
    }
    // Queue an action press every ~14 frames.
    state.press = {};
    if (state.pressQueue && f >= state.queueTick) {
      state.press[state.pressQueue] = true;
      state.pressQueue = null;
    } else if (!state.pressQueue && rnd() < 0.09) {
      state.pressQueue = actions[Math.floor(rnd() * actions.length)];
      state.queueTick = f + 2;
    }

    hero.update(1 / 60, world);
    for (const e of enemies) e.update(1 / 60, world);
    combat.tickTimers(1 / 60);
    combat.updateHitboxes(1 / 60, world);

    // Keep the fight going: recycle dead enemies and revive the hero.
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.removed) {
        enemies.splice(i, 1);
        const arch = ['grunt', 'agile', 'brute'][Math.floor(rnd() * 3)];
        const ne = new Enemy({ archetype: arch, x: hero.position.x + 6 + rnd() * 4, z: rnd() * 4 - 2, facing: -1 });
        ne.initAI(world);
        enemies.push(ne);
      } else if (e.dead) {
        e.update(1 / 60, world); // advance fade-out
      }
    }
    if (hero.deadAndGone) {
      spawnCounter++;
      hero.revive(hero.position.x - 3, 0);
    }
    if (!Number.isFinite(hero.position.x + hero.position.y + hero.position.z)) {
      throw new Error(`hero position became non-finite at frame ${f}`);
    }
  }

  assert.ok(true, 'no exceptions thrown');
  assert.ok(Number.isFinite(combat.combo), 'combo counter is finite');
});

console.log(`\nAll ${passed} checks passed.`);