let mode = 'exec';
let interfaceConfigured = false;
let interfaceUp = false;
let hostnameChanged = false;

const outputArea = document.getElementById('output');
const promptText = document.getElementById('promptText');
const inputField = document.getElementById('commandInput');
const taskStatus = document.getElementById('taskStatus');
const taskText = document.getElementById('taskText');
const interfaceDiv = document.getElementById('interface');

const tasks = [
  {
    description: "Konfiguroi GigabitEthernet0/1 IP-osoitteella 192.168.1.1/24 ja aktivoi se.",
    check: () => interfaceConfigured && interfaceUp
  },
  {
    description: "Muuta reitittimen nimeksi 'CoreRouter'.",
    check: () => hostnameChanged
  }
];

let currentTaskIndex = 0;

function loadTask(index) {
  const task = tasks[index];
  taskText.textContent = task.description;
  taskStatus.innerHTML = 'Suoritus: <span class="pending">Keskeneräinen</span>';
}

function completeTask() {
  taskStatus.innerHTML = 'Suoritus: <span class="done">Valmis</span>';
  if (currentTaskIndex + 1 < tasks.length) {
    const next = confirm("Tehtävä valmis! Haluatko siirtyä seuraavaan?");
    if (next) {
      currentTaskIndex++;
      resetState();
      loadTask(currentTaskIndex);
    }
  } else {
    alert("Kaikki tehtävät suoritettu!");
  }
}

function updateTaskStatus() {
  if (tasks[currentTaskIndex].check()) {
    completeTask();
  }
}

function resetState() {
  mode = 'exec';
  interfaceConfigured = false;
  interfaceUp = false;
  hostnameChanged = false;
  promptText.textContent = 'Router>';
  interfaceDiv.className = 'interface down';
  outputArea.innerHTML = '';
}

inputField.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    const command = inputField.value.trim();
    if (command !== '') {
      processCommand(command);
      inputField.value = '';
    }
  }
});

function updateInterfaceVisual() {
  if (interfaceUp) {
    interfaceDiv.classList.remove('down');
    interfaceDiv.classList.add('up');
  } else {
    interfaceDiv.classList.remove('up');
    interfaceDiv.classList.add('down');
  }
}

function processCommand(cmd) {
  const currentPrompt = promptText.textContent;
  outputArea.innerHTML += `<div>${currentPrompt} ${cmd}</div>`;
  let response = '';

  switch (mode) {
    case 'exec':
      if (cmd === 'enable') {
        mode = 'enable';
        promptText.textContent = 'Router#';
      } else {
        response = '% Invalid command at this level.';
      }
      break;
    case 'enable':
      if (cmd === 'configure terminal') {
        mode = 'config';
        promptText.textContent = 'Router(config)#';
      } else if (cmd === 'disable') {
        mode = 'exec';
        promptText.textContent = 'Router>';
      } else {
        response = '% Unknown command.';
      }
      break;
    case 'config':
      if (cmd === 'interface GigabitEthernet0/1') {
        mode = 'interface';
        promptText.textContent = 'Router(config-if)#';
      } else if (cmd.startsWith('hostname')) {
        const newName = cmd.split(' ')[1];
        promptText.textContent = `${newName}#`;
        hostnameChanged = (newName === 'CoreRouter');
        response = '';
      } else if (cmd === 'exit') {
        mode = 'enable';
        promptText.textContent = 'Router#';
      } else {
        response = '% Invalid configuration command.';
      }
      break;
    case 'interface':
      if (cmd.startsWith('ip address 192.168.1.1 255.255.255.0')) {
        interfaceConfigured = true;
        response = 'IP address assigned.';
      } else if (cmd === 'no shutdown') {
        interfaceUp = true;
        response = 'Interface activated.';
        updateInterfaceVisual();
      } else if (cmd === 'exit') {
        mode = 'config';
        promptText.textContent = 'Router(config)#';
      } else {
        response = '% Unknown interface command.';
      }
      break;
    default:
      response = '% Error in mode handling.';
  }

  if (response) {
    outputArea.innerHTML += `<div>${response}</div>`;
  }

  updateTaskStatus();
  outputArea.scrollTop = outputArea.scrollHeight;
}

loadTask(currentTaskIndex);
