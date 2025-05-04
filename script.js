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

// Exercise system
let exerciseList = [];
function registerExercise(exercise) {
  exerciseList.push(exercise);
}
window.registerExercise = registerExercise;

function createDevice(type, x, y, name) {
  const template = JSON.parse(JSON.stringify(deviceTemplates[type]));
  return { ...template, x, y, hostname: name };
}

// CLI state
let devices = {};
let links = [];
let currentDevice = null;
let currentExercise = null;
let mode = 'exec';
let currentInterface = null;
let history = [];
let historyIndex = -1;

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

function matchCommand(input, full) {
  return full.startsWith(input);
}

function handleCommand(e) {
  if (e.key !== 'Enter') return;
  const input = commandInput.value.trim();
  commandInput.value = '';
  if (!input) return;

  const config = devices[currentDevice];
  print(`${promptText.textContent} ${input}`);

  history.push(input);
  historyIndex = history.length;

  if (matchCommand(input, 'enable')) {
    mode = 'enable';
  }
  else if (matchCommand(input, 'configure terminal') && mode === 'enable') {
    mode = 'config';
  }
  else if (matchCommand(input, 'interface') && mode === 'config') {
    const intf = input.split(' ')[1];
    const found = Object.keys(config.interfaces).find(i => i.toLowerCase().startsWith(intf.toLowerCase()));
    if (found) {
      currentInterface = found;
      mode = 'interface';
    } else {
      print('% Invalid interface');
    }
  }
  else if (input.startsWith('ip address') && mode === 'interface' && currentInterface) {
    const parts = input.split(' ');
    const ip = parts[2];
    config.interfaces[currentInterface].ip = ip;
    print(`* IP address set: ${ip}`);
  }
  else if ((matchCommand(input, 'no shutdown') || input === 'no shut') && mode === 'interface') {
    config.interfaces[currentInterface].up = true;
    print(`* ${currentInterface} is now up`);
  }
  else if (matchCommand(input, 'exit')) {
    if (mode === 'interface') {
      mode = 'config';
      currentInterface = null;
    } else if (mode === 'config') {
      mode = 'enable';
    } else if (mode === 'enable') {
      mode = 'exec';
    }
  }
  else if (input === 'show ip interface brief') {
    print('Interface\t\tIP Address\t\tStatus');
    for (const [intf, conf] of Object.entries(config.interfaces)) {
      print(`${intf}\t${conf.ip || 'unassigned'}\t\t${conf.up ? 'up' : 'down'}`);
    }
  }
  else if (input === 'show running-config' || input === 'show run') {
    print(`hostname ${config.hostname}`);
    for (const [intf, conf] of Object.entries(config.interfaces)) {
      print(`interface ${intf}`);
      if (conf.ip) print(` ip address ${conf.ip}`);
      if (conf.up) print(` no shutdown`);
    }
  }
  else if (input.startsWith('hostname ') && mode === 'config') {
    const newName = input.split(' ')[1];
    config.hostname = newName;
    updatePrompt();
  }
  else if (input.startsWith('ping ')) {
    const ip = input.split(' ')[1];
    let found = false;
    for (const dev of Object.values(devices)) {
      for (const intf of Object.values(dev.interfaces)) {
        if (intf.ip === ip && intf.up) {
          found = true;
        }
      }
    }
    if (found) {
      print(`Reply from ${ip}: bytes=32 time<1ms TTL=64`);
    } else {
      print(`Request timed out.`);
    }
  }
  else {
    print('% Unknown command or incorrect mode');
  }

  updatePrompt();
  updateProgress();
}

// History navigation
commandInput.addEventListener('keydown', function (e) {
  if (e.key === 'ArrowUp') {
    if (historyIndex > 0) {
      historyIndex--;
      commandInput.value = history[historyIndex];
    }
  } else if (e.key === 'ArrowDown') {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      commandInput.value = history[historyIndex];
    } else {
      commandInput.value = '';
    }
  }
});

// Tab completion
commandInput.addEventListener('keydown', function (e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const inputVal = commandInput.value.trim();
    const partial = inputVal.split(' ')[0];
    const commands = ['enable', 'configure terminal', 'interface', 'ip address', 'no shutdown', 'exit', 'show ip interface brief', 'show running-config', 'hostname', 'ping'];
    const match = commands.find(cmd => cmd.startsWith(partial));
    if (match) {
      commandInput.value = match;
    }
  }
});

// Topology drawing (for exercises)
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

// Task progress (for exercises only)
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

// Run exercise from external page
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

// Auto-start single exercise if loaded
window.addEventListener('load', () => {
  if (exerciseList.length === 1) {
    startExercise(exerciseList[0]);
  }
});
