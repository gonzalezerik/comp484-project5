"use strict";

// ---------------------------------------------------------------------------
// Building polygons — coordinates derived from the CSUN campus grid.
// Oasis Wellness Center (F4) is the instructor-assigned mandatory location.
// ---------------------------------------------------------------------------
var LOCATIONS = [
  {
    name: "Oasis Wellness Center",
    // F4 on campus grid — inside the USU building complex
    polygon: [
      { lat: 34.24140, lng: -118.52760 },
      { lat: 34.24140, lng: -118.52640 },
      { lat: 34.24040, lng: -118.52640 },
      { lat: 34.24040, lng: -118.52760 }
    ]
  },
  {
    name: "University Library",
    // D4 — central campus
    polygon: [
      { lat: 34.24165, lng: -118.52990 },
      { lat: 34.24165, lng: -118.52840 },
      { lat: 34.24040, lng: -118.52840 },
      { lat: 34.24040, lng: -118.52990 }
    ]
  },
  {
    name: "Student Recreation Center",
    // G4 — east side of campus
    polygon: [
      { lat: 34.24175, lng: -118.52530 },
      { lat: 34.24175, lng: -118.52390 },
      { lat: 34.24055, lng: -118.52390 },
      { lat: 34.24055, lng: -118.52530 }
    ]
  },
  {
    name: "Manzanita Hall",
    // D2 — south campus
    polygon: [
      { lat: 34.23860, lng: -118.52990 },
      { lat: 34.23860, lng: -118.52840 },
      { lat: 34.23740, lng: -118.52840 },
      { lat: 34.23740, lng: -118.52990 }
    ]
  },
  {
    name: "Bookstein Hall",
    // C5 — northwest campus
    polygon: [
      { lat: 34.24280, lng: -118.53220 },
      { lat: 34.24280, lng: -118.53080 },
      { lat: 34.24160, lng: -118.53080 },
      { lat: 34.24160, lng: -118.53220 }
    ]
  }
];

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
var map;
var questions      = [];   // shuffled copy of LOCATIONS for this round
var currentIndex   = 0;
var score          = 0;
var activePolygons = [];
var timerInterval  = null;
var elapsedSeconds = 0;
var acceptingInput = false;

// ---------------------------------------------------------------------------
// Called by the Maps API once loaded
// ---------------------------------------------------------------------------
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 34.2410, lng: -118.5283 },
    zoom: 16,
    // Lock the map so only double-clicks register — no accidental panning
    draggable: false,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    disableDefaultUI: true,
    gestureHandling: "none"
  });

  map.addListener("dblclick", function (e) {
    if (acceptingInput) {
      handleGuess(e.latLng);
    }
  });

  renderHighScore();
  startQuiz();
}

// ---------------------------------------------------------------------------
// Quiz flow
// ---------------------------------------------------------------------------
function startQuiz() {
  questions      = shuffleArray(LOCATIONS.slice());
  currentIndex   = 0;
  score          = 0;
  elapsedSeconds = 0;
  acceptingInput = false;

  clearPolygons();
  document.getElementById("history").innerHTML = "";
  document.getElementById("final-score").style.display    = "none";
  document.getElementById("new-record-msg").style.display = "none";
  document.getElementById("restart-btn").style.display    = "none";
  document.getElementById("timer").textContent = "Time: 0s";

  if (timerInterval) {
    clearInterval(timerInterval);
  }
  timerInterval = setInterval(function () {
    elapsedSeconds++;
    document.getElementById("timer").textContent = "Time: " + elapsedSeconds + "s";
  }, 1000);

  askQuestion();
}

function askQuestion() {
  if (currentIndex >= questions.length) {
    endGame();
    return;
  }

  var loc  = questions[currentIndex];
  var bar  = document.createElement("div");
  bar.className   = "q-bar";
  bar.id          = "q-bar-" + currentIndex;
  bar.textContent = (currentIndex + 1) + ". " + loc.name;
  document.getElementById("history").appendChild(bar);

  // Scroll the new bar into view
  bar.scrollIntoView({ behavior: "smooth", block: "end" });

  acceptingInput = true;
}

function handleGuess(latLng) {
  acceptingInput = false;

  var loc    = questions[currentIndex];
  var poly   = buildPolygon(loc.polygon);
  var isHit  = google.maps.geometry.poly.containsLocation(latLng, poly);

  // Always draw the correct polygon so the user can learn
  drawPolygon(loc.polygon, isHit ? "#00aa00" : "#cc0000");

  var result = document.createElement("div");
  result.className = "q-result";

  if (isHit) {
    score++;
    result.innerHTML = '<span class="q-correct">Correct!</span> +1 point';
  } else {
    result.innerHTML = '<span class="q-wrong">Wrong!</span> The highlighted area shows the correct location.';
    triggerShake();
  }

  document.getElementById("history").appendChild(result);
  result.scrollIntoView({ behavior: "smooth", block: "end" });

  currentIndex++;

  // Short pause before next question so the user can read feedback
  setTimeout(askQuestion, 1200);
}

function endGame() {
  clearInterval(timerInterval);
  timerInterval  = null;
  acceptingInput = false;

  var finalDiv = document.getElementById("final-score");
  finalDiv.innerHTML =
    "<h1>" + score + " / " + questions.length + "</h1>" +
    "<p>Completed in " + elapsedSeconds + " second" + (elapsedSeconds === 1 ? "" : "s") + "</p>";
  finalDiv.style.display = "block";

  document.getElementById("restart-btn").style.display = "block";

  document.getElementById("restart-btn").onclick = function () {
    clearPolygons();
    startQuiz();
  };

  checkHighScore();
}

// ---------------------------------------------------------------------------
// High score (localStorage)
// ---------------------------------------------------------------------------
var LS_KEY = "csunMapQuizBest";

function checkHighScore() {
  var best    = getBest();
  var isFirst = !best;
  var improved = false;

  if (isFirst) {
    improved = true;
  } else if (score > best.score) {
    improved = true;
  } else if (score === best.score && elapsedSeconds < best.time) {
    improved = true;
  }

  if (improved) {
    localStorage.setItem(LS_KEY, JSON.stringify({ score: score, time: elapsedSeconds }));
    document.getElementById("new-record-msg").style.display = "block";
    renderHighScore();
  }
}

function getBest() {
  try {
    var raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function renderHighScore() {
  var best = getBest();
  var el   = document.getElementById("high-score");
  if (best) {
    el.textContent = "Best: " + best.score + "/" + LOCATIONS.length + " (" + best.time + "s)";
  } else {
    el.innerHTML = "Best: &mdash;";
  }
}

// ---------------------------------------------------------------------------
// Polygon helpers
// ---------------------------------------------------------------------------
function buildPolygon(coords) {
  return new google.maps.Polygon({
    paths: coords
  });
}

function drawPolygon(coords, color) {
  var poly = new google.maps.Polygon({
    paths: coords,
    strokeColor: color,
    strokeOpacity: 0.9,
    strokeWeight: 2,
    fillColor: color,
    fillOpacity: 0.30,
    map: map
  });
  activePolygons.push(poly);
}

function clearPolygons() {
  activePolygons.forEach(function (p) { p.setMap(null); });
  activePolygons = [];
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function triggerShake() {
  var sidebar = document.getElementById("sidebar");
  sidebar.classList.remove("shake");
  // Force reflow so the animation restarts if already running
  void sidebar.offsetWidth;
  sidebar.classList.add("shake");
  sidebar.addEventListener("animationend", function handler() {
    sidebar.classList.remove("shake");
    sidebar.removeEventListener("animationend", handler);
  });
}

function shuffleArray(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}
