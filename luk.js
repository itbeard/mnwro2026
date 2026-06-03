/* =======================================================================
   Стральба з лука — інтэрактыў.
   Дадзеныя частак → кропкі на схеме (хотспоты) + чыпы-сьпіс + панэль апісаньня.
   Кропкі пазіцыянуюцца ў каардынатах viewBox схемы (перакладаюцца ў %).
======================================================================== */

/* Частка: x/y — у адзінках viewBox адпаведнай схемы; gear — спартыўны абвес. */
const BOW_VIEW = { w: 340, h: 560 };
const ARROW_VIEW = { w: 560, h: 150 };

const BOW_PARTS = [
  { key: "riser",  x: 151, y: 280, emoji: "🪵", name: "Рукаяць",            en: "riser / handle",
    desc: "Цэнтральная частка, за якую трымаем лук. На ёй мацуюцца плечы, палічка і ўвесь абвес." },
  { key: "limb",   x: 116, y: 150, emoji: "💪", name: "Плечы",              en: "limbs",
    desc: "Верхняе і ніжняе — пругкія часткі, якія гнуцца і накопліваюць энергію. У рэкурсіва канцы загнутыя." },
  { key: "string", x: 206, y: 150, emoji: "〰️", name: "Цеціва",             en: "string",
    desc: "Злучае канцы плячэй. Менавіта яе мы нацягваем; на ёй — пункт фіксацыі стралы." },
  { key: "rest",   x: 170, y: 272, emoji: "📐", name: "Палічка для стралы", en: "arrow rest",
    desc: "Невялікая апора на рукаяці, на якой ляжыць страла да выпуску." },
  { key: "sight",  x: 96,  y: 276, emoji: "🎯", name: "Візір",             en: "sight", gear: true,
    desc: "Прыцэл спартыўнага лука — праз яго наводзім на мішэнь. Толькі для спартыўнага абвесу." },
  { key: "stab",   x: 96,  y: 332, emoji: "📏", name: "Стабілізатары",      en: "stabilisers", gear: true,
    desc: "Стрыжні, што гасяць ваганьні і ўтрымліваюць лук роўна пры стрэле." },
  { key: "weight", x: 46,  y: 354, emoji: "⚖️", name: "Уцяжарвальнік",      en: "weight", gear: true,
    desc: "Грузік на стабілізатары — балансуе лук і робіць трыманьне больш спакойным." },
];

const ARROW_PARTS = [
  { key: "point",  x: 50,  y: 75, emoji: "🔺", name: "Наканечнік", en: "point / tip",
    desc: "Пярэдні цяжкі канец — уваходзіць у мішэнь. Бывае розны па форме і вазе." },
  { key: "shaft",  x: 245, y: 75, emoji: "🪵", name: "Древка (трубка)", en: "shaft",
    desc: "Цела стралы. Матэрыял: дрэва, алюміній, карбон ці кампазіт. Даўжыня і жорсткасьць падбіраюцца пад лук." },
  { key: "fletch", x: 448, y: 60, emoji: "🪶", name: "Апярэньне", en: "fletching / vanes",
    desc: "Пёры або пластыкавыя лопасьці — стабілізуюць палёт і дакладнасьць." },
  { key: "nock",   x: 492, y: 75, emoji: "🔗", name: "Хвосьцік", en: "nock",
    desc: "Заднi прарэз, якім страла ставіцца на цеціву ў пункце фіксацыі." },
];

/* Будуем адну схему: кропкі-хотспоты + чыпы + апрацоўка выбару. */
function buildDiagram(opts) {
  const canvas = document.getElementById(opts.canvasId);
  const chipsBox = document.getElementById(opts.chipsId);
  const infoBox = document.getElementById(opts.infoId);
  const view = opts.view;
  const svgParts = canvas.querySelectorAll("[data-part]");
  let activeKey = null;

  function setActive(key) {
    activeKey = key;
    const part = opts.parts.find(p => p.key === key);

    // кропкі + чыпы
    canvas.querySelectorAll(".hot").forEach(h => h.classList.toggle("is-active", h.dataset.key === key));
    chipsBox.querySelectorAll(".chip").forEach(c => c.classList.toggle("is-active", c.dataset.key === key));

    // падсветка элементаў SVG: актыўная частка чырвоная, рэшта прыцемненая
    svgParts.forEach(el => {
      const isActive = el.dataset.part === key;
      el.style.opacity = key && !isActive && !el.closest(".gear-part") ? "0.32" : "";
      el.style.filter = "";
      if (isActive) {
        if (el.tagName === "line" || el.tagName === "path" && el.getAttribute("fill") === "none") {
          el.style.stroke = "#ce1720";
        } else if (el.tagName === "polygon" || el.tagName === "rect" || el.tagName === "circle" || el.tagName === "path") {
          if (el.getAttribute("fill") && el.getAttribute("fill") !== "none") el.style.fill = "#ce1720";
          if (el.getAttribute("stroke")) el.style.stroke = "#ce1720";
        }
      } else {
        el.style.stroke = "";
        el.style.fill = "";
      }
    });

    // панэль апісаньня
    if (part) {
      infoBox.classList.remove("empty");
      infoBox.innerHTML =
        `<div class="pi-top"><span class="pi-name">${part.emoji} ${part.name}</span>` +
        `<span class="pi-en">${part.en}</span></div>` +
        `<p class="pi-desc">${part.desc}</p>`;
    }
  }

  opts.parts.forEach((p, i) => {
    // кропка-хотспот
    const hot = document.createElement("button");
    hot.type = "button";
    hot.className = "hot" + (p.gear ? " gear" : "");
    hot.dataset.key = p.key;
    hot.textContent = i + 1;
    hot.style.left = (p.x / view.w * 100) + "%";
    hot.style.top = (p.y / view.h * 100) + "%";
    hot.setAttribute("aria-label", p.name);
    if (p.gear) { hot.style.display = "none"; hot.dataset.gear = "1"; }
    hot.addEventListener("click", () => setActive(p.key));
    canvas.appendChild(hot);

    // чып
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (p.gear ? " gear" : "");
    chip.dataset.key = p.key;
    chip.innerHTML = `<span class="num">${i + 1}</span>${p.name}`;
    if (p.gear) chip.style.display = "none";
    chip.addEventListener("click", () => setActive(p.key));
    chipsBox.appendChild(chip);
  });

  return {
    setGearVisible(show) {
      canvas.querySelectorAll('.hot[data-gear="1"]').forEach(h => h.style.display = show ? "" : "none");
      chipsBox.querySelectorAll(".chip.gear").forEach(c => c.style.display = show ? "" : "none");
      // калі схавалі абвес, а выбраная была gear-частка — скідаем
      if (!show && activeKey && opts.parts.find(p => p.key === activeKey)?.gear) {
        canvas.querySelectorAll(".hot, .chip").forEach(e => e.classList.remove("is-active"));
        svgParts.forEach(el => { el.style.opacity = ""; el.style.stroke = ""; el.style.fill = ""; });
        infoBox.classList.add("empty");
        infoBox.innerHTML = '<span class="pi-hint">Выберы частку лука 👆</span>';
        activeKey = null;
      }
    }
  };
}

const bow = buildDiagram({
  canvasId: "bowCanvas", chipsId: "bowChips", infoId: "bowInfo",
  parts: BOW_PARTS, view: BOW_VIEW
});
buildDiagram({
  canvasId: "arrowCanvas", chipsId: "arrowChips", infoId: "arrowInfo",
  parts: ARROW_PARTS, view: ARROW_VIEW
});

/* Тумблер спартыўнага абвесу */
const gearToggle = document.getElementById("gearToggle");
const bowCanvas = document.getElementById("bowCanvas");
gearToggle.addEventListener("click", () => {
  const on = !gearToggle.classList.contains("on");
  gearToggle.classList.toggle("on", on);
  gearToggle.setAttribute("aria-pressed", String(on));
  bowCanvas.classList.toggle("show-gear", on);
  bow.setGearVisible(on);
});

/* Падсветка актыўнай секцыі ў стужцы-навігацыі */
const navLinks = Array.from(document.querySelectorAll("#sectionNav a"));
const sections = navLinks.map(a => document.querySelector(a.getAttribute("href")));
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const i = sections.indexOf(e.target);
      navLinks.forEach((a, j) => a.classList.toggle("is-active", j === i));
      navLinks[i]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  });
}, { rootMargin: "-130px 0px -65% 0px", threshold: 0 });
sections.forEach(s => s && navObserver.observe(s));
