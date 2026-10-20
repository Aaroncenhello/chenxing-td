
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
  el.textContent = `${Math.round(fpsN * 1000 / Math.max(1, now - fpsT))} 帧/秒（目标 ${Math.round(1000 / frameGap())}） · 平均 ${(fpsMs / fpsN).toFixed(1)}ms · 最差 ${fpsMax.toFixed(0)}ms\n画质 ${GFX.name}${gfxSel < 0 ? "（自动）" : ""} · 敌 ${S.enemies.length} · 特效 ${S.fx.length}`;
  fpsT = now; fpsN = 0; fpsMs = 0; fpsMax = 0;
}
// 一帧里哪怕出了错也要接着排下一帧，否则画面会整个停住（看上去就是黑屏 / 卡死）；错误只在控制台里报，前 3 次
let frameErrs = 0, frameErrRun = 0, lastFrameAt = performance.now(), loopId = 0;
function frame(now, id) {
  if (id != null && id !== loopId) return;   // 看门狗重开过循环，老的那条就不再排了
  lastFrameAt = performance.now();
  try { frameBody(now); frameErrRun = 0; } catch (e) {
    frameErrRun++; diagLog("出错", e && e.message || e); if (frameErrs++ < 3) setTimeout(() => { throw e; });
    showErrBanner("画面出错：" + (e && e.message || e));
    if (frameErrRun === 5) { try { reviveView(true); } catch (e2) { } }   // 连着出错 5 帧：丢掉所有缓存画布重来一遍
  }
  const me = loopId; requestAnimationFrame(t => frame(t, me));
}
// 出错时在屏幕左下角留一条小提示（点一下收起），方便截图反馈；平时不出现
let errBanner = null;
function showErrBanner(msg) {
  try {
    if (!errBanner) { errBanner = document.createElement("div"); errBanner.style.cssText = "position:fixed;left:6px;bottom:6px;z-index:99;max-width:70vw;padding:6px 8px;background:rgba(120,20,20,.92);color:#fff;font:11px/1.4 sans-serif;white-space:pre-wrap;word-break:break-all"; errBanner.addEventListener("click", () => { errBanner.hidden = true; }); document.body.appendChild(errBanner); }
    errBanner.hidden = false; errBanner.textContent = String(msg).slice(0, 160) + "（点一下收起）";
  } catch (e) { }
}
window.addEventListener("error", e => showErrBanner("出错：" + (e.message || "")));
window.addEventListener("unhandledrejection", e => showErrBanner("出错：" + ((e.reason && e.reason.message) || e.reason || "")));
// 看门狗：画面循环停了超过 2.5 秒（页面没在后台）就重新开一条，并重建所有缓存画布
setInterval(() => {
  if (document.hidden || performance.now() - lastFrameAt < 2500) return;
  diagLog("卡住", "画面循环停了 2.5 秒，重开"); loopId++; lastFrameAt = performance.now(); reviveView(true);
  const me = loopId; requestAnimationFrame(t => frame(t, me));
}, 1500);
// 帧率策略（发热/耗电的主旋钮）：逻辑本来就是固定 30Hz，画得比 30 帧快手机上基本看不出区别，却要多烧一倍的电。
// 战斗中：省电模式 30 帧，否则 60 帧封顶（120Hz 屏也只画 60）；战场被面板盖住或暂停时降到 8~15 帧
function frameGap() {
  if (!S || menuOpen || S.over || S.offer || S.shop || S.event) return 1000 / 8;   // （剧情对话要打字机效果，不降）
  if (S.paused) return 1000 / 15;
  return OPT.eco ? 1000 / 30 : 1000 / 60;
}
// 界面文字、血条、按钮状态不用每帧刷：每 100ms 一次足够（战场画面仍然每帧画）
let uiAt = 0;
function frameBody(now) {
  const gap = frameGap();
  if (now - last < gap - 3) return;
  const dt = Math.min(0.1, (now - last) / 1000); fpsTick(now, (now - last)); last = now;
  adaptGfx(dt, 1000 / gap);
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
  fitCheck(now); mapGuard(now); render(now);
  if (now - uiAt >= 100 || gap > 100) { uiAt = now; updateStats(); updateTeam(); updateCardbar(); updateSpells(); updateUlt(); updateInfo(); updateOffer(); updateShop(); updateEvent(); updateSynBar(); updateHud(); updatePInfo(); updateUnitCards(now); updateCrystalBars(); }
  updateTut(dt); updateDlg(dt); animRoster(now);
  if (!dlg) checkOver();
}

lpcLoad();
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
const reviveView = hard => {
  mapFor = -1;
  if (hard === true) { BIG.clear(); BIG_POOL.length = 0; SPR.clear(); if (typeof decalFor !== "undefined") decalFor = null; vigFor = null; }
  resizeSoon();
};
window.addEventListener("pageshow", () => reviveView());
document.addEventListener("visibilitychange", () => { diagLog("页面", document.hidden ? "切到后台" : "回到前台"); if (!document.hidden) reviveView(true); });
cv.addEventListener("contextlost", e => { diagLog("画布", "上下文丢失"); e.preventDefault(); });
cv.addEventListener("contextrestored", () => { diagLog("画布", "上下文恢复"); reviveView(true); });
document.addEventListener("visibilitychange", () => { if (document.hidden && S && !S.over && !S.paused && !menuOpen && !dlg && (S.wave > 0 || S.kills > 0)) togglePause(); });
requestAnimationFrame(t => frame(t, loopId));
</script>
