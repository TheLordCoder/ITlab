// Device templates
const deviceTemplates = {
  router: {
    type: 'router',
    shape: 'circle',
    interfaces: { 'Gig0/0': { ip: null, up: false } }
  },
  switch: {
    type: 'switch',
    shape: 'rect',
    interfaces: { 'Fa0/1': { ip: null, up: false } }
  }
};

let exerciseOptions = [];
function registerExercise(exercise) {
  exerciseOptions.push(exercise);
}
window.registerExercise = registerExercise;

function createDevice(type, x, y, name) {
  const template = JSON.parse(JSON.stringify(deviceTemplates[type]));
  return { ...template, x, y, hostname: name };
}

let currentDevice = null;
let mode = 'exec';
let currentInterface = null;
let currentTask = null;
let devices = {};
let links = [];

function renderExerciseMenu() {
  const app = document.getElementById('app');
  const container = document.createElement('div');
  container.id = 'exerciseMenu';
  container.style.padding = '20px';
  container.innerHTML = '<h2>Select an Exercise</h2>';

  exerciseOptions.forEach((ex, i) => {
    const btn = document.createElement('button');
    btn.textContent = ex.name;
    btn.onclick = () => startExercise(i);
    btn.style.margin = '10px';
    container.appendChild(btn);
  });
  app.innerHTML = '';
  app.appendChild(container);
}

function startExercise(index) {
  const app = document.getElementById('app');
  currentTask = exerciseOptions[index];
  devices = currentTask.devices();
  links = currentTask.links;

  app.innerHTML = `
    <div id="topology">
      <div id="taskbar">
        <span id="taskText"></span>
        <span id="taskProgress"></span>
      </div>
      <svg id="network-svg" width="100%" height="100%"></svg>
    </div>
    <div id="cli-panel">
      <div id="cli-header">
        <span id="cli-title">CLI</span>
        <button onclick="closeCli()">Close</button>
      </div>
      <div id="output"></div>
      <div id="inputArea">
        <span id="promptText"></span>
        <input type="text" id="commandInput" autocomplete="off" />
      </div>
    </div>
  `;
  document.getElementById('commandInput').addEventListener('keydown', handleCommand);
  drawTopology();
  updateProgress();
}

function drawTopology() {
  const svg = document.getElementById('network-svg');
  svg.innerHTML = '';
  links.forEach(([a, b]) => {
    const da = devices[a];
    const db = devices[b];
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', da.x);
    line.setAttribute('y1', da.y);
    line.setAttribute('x2', db.x);
    line.setAttribute('y2', db.y);
    svg.appendChild(line);
  });
  for (const [name, dev] of Object.entries(devices)) {
    if (dev.shape === 'circle') {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', dev.x);
      circle.setAttribute('cy', dev.y);
      circle.setAttribute('r', 20);
      circle.addEventListener('click', () => openCli(name));
      svg.appendChild(circle);
    } else {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', dev.x - 20);
      rect.setAttribute('y', dev.y - 20);
      rect.setAttribute('width', 40);
      rect.setAttribute('height', 40);
      rect.addEventListener('click', () => openCli(name));
      svg.appendChild(rect);
    }
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', dev.x - 10);
    label.setAttribute('y', dev.y + 35);
    label.textContent = name;
    svg.appendChild(label);
  }
}

function updateProgress() {
  const taskText = document.getElementById('taskText');
  const taskProgress = document.getElementById('taskProgress');
  const total = currentTask.tasks.length;
  const completed = currentTask.tasks.filter(t => t.check(devices)).length;
  taskText.textContent = currentTask.tasks.map(t => t.description).join(' | ');
  taskProgress.textContent = `Completed: ${(completed / total * 100).toFixed(0)}%`;
}

function openCli(name) {
  currentDevice = name;
  document.getElementById('cli-panel').style.display = 'flex';
  promptText.textContent = `${devices[name].hostname}>`;
  mode = 'exec';
  currentInterface = null;
  output.innerHTML = '';
  print(`* Connected to ${name}`);
}

function closeCli() {
  document.getElementById('cli-panel').style.display = 'none';
}

function print(line) {
  const div = document.createElement('div');
  div.textContent = line;
  output.prepend(div);
}

function handleCommand(e) {
  if (e.key !== 'Enter') return;
  const input = commandInput.value.trim();
  commandInput.value = '';
  print(`${promptText.textContent} ${input}`);

  const config = devices[currentDevice];

  if (input === 'enable') {
    mode = 'enable';
    promptText.textContent = `${config.hostname}#`;
  } else if (input === 'configure terminal' && mode === 'enable') {
    mode = 'config';
    promptText.textContent = `${config.hostname}(config)#`;
  } else if (input.startsWith('interface ') && mode === 'config') {
    const intf = input.split(' ')[1];
    if (config.interfaces[intf]) {
      currentInterface = intf;
      mode = 'interface';
      promptText.textContent = `${config.hostname}(config-if)#`;
    } else {
      print('% Invalid interface');
    }
  } else if (input.startsWith('ip address') && mode === 'interface' && currentInterface) {
    const parts = input.split(' ');
    const ip = parts[2];
    config.interfaces[currentInterface].ip = ip;
    print(`* IP address set: ${ip}`);
  } else if ((input === 'no shutdown' || input === 'no shut') && mode === 'interface' && currentInterface) {
    config.interfaces[currentInterface].up = true;
    print(`* ${currentInterface} enabled`);
  } else if (input === 'exit') {
    if (mode === 'interface') {
      mode = 'config';
      currentInterface = null;
      promptText.textContent = `${config.hostname}(config)#`;
    } else if (mode === 'config') {
      mode = 'enable';
      promptText.textContent = `${config.hostname}#`;
    } else if (mode === 'enable') {
      mode = 'exec';
      promptText.textContent = `${config.hostname}>`;
    }
  } else {
    print('% Unknown command');
  }

  updateProgress();
}

document.addEventListener('DOMContentLoaded', renderExerciseMenu);
