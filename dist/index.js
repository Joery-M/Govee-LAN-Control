var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var lerp = (x, y, a) => x * (1 - a) + y * a;
function lerpColor(a, b, amount) {
  var ah = parseInt(a.replace(/#/g, ""), 16), ar = ah >> 16, ag = ah >> 8 & 255, ab = ah & 255, bh = parseInt(b.replace(/#/g, ""), 16), br = bh >> 16, bg = bh >> 8 & 255, bb = bh & 255, rr = ar + amount * (br - ar), rg = ag + amount * (bg - ag), rb = ab + amount * (bb - ab);
  return "#" + ((1 << 24) + (rr << 16) + (rg << 8) + rb | 0).toString(16).slice(1);
}
function setColor(colorOption) {
  return new Promise((resolve, reject) => {
    var _a;
    var rgb2 = { r: 0, g: 0, b: 0 };
    if (colorOption.hex) {
      var newColor = import_color_convert.hex.rgb(colorOption.hex);
      rgb2 = {
        r: newColor[0],
        g: newColor[1],
        b: newColor[2]
      };
    } else if (colorOption.hsl) {
      var newColor = import_color_convert.hsl.rgb(colorOption.hsl);
      rgb2 = {
        r: newColor[0],
        g: newColor[1],
        b: newColor[2]
      };
    } else if (colorOption.rgb) {
      rgb2 = {
        r: colorOption.rgb[0],
        g: colorOption.rgb[1],
        b: colorOption.rgb[2]
      };
    }
    let message = JSON.stringify(
      {
        msg: {
          cmd: "colorwc",
          data: {
            colorTemInKelvin: 0,
            color: rgb2
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
function setColorTemp(color) {
  return new Promise((resolve, reject) => {
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
      var curBrightness = device.state.brightness;
      var curHex = import_color_convert.rgb.hex(device.state.color.r, device.state.color.g, device.state.color.b);
      if (options.color.hex || options.color.hsl || options.color.rgb) {
        var newColor = "";
        if (options.color.hsl)
          newColor = import_color_convert.hsl.hex(options.color.hsl);
        else if (options.color.rgb)
          newColor = import_color_convert.rgb.hex(options.color.rgb);
        else if (options.color.hex)
          newColor = options.color.hex.replace(/#/g, "");
        var running = true;
        var startTime = Date.now();
        setTimeout(() => {
          running = false;
          setColor.call(this, {
            hex: newColor
          });
        }, options.time - 100);
        while (running == true) {
          var percent = (Date.now() - startTime) / options.time;
          var lerpedColor = lerpColor(curHex, newColor, Math.max(Math.min(percent, 1), 0));
          var newRgb = import_color_convert.hex.rgb(lerpedColor);
          device.state.color.r = newRgb[0];
          device.state.color.g = newRgb[1];
          device.state.color.b = newRgb[2];
          await setColor.call(this, {
            hex: "#" + lerpedColor
          });
          await sleep(50);
        }
      }
      resolve();
      updateValues(this);
    });
    eventEmitter2.once("newStatus", async (device, data) => {
      if (device.deviceID !== this.deviceID)
        return;
      var curBrightness = device.state.brightness;
      var curHex = import_color_convert.rgb.hex(device.state.color.r, device.state.color.g, device.state.color.b);
      if (options.brightness) {
        var running = true;
        var startTime = Date.now();
        var targetBright = options.brightness;
        setTimeout(() => {
          running = false;
          setBrightness.call(this, targetBright);
        }, options.time - 100);
        while (running == true) {
          var percent = (Date.now() - startTime) / options.time;
          var newBright = lerp(curBrightness, options.brightness, Math.max(Math.min(percent, 1), 0));
          device.state.brightness = newBright;
          await setBrightness.call(this, newBright);
          await sleep(50);
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
var import_node_dgram = require("dgram");
var import_os = require("os");
var address = "239.255.255.250";
var port = 4002;
var createSocket_default = () => {
  return new Promise((resolve, _reject) => {
    var _a;
    const nets = (0, import_os.networkInterfaces)();
    for (const name of Object.keys(nets)) {
      (_a = nets[name]) == null ? void 0 : _a.forEach((net) => {
        const familyV4Value = typeof net.family === "string" ? "IPv4" : 4;
        if (net.family === familyV4Value && !net.internal) {
          let socket2 = (0, import_node_dgram.createSocket)({
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
var import_events = require("events");
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
    this.setColorTemp = (color) => {
      return setColorTemp.call(this.device, color);
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
var Govee = class extends import_events.EventEmitter {
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
        device.state.colorKelvin = data.colorTemInKelvin;
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Device
});
