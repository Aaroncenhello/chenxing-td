
// ================= 每一步（固定 30 次/秒） =================
function moveToward(e, tx, ty, dt) {
  const spd = eSpeed(e);
  let dx = tx - e.x + (e.px || 0), dy = ty - e.y + (e.py || 0);
  const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
  const ox0 = e.x, oy0 = e.y;
  let nx = e.x + dx * spd * dt, ny = e.y + dy * spd * dt;
  if (!e.d.flying && (e.stuckT || 0) < 3) {
    if (solid(nx, ny)) {
      if (!solid(nx, e.y)) ny = e.y;
      else if (!solid(e.x, ny)) nx = e.x;
      else {
        const a = Math.atan2(dy, dx) + (e.id % 2 ? 1 : -1);
        nx = e.x + Math.cos(a) * spd * dt; ny = e.y + Math.sin(a) * spd * dt;
        if (solid(nx, ny)) { nx = e.x; ny = e.y; }
      }
    }
  }
  e.x = Math.max(0.3, Math.min(COLS - 1.3, nx)); e.y = Math.max(0.3, Math.min(ROWS - 1.3, ny));
  // 卡住超过 3 秒就允许穿过障碍，避免有敌人永远到不了晨星碑
  e.stuckT = Math.hypot(e.x - ox0, e.y - oy0) < spd * dt * 0.35 ? (e.stuckT || 0) + dt : 0;
  e.walk += dt * spd; faceTo(e, tx);
}
// 敌人之间稍微挤开一点，避免完全重叠
function separate() {
  const list = S.enemies;
  for (const e of list) { e.px = 0; e.py = 0; }
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 > 0.18 || d2 < 1e-6) continue;
      const d = Math.sqrt(d2), k = (0.42 - d) * 0.5;
      a.px -= dx / d * k; a.py -= dy / d * k; b.px += dx / d * k; b.py += dy / d * k;
    }
  }
}
function step(dt) {
  if (S.cine) { cineStep(dt); return; }
  if (S.over || S.offer || S.shop || S.event) return;
  S.t += dt;
  S.synT = (S.synT || 0) - dt;
  if (S.synT <= 0) { S.synT = 0.5; updateSyn(); }
  for (const k in S.spells) S.spells[k] = Math.max(0, S.spells[k] - dt);
  S.hitFlash = Math.max(0, S.hitFlash - dt);
  S.crystal.hitT = Math.max(0, S.crystal.hitT - dt);
  if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
  if (S.ultPending > 0) { S.ultPending -= dt; if (S.ultPending <= 0) ultHit(); }

  // 波次
  if (S.spawnQueue.length) {
    S.waveClock += dt;
    while (S.spawnQueue.length && S.spawnQueue[0].at <= S.waveClock) { const q = S.spawnQueue.shift(); spawnPortal(q.type, q.portal, q.elite); }
    if (!S.spawnQueue.length) S.nextWaveIn = RULES.waveGap;
  } else if (S.wave < totalWaves()) {
    // 商店"欠着"也要补开：叠波跳过了第 4 波，清场后照样开
    const shopAt = Math.floor(S.wave / SHOP.everyWaves) * SHOP.everyWaves;
    if (shopAt > 0 && S.shopWave < shopAt && !S.enemies.length) { S.shopWave = shopAt; if (wk("noshop")) { S.pending++; addFx({ kind: "banner", text: "荒野 · 没有商店，白送一次翻牌", life: 1.8 }); } else { openShop(); return; } }
    if (S.autoWave !== false || S.nextWaveIn <= 0) S.nextWaveIn -= dt;
    // 大波预警：潮汐 / 首领 / 精英波到来前 3 秒弹一次全屏横幅（画面上的红边和传送门脉动在 drawWavePreview 里）
    if (S.nextWaveIn <= 3 && S.warnWave !== S.wave) {
      S.warnWave = S.wave;
      const info = nextWaveInfo(), txt = info && { boss: "首领将至！", tide: "潮汐来袭 · 敌人数量大增", elite: "精英来袭！" }[info.kind];
      if (txt) addFx({ kind: "banner", text: txt, life: 2.2, danger: true });
    }
    if (S.nextWaveIn <= 0) {
      // 事件在两波之间弹出，不要求场上清空
      if (eventDue(S.wave)) { openEvent(); if (S.event) return; }
      startWave();
      if (!S.spawnQueue.length) S.nextWaveIn = RULES.waveGap;   // 保险：空波不连跳
    }
  }

  autoSkills(dt);
  hazStep(dt);
  relicStep(dt);

  // 陨星
  for (const m of S.meteors) {
    m.t -= dt;
    if (m.t <= 0) {
      m.done = true;
      const sp = SPELLS[0], r = m.r || sp.radius, dmg = (m.dmg || sp.dmg * powerK()) * (rl("rl_lodestone") ? 1.5 : 1);
      const src = m.src || { key: m.dmg ? "sk_meteor" : "meteor" }, col = m.color || "#ff8a3a";
      for (const e of S.enemies) if (hittable(e) && distTo(e, m.x, m.y) <= r) {
        hurt(e, calc(dmg, "magic", eDef(e), eRes(e)), "magic", true, src);
        if (m.burn && !e.dead) burnEnemy(e, m.burn, 3, src);
        if (m.src && m.src.def && br(m.src, "star", "B")) markEnemy(e, 5);
      }
      addFx({ kind: "boom", x: m.x, y: m.y, r, color: col, life: 0.6 });
      burst(m.x, m.y, col, 30, 3.5, 0.8, 0.09); S.shake = 0.45;
    }
  }
  S.meteors = S.meteors.filter(m => !m.done);

  // 酸池
  for (const p of S.pools) {
    p.t -= dt; p.acc += dt;
    if (p.acc < 0.5) continue;
    p.acc -= 0.5;
    const dmg = uAtk(p.src) * 0.6 * 0.5;
    for (const e of S.enemies) if (hittable(e) && !e.d.flying && distTo(e, p.x, p.y) <= p.r) {
      applyCorrode(e, p.k, 0.8, p.src);
      hurt(e, calc(dmg, "magic", eDef(e), eRes(e)), "poison", false, p.src);
    }
  }
  S.pools = S.pools.filter(p => p.t > 0);

  // 冰霜巨魔/寒冰妖灵的寒气
  for (const u of S.units) u.chill = 0;
  for (const e of S.enemies) if (e.d.chill && !e.dead) for (const u of S.units) if (alive(u) && dist(u, e) <= 2.6) u.chill = Math.max(u.chill, e.d.chill);
  // 角色
  for (const u of [...S.units]) {
    if (u.dead) continue;
    if (u.down > 0) { u.down -= dt; if (u.down <= 0) reviveUnit(u); continue; }
    u.age += dt; u.hitT = Math.max(0, u.hitT - dt); u.kb = Math.max(0, u.kb - dt * 8);
    if (u.frozenT > 0) u.frozenT -= dt;
    if (u.summon) { u.life -= dt; if (u.life <= 0) { knockOut(u); continue; } }
    if (u.poison && u.poison.t > 0) {
      u.poison.t -= dt; u.poison.acc += dt;
      if (u.poison.acc >= 0.5) { u.poison.acc -= 0.5; hurtUnit(u, u.poison.dps * 0.5, "poison"); if (u.down > 0) continue; }
    }
    // 站位 / 迎击：前排会离开站位一小段去拦最近的敌人
    let gx = u.tx, gy = u.ty;
    if (u.def.place === "ground" && u.def.dmg !== "heal") {
      const R = uRange(u);
      let best = null, bd = 99;
      for (const e of S.enemies) {
        if (!hittable(e) || !canMelee(e) || !e.revealed) continue;
        const d0 = Math.hypot(e.x - u.tx, e.y - u.ty), near = toCrystal(e);
        if (d0 > RULES.leash && near > CRYSTAL.r + 1.4) continue;   // 太远就不追，但贴着碑的一定回防
        const pri = Math.min(near, d0);
        if (pri < bd) { bd = pri; best = e; }
      }
      if (best) {
        if (dist(u, best) > R * 0.72) { gx = best.x; gy = best.y; } else { gx = u.x; gy = u.y; }
      }
    }
    const dx = gx - u.x, dy = gy - u.y, d = Math.hypot(dx, dy);
    if (d > 0.03) {
      const mv = Math.min(d, dt * 3.4), nx = u.x + dx / d * mv, ny = u.y + dy / d * mv;
      if (!solid(nx, ny)) { u.x = nx; u.y = ny; }
      else if (!solid(nx, u.y)) u.x = nx;
      else if (!solid(u.x, ny)) u.y = ny;
    }
    if (u.blessT > 0) u.blessT -= dt;
    if (cl("regen") && !cu("cu_blood")) heal(u, u.maxHp * 0.012 * cl("regen") * dt, true, null);
    if (u.hero && sg("sg_kn2")) {
      u.shieldCd = (u.shieldCd || 0) - dt;
      if (u.hp < u.maxHp * 0.5 && u.shieldCd <= 0) {
        u.shieldCd = 15; heal(u, u.maxHp * 0.3, false, u);
        addFx({ kind: "ring", x: u.x, y: u.y, color: "#8fb3e0", life: 0.8, r0: 0.3, r1: 2 });
        addFx({ kind: "text", x: u.x, y: u.y - 0.8, text: "誓约之光", color: "#8fb3e0", life: 1.2, big: true });
      }
    }
    if (br(u, "knight", "A") && !cu("cu_blood")) heal(u, u.maxHp * 0.02 * dt, true, u);
    if (u.def.id === "bard" && u.skillT > 0) for (const a of S.units) if (a !== u && alive(a) && dist(u, a) <= uRange(u)) heal(a, a.maxHp * 0.02 * dt, true, u);
    if (u.stop > 0) { u.stop -= dt; continue; }
    u.atkT += dt;
    if (!u.summon) {
      if (u.skillT > 0) {
        u.skillT = Math.max(0, u.skillT - dt);
        if (u.skillT === 0 && hasTal(u, "bard")) for (const a of S.units) if (a !== u && !a.summon && alive(a) && dist(u, a) <= uRange(u) && a.skillT <= 0) { a.sp = Math.min(a.def.sp, a.sp + 8); addFx({ kind: "text", x: a.x, y: a.y - 0.5, text: "技力 +8", color: "#f07aa8", life: 0.9 }); }
      } else u.sp = Math.min(u.def.sp, u.sp + dt * (rl("rl_hourglass") ? 1.3 : 1) * (bardSp(u) ? 1.3 : 1) * (1 + 0.3 * cl("sp")) * (tal(u, "t_sp") ? 1.3 : 1) * (S.buff.sp || 1) * (S.resoT > 0 ? 2 : 1) * (1 + awkSp(u)));
      if (u.auto && u.skillT <= 0 && u.sp >= u.def.sp && autoWant(u)) useSkill(u);
    }
    u.atkCd -= dt;
    if (u.pend) {
      u.pend.t -= dt;
      if (u.pend.t <= 0) { const p = u.pend; u.pend = null; strike(u, p.targets); }
      continue;
    }
    if (u.atkCd > 0) continue;
    const targets = pickTargets(u);
    if (!targets.length) continue;
    faceTo(u, targets[0].x);
    u.pend = { t: u.def.place === "ground" ? WINDUP.melee : WINDUP.ranged, targets };
    u.atkCd = uInterval(u); u.atkT = 0;
  }

  // 敌人
  separate();
  afxAuras();
  for (const e of S.enemies) {
    if (e.dead) continue;
    if (e.d.unstoppable) { e.freezeT = 0; e.stunT = 0; e.slowT = 0; }
    if (e.d.stealth) e.revealed = !!e.target || S.units.some(u => alive(u) && dist(u, e) <= e.d.stealth);
    if (e.corrode && e.corrode.t > 0) e.corrode.t -= dt;
    e.hitT = Math.max(0, e.hitT - dt); e.kb = Math.max(0, e.kb - dt * 8); e.hitCd = Math.max(0, e.hitCd - dt);
    if (e.poison && e.poison.t > 0) {
      e.poison.t -= dt; e.poison.acc += dt;
      if (e.poison.acc >= 0.5) { e.poison.acc -= 0.5; if (!e.under) hurt(e, e.poison.dps * 0.5, "poison", false, e.poison.src); if (e.dead) continue; }
    }
    if (e.burn > 0) {
      e.burn -= dt; e.burnAcc = (e.burnAcc || 0) + dt;
      if (e.burnAcc >= 0.5) { e.burnAcc -= 0.5; if (!e.under) hurt(e, e.burnDps * 0.5, "poison", false, e.burnSrc || { key: "burn" }); if (e.dead) continue; }
    }
    if (e.mark > 0) e.mark -= dt;
    afxStep(e, dt);
    // 首领大招：读条 / 破防僵直
    if (isBoss(e) || e.lead || e.brokenT > 0) { if (ultStep(e, dt)) continue; }
    // 宝箱怪：只会往最近的传送门逃
    if (e.d.flee) {
      const p = PORTALS.length ? PORTALS.reduce((b, q) => (distTo(e, q.x, q.y) < distTo(e, b.x, b.y) ? q : b), PORTALS[0]) : null;
      if (p) {
        moveToward(e, p.x, p.y, dt);
        if (distTo(e, p.x, p.y) < 0.6) { e.dead = true; addFx({ kind: "text", x: e.x, y: e.y - 0.5, text: "宝箱跑掉了", color: "#e2645a", life: 1.2, big: true }); }
      }
      continue;
    }
    if (e.stop > 0) { e.stop -= dt; continue; }
    e.atkT += dt;
    if (e.d.aoe) {
      e.aoeCd -= dt;
      if (e.aoeCd <= 0 && e.freezeT <= 0 && e.stunT <= 0) {
        e.aoeCd = e.d.aoe.every * (e.enraged ? 0.7 : 1);
        for (const u of [...S.units]) if (alive(u) && dist(u, e) <= e.d.aoe.radius) hurtUnit(u, calc(eAtk(e) * e.d.aoe.mult, "phys", uDef(u), uRes(u)), "phys", e);
        const col = e.type === "sovereign" ? "#b070ff" : "#ff5a3a";
        addFx({ kind: "boom", x: e.x, y: e.y, r: e.d.aoe.radius, color: col, life: 0.6 });
        burst(e.x, e.y, e.type === "sovereign" ? "#c890ff" : "#ff7a4f", 24, 3.2, 0.7, 0.08); S.shake = 0.35; e.atkT = 0;
      }
    }
    if (e.d.heal) {
      e.healCd -= dt;
      if (e.healCd <= 0) {
        e.healCd = e.d.heal.every; e.atkT = 0;
        for (const o of S.enemies) if (!o.dead && dist(o, e) <= e.d.heal.radius && o.hp < o.maxHp) {
          const got = Math.min(e.d.heal.amount * stageHp() * e.hpK * S.diffK.hp, o.maxHp - o.hp); o.hp += got; addNum(o.x, o.y, got, "#7ee89c");
        }
        addFx({ kind: "ring", x: e.x, y: e.y, color: "#7ee89c", life: 0.5, r0: 0.2, r1: e.d.heal.radius });
      }
    }
    if (e.d.summon && e.freezeT <= 0 && e.stunT <= 0) {
      e.summonCd -= dt;
      if (e.summonCd <= 0) {
        e.summonCd = e.d.summon.every; e.atkT = 0;
        for (let i = 0; i < e.d.summon.n; i++) spawnNear("skeleton", e, false, true).hitT = 0.2;
        addFx({ kind: "ring", x: e.x, y: e.y, color: "#b070ff", life: 0.6, r0: 0.1, r1: 1 });
        burst(e.x, e.y, "#b070ff", 14, 2, 0.6, 0.06);
      }
    }
    if (e.freezeT > 0) { e.freezeT -= dt; continue; }
    if (e.stunT > 0) { e.stunT -= dt; continue; }
    if (e.slowT > 0) e.slowT -= dt;
    if (e.d.burrow) {
      e.bT -= dt;
      if (e.bT <= 0) {
        e.under = !e.under; e.bT = e.under ? e.d.burrow.down : e.d.burrow.up;
        if (e.under) { e.target = null; e.pend = 0; }
        burst(e.x, e.y + 0.1, "#d8b878", 12, 1.8, 0.5, 0.06);
      }
    }
    // 选目标：拦截半径内的角色
    if (e.target && (e.target.dead || e.target.down > 0 || dist(e, e.target) > uTaunt(e.target) + 0.9)) e.target = null;
    if (!e.target && !e.d.flying && !e.under) {
      let best = null, bd = 99;
      for (const u of S.units) {
        if (!alive(u) || !uTaunt(u)) continue;
        const d = dist(e, u);
        if (d > uTaunt(u) + 0.15 || d >= bd) continue;
        let load = 0;
        for (const o of S.enemies) if (o.target === u && !o.dead) load += o.d.weight || 1;
        if (load + (e.d.weight || 1) > uBlock(u)) continue;
        best = u; bd = d;
      }
      if (best) e.target = best;
    }
    const atCrystal = !e.under && toCrystal(e) <= CRYSTAL.r + 0.5;
    // 炸弹鬼
    const nearUnit = e.d.bomb ? S.units.some(u => alive(u) && dist(u, e) <= 0.9) : false;
    if (e.d.bomb && (e.target || atCrystal || nearUnit)) {
      if (e.fuse < 0) e.fuse = e.d.bomb.fuse;
      e.fuse -= dt;
      if (e.fuse <= 0) {
        const dmg = e.d.bomb.dmg * stageHp() * Math.sqrt(e.hpK) * S.diffK.atk;
        for (const u of [...S.units]) if (alive(u) && dist(u, e) <= e.d.bomb.radius) hurtUnit(u, calc(dmg, "phys", uDef(u), uRes(u)), "phys", e);
        if (toCrystal(e) <= e.d.bomb.radius + CRYSTAL.r) hurtCrystal(Math.round(S.crystal.maxHp * 0.05), e);
        addFx({ kind: "boom", x: e.x, y: e.y, r: e.d.bomb.radius, color: "#ff7040", life: 0.5 });
        burst(e.x, e.y, "#ffb040", 26, 3.4, 0.7, 0.09); S.shake = 0.3;
        e.dead = true; S.kills++; S.foeKill[e.type] = (S.foeKill[e.type] || 0) + 1;
      }
      continue;
    }
    if (e.target) {
      if (e.pend > 0) {
        e.pend -= dt;
        const u = e.target;
        if (e.pend <= 0 && u && alive(u)) {
          hurtUnit(u, calc(eAtk(e), e.d.ranged ? "magic" : "phys", uDef(u), uRes(u)), e.d.ranged ? "magic" : "phys", e);
          if (e.d.venom && alive(u)) u.poison = { dps: eAtk(e) * e.d.venom.k, t: e.d.venom.t, acc: 0 };
          u.stop = 0.06; e.stop = 0.06;
        }
        continue;
      }
      // 走到能打到的距离再动手（近战要贴身，远程够得着就停）
      // 远程敌人 8 秒没挨打（比如全队都是近战、够不着它）就贴上来，免得僵住打不完
      const reach = e.d.ranged && S.t - (e.hurtAt || 0) < 8 ? Math.max(0.7, e.d.ranged * 0.8) : 0.62;
      if (dist(e, e.target) > reach) { moveToward(e, e.target.x, e.target.y, dt); continue; }
      e.atkCd -= dt;
      if (e.atkCd <= 0 && eAtk(e) > 0) { e.atkCd = eInt(e); e.atkT = 0; e.pend = WINDUP.enemy; faceTo(e, e.target.x); }
      else faceTo(e, e.target.x);
      continue;
    }
    // 远程敌人：够得着角色就停下来打
    if (e.d.ranged && !e.under) {
      const near = S.units.filter(u => alive(u) && dist(u, e) <= e.d.ranged).sort((a, b) => dist(a, e) - dist(b, e))[0];
      if (near && S.t - (e.hurtAt || 0) < 8) {   // 8 秒没挨打就不再站着放风筝，继续往晨星碑走
        e.atkCd -= dt;
        if (e.atkCd <= 0) { shoot(e, near, e.type === "wyvern" ? "fire" : e.type === "sovereign" ? "dark" : "enemy", eAtk(e)); e.atkCd = eInt(e); e.atkT = 0; faceTo(e, near.x); }
        continue;
      }
    }
    // 打晨星碑
    if (atCrystal) {
      e.atkCd -= dt;
      if (e.atkCd <= 0) {
        e.atkCd = eInt(e); e.atkT = 0;
        const dmg = Math.round(S.crystal.maxHp * 0.012 * (e.d.crystal || e.d.weight || 1) * (e.elite ? 1.5 : 1) * (S.vigil || S.endless ? 1 + S.wave * 0.05 : 1));
        hurtCrystal(dmg, e);
        addFx({ kind: "slash", x: CRYSTAL.x, y: CRYSTAL.y - 0.1, color: "#ff6a5a", face: e.x < CRYSTAL.x ? 1 : -1, life: 0.22, big: true });
      }
      faceTo(e, CRYSTAL.x);
      continue;
    }
    moveToward(e, CRYSTAL.x, CRYSTAL.y, dt);
  }

  // 飞行物
  for (const s of S.shots) {
    const t = s.target;
    if (t.dead || t.under || (t.down != null && t.down > 0)) { s.done = true; continue; }
    s.trail.push([s.x, s.y]); if (s.trail.length > 7) s.trail.shift();
    const dx = t.x - s.x, dy = t.y - 0.1 - s.y, d = Math.hypot(dx, dy), mv = s.speed * dt;
    if (d <= mv) { s.done = true; landShot(s); } else { s.x += dx / d * mv; s.y += dy / d * mv; }
  }
  S.shots = S.shots.filter(s => !s.done);
  S.enemies = S.enemies.filter(e => !e.dead);
  if (S.boss && S.boss.dead) S.boss = null;
  fxQueueStep(dt);
  for (const f of S.fx) f.t += dt;
  S.fx = S.fx.filter(f => f.t < f.life);
  S.shake = Math.max(0, S.shake - dt);

  if (S.crystal.hp <= 0) S.over = "lose";
  else if (!S.endless && S.wave >= ST.waves && !S.spawnQueue.length && !S.enemies.length) {
    const f = S.crystal.hp / S.crystal.maxHp;
    S.over = "win"; S.stars = f >= 0.8 ? 3 : f >= 0.4 ? 2 : 1;
  }
}
