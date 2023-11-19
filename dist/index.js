var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Device: () => Device,
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);

// src/commands/setColors.ts
var import_color_convert = require("color-convert");
var ct = __toESM(require("color-temperature"));
var lerp = (x, y, a) => x * (1 - a) + y * a;
function lerpColor(a, b, amount) {
  var ah = parseInt(a.replace(/#/g, ""), 16), ar = ah >> 16, ag = ah >> 8 & 255, ab = ah & 255, bh = parseInt(b.replace(/#/g, ""), 16), br = bh >> 16, bg = bh >> 8 & 255, bb = bh & 255, rr = ar + amount * (br - ar), rg = ag + amount * (bg - ag), rb = ab + amount * (bb - ab);
  return "#" + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
}
var interpolate = function(value, s1, s2, t1, t2, slope) {
  slope = slope || 0.5;
  if (value < Math.min(s1, s2)) {
    return Math.min(s1, s2) === s1 ? t1 : t2;
  }
  if (value > Math.max(s1, s2)) {
    return Math.max(s1, s2) === s1 ? t1 : t2;
  }
  value = s2 - value;
  var C1 = { x: s1, y: t1 };
  var C3 = { x: s2, y: t2 };
  var C2 = {
    x: C3.x,
    y: C1.y + Math.abs(slope) * (C3.y - C1.y)
  };
  var percent = value / (C3.x - C1.x);
  return C1.y * b1(percent) + C2.y * b2(percent) + C3.y * b3(percent);
  function b1(t) {
    return t * t;
  }
  function b2(t) {
    return 2 * t * (1 - t);
  }
  function b3(t) {
    return (1 - t) * (1 - t);
  }
};
function setColor(options) {
  var device = this;
  return new Promise((resolve, _reject) => {
    var rgb2 = { r: 0, g: 0, b: 0 };
    var message;
    if (options.kelvin) {
      var kelvin = parseFloat(options.kelvin.toString().replace(/[^0-9]/g, ""));
      message = JSON.stringify(
        {
          msg: {
            cmd: "colorwc",
            data: {
              colorTemInKelvin: kelvin
            }
          }
        }
      );
    } else {
      if (options.hex !== void 0) {
        var newColor = import_color_convert.hex.rgb(options.hex);
        rgb2 = {
          r: newColor[0],
          g: newColor[1],
          b: newColor[2]
        };
      } else if (options.hsl !== void 0) {
        var newColor = import_color_convert.hsl.rgb(options.hsl);
        rgb2 = {
          r: newColor[0],
          g: newColor[1],
          b: newColor[2]
        };
      } else if (options.rgb !== void 0) {
        rgb2 = {
          r: options.rgb[0],
          g: options.rgb[1],
          b: options.rgb[2]
        };
      }
      message = JSON.stringify(
        {
          msg: {
            cmd: "colorwc",
            data: {
              color: rgb2
            }
          }
        }
      );
    }
    device.socket?.send(message, 0, message.length, 4003, device.ip, async () => {
      if (rgb2) {
        device.state.color = rgb2;
        device.state.colorKelvin = ct.rgb2colorTemperature({ red: rgb2.r, green: rgb2.g, blue: rgb2.b });
      } else if (kelvin) {
        var rgbColor = ct.colorTemperature2rgb(kelvin);
        device.state.color = { r: rgbColor.red, g: rgbColor.green, b: rgbColor.blue };
        device.state.colorKelvin = kelvin;
      }
      device.emit("updatedStatus", device.state, ["color"]);
      resolve();
    });
  });
}
function setBrightness(brightness) {
  return new Promise((resolve, _reject) => {
    var bright = Math.round(parseFloat(brightness.toString()) * 100) / 100;
    let message = JSON.stringify(
      {
        "msg": {
          "cmd": "brightness",
          "data": {
            "value": bright
          }
        }
      }
    );
    this.socket?.send(message, 0, message.length, 4003, this.ip, async () => {
      this.state.brightness = bright;
      resolve();
      await sleep(100);
      this.emit("updatedStatus", this.state, ["brightness"]);
    });
  });
}
function fade(options) {
  return new Promise(async (resolve, reject) => {
    var device = this;
    await updateValues(device);
    await sleep(100);
    var curHex = import_color_convert.rgb.hex(device.state.color.r, device.state.color.g, device.state.color.b);
    var curKelvin = ct.rgb2colorTemperature({ red: device.state.color.r, green: device.state.color.g, blue: device.state.color.b });
    var curBrightness = device.state.isOn == 1 ? device.state.brightness : 1;
    var targetKelvin;
    const targetBright = options.brightness;
    if (options.color?.kelvin) {
      targetKelvin = parseFloat(options.color.kelvin.toString().replace(/[^0-9]/g, ""));
    }
    var changeColor = options.color?.hex !== void 0 || options.color?.hsl !== void 0 || options.color?.rgb !== void 0;
    var startTime = Date.now();
    var newColor = "";
    if (options.color?.hsl !== void 0)
      newColor = import_color_convert.hsl.hex(options.color.hsl);
    else if (options.color?.rgb !== void 0)
      newColor = import_color_convert.rgb.hex(options.color.rgb);
    else if (options.color?.hex !== void 0)
      newColor = options.color.hex.replace(/#/g, "");
    async function stepBrightness(percent2, targetBrightness) {
      var newBright = lerp(curBrightness, targetBrightness, Math.max(Math.min(percent2, 1), 0));
      return device.actions.setBrightness(newBright);
    }
    async function stepColor(percent2, newColor2) {
      var lerpedColor = lerpColor(curHex, newColor2, Math.max(Math.min(percent2, 1), 0));
      return device.actions.setColor({ hex: "#" + lerpedColor });
    }
    async function stepKelvin(percent2, targetKelvin2) {
      var lerpedKelvin = lerp(curKelvin, targetKelvin2, Math.max(Math.min(percent2, 1), 0));
      var kelvinRGB = ct.colorTemperature2rgb(lerpedKelvin);
      return device.actions.setColor({ rgb: [kelvinRGB.red, kelvinRGB.green, kelvinRGB.blue] });
    }
    var running = true;
    var fadeEndTimeout = setTimeout(async () => {
      running = false;
      this.removeListener("fadeCancel", fadeCancelHandler);
      if (changeColor) {
        setColor.call(device, {
          hex: newColor
        });
      } else if (targetKelvin) {
        var kelvinRGB = ct.colorTemperature2rgb(targetKelvin);
        await device.actions.setColor({ rgb: [kelvinRGB.red, kelvinRGB.green, kelvinRGB.blue] });
      }
      if (targetBright !== void 0) {
        device.actions.setBrightness(targetBright);
      }
      await sleep(50);
      await device.updateValues();
      var updatedValues = [];
      if (curBrightness !== targetBright) {
        updatedValues.push("brightness");
      }
      if (changeColor) {
        updatedValues.push("color");
      }
      device.emit("updatedStatus", device.state, updatedValues);
      resolve();
    }, options.time - 100);
    function fadeCancelHandler(rejectPromise) {
      running = false;
      clearTimeout(fadeEndTimeout);
      if (rejectPromise) {
        reject("Fade got cancelled");
      } else {
        resolve();
      }
    }
    this.once("fadeCancel", fadeCancelHandler);
    while (running) {
      var startLoopTime = Date.now();
      var percent = interpolate((Date.now() - startTime) / (options.time - 100), 0, 1, 0, 1, 0.5);
      if (changeColor) {
        stepColor(percent, newColor);
      }
      if (options.color && options.color.kelvin !== void 0) {
        const targetKelvin2 = typeof options.color.kelvin === "string" ? parseFloat(options.color.kelvin) : options.color.kelvin;
        if (!isNaN(targetKelvin2))
          stepKelvin(percent, targetKelvin2);
      }
      if (options.brightness !== void 0) {
        stepBrightness(percent, options.brightness);
      }
      await sleep(30 - (Date.now() - startLoopTime));
    }
  });
}
function sleep(ms) {
  return new Promise((resolve, _reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}
function updateValues(device, updateAll) {
  if (!device) {
    return Promise.reject("No device given");
  }
  return new Promise((resolve, _reject) => {
    let message = JSON.stringify(
      {
        "msg": {
          "cmd": "devStatus",
          "data": {}
        }
      }
    );
    if (!updateAll) {
      device.socket.send(message, 0, message.length, 4003, device.ip);
      resolve();
    } else {
      device.socket.send(message, 0, message.length, 4001, "239.255.255.250");
      resolve();
    }
  });
}

// src/commands/setOnOff.ts
function setOff() {
  var device = this;
  return new Promise((resolve, _reject) => {
    let message = JSON.stringify(
      {
        msg: {
          cmd: "turn",
          data: {
            value: 0
          }
        }
      }
    );
    device.socket?.send(message, 0, message.length, 4003, device.ip, async () => {
      device.state.isOn = 0;
      device.emit("updatedStatus", device.state, ["onOff"]);
      resolve();
    });
  });
}
function setOn() {
  var device = this;
  return new Promise((resolve, _reject) => {
    let message = JSON.stringify(
      {
        msg: {
          cmd: "turn",
          data: {
            value: 1
          }
        }
      }
    );
    device.socket?.send(message, 0, message.length, 4003, device.ip, () => {
      device.state.isOn = 1;
      device.emit("updatedStatus", device.state, ["onOff"]);
      resolve();
    });
  });
}

// src/commands/createSocket.ts
var import_node_dgram = require("dgram");
var import_os = require("os");
var address = "239.255.255.250";
var port = 4002;
function getGoveeDeviceSocket() {
  return new Promise((resolve, _reject) => {
    const nets = (0, import_os.networkInterfaces)();
    var sockets = [];
    var isResolved = false;
    for (const name of Object.keys(nets)) {
      nets[name]?.forEach((net) => {
        const familyV4Value = typeof net.family === "string" ? "IPv4" : 4;
        if (net.family === familyV4Value && !net.internal) {
          let socket = (0, import_node_dgram.createSocket)({
            type: "udp4",
            reuseAddr: true
          });
          sockets.push(socket);
          socket.once("message", (_msg, _remote) => {
            resolve(socket);
            isResolved = true;
          });
          socket.bind(port, net.address);
          socket.on("listening", function() {
            socket.setBroadcast(true);
            socket.setMulticastTTL(128);
            socket.addMembership(address);
            let message = JSON.stringify(
              {
                "msg": {
                  "cmd": "scan",
                  "data": {
                    "account_topic": "reserve"
                  }
                }
              }
            );
            socket.send(message, 0, message.length, 4001, address);
          });
        }
      });
    }
    setTimeout(() => {
      if (!isResolved) {
        sockets.forEach((socket) => {
          socket.close();
        });
        resolve(void 0);
      }
    }, 5e3);
  });
}

// src/index.ts
var import_events = require("events");
var ct2 = __toESM(require("color-temperature"));
var Device = class extends import_events.EventEmitter {
  constructor(data, GoveeInstance, socket) {
    super();
    deviceList.set(data.ip, this);
    this.model = data.sku;
    this.deviceID = data.device;
    this.ip = data.ip;
    this.versions = {
      BLEhardware: data.bleVersionHard,
      BLEsoftware: data.bleVersionSoft,
      WiFiHardware: data.wifiVersionHard,
      WiFiSoftware: data.wifiVersionSoft
    };
    this.state = {
      isOn: 0,
      brightness: 0,
      color: { "r": 0, "g": 0, "b": 0 },
      colorKelvin: 0,
      hasReceivedUpdates: false
    };
    this.socket = socket;
    this.updateTimer = setInterval(() => {
      this.updateValues();
    }, 6e3);
    this.on("updatedStatus", (data2, stateChanged) => {
      GoveeInstance.emit("updatedStatus", this, data2, stateChanged);
    });
    this.goveeInstance = GoveeInstance;
  }
  ip;
  deviceID;
  model;
  socket;
  goveeInstance;
  versions;
  state;
  actions = new actions(this);
  updateValues = async () => await updateValues(this);
  updateTimer;
  destroy = () => {
    this.emit("destroyed");
    clearTimeout(this.updateTimer);
  };
};
var actions = class {
  constructor(device) {
    this.device = device;
  }
  device;
  setColor = (color) => setColor.call(this.device, color);
  setBrightness = (brightness) => setBrightness.call(this.device, brightness);
  fadeColor = (options) => {
    this.cancelFade();
    return fade.bind(this.device)(options);
  };
  cancelFade = (rejectPromises = false) => this.device.emit("fadeCancel", rejectPromises);
  setOff = () => setOff.call(this.device);
  setOn = () => setOn.call(this.device);
};
var deviceList = /* @__PURE__ */ new Map();
var udpSocket;
var Govee = class extends import_events.EventEmitter {
  config;
  isReady = false;
  constructor(config) {
    super();
    this.config = config;
    this.getSocket().then(() => {
      this.emit("ready");
      this.isReady = true;
    });
    let discoverInterval = 6e4;
    if (config && config.discoverInterval) {
      discoverInterval = config.discoverInterval;
    }
    this.once("ready", () => {
      this.discoverInterval = setInterval(() => {
        this.discover();
      }, discoverInterval);
    });
  }
  discoverInterval = null;
  getSocket() {
    return new Promise((resolve, _reject) => {
      getGoveeDeviceSocket().then(async (socket) => {
        if (!socket) {
          console.error("UDP Socket was not estabilished whilst trying to discover new devices.\n\nIs the server able to access UDP port 4001 and 4002 on address 239.255.255.250?");
          let whileSocket = void 0;
          while (whileSocket == void 0) {
            whileSocket = await this.getSocket();
            if (whileSocket == void 0) {
              console.error("UDP Socket was not estabilished whilst trying to discover new devices.\n\nIs the server able to access UDP port 4001 and 4002 on address 239.255.255.250?");
            }
          }
          udpSocket = whileSocket;
        } else {
          udpSocket = socket;
        }
        udpSocket.on("message", this.receiveMessage.bind(this));
        if (!this.config || this.config.startDiscover) {
          this.discover();
        }
        if (!this.isReady) {
          this.emit("ready");
          this.isReady = true;
        }
        resolve();
      });
    });
  }
  discover() {
    if (!udpSocket) {
      console.error("UDP Socket was not estabilished whilst trying to discover new devices.\n\nIs the server able to access UDP port 4001 and 4002 on address 239.255.255.250?");
      return;
    }
    let message = JSON.stringify(
      {
        "msg": {
          "cmd": "scan",
          "data": {
            "account_topic": "reserve"
          }
        }
      }
    );
    udpSocket.send(message, 0, message.length, 4001, "239.255.255.250");
    deviceList.forEach((dev) => {
      if (!udpSocket)
        return;
      udpSocket.send(message, 0, message.length, 4003, dev.ip);
      const oldCount = this.discoverTimes.get(dev.ip) ?? 0;
      this.discoverTimes.set(dev.ip, oldCount + 1);
      if (oldCount >= 4) {
        this.emit("deviceRemoved", dev);
        dev.destroy();
        deviceList.delete(dev.ip);
      }
    });
  }
  discoverTimes = /* @__PURE__ */ new Map();
  async receiveMessage(msg, rinfo) {
    const msgRes = JSON.parse(msg.toString());
    if (!udpSocket) {
      return;
    }
    const data = msgRes.msg.data;
    switch (msgRes.msg.cmd) {
      case "scan":
        this.onScanMessage(data);
        break;
      case "devStatus":
        this.onDevStatusMessage(rinfo, data);
        break;
      default:
        break;
    }
  }
  onDevStatusMessage(rinfo, data) {
    const device = deviceList.get(rinfo.address);
    if (!device) {
      return;
    }
    const oldState = JSON.parse(JSON.stringify(device.state));
    device.state.brightness = data.brightness;
    device.state.isOn = data.onOff;
    device.state.color = data.color;
    if (!data.color.colorTemInKelvin) {
      device.state.colorKelvin = ct2.rgb2colorTemperature({ red: data.color.r, green: data.color.g, blue: data.color.b });
    } else {
      device.state.colorKelvin = data.color.colorTemInKelvin;
    }
    const stateChanged = [];
    const colorChanged = oldState.color.r !== data.color.r || oldState.color.g !== data.color.g || oldState.color.b !== data.color.b;
    const brightnessChanged = oldState.brightness !== data.brightness;
    const onOffChanged = oldState.isOn !== data.onOff;
    if (!device.state.hasReceivedUpdates) {
      device.state.hasReceivedUpdates = true;
      this.emit("deviceAdded", device);
    }
    if (brightnessChanged) {
      stateChanged.push("brightness");
    }
    if (colorChanged) {
      stateChanged.push("color");
    }
    if (onOffChanged) {
      stateChanged.push("onOff");
    }
    device.emit("updatedStatus", device.state, stateChanged);
  }
  onScanMessage(data) {
    const oldList = Array.from(deviceList.values());
    if (!deviceList.has(data.ip)) {
      if (!udpSocket)
        return;
      var device = new Device(data, this, udpSocket);
      device.updateValues();
    }
    this.discoverTimes.set(data.ip, 0);
    oldList.forEach((device2) => {
      if (!deviceList.has(device2.ip)) {
        this.emit("deviceRemoved", device2);
        device2.destroy();
        deviceList.delete(device2.ip);
      }
    });
  }
  get devicesMap() {
    return deviceList;
  }
  get devicesArray() {
    return Array.from(deviceList.values());
  }
  async updateAllDevices() {
    const updatePromises = this.devicesArray.map((device) => device.updateValues);
    await Promise.all(updatePromises);
    return;
  }
  destroy() {
    this.removeAllListeners();
    deviceList = /* @__PURE__ */ new Map();
    udpSocket?.close();
    udpSocket = void 0;
    if (this.discoverInterval !== null) {
      clearInterval(this.discoverInterval);
      this.discoverInterval = null;
    }
    deviceList.forEach((device) => {
      device.destroy();
    });
  }
};
var src_default = Govee;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Device
});
//! Commands have to be send twice te be caught by devstatus... annoying
//# sourceMappingURL=index.js.map