
// ================= 主循环、开机、测试接口 =================
// ---------- 主循环 ----------
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (S.slowCd > 0) S.slowCd -= dt;
  let k = 1; if (S.slowmo > 0) { S.slowmo -= dt; k = 0.3; }
  if (S.hitStop > 0) { S.hitStop -= dt; k = 0; }   // 顿帧：精英/首领被打死的一瞬间画面停住
  if (!menuOpen && !dlg && !S.paused && !S.over && !S.offer && !S.shop && !S.event) {
    acc += dt * S.speed * k;
    let n = 0;
    while (acc >= TICK && n < 16) { step(TICK); acc -= TICK; n++; }
  }
  if (!S.offer && !S.shop && !S.cine && !S.event && S.pending > 0 && !S.over && !dlg && !menuOpen) { const mr = S.forceRare || 0; S.forceRare = 0; openOffer(mr, true); }
  handleEvents();
  render(now); updateStats(); updateTeam(); updateCardbar(); updateSpells(); updateUlt(); updateInfo(); updateOffer(); updateShop(); updateEvent(); updateSynBar(); updateHud(); updatePInfo(); updateTut(dt); updateDlg(dt); animRoster(now);
  if (!dlg) checkOver();
  requestAnimationFrame(frame);
}

applyGfx(loadSave().gfx);
newRun(0, { perks: loadSave().perks, charLv: charLevels(), charTal: loadSave().tal, hero: loadSave().hero, charOpen: openChars().map(u => u.id) });
buildSpells();
resize();
window.addEventListener("resize", resize);
showLevels();
window.__td = {
  get S() { return S; }, step, settle: settleRun, newRun: (i, o) => startRun(i, o || {}), beginStage, castUlt, castSpell, useSkill, pickCard, openOffer, randomCards, cardInfo,
  UNITS, STAGES, CARDS, awardExp, levelOf, buyShop, closeShop, rerollOffer, SYNERGY, VIGIL, EVENTS, takeEvent, openEvent,
  FORMS, AFFIX, cycleForm, setSlot, clearSlot, arrange, formOf, callWaveEarly, toggleAutoWave, cardPool,
};
requestAnimationFrame(frame);
</script>
