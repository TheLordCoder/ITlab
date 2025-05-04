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

// Exercise support
let exerciseList = [];
function registerExercise(exercise) {
  exerciseList.push(exercise);
}
window.registerExercise = registerExercise;

function createDevice(type, x, y, name) {
  const template = JSON.parse(JSON.stringify(deviceTemplates[type]));
  return { ...template, x, y, hostname: name };
}

// CLI and simulation state
let devices = {};
let links = [];
let currentDevice = null;
let currentExercise = null;
let mode = 'exec';
let currentInterface = null;

function print(line) {
  const div = document.createElement('div');
  div.textContent = line;
  output.prepend(div);
}

function updatePrompt() {
  const d = devices[currentDevice];
  if (!d) return;
  const base = d.hostname;
  if (mode === 'exec') promptText.textContent = `${base}>`;
  else if (mode === 'enable') promptText.textContent = `${base}#`;
  else if (mode === 'config') promptText.textContent = `${base}(config)#`;
  else if (mode === 'interface') promptText.textContent = `${base}(config-if)#`;
}

function openCli(name) {
  currentDevice = name;
  mode = 'exec';
  currentInterface = null;
  document.getElementById('cli-panel').style.display = 'flex';
  output.innerHTML = '';
  print(`* Connected to ${name}`);
  updatePrompt();
}

function closeCli() {
  document.getElementById('cli-panel').style.display = 'none';
}

function handleCommand(e) {
  if (e.key !== 'Enter') return;
  const input = commandInput.value.trim();
  commandInput.value = '';
  const config = devices[currentDevice];
  print(`${promptText.textContent} ${input}`);

  if (input === 'enable') {
    mode = 'enable';
  } else if (input === 'configure terminal' && mode === 'enable') {
    mode = 'config';
  } else if (input.startsWith('interface ') && mode === 'config') {
    const intf = input.split(' ')[1];
    if (config.interfaces[intf]) {
      currentInterface = intf;
      mode = 'interface';
    } else {
      print('% Invalid interface');
    }
  } else if (input.startsWith('ip address') && mode === 'interface' && currentInterface) {
    const ip = input.split(' ')[2];
    config.interfaces[currentInterface].ip = ip;
    print(`* IP address set: ${ip}`);
  } else if ((input === 'no shutdown' || input === 'no shut') && mode === 'interface') {
    config.interfaces[currentInterface].up = true;
    print(`* ${currentInterface} is now up`);
  } else if (input === 'exit') {
    if (mode === 'interface') {
      mode = 'config';
      currentInterface = null;
    } else if (mode === 'config') {
      mode = 'enable';
    } else if (mode === 'enable') {
      mode = 'exec';
    }
  } else if (input === 'show ip interface brief') {
    print('Interface\t\tIP Address\t\tStatus');
    for (const [intf, conf] of Object.entries(config.interfaces)) {
      print(`${intf}\t${conf.ip || 'unassigned'}\t\t${conf.up ? 'up' : 'down'}`);
    }
  } else {
    print('% Unknown command');
  }

  updatePrompt();
  updateProgress();
}

// Topology rendering for exercises
function drawTopology() {
  const svg = document.getElementById('network-svg');
  if (!svg) return;
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
    const node = dev.shape === 'circle'
      ? document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      : document.createElementNS('http://www.w3.org/2000/svg', 'rect');

    if (dev.shape === 'circle') {
      node.setAttribute('cx', dev.x);
      node.setAttribute('cy', dev.y);
      node.setAttribute('r', 20);
    } else {
      node.setAttribute('x', dev.x - 20);
      node.setAttribute('y', dev.y - 20);
      node.setAttribute('width', 40);
      node.setAttribute('height', 40);
    }

    node.addEventListener('click', () => openCli(name));
    svg.appendChild(node);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', dev.x - 10);
    label.setAttribute('y', dev.y + 35);
    label.textContent = name;
    svg.appendChild(label);
  }
}

// Progress tracking (for exercises only)
function updateProgress() {
  const taskText = document.getElementById('taskText');
  const taskProgress = document.getElementById('taskProgress');
  if (!taskText || !currentExercise) return;

  const tasks = currentExercise.tasks;
  const total = tasks.length;
  const passed = tasks.filter(t => t.check(devices)).length;
  const percent = Math.round((passed / total) * 100);

  taskText.textContent = tasks.map(t => t.description).join(' | ');
  taskProgress.textContent = `Completed: ${percent}%`;
}

// Called from theory pages
function startExercise(exercise) {
  currentExercise = exercise;
  devices = exercise.devices();
  links = exercise.links;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div id="topology">
      <div id="taskbar">
        <span id="taskText"></span>
        <span id="taskProgress"></span>
      </div>
      <svg id="network-svg"></svg>
    </div>
    <div id="cli-panel" style="display: none;">
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
  updatePrompt();
  updateProgress();
}

// Auto-start exercise if only one is defined
window.addEventListener('load', () => {
  if (exerciseList.length === 1) {
    startExercise(exerciseList[0]);
  }
});
