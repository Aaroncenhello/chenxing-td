
// ================= 主循环、开机、测试接口 =================
// ---------- 主循环 ----------
let last = performance.now(), acc = 0;
// 帧率显示（菜单里「显示帧率」）：每半秒刷新一次，方便真机反馈卡顿
let fpsN = 0, fpsT = 0, fpsMs = 0, fpsMax = 0;
function fpsTick(now, ms) {
  const el = $("fps"); if (!el) return;
  if (!OPT.fps) { if (!el.hidden) el.hidden = true; return; }
  el.hidden = false; fpsN++; fpsMs += ms; fpsMax = Math.max(fpsMax, ms);
  if (now - fpsT < 500) return;
  el.textContent = `${Math.round(fpsN * 1000 / Math.max(1, now - fpsT))} FPS · 平均 ${(fpsMs / fpsN).toFixed(1)}ms · 最差 ${fpsMax.toFixed(0)}ms\n画质 ${GFX.name}${gfxSel < 0 ? "（自动）" : ""} · 敌 ${S.enemies.length} · 特效 ${S.fx.length}`;
  fpsT = now; fpsN = 0; fpsMs = 0; fpsMax = 0;
}
// 一帧里哪怕出了错也要接着排下一帧，否则画面会整个停住（看上去就是黑屏 / 卡死）；错误只在控制台里报，前 3 次
let frameErrs = 0;
function frame(now) {
  try { frameBody(now); } catch (e) { if (frameErrs++ < 3) setTimeout(() => { throw e; }); }
  requestAnimationFrame(frame);
}
function frameBody(now) {
  if (OPT.eco && now - last < 30) return;   // 省电：最多 30 帧
  const dt = Math.min(0.1, (now - last) / 1000); fpsTick(now, (now - last)); last = now;
  adaptGfx(dt);
  if (S.slowCd > 0) S.slowCd -= dt;
  let k = 1; if (S.slowmo > 0) { S.slowmo -= dt; k = 0.3; }
  if (S.hitStopCd > 0) S.hitStopCd -= dt;
  if (S.hitStop > 0) { S.hitStop -= dt; k = 0; }   // 顿帧：精英/首领被打死的一瞬间画面停住
  if (!menuOpen && !dlg && !S.paused && !S.over && !S.offer && !S.shop && !S.event) {
    acc += dt * S.speed * k;
    let n = 0;
    while (acc >= TICK && n < 16) { step(TICK); acc -= TICK; n++; }
  }
  if (!S.offer && !S.shop && !S.cine && !S.event && S.pending > 0 && !S.over && !dlg && !menuOpen) { const mr = S.forceRare || 0; S.forceRare = 0; openOffer(mr, true); }
  handleEvents();
  fitCheck(now); mapGuard(now); render(now); updateStats(); updateTeam(); updateCardbar(); updateSpells(); updateUlt(); updateInfo(); updateOffer(); updateShop(); updateEvent(); updateSynBar(); updateHud(); updatePInfo(); updateUnitCards(now); updateCrystalBars(); updateTut(dt); updateDlg(dt); animRoster(now);
  if (!dlg) checkOver();
}

applyGfx(loadSave().gfx);
newRun(0, { perks: loadSave().perks, charLv: charLevels(), charTal: loadSave().tal, hero: loadSave().hero, charOpen: openChars().map(u => u.id) });
applySpell2(OPT.sp2);
buildSpells();
resize();
window.addEventListener("resize", resizeSoon);
showLevels();
showNews();
window.__td = {
  get S() { return S; }, step, settle: settleRun, newRun: (i, o) => startRun(i, o || {}), beginStage, castUlt, castSpell, useSkill, pickCard, openOffer, randomCards, cardInfo,
  UNITS, STAGES, CARDS, awardExp, levelOf, buyShop, closeShop, rerollOffer, SYNERGY, VIGIL, EVENTS, takeEvent, openEvent,
  setFocus, FORMS, AFFIX, cycleForm, setSlot, clearSlot, arrange, formOf, callWaveEarly, toggleAutoWave, cardPool,
};
// 切到别的标签页或后台时自动暂停，回来不会被偷袭
// 从后台回来：离屏画布可能被系统清空，重画底图再重排一次
const reviveView = () => { mapFor = -1; resizeSoon(); };
window.addEventListener("pageshow", reviveView);
document.addEventListener("visibilitychange", () => { if (!document.hidden) reviveView(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && S && !S.over && !S.paused && !menuOpen && !dlg && (S.wave > 0 || S.kills > 0)) togglePause(); });
requestAnimationFrame(frame);
</script>
