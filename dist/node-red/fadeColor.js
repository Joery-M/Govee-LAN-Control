"use strict";
var import_globalData = require("./globalData");
var deviceIDregex = /([A-f0-9]{2}:){7}[A-z0-9]{2}/i;
var deviceIPregex = /\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b/ig;
module.exports = (RED) => {
  function fadeColorNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.on("input", async (msg) => {
      var device;
      if (deviceIDregex.test(config.device)) {
        device = import_globalData.govee.devicesArray.find((dev) => dev.deviceID == config.device);
      } else if (deviceIPregex.test(config.device)) {
        device = import_globalData.govee.devicesMap.get(config.device);
      } else {
        RED.log.error("Unknown device ID or IP passed: " + config.device);
      }
      var payload = msg.payload;
      var newColor = {
        time: config.time
      };
      if (config.color !== "#000000") {
        newColor.color = {
          hex: config.color
        };
      } else if (payload.color) {
        newColor.color = payload.color;
      }
      if (parseFloat(config.brightness)) {
        newColor.brightness = parseFloat(config.brightness);
      } else {
        newColor.brightness = parseFloat(payload.brightness);
      }
      if (payload.time && config.time == "") {
        newColor.time = parseFloat(payload.time);
      } else {
        RED.log.error("Don't know where to get time value from for fade.");
      }
      if (newColor.brightness == void 0 && !newColor.color) {
        RED.log.error("No color/brightness values received for fade.");
        return;
      }
      if (config.device == "all") {
        import_globalData.govee.devicesArray.forEach((arrayDevice) => {
          fadeDeviceColor(arrayDevice, newColor);
        });
      } else {
        fadeDeviceColor(device, newColor);
      }
      function fadeDeviceColor(device2, newColor2) {
        device2.actions.fadeColor(newColor2).then(async () => {
          await device2.updateValues();
          setTimeout(() => {
            node.send(msg);
          }, 50);
        }).catch((res) => {
          RED.log.error(res);
        });
      }
    });
  }
  RED.nodes.registerType("Fade Color", fadeColorNode);
};
