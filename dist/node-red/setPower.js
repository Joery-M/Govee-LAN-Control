"use strict";
var import_globalData = require("./globalData");
var deviceIDregex = /([A-f0-9]{2}:){7}[A-z0-9]{2}/i;
var deviceIPregex = /\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b/ig;
module.exports = (RED) => {
  function setPowerNode(config) {
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
      if (config.device == "all") {
        import_globalData.govee.devicesArray.forEach((arrayDevice) => {
          setDevicePower(arrayDevice);
        });
      } else if (device) {
        setDevicePower(device);
      }
      function setDevicePower(device2) {
        if (config.powerState == "on") {
          device2.actions.setOn().then(async () => {
            node.send(msg);
          }).catch((res) => {
            RED.log.error(res);
          });
        } else if (config.powerState == "off") {
          device2.actions.setOff().then(async () => {
            setTimeout(() => {
              node.send(msg);
            }, 1);
          }).catch((res) => {
            RED.log.error(res);
          });
        }
      }
    });
  }
  RED.nodes.registerType("Set Power", setPowerNode);
};
