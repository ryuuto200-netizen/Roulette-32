(() => {
  "use strict";
  const TOTAL = 32;
  const SLICE = 360 / TOTAL;
  const CENTER = 240;
  const RADIUS = 220;
  const LABEL_RADIUS = 170;
  const COLORS = ["#315E8B","#3F6B9A","#4E6F9D","#5E699B","#665E96","#775F98","#456F83","#397A7D"];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wheelSvg = document.getElementById("wheelSvg");
  const wheelFace = document.getElementById("wheelFace");
  const wheelStage = document.getElementById("wheelStage");
  const spinButton = document.getElementById("spinButton");
  const actionSymbol = document.getElementById("actionSymbol");
  const actionLabel = document.getElementById("actionLabel");
  const actionHint = document.getElementById("actionHint");
  const status = document.getElementById("spinStatus");
  const statusText = document.getElementById("statusText");
  const resultCard = document.getElementById("resultCard");
  const resultNumber = document.getElementById("resultNumber");
  const resultCaption = document.getElementById("resultCaption");
  const historyList = document.getElementById("historyList");
  const historyCount = document.getElementById("historyCount");
  let state = "ready";
  let currentRotation = 0;
  let spinStartedAt = 0;
  let startRotation = 0;
  let animationFrame = 0;
  let stopFallback = 0;
  const history = [];

  function pointAt(degrees, radius) {
    const radians = degrees * Math.PI / 180;
    return { x: CENTER + Math.cos(radians) * radius, y: CENTER + Math.sin(radians) * radius };
  }
  function createSvgElement(name) { return document.createElementNS("http://www.w3.org/2000/svg", name); }

  function drawWheel() {
    const slices = document.createDocumentFragment();
    for (let index = 0; index < TOTAL; index += 1) {
      const startAngle = -90 + index * SLICE;
      const endAngle = startAngle + SLICE;
      const start = pointAt(startAngle, RADIUS);
      const end = pointAt(endAngle, RADIUS);
      const path = createSvgElement("path");
      path.setAttribute("d","M " + CENTER + " " + CENTER + " L " + start.x.toFixed(3) + " " + start.y.toFixed(3) + " A " + RADIUS + " " + RADIUS + " 0 0 1 " + end.x.toFixed(3) + " " + end.y.toFixed(3) + " Z");
      path.setAttribute("fill", COLORS[index % COLORS.length]);
      path.setAttribute("stroke", "rgba(232,240,255,.48)");
      path.setAttribute("stroke-width", "1.35");
      slices.appendChild(path);
      const labelPoint = pointAt(startAngle + SLICE / 2, LABEL_RADIUS);
      const label = createSvgElement("text");
      label.setAttribute("x", labelPoint.x.toFixed(2));
      label.setAttribute("y", labelPoint.y.toFixed(2));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "central");
      label.textContent = String(index + 1);
      slices.appendChild(label);
    }
    const rim = createSvgElement("circle");
    rim.setAttribute("cx", String(CENTER)); rim.setAttribute("cy", String(CENTER));
    rim.setAttribute("r", String(RADIUS - 1)); rim.setAttribute("fill", "none");
    rim.setAttribute("stroke", "rgba(235,242,255,.72)"); rim.setAttribute("stroke-width", "2.2");
    slices.appendChild(rim);
    const innerRing = createSvgElement("circle");
    innerRing.setAttribute("cx", String(CENTER)); innerRing.setAttribute("cy", String(CENTER));
    innerRing.setAttribute("r", "60"); innerRing.setAttribute("fill", "none");
    innerRing.setAttribute("stroke", "rgba(231,239,255,.18)"); innerRing.setAttribute("stroke-width", "1.2");
    slices.appendChild(innerRing);
    wheelFace.appendChild(slices);
  }

  function normalize(angle) { return ((angle % 360) + 360) % 360; }
  function setRotation(angle) { wheelSvg.style.transform = "rotate(" + angle.toFixed(3) + "deg)"; }

  function randomIndex() {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    // 2^32 is divisible by 32, so modulo 32 keeps every outcome equally likely.
    return values[0] % TOTAL;
  }

  function setButton(label, symbol, hint) {
    actionLabel.textContent = label;
    actionSymbol.textContent = symbol;
    actionHint.textContent = hint;
  }

  function startSpin() {
    if (state !== "ready") return;
    state = "spinning";
    spinStartedAt = performance.now();
    startRotation = currentRotation;
    wheelSvg.style.transition = "none";
    setRotation(currentRotation);
    spinButton.disabled = false;
    spinButton.classList.add("is-stop");
    spinButton.setAttribute("aria-pressed", "true");
    setButton("ストップ", "■", "STOP");
    status.classList.add("is-spinning");
    statusText.textContent = "SPINNING";
    wheelStage.classList.add("is-spinning");
    resultCaption.textContent = "止めると、今回の数字が選ばれます";
    window.cancelAnimationFrame(animationFrame);
    animationFrame = window.requestAnimationFrame(animateSpin);
  }

  function animateSpin(now) {
    if (state !== "spinning") return;
    const elapsed = now - spinStartedAt;
    const speed = reducedMotion.matches ? 0.24 : 0.48;
    const accelerationDuration = reducedMotion.matches ? 1 : 520;
    const distance = elapsed <= accelerationDuration
      ? speed * elapsed * elapsed / (2 * accelerationDuration)
      : speed * (accelerationDuration / 2 + elapsed - accelerationDuration);
    currentRotation = startRotation + distance;
    setRotation(currentRotation);
    animationFrame = window.requestAnimationFrame(animateSpin);
  }

  function stopSpin() {
    if (state !== "spinning") return;
    window.cancelAnimationFrame(animationFrame);
    state = "stopping";
    const selectedIndex = randomIndex();
    const selectedNumber = selectedIndex + 1;
    const targetAngle = normalize(360 - ((selectedIndex + .5) * SLICE));
    const currentAngle = normalize(currentRotation);
    const remainingAngle = normalize(targetAngle - currentAngle);
    const extraTurns = reducedMotion.matches ? 0 : 4;
    const finalRotation = currentRotation + extraTurns * 360 + remainingAngle;
    const duration = reducedMotion.matches ? 420 : 4400;
    spinButton.disabled = true;
    spinButton.setAttribute("aria-pressed", "false");
    setButton("選定中…", "·", "WAIT");
    status.classList.remove("is-spinning");
    statusText.textContent = "SLOWING";
    wheelStage.classList.remove("is-spinning");
    resultCaption.textContent = "ホイールが止まるまでお待ちください";
    wheelSvg.style.transition = "transform " + duration + "ms cubic-bezier(.10,.73,.12,1)";
    window.requestAnimationFrame(() => setRotation(finalRotation));

    const finish = () => {
      if (state !== "stopping") return;
      window.clearTimeout(stopFallback);
      wheelSvg.removeEventListener("transitionend", onTransitionEnd);
      currentRotation = finalRotation;
      state = "ready";
      resultNumber.textContent = String(selectedNumber);
      resultCard.classList.add("has-result");
      resultCaption.textContent = "1〜32の中から選ばれた数字です";
      spinButton.disabled = false;
      spinButton.classList.remove("is-stop");
      spinButton.setAttribute("aria-pressed", "false");
      setButton("もう一度まわす", "↻", "SPIN AGAIN");
      statusText.textContent = "READY";
      addToHistory(selectedNumber);
    };
    const onTransitionEnd = (event) => {
      if (event.target === wheelSvg && event.propertyName === "transform") finish();
    };
    wheelSvg.addEventListener("transitionend", onTransitionEnd);
    stopFallback = window.setTimeout(finish, duration + 300);
  }

  function addToHistory(number) {
    history.unshift(number);
    if (history.length > 4) history.pop();
    historyList.replaceChildren();
    history.forEach((value, index) => {
      const chip = document.createElement("span");
      chip.className = "history-chip";
      chip.textContent = String(value);
      chip.setAttribute("aria-label", "直近" + (index + 1) + "回目: " + value);
      historyList.appendChild(chip);
    });
    historyCount.textContent = history.length + " / 4";
  }

  spinButton.addEventListener("click", () => {
    if (state === "spinning") stopSpin();
    else if (state === "ready") startSpin();
  });
  drawWheel();
})();