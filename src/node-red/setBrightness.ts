import * as registry from "@node-red/registry";
import { Node, NodeAPISettingsWithData, NodeDef } from "node-red";
import Govee, { Device } from "../index";
import { govee } from "./globalData";

var deviceIDregex = /([A-f0-9]{2}:){7}[A-z0-9]{2}/i;

//* https://regexr.com/38odc
var deviceIPregex = /\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b/ig;

module.exports = (RED: registry.NodeAPI<NodeAPISettingsWithData>): void =>
{
    function setBrightNode (config: Record<string, any>)
    {
        RED.nodes.createNode(this, config as NodeDef);
        var node: Node = this;

        node.on("input", async (msg) =>
        {
            var device: Device;
            if (deviceIDregex.test(config.device))
            {
                device = govee.devicesArray.find((dev) => dev.deviceID == config.device);
            } else if (deviceIPregex.test(config.device))
            {
                device = govee.devicesMap.get(config.device);
            } else if (config.device !== "all")
            {
                RED.log.error("Unknown device ID or IP passed: " + config.device);
                return;
            }

            var payload = msg.payload as Record<string, any>;

            var bright = payload ? payload.brightness : 0;
            if (config.brightness !== undefined && config.brightness !== "")
            {
                bright = config.brightness;
            } else if (!payload.brightness)
            {
                RED.log.error("No brightness input: " + payload);
                return;
            }

            if (config.device == "all")
            {
                govee.devicesArray.forEach((arrayDevice) =>
                {
                    setDeviceBrightness(arrayDevice, bright);
                });
            } else
            {
                setDeviceBrightness(device, bright);
            }

            function setDeviceBrightness (device: Device, bright: number)
            {
                device.actions.setBrightness(bright).then(async () =>
                {
                    setTimeout(() =>
                    {
                        node.send(msg);
                    }, 1);
                }).catch((res) =>
                {
                    RED.log.error(res);
                });
            }
        });
    }
    RED.nodes.registerType("Set Brightness", setBrightNode);
};