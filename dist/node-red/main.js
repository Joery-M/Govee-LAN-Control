"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var import__ = __toESM(require("../index"));
const govee = new import__.default();
module.exports = (RED) => {
  RED.events.addListener("runtime-event", (evt) => {
    if (evt.id == "runtime-state" && evt.payload && evt.payload.state == "start") {
      console.log("A");
      RED.nodes.eachNode((node) => {
        var types = ["Fade Color", "Set Brightness", "Set Color", "Set Power"];
        if (types.includes(node.type)) {
          RED.nodes.getNode(node.id).context().global.set("govee", govee);
        }
      });
    }
  });
  function discoverNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    node.context().global.set("govee", govee);
    govee.on("deviceAdded", (device) => {
      console.log("Device found, " + device.model, "on:", device.ip);
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
    });
  }
  RED.nodes.registerType("Device Added", discoverNode);
};
