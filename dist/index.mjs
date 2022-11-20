// src/commands/setColors.ts
import { hex, hsl, rgb } from "color-convert";
import * as ct from "color-temperature";
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
  return new Promise((resolve, reject) => {
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
        var newColor = hex.rgb(options.hex);
        rgb2 = {
          r: newColor[0],
          g: newColor[1],
          b: newColor[2]
        };
      } else if (options.hsl !== void 0) {
        var newColor = hsl.rgb(options.hsl);
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
    device.socket?.send(message, 0, message.length, 4001, device.ip, () => {
      if (rgb2) {
        device.state.color = rgb2;
        device.state.colorKelvin = ct.rgb2colorTemperature({ red: rgb2.r, green: rgb2.g, blue: rgb2.b });
      } else if (kelvin) {
        var rgbColor = ct.colorTemperature2rgb(kelvin);
        device.state.color = { r: rgbColor.red, g: rgbColor.green, b: rgbColor.blue };
        device.state.colorKelvin = kelvin;
      }
      resolve();
    });
  });
}
function setBrightness(brightness) {
  return new Promise((resolve, reject) => {
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
    this.socket?.send(message, 0, message.length, 4001, this.ip, () => {
      this.state.brightness = bright;
      resolve();
    });
  });
}
function fade(eventEmitter2, options) {
  return new Promise(async (resolve, reject) => {
    var device = this;
    await updateValues(device);
    await sleep(100);
    var curHex = rgb.hex(device.state.color.r, device.state.color.g, device.state.color.b);
    var curKelvin = ct.rgb2colorTemperature({ red: device.state.color.r, green: device.state.color.g, blue: device.state.color.b });
    var curBrightness = device.state.isOn == 1 ? device.state.brightness : 1;
    var targetKelvin;
    var targetBright = options.brightness;
    if (options.color?.kelvin) {
      targetKelvin = parseFloat(options.color.kelvin.toString().replace(/[^0-9]/g, ""));
    }
    var changeColor = options.color?.hex !== void 0 || options.color?.hsl !== void 0 || options.color?.rgb !== void 0;
    var startTime = Date.now();
    var newColor = "";
    if (options.color?.hsl !== void 0)
      newColor = hsl.hex(options.color.hsl);
    else if (options.color?.rgb !== void 0)
      newColor = rgb.hex(options.color.rgb);
    else if (options.color?.hex !== void 0)
      newColor = options.color.hex.replace(/#/g, "");
    async function stepBrightness(percent2) {
      var newBright = lerp(curBrightness, targetBright, Math.max(Math.min(percent2, 1), 0));
      device.actions.setBrightness(newBright);
    }
    async function stepColor(percent2, newColor2) {
      var lerpedColor = lerpColor(curHex, newColor2, Math.max(Math.min(percent2, 1), 0));
      device.actions.setColor({ hex: "#" + lerpedColor });
    }
    async function stepKelvin(percent2, targetKelvin2) {
      var lerpedKelvin = lerp(curKelvin, targetKelvin2, Math.max(Math.min(percent2, 1), 0));
      var kelvinRGB = ct.colorTemperature2rgb(lerpedKelvin);
      device.actions.setColor({ rgb: [kelvinRGB.red, kelvinRGB.green, kelvinRGB.blue] });
    }
    var running = true;
    setTimeout(async () => {
      running = false;
      if (changeColor) {
        setColor.call(device, {
          hex: newColor
        });
      } else if (targetKelvin) {
        var kelvinRGB = ct.colorTemperature2rgb(targetKelvin);
        await device.actions.setColor({ rgb: [kelvinRGB.red, kelvinRGB.green, kelvinRGB.blue] });
      }
      if (options.brightness !== void 0) {
        device.actions.setBrightness(targetBright);
      }
      await sleep(50);
      await device.updateValues();
      resolve();
    }, options.time - 100);
    while (running == true) {
      var startLoopTime = Date.now();
      var percent = interpolate((Date.now() - startTime) / (options.time - 100), 0, 1, 0, 1, 0.5);
      if (changeColor) {
        stepColor(percent, newColor);
      }
      if (options.color && options.color.kelvin !== void 0) {
        stepKelvin(percent, targetKelvin);
      }
      if (options.brightness !== void 0) {
        stepBrightness(percent);
      }
      await sleep(30 - (Date.now() - startLoopTime));
    }
  });
}
function sleep(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}
function updateValues(device, updateAll) {
  return new Promise((resolve, reject) => {
    let message = JSON.stringify(
      {
        "msg": {
          "cmd": "devStatus",
          "data": {}
        }
      }
    );
    if (!updateAll) {
      device.socket.send(message, 0, message.length, 4001, device.ip);
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
  return new Promise((resolve, reject) => {
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
    device.socket?.send(message, 0, message.length, 4001, device.ip, () => {
      device.updateValues();
      device.state.isOn = 0;
      resolve();
    });
  });
}
function setOn() {
  var device = this;
  return new Promise((resolve, reject) => {
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
    device.socket?.send(message, 0, message.length, 4001, device.ip, () => {
      device.updateValues();
      device.state.isOn = 1;
      resolve();
    });
  });
}

// src/commands/createSocket.ts
import { createSocket } from "node:dgram";
import { networkInterfaces } from "os";
var address = "239.255.255.250";
var port = 4002;
var createSocket_default = () => {
  return new Promise((resolve, _reject) => {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      nets[name]?.forEach((net) => {
        const familyV4Value = typeof net.family === "string" ? "IPv4" : 4;
        if (net.family === familyV4Value && !net.internal) {
          let socket = createSocket({
            type: "udp4",
            reuseAddr: true
          });
          socket.once("message", (msg, remote) => {
            resolve(socket);
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
  });
};

// src/index.ts
import { EventEmitter } from "events";
import * as ct2 from "color-temperature";
var Device = class extends EventEmitter {
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
    }, 6e4);
  }
  ip;
  deviceID;
  model;
  socket;
  versions;
  state;
  actions = new actions(this);
  updateValues = () => updateValues(this);
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
  fadeColor = (options) => fade.call(this.device, eventEmitter, options);
  setOff = () => setOff.call(this.device);
  setOn = () => setOn.call(this.device);
};
var deviceList = /* @__PURE__ */ new Map();
var eventEmitter;
var udpSocket;
var Govee = class extends EventEmitter {
  constructor(config) {
    super();
    eventEmitter = this;
    createSocket_default().then((socket) => {
      udpSocket = socket;
      udpSocket.on("message", this.receiveMessage);
      if (!config || config.startDiscover) {
        this.discover();
      }
      this.emit("ready");
    });
    var discoverInterval = 3e5;
    if (config && config.discoverInterval) {
      discoverInterval = config.discoverInterval;
    }
    this.discoverInterval = setInterval(() => {
      this.discover();
    }, discoverInterval);
  }
  discoverInterval;
  discover() {
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
  }
  async receiveMessage(msg, rinfo) {
    var msgRes = JSON.parse(msg.toString());
    if (!udpSocket) {
      return;
    }
    var data = msgRes.msg.data;
    switch (msgRes.msg.cmd) {
      case "scan":
        var oldList = deviceList;
        if (!deviceList.has(data.ip)) {
          var device = new Device(data, this, udpSocket);
          device.updateValues();
        }
        oldList.forEach((device2) => {
          if (!deviceList.has(device2.ip)) {
            eventEmitter.emit("deviceRemoved", device2);
            device2.destroy();
            deviceList.delete(device2.ip);
          }
        });
        break;
      case "devStatus":
        var device = deviceList.get(rinfo.address);
        var oldState = JSON.parse(JSON.stringify(device.state));
        device.state.brightness = data.brightness;
        device.state.isOn = data.onOff;
        device.state.color = data.color;
        if (!data.color.colorTemInKelvin) {
          device.state.colorKelvin = ct2.rgb2colorTemperature({ red: data.color.r, green: data.color.g, blue: data.color.b });
        } else {
          device.state.colorKelvin = data.color.colorTemInKelvin;
        }
        var stateChanged = [];
        var colorChanged = oldState.color.r !== data.color.r || oldState.color.g !== data.color.g || oldState.color.b !== data.color.b;
        var brightnessChanged = oldState.brightness !== data.brightness;
        var onOffChanged = oldState.isOn !== data.onOff;
        if (!device.state.hasReceivedUpdates) {
          device.state.hasReceivedUpdates = true;
          eventEmitter.emit("deviceAdded", device);
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
        device.emit("updatedStatus", data, stateChanged);
        eventEmitter.emit("updatedStatus", device, data, stateChanged);
        break;
      default:
        break;
    }
  }
  get devicesMap() {
    return deviceList;
  }
  get devicesArray() {
    return Array.from(deviceList.values());
  }
  updateAllDevices() {
    updateValues(this.devicesArray[0], true);
  }
  destroy() {
    eventEmitter.removeAllListeners();
    deviceList = /* @__PURE__ */ new Map();
    eventEmitter = void 0;
    udpSocket.close();
    udpSocket = void 0;
    clearInterval(this.discoverInterval);
    deviceList.forEach((device) => {
      device.destroy();
    });
  }
};
var src_default = Govee;
export {
  Device,
  src_default as default
};
//! Commands have to be send twice te be caught by devstatus... annoying
//# sourceMappingURL=index.mjs.map