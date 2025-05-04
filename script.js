const svg = document.getElementById('network-svg');
const commandInput = document.getElementById('commandInput');
const output = document.getElementById('output');
const promptText = document.getElementById('promptText');

let currentDevice = null;
let mode = 'exec';
let currentInterface = null;

const devices = {
  R1: { x: 100, y: 200, hostname: 'R1', interfaces: { 'GigabitEthernet0/1': { ip: '192.168.1.1', up: true } } },
  S1: { x: 300, y: 200, hostname: 'S1', interfaces: { 'FastEthernet0/1': { ip: null, up: false }, 'Vlan1': { ip: '192.168.1.2', up: true } } },
  R2: { x: 500, y: 200, hostname: 'R2', interfaces: { 'GigabitEthernet0/1': { ip: '192.168.1.3', up: true } } },
  PC1: { x: 700, y: 200, hostname: 'PC1', interfaces: { 'Ethernet0': { ip: '192.168.1.100', up: true } } },
};

const links = [
  ['R1', 'S1'],
  ['S1', 'R2'],
  ['R2', 'PC1']
];

function drawTopology() {
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
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', dev.x);
    circle.setAttribute('cy', dev.y);
    circle.setAttribute('r', 20);
    circle.addEventListener('click', () => openCli(name));
    svg.appendChild(circle);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', dev.x - 10);
    label.setAttribute('y', dev.y + 35);
    label.textContent = name;
    svg.appendChild(label);
  }
}

drawTopology();

function openCli(name) {
  currentDevice = name;
  document.getElementById('cli-panel').style.display = 'flex';
  promptText.textContent = `${devices[name].hostname}>`;
  mode = 'exec';
  currentInterface = null;
  output.innerHTML = '';
  print(`* Yhdistetty laitteeseen ${name}`);
}

function closeCli() {
  document.getElementById('cli-panel').style.display = 'none';
}

function print(line) {
  const div = document.createElement('div');
  div.textContent = line;
  output.prepend(div);
}

function canPing(from, toIP) {
  for (const dev of Object.values(devices)) {
    for (const intf of Object.values(dev.interfaces)) {
      if (intf.ip === toIP && intf.up) return true;
    }
  }
  return false;
}

commandInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
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
      print(`* IP-osoite asetettu: ${ip}`);
    } else if ((input === 'no shutdown' || input === 'no shut') && mode === 'interface' && currentInterface) {
      config.interfaces[currentInterface].up = true;
      print(`* ${currentInterface} aktivoitu`);
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
    } else if (input === 'show ip interface brief') {
      print('Interface\t\tIP-Address\t\tStatus');
      for (const [intf, conf] of Object.entries(config.interfaces)) {
        print(`${intf}\t${conf.ip || 'unassigned'}\t\t${conf.up ? 'up' : 'administratively down'}`);
      }
    } else if (input.startsWith('ping ')) {
      const targetIP = input.split(' ')[1];
      const success = canPing(currentDevice, targetIP);
      if (success) {
        print(`Reply from ${targetIP}: bytes=32 time=1ms TTL=64`);
      } else {
        print(`Request timed out.`);
      }
    } else if (input === '?') {
      print('Saatavilla komennot:');
      print('- enable, configure terminal, interface, ip address, no shutdown, exit');
      print('- show ip interface brief, ping <ip-osoite>');
    } else {
      print('% Tuntematon komento');
    }
  }
});
