"use strict";
var import_globalData = require("./globalData");
const deviceIDregex = /([A-f0-9]{2}:){7}[A-z0-9]{2}/i;
const deviceIPregex = /\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b/ig;
module.exports = (RED) => {
  function setColorNode(config) {
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
      }
      var newColor = msg.payload;
      if (config.color !== "#000000") {
        newColor = {
          hex: config.color
        };
      }
      if (config.device == "all") {
        import_globalData.govee.devicesArray.forEach((arrayDevice) => {
          setDeviceColor(arrayDevice, newColor);
        });
      } else {
        setDeviceColor(device, newColor);
      }
      function setDeviceColor(device2, newColor2) {
        device2.actions.setColor(newColor2).then(async () => {
          setTimeout(() => {
            node.send(msg);
          }, 1);
        }).catch((res) => {
          RED.log.error(res);
        });
      }
    });
  }
  RED.nodes.registerType("Set Color", setColorNode);
};
