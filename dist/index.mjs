// src/commands/setColors.ts
import { hex, hsl, rgb } from "color-convert";
import * as ct from "color-temperature";
var lerp = (x, y, a) => x * (1 - a) + y * a;
function lerpColor(a, b, amount) {
  var ah = parseInt(a.replace(/#/g, ""), 16), ar = ah >> 16, ag = ah >> 8 & 255, ab = ah & 255, bh = parseInt(b.replace(/#/g, ""), 16), br = bh >> 16, bg = bh >> 8 & 255, bb = bh & 255, rr = ar + amount * (br - ar), rg = ag + amount * (bg - ag), rb = ab + amount * (bb - ab);
  return "#" + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
}
function setColor(options) {
  return new Promise((resolve, reject) => {
    var _a;
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
      if (options.hex) {
        var newColor = hex.rgb(options.hex);
        rgb2 = {
          r: newColor[0],
          g: newColor[1],
          b: newColor[2]
        };
      } else if (options.hsl) {
        var newColor = hsl.rgb(options.hsl);
        rgb2 = {
          r: newColor[0],
          g: newColor[1],
          b: newColor[2]
        };
      } else if (options.rgb) {
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
    (_a = this.socket) == null ? void 0 : _a.send(message, 0, message.length, 4001, this.ip, () => {
      updateValues(this);
      resolve();
    });
  });
}
function setBrightness(brightness) {
  return new Promise((resolve, reject) => {
    var _a;
    var bright = parseFloat(brightness.toString());
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
    (_a = this.socket) == null ? void 0 : _a.send(message, 0, message.length, 4001, this.ip, () => {
      updateValues(this);
      resolve();
    });
  });
}
function fade(eventEmitter2, options) {
  return new Promise((resolve, reject) => {
    updateValues(this);
    eventEmitter2.once("newStatus", async (device, data) => {
      if (device.deviceID !== this.deviceID)
        return;
      var curHex = rgb.hex(device.state.color.r, device.state.color.g, device.state.color.b);
      var curKelvin = device.state.colorKelvin = ct.rgb2colorTemperature({ red: device.state.color.r, green: device.state.color.g, blue: device.state.color.b });
      if (options.color.hex || options.color.hsl || options.color.rgb) {
        var newColor = "";
        if (options.color.hsl)
          newColor = hsl.hex(options.color.hsl);
        else if (options.color.rgb)
          newColor = rgb.hex(options.color.rgb);
        else if (options.color.hex)
          newColor = options.color.hex.replace(/#/g, "");
        var running = true;
        var startTime = Date.now();
        setTimeout(() => {
          running = false;
          setColor.call(this, {
            hex: newColor
          });
          resolve();
        }, options.time - 100);
        while (running == true) {
          var percent = (Date.now() - startTime) / (options.time - 100);
          var lerpedColor = lerpColor(curHex, newColor, Math.max(Math.min(percent, 1), 0));
          var newRgb = hex.rgb(lerpedColor);
          device.state.color.r = newRgb[0];
          device.state.color.g = newRgb[1];
          device.state.color.b = newRgb[2];
          await setColor.call(this, {
            hex: "#" + lerpedColor
          });
          await sleep(10);
        }
      } else if (options.color.kelvin) {
        var targetKelvin = parseFloat(options.color.kelvin.toString().replace(/[^0-9]/g, ""));
        var running = true;
        var startTime = Date.now();
        setTimeout(() => {
          running = false;
          var kelvinRGB2 = ct.colorTemperature2rgb(targetKelvin);
          setColor.call(this, {
            rgb: [kelvinRGB2.red, kelvinRGB2.green, kelvinRGB2.blue]
          });
          device.state.color.r = kelvinRGB2.red;
          device.state.color.g = kelvinRGB2.green;
          device.state.color.b = kelvinRGB2.blue;
          device.state.colorKelvin = targetKelvin;
          resolve();
        }, options.time - 100);
        while (running == true) {
          var percent = (Date.now() - startTime) / (options.time - 100);
          var lerpedKelvin = lerp(curKelvin, targetKelvin, Math.max(Math.min(percent, 1), 0));
          console.log(percent, lerpedKelvin, curKelvin, targetKelvin);
          var kelvinRGB = ct.colorTemperature2rgb(lerpedKelvin);
          device.state.color.r = kelvinRGB.red;
          device.state.color.g = kelvinRGB.green;
          device.state.color.b = kelvinRGB.blue;
          device.state.colorKelvin = targetKelvin;
          await setColor.call(this, {
            rgb: [kelvinRGB.red, kelvinRGB.green, kelvinRGB.blue]
          });
          await sleep(10);
        }
      }
      updateValues(this);
    });
    eventEmitter2.once("newStatus", async (device, data) => {
      if (device.deviceID !== this.deviceID)
        return;
      var curBrightness = device.state.brightness;
      if (options.brightness) {
        var running = true;
        var startTime = Date.now();
        var targetBright = options.brightness;
        setTimeout(() => {
          running = false;
          setBrightness.call(this, targetBright);
          resolve();
        }, options.time - 100);
        while (running == true) {
          var percent = (Date.now() - startTime) / (options.time - 100);
          var newBright = lerp(curBrightness, options.brightness, Math.max(Math.min(percent, 1), 0));
          device.state.brightness = newBright;
          await setBrightness.call(this, newBright);
          await sleep(10);
        }
      }
      resolve();
      updateValues(this);
    });
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
  var _a, _b;
  let message = JSON.stringify(
    {
      "msg": {
        "cmd": "devStatus",
        "data": {}
      }
    }
  );
  if (updateAll) {
    (_a = device.socket) == null ? void 0 : _a.send(message, 0, message.length, 4001, device.ip);
  } else {
    (_b = device.socket) == null ? void 0 : _b.send(message, 0, message.length, 4001, "239.255.255.250");
  }
}

// src/commands/setOnOff.ts
function setOff() {
  return new Promise((resolve, reject) => {
    var _a;
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
    (_a = this.socket) == null ? void 0 : _a.send(message, 0, message.length, 4001, this.ip, () => {
      resolve();
    });
  });
}
function setOn() {
  return new Promise((resolve, reject) => {
    var _a;
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
    (_a = this.socket) == null ? void 0 : _a.send(message, 0, message.length, 4001, this.ip, () => {
      resolve();
    });
  });
}

// src/commands/createSocket.ts
import { createSocket } from "dgram";
import { networkInterfaces } from "os";
var address = "239.255.255.250";
var port = 4002;
var createSocket_default = () => {
  return new Promise((resolve, _reject) => {
    var _a;
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      (_a = nets[name]) == null ? void 0 : _a.forEach((net) => {
        const familyV4Value = typeof net.family === "string" ? "IPv4" : 4;
        if (net.family === familyV4Value && !net.internal) {
          let socket2 = createSocket({
            type: "udp4",
            reuseAddr: true
          });
          socket2.on("message", (msg, remote) => {
            resolve(socket2);
          });
          socket2.bind(port, net.address);
          socket2.on("listening", function() {
            socket2.setBroadcast(true);
            socket2.setMulticastTTL(128);
            socket2.addMembership(address);
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
            socket2.send(message, 0, message.length, 4001, address);
          });
        }
      });
    }
  });
};

// src/index.ts
import { EventEmitter } from "events";
import * as ct2 from "color-temperature";
var Device = class {
  constructor(data, GoveeInstance, socket2) {
    this.actions = new actions(this);
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
      colorKelvin: 0
    };
    this.socket = socket2;
  }
};
var actions = class {
  constructor(device) {
    this.setRGB = (color) => {
      return setColor.call(this.device, color);
    };
    this.setBrightness = (brightness) => {
      return setBrightness.call(this.device, brightness);
    };
    this.fadeColor = (options) => {
      return fade.call(this.device, eventEmitter, options);
    };
    this.setOff = () => {
      return setOff.call(this.device);
    };
    this.setOn = () => {
      return setOn.call(this.device);
    };
    this.device = device;
  }
};
var deviceList = /* @__PURE__ */ new Map();
var eventEmitter;
var socket;
var Govee = class extends EventEmitter {
  constructor() {
    super();
    eventEmitter = this;
    this.discover();
  }
  async discover() {
    socket = await createSocket_default();
    socket.on("message", this.receiveMessage);
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
    socket.send(message, 0, message.length, 4001, "239.255.255.250");
  }
  receiveMessage(msg, rinfo) {
    var msgRes = JSON.parse(msg.toString());
    var data = msgRes.msg.data;
    switch (msgRes.msg.cmd) {
      case "scan":
        var device = new Device(data, this, socket);
        deviceList.set(device.ip, device);
        eventEmitter.emit("deviceAdded", device);
        break;
      case "devStatus":
        var device = deviceList.get(rinfo.address) || new Device(data, this, socket);
        device.state.brightness = data.brightness;
        device.state.isOn = data.onOff;
        device.state.color = data.color;
        if (!data.color.colorTemInKelvin) {
          device.state.colorKelvin = ct2.rgb2colorTemperature({ red: data.color.r, green: data.color.g, blue: data.color.b });
        } else {
          device.state.colorKelvin = data.color.colorTemInKelvin;
        }
        eventEmitter.emit("newStatus", device, data);
        break;
      default:
        break;
    }
  }
  getDevicesMap() {
    return deviceList;
  }
  getDevicesArray() {
    return Array.from(deviceList.values());
  }
};
var src_default = Govee;
export {
  Device,
  src_default as default
};
