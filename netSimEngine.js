export class Router {
  constructor(name) {
    this.hostname = name;
    this.interfaces = {};
    this.currentMode = "user";
    this.currentInterface = null;
    this.commandHistory = [];
    this.historyIndex = -1;
  }

  commandTree = {
    user: [["enable"]],
    privileged: [
      ["configure", "terminal"],
      ["show", "ip", "interface", "brief"],
      ["show", "running-config"],
      ["ping"],
      ["hostname"]
    ],
    config: [
      ["interface"],
      ["exit"],
      ["hostname"]
    ],
    int: [
      ["ip", "address"],
      ["no", "shutdown"],
      ["exit"]
    ]
  };

  prompt() {
    switch (this.currentMode) {
      case "user": return `${this.hostname}>`;
      case "privileged": return `${this.hostname}#`;
      case "config": return `${this.hostname}(config)#`;
      case "int": return `${this.hostname}(config-if)#`;
      default: return `${this.hostname}>`;
    }
  }

  autocomplete(inputLine) {
    const tokens = inputLine.trim().split(/\s+/);
    const modeTree = this.commandTree[this.currentMode];
    if (!modeTree) return inputLine;

    for (const path of modeTree) {
      if (path.length >= tokens.length) {
        let match = true;
        for (let i = 0; i < tokens.length; i++) {
          if (!path[i].startsWith(tokens[i])) {
            match = false;
            break;
          }
        }
        if (match) {
          return path.slice(0, tokens.length + 1).join(" ");
        }
      }
    }
    return inputLine;
  }

  matchCommand(inputLine) {
    const tokens = inputLine.trim().split(/\s+/);
    const modeTree = this.commandTree[this.currentMode];
    if (!modeTree) return null;

    let matches = [];

    for (const path of modeTree) {
      if (path.length < tokens.length) continue;
      let match = true;
      for (let i = 0; i < tokens.length; i++) {
        if (!path[i] || !path[i].startsWith(tokens[i])) {
          match = false;
          break;
        }
      }
      if (match) {
        matches.push(path);
      }
    }

    if (matches.length === 1) return matches[0];
    if (matches.length > 1) return "ambiguous";
    return null;
  }

  showIpInterfaceBrief() {
    const rows = Object.entries(this.interfaces).map(([name, data]) => {
      return `${name}\t${data.ip || "unassigned"}\t${data.status}`;
    });
    return ["Interface\tIP Address\tStatus", ...rows].join("\n");
  }

  showRunningConfig() {
    let lines = [`hostname ${this.hostname}`];
    for (const [intf, data] of Object.entries(this.interfaces)) {
      lines.push(`interface ${intf}`);
      if (data.ip) lines.push(` ip address ${data.ip}`);
      if (data.status === "up") lines.push(` no shutdown`);
      lines.push(" exit");
    }
    return lines.join("\n");
  }

  configureInterface(name) {
    if (!this.interfaces[name]) {
      this.interfaces[name] = { ip: null, status: "down" };
    }
    this.currentInterface = name;
    this.currentMode = "int";
    return `Entered interface configuration mode (${name})`;
  }

  setInterfaceIP(ip) {
    if (this.currentInterface) {
      this.interfaces[this.currentInterface].ip = ip;
      return `IP address ${ip} assigned to ${this.currentInterface}`;
    }
    return "No interface selected";
  }

  noShutdown() {
    if (this.currentInterface) {
      this.interfaces[this.currentInterface].status = "up";
      return `${this.currentInterface} is now up`;
    }
    return "No interface selected";
  }

  ping(ip, network) {
    for (const device of Object.values(network.devices)) {
      if (device === this) continue;
      for (const iface of Object.values(device.interfaces)) {
        if (iface.ip === ip && iface.status === "up") {
          return `Reply from ${ip}: bytes=32 time=1ms TTL=64`;
        }
      }
    }
    return `Destination ${ip} unreachable`;
  }

  processCommand(input, network) {
    input = input.trim();
    if (!input) return "";

    this.commandHistory.push(input);
    this.historyIndex = this.commandHistory.length;

    if (input.endsWith("?")) {
      return this.suggestNext(input.replace("?", "").trim());
    }

    const matched = this.matchCommand(input);
    if (matched === "ambiguous") return "% Ambiguous command";
    if (!matched) return "% Invalid input detected at '^' marker.";

    const args = input.split(/\s+/);
    const [cmd, ...rest] = matched;

    switch (this.currentMode) {
      case "user":
        if (cmd === "enable") {
          this.currentMode = "privileged";
          return "Entered privileged mode";
        }
        break;

      case "privileged":
        if (cmd === "configure" && rest[0] === "terminal") {
          this.currentMode = "config";
          return "Entered configuration mode";
        }
        if (cmd === "show" && rest.join(" ") === "ip interface brief") {
          return this.showIpInterfaceBrief();
        }
        if (cmd === "show" && rest.join(" ") === "running-config") {
          return this.showRunningConfig();
        }
        if (cmd === "ping") {
          const target = args[1];
          if (!target) return "% Incomplete command.";
          return this.ping(target, network);
        }
        if (cmd === "hostname") {
          const newName = args[1];
          if (!newName) return "% Incomplete command.";
          this.hostname = newName;
          return "";
        }
        break;

      case "config":
        if (cmd === "interface") {
          const iface = args[1];
          if (!iface) return "% Incomplete command.";
          return this.configureInterface(iface);
        }
        if (cmd === "hostname") {
          const newName = args[1];
          if (!newName) return "% Incomplete command.";
          this.hostname = newName;
          return "";
        }
        if (cmd === "exit") {
          this.currentMode = "privileged";
          return "Exited config mode";
        }
        break;

      case "int":
        if (cmd === "ip" && rest[0] === "address") {
          const ip = args[2];
          if (!ip) return "% Incomplete command.";
          return this.setInterfaceIP(ip);
        }
        if (cmd === "no" && rest[0] === "shutdown") {
          return this.noShutdown();
        }
        if (cmd === "exit") {
          this.currentMode = "config";
          this.currentInterface = null;
          return "Exited interface mode";
        }
        break;
    }

    return "% Command not implemented";
  }

  suggestNext(prefix) {
    const tokens = prefix.split(/\s+/);
    const modeTree = this.commandTree[this.currentMode];
    if (!modeTree) return "";

    const suggestions = [];

    for (const path of modeTree) {
      let match = true;
      for (let i = 0; i < tokens.length; i++) {
        if (!path[i] || !path[i].startsWith(tokens[i])) {
          match = false;
          break;
        }
      }
      if (match && path.length > tokens.length) {
        suggestions.push(path[tokens.length]);
      }
    }

    return suggestions.length ? suggestions.join(" ") : "No further options.";
  }
}

export class Network {
  constructor() {
    this.devices = {};
    this.links = [];
  }

  addDevice(device) {
    this.devices[device.hostname] = device;
  }

  connect(dev1, dev2) {
    this.links.push([dev1.hostname, dev2.hostname]);
  }

  simulatePing(fromName, toIp) {
    const device = this.devices[fromName];
    return device.ping(toIp, this);
  }

  sendCommand(deviceName, command) {
    const device = this.devices[deviceName];
    return device.processCommand(command, this);
  }

  autocomplete(deviceName, input) {
    const device = this.devices[deviceName];
    return device.autocomplete(input);
  }
}

// ✅ Suoraan käyttöön otettava CLI-ympäristö
export function startCLISession(outputEl, inputEl) {
  const net = new Network();
  const r1 = new Router("Router1");
  net.addDevice(r1);

  function appendOutput(text) {
    outputEl.innerHTML += text.replace(/\n/g, '<br>') + '<br>';
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  appendOutput(r1.prompt());

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const cmd = inputEl.value;
      appendOutput(r1.prompt() + ' ' + cmd);
      const result = net.sendCommand("Router1", cmd);
      if (result) appendOutput(result);
      appendOutput(r1.prompt());
      inputEl.value = "";
    } else if (e.key === "Tab") {
      e.preventDefault();
      inputEl.value = net.autocomplete("Router1", inputEl.value);
    }
  });
}
