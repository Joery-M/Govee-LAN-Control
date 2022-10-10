"use strict";
var deviceIDregex = /([A-f0-9]{2}:){7}[A-z0-9]{2}/i;
var deviceIPregex = /\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b/ig;
module.exports = (RED) => {
  function setPowerNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.on("input", async (msg) => {
      const govee = node.context().global.get("govee");
      var device;
      if (deviceIDregex.test(config.device)) {
        device = govee.devicesArray.find((dev) => dev.deviceID == config.device);
      } else if (deviceIPregex.test(config.device)) {
        device = govee.devicesMap.get(config.device);
      } else {
        RED.log.error("Unknown device ID or IP passed: " + config.device);
        return;
      }
      debugger;
      if (config.powerState == "on") {
        device.actions.setOn().then(async () => {
          await device.updateValues();
          node.send(msg);
        }).catch((res) => {
          RED.log.error(res);
        });
      } else if (config.powerState == "off") {
        device.actions.setOff().then(async () => {
          await device.updateValues();
          setTimeout(() => {
            node.send(msg);
          }, 1);
        }).catch((res) => {
          RED.log.error(res);
        });
      }
    });
  }
  RED.nodes.registerType("Set Power", setPowerNode);
};
