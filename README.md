# Vis-Viva Orbital Simulator

An interactive 3D website that visualizes a satellite orbiting Earth using
classical orbital elements, Keplerian propagation, and the vis-viva equation.

The project converts orbital elements into an Earth-Centered Inertial (ECI)
state vector, advances the satellite through time using Kepler’s equation,
and displays its instantaneous orbital speed using the vis-viva equation.

## Live Website

[Open the Vis-Viva Orbital Simulator](https://prasiddhigour2806-creator.github.io/vis-viva/)

The website runs directly in a web browser. No installation is required.

## Features

- Interactive 3D Earth and satellite visualization
- Adjustable semi-major axis, eccentricity, inclination, RAAN, and argument of periapsis
- Adjustable initial true anomaly and simulation time scale
- Animated satellite motion along a Keplerian orbit
- Live orbital radius and velocity telemetry
- ECI position and velocity vectors
- Orbital period, periapsis radius, and apoapsis radius
- Vis-viva velocity calculation
- Play, pause, and reset controls

## Orbital Mechanics

The simulator uses the following governing relationships:

\[
p = a(1-e^2)
\]

\[
r = \frac{p}{1+e\cos\nu}
\]

\[
h = \sqrt{\mu p}
\]

\[
\mathbf{r}_p =
\begin{bmatrix}
r\cos\nu \\
r\sin\nu \\
0
\end{bmatrix}
\]

\[
\mathbf{v}_p =
\frac{\mu}{h}
\begin{bmatrix}
-\sin\nu \\
e+\cos\nu \\
0
\end{bmatrix}
\]

\[
v = \sqrt{\mu\left(\frac{2}{r}-\frac{1}{a}\right)}
\]

Where:

- \(a\) is the semi-major axis
- \(e\) is the orbital eccentricity
- \(\nu\) is true anomaly
- \(r\) is orbital radius
- \(h\) is specific angular momentum
- \(\mu\) is Earth’s gravitational parameter
- \(v\) is instantaneous orbital speed

The perifocal position and velocity vectors are transformed into the
Earth-Centered Inertial frame using a 3-1-3 Euler-angle rotation sequence
based on right ascension of the ascending node, inclination, and argument
of periapsis.

## Time Propagation

The simulation advances mean anomaly linearly with time:

\[
M = M_0 + n(t-t_0)
\]

\[
n = \sqrt{\frac{\mu}{a^3}}
\]

Kepler’s equation is then solved numerically using Newton-Raphson iteration:

\[
M = E - e\sin E
\]

The eccentric anomaly is converted into true anomaly, which is used to
calculate the satellite’s current radius, position, velocity, and speed.

## Constants

- Earth gravitational parameter: \( \mu = 398600.4418\ \mathrm{km^3/s^2} \)
- Earth radius: \( 6378.137\ \mathrm{km} \)
- Units: kilometers, seconds, and kilometers per second

## Technologies Used

- HTML
- CSS
- JavaScript
- Three.js
- GitHub Pages

## How to Run Locally

1. Download or clone this repository.
2. Open `index.html` in a modern web browser.
3. Adjust the orbital elements using the control panel.
4. Use the camera to rotate, zoom, and explore the orbit.

## Project Structure

```text
vis-viva-orbital-simulator/
├── index.html
├── style.css
├── orbital-mechanics.js
├── main.js
├── README.md
└── .gitignore
```


## License

This project is released for educational and competition use.
