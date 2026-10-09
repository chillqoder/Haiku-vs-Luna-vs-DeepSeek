export function updateEnemyAI(enemy, dt, hero) {
  if (enemy.dead) {
    enemy.updateAnimation(dt, 0);
    return null;
  }
  if (enemy.grabbed) return null;
  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
  enemy.blockTimer = Math.max(0, enemy.blockTimer - dt);
  if (enemy.stun > 0) {
    enemy.stun = Math.max(0, enemy.stun - dt);
    enemy.group.position.x += enemy.knockVelocityX * dt;
    enemy.group.position.z += enemy.knockVelocityZ * dt;
    enemy.knockVelocityX *= Math.exp(-5 * dt);
    enemy.knockVelocityZ *= Math.exp(-5 * dt);
    if (enemy.stun === 0 && enemy.health > 0) enemy.motion = 'idle';
    enemy.group.position.z = Math.max(-3.4, Math.min(3.4, enemy.group.position.z));
    enemy.updateAnimation(dt, 0);
    return null;
  }

  const dx = hero.group.position.x - enemy.group.position.x;
  const dz = hero.group.position.z - enemy.group.position.z;
  const absX = Math.abs(dx);
  const absZ = Math.abs(dz);
  enemy.setFacing(dx);
  let speed = 0;
  let attackEvent = null;

  if (enemy.attackTimer > 0) {
    enemy.attackTimer -= dt;
    enemy.motion = enemy.attackTimer > 0.18 ? 'block' : 'punch';
    if (enemy.attackTimer <= 0 && !enemy.didAttack) {
      enemy.didAttack = true;
      attackEvent = {
        damage: enemy.damage,
        range: enemy.type === 'boss' ? 1.65 : enemy.type === 'brute' ? 1.45 : 1.15,
        depth: 1.05,
        knockback: Math.sign(dx || 1) * (enemy.type === 'boss' ? 5.3 : 3.6),
        laneKnock: Math.sign(dz || 1) * 1.7,
      };
    }
    if (enemy.attackTimer <= -0.17) { enemy.attackTimer = 0; enemy.didAttack = false; }
  } else if (absX < (enemy.type === 'boss' ? 5.5 : 4.3) && absZ < 2.6 && enemy.attackCooldown <= 0 && absX < (enemy.type === 'boss' ? 2.05 : 1.55) && absZ < 1.05) {
    enemy.attackTimer = 0.47;
    enemy.attackCooldown = enemy.cooldownForType();
    enemy.didAttack = false;
    enemy.motion = 'block';
  } else {
    const wantsBlock = enemy.type !== 'agile' && enemy.type !== 'boss' && absX < 2.7 && absZ < 1 && hero.actionTimer > 0 && enemy.random > 0.78;
    const wantsDodge = enemy.type === 'agile' && absX < 2.4 && absZ < 0.85 && hero.actionTimer > 0 && enemy.random > 0.35;
    if (wantsBlock && enemy.blockTimer <= 0) {
      enemy.blockTimer = 0.62;
      enemy.motion = 'block';
    } else if (wantsDodge) {
      enemy.group.position.z += Math.sign(dz || 1) * 2.1 * dt;
      enemy.motion = 'walk';
      speed = 1.5;
    } else {
      const laneFactor = absZ > 0.43 ? 1 : 0;
      const stepX = absX > (enemy.type === 'boss' ? 1.48 : 1.05) ? Math.sign(dx) : 0;
      const stepZ = laneFactor ? Math.sign(dz) : 0;
      enemy.group.position.x += stepX * enemy.speed * dt;
      enemy.group.position.z += stepZ * enemy.speed * 0.68 * dt;
      enemy.motion = stepX || stepZ ? 'walk' : 'idle';
      speed = (stepX || stepZ) ? enemy.speed : 0;
    }
  }
  enemy.group.position.z = Math.max(-3.4, Math.min(3.4, enemy.group.position.z));
  enemy.updateAnimation(dt, speed);
  return attackEvent;
}
