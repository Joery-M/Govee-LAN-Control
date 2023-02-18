"use strict";
var import_globalData = require("./globalData");
module.exports = (RED) => {
  function deviceRemovedNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.on("close", () => {
      import_globalData.govee.removeListener("deviceRemoved", handleDeviceRemoved);
    });
    import_globalData.govee.on("deviceRemoved", handleDeviceRemoved);
    function handleDeviceRemoved(device) {
      node.send({
        payload: {
          ip: device.ip,
          id: device.deviceID,
          model: device.model,
          state: device.state,
          versions: device.versions
        },
        topic: "GoveeDiscovery"
      });
    }
  }
  RED.nodes.registerType("Device Removed", deviceRemovedNode);
};
