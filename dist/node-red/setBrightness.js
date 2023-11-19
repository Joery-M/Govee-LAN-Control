"use strict";
var import_globalData = require("./globalData");
var deviceIDregex = /([A-f0-9]{2}:){7}[A-z0-9]{2}/i;
var deviceIPregex = /\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b/ig;
module.exports = (RED) => {
  function setBrightNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.on("input", async (msg) => {
      var device;
      if (deviceIDregex.test(config.device)) {
        device = import_globalData.govee.devicesArray.find((dev) => dev.deviceID == config.device);
      } else if (deviceIPregex.test(config.device)) {
        device = import_globalData.govee.devicesMap.get(config.device);
      } else if (config.device !== "all") {
        RED.log.error("Unknown device ID or IP passed: " + config.device);
        return;
      }
      var payload = msg.payload;
      var bright = payload ? payload.brightness : 0;
      if (config.brightness !== void 0 && config.brightness !== "") {
        bright = config.brightness;
      } else if (!payload.brightness) {
        RED.log.error("No brightness input: " + payload);
        return;
      }
      if (config.device == "all") {
        import_globalData.govee.devicesArray.forEach((arrayDevice) => {
          setDeviceBrightness(arrayDevice, bright);
        });
      } else if (device) {
        setDeviceBrightness(device, bright);
      }
      function setDeviceBrightness(device2, bright2) {
        device2.actions.setBrightness(bright2).then(async () => {
          setTimeout(() => {
            node.send(msg);
          }, 1);
        }).catch((res) => {
          RED.log.error(res);
        });
      }
    });
  }
  RED.nodes.registerType("Set Brightness", setBrightNode);
};
