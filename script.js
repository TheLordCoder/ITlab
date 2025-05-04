const commandInput = document.getElementById('commandInput');
const output = document.getElementById('output');
const promptText = document.getElementById('promptText');
const tasksContainer = document.getElementById('tasks');

let currentDevice = 'R1';
let mode = 'exec';
let currentInterface = null;

let deviceConfigs = {
  R1: {
    hostname: 'R1',
    interfaces: { 'GigabitEthernet0/1': { ip: null, up: false } }
  },
  R2: {
    hostname: 'R2',
    interfaces: { 'GigabitEthernet0/1': { ip: null, up: false } }
  },
  S1: {
    hostname: 'S1',
    interfaces: {
      'FastEthernet0/1': { ip: null, up: false },
      'Vlan1': { ip: '192.168.1.2', up: true }
    }
  },
  PC1: {
    hostname: 'PC1',
    interfaces: { 'Ethernet0': { ip: '192.168.1.100', up: true } }
  }
};

const tasks = [
  {
    text: 'Anna R1:lle IP osoite Gi0/1:lle ja käynnistä se',
    check: () =>
      deviceConfigs['R1'].interfaces['GigabitEthernet0/1'].ip &&
      deviceConfigs['R1'].interfaces['GigabitEthernet0/1'].up
  },
  {
    text: 'Tarkista onko Vlan1 aktiivinen S1:llä',
    check: () => deviceConfigs['S1'].interfaces['Vlan1'].up
  },
  {
    text: 'Varmista, että PC1:n Ethernet0 on UP',
    check: () => deviceConfigs['PC1'].interfaces['Ethernet0'].up
  }
];

function renderTasks() {
  tasksContainer.innerHTML = '';
  tasks.forEach((task) => {
    const el = document.createElement('div');
    el.className = 'task';
    const done = task.check() ? 'done' : 'pending';
    el.innerHTML = `• ${task.text} <span class="${done}">${
      done === 'done' ? 'Valmis' : 'Keskeneräinen'
    }</span>`;
    tasksContainer.appendChild(el);
  });
}

function print(line) {
  const div = document.createElement('div');
  div.textContent = line;
  output.prepend(div);
}

function selectDevice(name) {
  currentDevice = name;
  promptText.textContent = `${deviceConfigs[name].hostname}>`;
  mode = 'exec';
  currentInterface = null;
  print(`* Yhdistetty laitteeseen ${name}`);
}

commandInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    const input = commandInput.value.trim();
    commandInput.value = '';
    print(`${promptText.textContent} ${input}`);

    const config = deviceConfigs[currentDevice];

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
    } else if (
      input.startsWith('ip address') &&
      mode === 'interface' &&
      currentInterface
    ) {
      const parts = input.split(' ');
      const ip = parts[2];
      config.interfaces[currentInterface].ip = ip;
      print(`* IP-osoite asetettu: ${ip}`);
    } else if (
      (input === 'no shutdown' || input === 'no shut') &&
      mode === 'interface' &&
      currentInterface
    ) {
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
        print(
          `${intf}\t${conf.ip || 'unassigned'}\t\t${
            conf.up ? 'up' : 'administratively down'
          }`
        );
      }
    } else if (input === '?') {
      print('Saatavilla komennot:');
      print('- enable, configure terminal, interface, ip address, no shutdown, exit');
      print('- show ip interface brief');
    } else {
      print('% Tuntematon komento');
    }

    renderTasks();
  }
});

renderTasks();
