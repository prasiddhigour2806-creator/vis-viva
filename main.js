const MU = 398600.4418; // km^3/s^2
const EARTH_RADIUS_KM = 6378.137;
const VISUAL_EARTH_RADIUS = 1;
const KM_TO_SCENE = VISUAL_EARTH_RADIUS / EARTH_RADIUS_KM;

const orbitalElements = {
  semiMajorAxis: 10000,
  eccentricity: 0.1,
  inclination: 30,
  raan: 40,
  argumentOfPeriapsis: 30,
  initialTrueAnomaly: 60,
  timeScale: 1000
};

let isPlaying = true;
let elapsedSeconds = 0;
let orbitLine = null;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03050a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.01,
  2000
);

camera.position.set(0, 8, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

document.getElementById("scene").appendChild(renderer.domElement);

const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const sunlight = new THREE.DirectionalLight(0xffffff, 2);
sunlight.position.set(30, 15, 20);
scene.add(sunlight);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(VISUAL_EARTH_RADIUS, 64, 64),
  new THREE.MeshStandardMaterial({
    color: 0x1a5fb4,
    roughness: 0.75,
    metalness: 0.05
  })
);

scene.add(earth);

const satellite = new THREE.Mesh(
  new THREE.SphereGeometry(0.06, 24, 24),
  new THREE.MeshBasicMaterial({ color: 0xffd166 })
);

scene.add(satellite);
const velocityArrow = new THREE.ArrowHelper(
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(),
  1,
  0x66ff99,
  0.2,
  0.1
);

scene.add(velocityArrow);
rebuildOrbitPath();

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function normalizeAngle(angle) {
  const twoPi = 2 * Math.PI;
  return ((angle % twoPi) + twoPi) % twoPi;
}

function calculateSemiLatusRectum(semiMajorAxis, eccentricity) {
  return semiMajorAxis * (1 - eccentricity * eccentricity);
}

function calculateRadius(semiLatusRectum, eccentricity, trueAnomaly) {
  return semiLatusRectum / (1 + eccentricity * Math.cos(trueAnomaly));
}

function calculateVisVivaSpeed(semiMajorAxis, radius) {
  return Math.sqrt(MU * (2 / radius - 1 / semiMajorAxis));
}

function calculateOrbitalPeriod(semiMajorAxis) {
  return 2 * Math.PI * Math.sqrt(
    (semiMajorAxis * semiMajorAxis * semiMajorAxis) / MU
  );
}

function trueAnomalyToEccentricAnomaly(trueAnomaly, eccentricity) {
  return 2 * Math.atan2(
    Math.sqrt(1 - eccentricity) * Math.sin(trueAnomaly / 2),
    Math.sqrt(1 + eccentricity) * Math.cos(trueAnomaly / 2)
  );
}

function eccentricAnomalyToTrueAnomaly(eccentricAnomaly, eccentricity) {
  return 2 * Math.atan2(
    Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
    Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
  );
}

function solveKeplerEquation(meanAnomaly, eccentricity) {
  let eccentricAnomaly = eccentricity < 0.8 ? meanAnomaly : Math.PI;

  for (let iteration = 0; iteration < 60; iteration++) {
    const functionValue =
      eccentricAnomaly -
      eccentricity * Math.sin(eccentricAnomaly) -
      meanAnomaly;

    const derivative =
      1 - eccentricity * Math.cos(eccentricAnomaly);

    const correction = functionValue / derivative;
    eccentricAnomaly -= correction;

    if (Math.abs(correction) < 1e-10) {
      break;
    }
  }

  return eccentricAnomaly;
}

function createEciRotationMatrix(
  raanDegrees,
  inclinationDegrees,
  argumentOfPeriapsisDegrees
) {
  const raan = degreesToRadians(raanDegrees);
  const inclination = degreesToRadians(inclinationDegrees);
  const argumentOfPeriapsis = degreesToRadians(
    argumentOfPeriapsisDegrees
  );

  const cosRaan = Math.cos(raan);
  const sinRaan = Math.sin(raan);
  const cosInclination = Math.cos(inclination);
  const sinInclination = Math.sin(inclination);
  const cosPeriapsis = Math.cos(argumentOfPeriapsis);
  const sinPeriapsis = Math.sin(argumentOfPeriapsis);

  return [
    [
      cosRaan * cosPeriapsis -
        sinRaan * sinPeriapsis * cosInclination,

      -cosRaan * sinPeriapsis -
        sinRaan * cosPeriapsis * cosInclination,

      sinRaan * sinInclination
    ],
    [
      sinRaan * cosPeriapsis +
        cosRaan * sinPeriapsis * cosInclination,

      -sinRaan * sinPeriapsis +
        cosRaan * cosPeriapsis * cosInclination,

      -cosRaan * sinInclination
    ],
    [
      sinPeriapsis * sinInclination,
      cosPeriapsis * sinInclination,
      cosInclination
    ]
  ];
}

function multiplyMatrixVector(matrix, vector) {
  return [
    matrix[0][0] * vector[0] +
      matrix[0][1] * vector[1] +
      matrix[0][2] * vector[2],

    matrix[1][0] * vector[0] +
      matrix[1][1] * vector[1] +
      matrix[1][2] * vector[2],

    matrix[2][0] * vector[0] +
      matrix[2][1] * vector[1] +
      matrix[2][2] * vector[2]
  ];
}

function calculateOrbitalState(elapsedSeconds) {
  const semiMajorAxis = orbitalElements.semiMajorAxis;
  const eccentricity = orbitalElements.eccentricity;

  const semiLatusRectum = calculateSemiLatusRectum(
    semiMajorAxis,
    eccentricity
  );

  const meanMotion = Math.sqrt(MU / (semiMajorAxis ** 3));

  const initialTrueAnomaly = degreesToRadians(
    orbitalElements.initialTrueAnomaly
  );

  const initialEccentricAnomaly = trueAnomalyToEccentricAnomaly(
    initialTrueAnomaly,
    eccentricity
  );

  const initialMeanAnomaly =
    initialEccentricAnomaly -
    eccentricity * Math.sin(initialEccentricAnomaly);

  const meanAnomaly = normalizeAngle(
    initialMeanAnomaly + meanMotion * elapsedSeconds
  );

  const eccentricAnomaly = solveKeplerEquation(
    meanAnomaly,
    eccentricity
  );

  const trueAnomaly = eccentricAnomalyToTrueAnomaly(
    eccentricAnomaly,
    eccentricity
  );

  const radius = calculateRadius(
    semiLatusRectum,
    eccentricity,
    trueAnomaly
  );

  const specificAngularMomentum = Math.sqrt(MU * semiLatusRectum);

  const perifocalPosition = [
    radius * Math.cos(trueAnomaly),
    radius * Math.sin(trueAnomaly),
    0
  ];

  const perifocalVelocity = [
    (MU / specificAngularMomentum) * -Math.sin(trueAnomaly),
    (MU / specificAngularMomentum) *
      (eccentricity + Math.cos(trueAnomaly)),
    0
  ];

  const rotationMatrix = createEciRotationMatrix(
    orbitalElements.raan,
    orbitalElements.inclination,
    orbitalElements.argumentOfPeriapsis
  );

  const eciPosition = multiplyMatrixVector(
    rotationMatrix,
    perifocalPosition
  );

  const eciVelocity = multiplyMatrixVector(
    rotationMatrix,
    perifocalVelocity
  );

  return {
    radius,
    speed: calculateVisVivaSpeed(semiMajorAxis, radius),
    trueAnomaly,
    orbitalPeriod: calculateOrbitalPeriod(semiMajorAxis),
    periapsisRadius: semiMajorAxis * (1 - eccentricity),
    apoapsisRadius: semiMajorAxis * (1 + eccentricity),
    eciPosition,
    eciVelocity
  };
}

function updateTelemetry(orbitalState) {
  document.getElementById("radiusOutput").textContent =
    `${orbitalState.radius.toFixed(1)} km`;

  document.getElementById("speedOutput").textContent =
    `${orbitalState.speed.toFixed(4)} km/s`;

  document.getElementById("trueAnomalyOutput").textContent =
    `${(orbitalState.trueAnomaly * 180 / Math.PI).toFixed(2)}°`;

  document.getElementById("periodOutput").textContent =
    formatDuration(orbitalState.orbitalPeriod);

  document.getElementById("periapsisOutput").textContent =
    `${orbitalState.periapsisRadius.toFixed(1)} km`;

  document.getElementById("apoapsisOutput").textContent =
    `${orbitalState.apoapsisRadius.toFixed(1)} km`;

  document.getElementById("positionOutput").textContent =
    orbitalState.eciPosition
      .map(value => value.toFixed(0))
      .join(", ") + " km";

  document.getElementById("velocityOutput").textContent =
    orbitalState.eciVelocity
      .map(value => value.toFixed(3))
      .join(", ") + " km/s";

  document.getElementById("timeOutput").textContent =
    formatDuration(elapsedSeconds);
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

function bindSlider(inputId, outputId, key, formatter) {
  const input = document.getElementById(inputId);
  const output = document.getElementById(outputId);

  input.addEventListener("input", () => {
    orbitalElements[key] = parseFloat(input.value);
    output.textContent = formatter(orbitalElements[key]);

  if (key === "initialTrueAnomaly") {
  elapsedSeconds = 0;
}

rebuildOrbitPath();
  });

  output.textContent = formatter(orbitalElements[key]);
}

bindSlider(
  "semiMajorAxis",
  "semiMajorAxisValue",
  "semiMajorAxis",
  value => `${value.toLocaleString()} km`
);

bindSlider(
  "eccentricity",
  "eccentricityValue",
  "eccentricity",
  value => value.toFixed(3)
);

bindSlider(
  "inclination",
  "inclinationValue",
  "inclination",
  value => `${value}°`
);

bindSlider(
  "raan",
  "raanValue",
  "raan",
  value => `${value}°`
);

bindSlider(
  "argumentOfPeriapsis",
  "argumentOfPeriapsisValue",
  "argumentOfPeriapsis",
  value => `${value}°`
);

bindSlider(
  "initialTrueAnomaly",
  "initialTrueAnomalyValue",
  "initialTrueAnomaly",
  value => `${value}°`
);

bindSlider(
  "timeScale",
  "timeScaleValue",
  "timeScale",
  value => `${value.toLocaleString()}×`
);

document.getElementById("playPauseButton")
  .addEventListener("click", event => {
    isPlaying = !isPlaying;
    event.target.textContent = isPlaying ? "Pause" : "Play";
  });

document.getElementById("resetButton")
  .addEventListener("click", () => {
    elapsedSeconds = 0;
  });

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function rebuildOrbitPath() {
  if (orbitLine) {
    scene.remove(orbitLine);
    orbitLine.geometry.dispose();
    orbitLine.material.dispose();
  }

  const points = [];
  const segments = 512;

  const semiLatusRectum =
    orbitalElements.semiMajorAxis *
    (1 - orbitalElements.eccentricity * orbitalElements.eccentricity);

  for (let point = 0; point <= segments; point++) {
    const trueAnomaly = (point / segments) * Math.PI * 2;

    const radius =
      semiLatusRectum /
      (1 + orbitalElements.eccentricity * Math.cos(trueAnomaly));

    const perifocalPosition = [
      radius * Math.cos(trueAnomaly),
      radius * Math.sin(trueAnomaly),
      0
    ];

    const rotationMatrix = createEciRotationMatrix(
      orbitalElements.raan,
      orbitalElements.inclination,
      orbitalElements.argumentOfPeriapsis
    );

    const eciPosition = multiplyMatrixVector(
      rotationMatrix,
      perifocalPosition
    );

    points.push(
      new THREE.Vector3(
        eciPosition[0] * KM_TO_SCENE,
        eciPosition[1] * KM_TO_SCENE,
        eciPosition[2] * KM_TO_SCENE
      )
    );
  }

  orbitLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x66ccff })
  );

  scene.add(orbitLine);
}
function animate() {
  requestAnimationFrame(animate);

  const frameTime = clock.getDelta();

  if (isPlaying) {
    elapsedSeconds += frameTime * orbitalElements.timeScale;
  }

  const orbitalState = calculateOrbitalState(elapsedSeconds);

  satellite.position.set(
    orbitalState.eciPosition[0] * KM_TO_SCENE,
    orbitalState.eciPosition[1] * KM_TO_SCENE,
    orbitalState.eciPosition[2] * KM_TO_SCENE
  );
const velocityDirection = new THREE.Vector3(
  orbitalState.eciVelocity[0],
  orbitalState.eciVelocity[1],
  orbitalState.eciVelocity[2]
).normalize();

velocityArrow.position.copy(satellite.position);
velocityArrow.setDirection(velocityDirection);
velocityArrow.setLength(0.8, 0.18, 0.09);
  updateTelemetry(orbitalState);
orbitControls.update();
  renderer.render(scene, camera);
}

animate();