"use strict";
var import_globalData = require("./globalData");
var deviceIDregex = /([A-f0-9]{2}:){7}[A-z0-9]{2}/i;
var deviceIPregex = /\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b/ig;
module.exports = (RED) => {
  function deviceChangedNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.on("close", () => {
      import_globalData.govee.removeListener("updatedStatus", handleDeviceChange);
    });
    import_globalData.govee.on("updatedStatus", handleDeviceChange);
    function handleDeviceChange(device, data, stateChanged) {
      if (stateChanged.length == 0) {
        return;
      }
      var filter = config.trigger.split(",");
      var hasFilterMatch = false;
      filter.forEach((item) => {
        if (stateChanged.includes(item)) {
          hasFilterMatch = true;
        }
      });
      if (!hasFilterMatch) {
        return;
      }
      var configDevice;
      if (deviceIDregex.test(config.device)) {
        configDevice = import_globalData.govee.devicesArray.find((dev) => dev.deviceID == config.device);
      } else if (deviceIPregex.test(config.device)) {
        configDevice = import_globalData.govee.devicesMap.get(config.device);
      }
      if (configDevice != void 0) {
        if (configDevice.deviceID == device.deviceID) {
          node.send({
            payload: {
              ip: device.ip,
              id: device.deviceID,
              model: device.model,
              state: device.state,
              versions: device.versions
            },
            topic: "GoveeDeviceChange"
          });
        }
      } else {
        node.send({
          payload: {
            ip: device.ip,
            id: device.deviceID,
            model: device.model,
            state: device.state,
            versions: device.versions
          },
          topic: "GoveeDeviceChange"
        });
      }
    }
    {
    }
  }
  RED.nodes.registerType("Device Changed", deviceChangedNode);
};
