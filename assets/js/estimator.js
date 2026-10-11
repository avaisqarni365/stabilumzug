/* Stabil Umzug estimator. Pure function, no DOM: the same file runs in the browser
   and (Phase 1) in Google Apps Script, so family and office always see the same numbers.
   Rules from the design handoff:
   volume = (1 + buffer) x sum(n * v); range +-8 % (high) / +-18 % (medium) / +-35 % (low)
   confidence = sum(n * w) / sum(n); w: catalogue/custom 1, list/photo 0.6, preset/guess 0.2
   vehicle = smallest of 20 / 38 / 50 m3 covering the volume, else trips with the 7.5 t truck
   crew = max carry crew (min 2), +1 above 30 m3, +1 above 45 m3
   hours = 0.25 vol (load) + 0.22 vol (unload) + trips * (km / 45) * 2 + assembly / 60 / (crew - 1) + access */
(function (root) {
  function byId(data) {
    var m = {};
    data.items.forEach(function (it) { m[it.id] = it; });
    return m;
  }
  function itemVol(it, vi) { return it.vars ? it.vars[vi || 0].v : it.v; }
  function itemKg(it, vi) { return it.vars ? it.vars[vi || 0].kg : it.kg; }

  /* Access factor per building. floor 0 ground, 1 = 1-2, 2 = 3-4, 3 = 5+;
     lift 0 none, 1 small, 2 large, 3 unknown; park 0 door, 1 <= 30 m, 2 > 30 m, 3 unknown. */
  function accessFactor(b) {
    var lift = (b.lift === 0 || b.lift === 3) ? 1 : b.lift === 1 ? 0.5 : 0.25;
    return b.floor * lift + (b.park === 2 ? 0.6 : b.park === 3 ? 0.3 : 0);
  }

  function estimate(s, data) {
    var R = data.rules, CAT = byId(data);
    var raw = 0, kgMin = 0, kgMax = 0, crew = 2, asm = 0, wsum = 0, n = 0, srcN = {};
    Object.keys(s.inv || {}).forEach(function (id) {
      var e = s.inv[id], it = CAT[id];
      if (!it) return;
      var v = itemVol(it, e.vi), kg = itemKg(it, e.vi), cnt = 0;
      Object.keys(e.by || {}).forEach(function (src) {
        var c = e.by[src] || 0;
        if (c <= 0) return;
        cnt += c;
        wsum += c * (R.weight[src] == null ? 0.2 : R.weight[src]);
        srcN[src] = (srcN[src] || 0) + c;
      });
      if (!cnt) return;
      raw += cnt * v; kgMin += cnt * kg[0]; kgMax += cnt * kg[1];
      crew = Math.max(crew, it.crew || 1);
      asm += cnt * ((it.dis || 0) + (it.asm || 0));
      n += cnt;
    });
    (s.customs || []).forEach(function (c) {
      var kg = c.v * R.customDensity;
      raw += c.n * c.v; kgMin += c.n * kg * 0.8; kgMax += c.n * kg * 1.2;
      wsum += c.n * R.weight.custom; n += c.n;
      srcN.custom = (srcN.custom || 0) + c.n;
    });

    var vol = raw * (1 + R.buffer);
    var score = n ? wsum / n : 0;
    var conf = n === 0 ? 'low' : score >= 0.8 ? 'high' : score >= 0.5 ? 'medium' : 'low';
    var w = R.range[conf];

    var V = R.vehicles, veh = null, trips = 1;
    for (var i = 0; i < V.length; i++) { if (V[i].cap >= vol) { veh = V[i]; break; } }
    if (!veh) { veh = V[1]; trips = Math.ceil(vol / veh.cap); }
    if (vol > 30) crew += 1;
    if (vol > 45) crew += 1;

    var kmIn = parseFloat(String((s.f1 && s.f1.km) || '').replace(',', '.'));
    var kmGuess = !(kmIn > 0);
    var km = kmGuess ? R.defaultKm : kmIn;
    var acc = accessFactor(s.acc.old) + accessFactor(s.acc['new']);
    var hours = vol * 0.25 + vol * 0.22 + trips * (km / 45) * 2 + asm / 60 / Math.max(1, crew - 1) + acc * vol * 0.02;

    return {
      raw: raw, vol: vol, volLow: vol * (1 - w), volHigh: vol * (1 + w),
      kgMin: kgMin, kgMax: kgMax, n: n, srcN: srcN, score: score, conf: conf,
      vehicle: veh.id, trips: trips, crew: crew, hours: hours, asmMin: asm,
      km: km, kmGuess: kmGuess, mdVersion: data.version
    };
  }

  var api = {estimate: estimate, itemVol: itemVol, itemKg: itemKg, accessFactor: accessFactor};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Estimator = api;
})(this);
