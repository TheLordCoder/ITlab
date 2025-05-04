const promptText = document.getElementById('promptText');
const commandInput = document.getElementById('commandInput');
const output = document.getElementById('output');

let mode = 'exec';
let currentInterface = null;

let commandHistory = [];
let historyIndex = -1;

const deviceConfig = {
  hostname: "Router",
  interfaces: {
    "GigabitEthernet0/1": { ip: null, up: false },
    "FastEthernet0/1": { ip: null, up: false },
    "Vlan1": { ip: null, up: false }
  }
};

const commands = {
  'enable': ['en'],
  'configure terminal': ['conf t'],
  'interface GigabitEthernet0/1': ['int gi0/1'],
  'interface FastEthernet0/1': ['int fa0/1'],
  'interface Vlan1': ['int vlan1'],
  'ip address': [],
  'no shutdown': ['no shut'],
  'shutdown': [],
  'exit': [],
  'hostname': [],
  'show running-config': []
};

function updatePrompt() {
  switch (mode) {
    case 'exec': promptText.textContent = `${deviceConfig.hostname}>`; break;
    case 'enable': promptText.textContent = `${deviceConfig.hostname}#`; break;
    case 'config': promptText.textContent = `${deviceConfig.hostname}(config)#`; break;
    case 'interface': promptText.textContent = `${deviceConfig.hostname}(config-if)#`; break;
  }
}

function printOutput(line) {
  const lineDiv = document.createElement('div');
  lineDiv.textContent = line;
  output.prepend(lineDiv);
}

function normalize(cmd) {
  return cmd.trim().toLowerCase().replace(/\s+/g, ' ');
}

function matchCommand(cmd) {
  const input = normalize(cmd);
  for (const fullCmd in commands) {
    if (normalize(fullCmd) === input) return fullCmd;
    if (commands[fullCmd].some(short => normalize(short) === input)) return fullCmd;
  }
  return null;
}

function autoComplete(inputValue) {
  const matches = Object.keys(commands).filter(c =>
    c.toLowerCase().startsWith(inputValue.toLowerCase()));
  return matches.length === 1 ? matches[0] : null;
}

function processCommand(input) {
  const normalized = normalize(input);
  const matched = matchCommand(input);
  printOutput(`${promptText.textContent} ${input}`);

  if (normalized === 'show running-config') {
    printOutput('Building configuration...');
    printOutput('');
    printOutput(`hostname ${deviceConfig.hostname}`);
    for (let intf in deviceConfig.interfaces) {
      let conf = deviceConfig.interfaces[intf];
      printOutput(`interface ${intf}`);
      if (conf.ip) printOutput(` ip address ${conf.ip}`);
      if (conf.up) printOutput(` no shutdown`);
      else printOutput(` shutdown`);
    }
    printOutput('end');
    return;
  }

  switch (mode) {
    case 'exec':
      if (matched === 'enable') {
        mode = 'enable';
      } else {
        printOutput('% Invalid command at this level.');
      }
      break;

    case 'enable':
      if (matched === 'configure terminal') {
        mode = 'config';
      } else if (normalized === 'disable') {
        mode = 'exec';
      } else {
        printOutput('% Unknown command.');
      }
      break;

    case 'config':
      if (normalized.startsWith('interface')) {
        const iface = input.split(' ')[1];
        if (deviceConfig.interfaces[iface]) {
          mode = 'interface';
          currentInterface = iface;
        } else {
          printOutput('% Invalid interface.');
        }
      } else if (normalized.startsWith('hostname')) {
        const newName = input.split(' ')[1];
        deviceConfig.hostname = newName;
      } else if (matched === 'exit') {
        mode = 'enable';
      } else {
        printOutput('% Invalid configuration command.');
      }
      break;

    case 'interface':
      if (normalized.startsWith('ip address')) {
        const parts = input.split(' ');
        const ip = parts[2];
        const mask = parts[3];
        if (deviceConfig.interfaces[currentInterface]) {
          deviceConfig.interfaces[currentInterface].ip = `${ip} ${mask}`;
        }
      } else if (matched === 'no shutdown') {
        deviceConfig.interfaces[currentInterface].up = true;
      } else if (matched === 'shutdown') {
        deviceConfig.interfaces[currentInterface].up = false;
      } else if (matched === 'exit') {
        mode = 'config';
        currentInterface = null;
      } else {
        printOutput('% Unknown interface command.');
      }
      break;

    default:
      printOutput('% Internal error.');
  }

  updatePrompt();
}

commandInput.addEventListener('keydown', function (e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const suggestion = autoComplete(commandInput.value);
    if (suggestion) {
      commandInput.value = suggestion;
    }
  }

  if (e.key === 'Enter') {
    const value = commandInput.value.trim();
    if (value !== '') {
      processCommand(value);
      commandHistory.push(value);
      historyIndex = commandHistory.length;
      commandInput.value = '';
    }
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (historyIndex > 0) {
      historyIndex--;
      commandInput.value = commandHistory[historyIndex];
    }
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      commandInput.value = commandHistory[historyIndex];
    } else {
      historyIndex = commandHistory.length;
      commandInput.value = '';
    }
  }
});

updatePrompt();
