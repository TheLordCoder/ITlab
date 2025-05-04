const promptText = document.getElementById('promptText');
const commandInput = document.getElementById('commandInput');
const output = document.getElementById('output');

let mode = 'exec'; // Tilat: exec, enable, config, interface
let hostname = 'Router';
let interfaceUp = false;
let ipAssigned = false;

const commands = {
  'enable': ['en'],
  'configure terminal': ['conf t'],
  'interface GigabitEthernet0/1': ['int gi0/1'],
  'ip address 192.168.1.1 255.255.255.0': [],
  'no shutdown': ['no shut'],
  'exit': [],
  'hostname CoreRouter': []
};

function updatePrompt() {
  switch (mode) {
    case 'exec': promptText.textContent = `${hostname}>`; break;
    case 'enable': promptText.textContent = `${hostname}#`; break;
    case 'config': promptText.textContent = `${hostname}(config)#`; break;
    case 'interface': promptText.textContent = `${hostname}(config-if)#`; break;
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
  const matched = matchCommand(input);
  printOutput(`${promptText.textContent} ${input}`);

  if (!matched) {
    printOutput('% Unknown command or invalid input');
    return;
  }

  switch (matched) {
    case 'enable':
      mode = 'enable';
      break;

    case 'configure terminal':
      if (mode !== 'enable') {
        printOutput('% Command only available in privileged EXEC mode');
        return;
      }
      mode = 'config';
      break;

    case 'interface GigabitEthernet0/1':
      if (mode !== 'config') {
        printOutput('% Command only available in global configuration mode');
        return;
      }
      mode = 'interface';
      break;

    case 'ip address 192.168.1.1 255.255.255.0':
      if (mode !== 'interface') {
        printOutput('% Command only available in interface configuration mode');
        return;
      }
      ipAssigned = true;
      printOutput('');
      break;

    case 'no shutdown':
      if (mode !== 'interface') {
        printOutput('% Command only available in interface configuration mode');
        return;
      }
      interfaceUp = true;
      printOutput('');
      break;

    case 'exit':
      if (mode === 'interface') {
        mode = 'config';
      } else if (mode === 'config') {
        mode = 'enable';
      } else if (mode === 'enable') {
        mode = 'exec';
      }
      break;

    case 'hostname CoreRouter':
      if (mode !== 'config') {
        printOutput('% Command only available in global configuration mode');
        return;
      }
      hostname = 'CoreRouter';
      break;

    default:
      printOutput('% Feature not yet implemented');
  }

  updatePrompt();
}

// TAB-täydennys
commandInput.addEventListener('keydown', function (e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const suggestion = autoComplete(commandInput.value);
    if (suggestion) {
      commandInput.value = suggestion;
    }
  }
});

// ENTER-komento
commandInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    const value = commandInput.value.trim();
    if (value !== '') {
      processCommand(value);
      commandInput.value = '';
    }
  }
});

updatePrompt();
