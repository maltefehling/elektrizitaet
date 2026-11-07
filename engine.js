// Kleine Prüf-Engine für Check-in und Kontrollen (Elektrizitätslehre Kl. 8)
// Aufgabe: {id, nr, bereich?, text, typ:'mc'|'zahl'|'tab'|'offen', opts, richtig, zeilen, spalten, tol, tipp, loesung}
// 2 Versuche: beim 1. Fehler Tipp, beim 2. Fehler Lösung. Offene Aufgaben: erst Papier, dann Musterantwort + Selbsteinschätzung.
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") e.className = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
    }
    kids.flat().forEach(k => e.append(k instanceof Node ? k : document.createTextNode(k)));
    return e;
  };
  const html = (s) => { const d = document.createElement("span"); d.innerHTML = s; return d; };
  const zahl = (s) => parseFloat(String(s).replace(/\s/g, "").replace(",", "."));

  window.starte = function (cfg) {
    const stand = {}; // id -> {status:'offen'|'ok'|'falsch'|'selbst', versuche, selbst}
    cfg.aufgaben.forEach(a => stand[a.id] = { status: "offen", versuche: 0 });
    const ziel = $("#aufgaben");

    function rueck(box, art, text) {
      box.className = "rueck " + art; box.innerHTML = text; box.style.display = "block";
    }
    function fertig(a, ok) {
      stand[a.id].status = ok ? "ok" : "falsch"; uebersicht();
    }

    cfg.aufgaben.forEach(a => {
      const karte = h("div", { class: "card", id: "k_" + a.id });
      karte.append(h("div", { class: "nr" }, a.nr + (a.bereich ? "  ·  " + a.bereich : "")));
      karte.append(h("p", { class: "frage" }, html(a.text)));
      const box = h("div", { class: "rueck" });
      const ab = (antwortOk, zeigeLoesung) => {
        const s = stand[a.id]; if (s.status !== "offen") return;
        s.versuche++;
        if (antwortOk) { rueck(box, "ok", "✓ Richtig! " + (a.loesung ? html(a.loesung).innerHTML : "")); fertig(a, true); sperre(); }
        else if (s.versuche < 2) rueck(box, "tipp", "Noch nicht. <b>Tipp:</b> " + (a.tipp || "Lies den Merkkasten noch einmal."));
        else { rueck(box, "bad", "Leider falsch. <b>Richtig ist:</b> " + zeigeLoesung()); fertig(a, false); sperre(); }
      };
      let sperre = () => karte.querySelectorAll("button.opt, input, button.pruef, select").forEach(e => e.disabled = true);

      if (a.typ === "mc") {
        const reihe = h("div", { class: "opts" });
        a.opts.forEach((o, i) => reihe.append(h("button", { class: "opt", onclick: (ev) => {
          reihe.querySelectorAll(".opt").forEach(b => b.classList.remove("gew")); ev.target.classList.add("gew");
          ab(i === a.richtig, () => a.opts[a.richtig] + (a.loesung ? " – " + a.loesung : ""));
          if (i !== a.richtig) ev.target.classList.add("weg");
        } }, html(o))));
        karte.append(reihe);
      }
      if (a.typ === "zahl") {
        const inp = h("input", { type: "text", inputmode: "decimal", placeholder: "Zahl" });
        const btn = h("button", { class: "pruef", onclick: () => {
          const v = zahl(inp.value); if (isNaN(v)) { rueck(box, "tipp", "Bitte eine Zahl eingeben."); return; }
          ab(Math.abs(v - a.richtig) <= (a.tol || 1e-9), () => String(a.richtig).replace(".", ",") + " " + (a.einheit || ""));
        } }, "Prüfen");
        karte.append(h("div", { class: "zeile" }, inp, h("span", { class: "einheit" }, a.einheit || ""), btn));
      }
      if (a.typ === "tab") {
        const t = h("table", { class: "tab" });
        t.append(h("tr", {}, h("th", {}, "Aussage"), ...a.spalten.map(s => h("th", {}, s))));
        const wahl = a.zeilen.map(() => null);
        a.zeilen.forEach(([txt], r) => {
          const tr = h("tr", {}, h("td", {}, txt));
          a.spalten.forEach((s, c) => tr.append(h("td", { class: "mitte" }, h("button", { class: "opt klein", onclick: (ev) => {
            wahl[r] = c; tr.querySelectorAll(".opt").forEach(b => b.classList.remove("gew")); ev.target.classList.add("gew");
          } }, "○"))));
          t.append(tr);
        });
        const btn = h("button", { class: "pruef", onclick: () => {
          if (wahl.includes(null)) { rueck(box, "tipp", "Kreuze in jeder Zeile etwas an."); return; }
          const falsch = a.zeilen.filter(([, r], i) => wahl[i] !== r).length;
          ab(falsch === 0, () => a.zeilen.map(([txt, r]) => `<br>• ${txt} → <b>${a.spalten[r]}</b>`).join(""));
          if (falsch && stand[a.id].status === "offen") box.innerHTML += ` (${falsch} Zeile${falsch > 1 ? "n" : ""} falsch)`;
        } }, "Prüfen");
        karte.append(t, h("div", { class: "zeile" }, btn));
      }
      if (a.typ === "offen") {
        karte.append(h("p", { class: "hinweis" }, "Schreib deine Antwort zuerst auf deine OneNote-Seite. Dann vergleiche."));
        const muster = h("div", { class: "muster" }, h("b", {}, "Musterantwort: "), html(a.loesung));
        muster.style.display = "none";
        const selbst = h("div", { class: "opts" });
        selbst.style.display = "none";
        [["passt", "ok"], ["teilweise", "selbst"], ["fehlt noch", "falsch"]].forEach(([t, st]) => selbst.append(h("button", { class: "opt", onclick: (ev) => {
          selbst.querySelectorAll(".opt").forEach(b => b.classList.remove("gew")); ev.target.classList.add("gew");
          stand[a.id].status = st; stand[a.id].selbst = t; uebersicht();
        } }, "Meine Antwort: " + t)));
        karte.append(h("button", { class: "pruef", onclick: (ev) => { muster.style.display = "block"; selbst.style.display = "flex"; ev.target.style.display = "none"; } }, "Musterantwort zeigen"), muster, selbst);
      }
      karte.append(box);
      ziel.append(karte);
    });

    const ue = $("#uebersicht");
    function uebersicht() {
      const alle = cfg.aufgaben, erledigt = alle.filter(a => stand[a.id].status !== "offen").length;
      ue.innerHTML = "";
      ue.append(h("h2", {}, cfg.titel + " – Übersicht"));
      ue.append(h("p", { class: "klein" }, `${erledigt} von ${alle.length} bearbeitet · ${new Date().toLocaleDateString("de-DE")}`));
      const zeichen = { ok: "✓", falsch: "✗", selbst: "~", offen: "–" };
      if (cfg.bereiche) {
        cfg.bereiche.forEach(b => {
          const ihre = alle.filter(a => a.bereich === b.name);
          const ok = ihre.filter(a => stand[a.id].status === "ok").length;
          const fertigB = ihre.every(a => stand[a.id].status !== "offen");
          const ampel = !fertigB ? "grau" : ok === ihre.length ? "gruen" : ok === 0 ? "rot" : "gelb";
          ue.append(h("div", { class: "bereich " + ampel }, h("b", {}, b.name + ": "), ihre.map(a => zeichen[stand[a.id].status]).join(" "),
            fertigB && ok < ihre.length ? h("div", { class: "klein" }, "→ " + b.wenn) : ""));
        });
      } else {
        const t = h("div", { class: "reihe" });
        alle.forEach(a => t.append(h("span", { class: "pill " + stand[a.id].status }, a.nr.replace(")", "") + " " + zeichen[stand[a.id].status])));
        ue.append(t);
      }
      if (erledigt === alle.length) ue.append(h("p", { class: "klein fertig" }, "Fertig! Mach jetzt einen Screenshot von diesem Kasten und füge ihn in OneNote ein."));
    }
    uebersicht();
  };
})();
