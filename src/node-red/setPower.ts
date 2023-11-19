import * as registry from "@node-red/registry";
import { Node, NodeAPISettingsWithData, NodeDef } from "node-red";
import { Device } from "../index";
import { govee } from "./globalData";

var deviceIDregex = /([A-f0-9]{2}:){7}[A-z0-9]{2}/i;

//* https://regexr.com/38odc
var deviceIPregex = /\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b/ig;

module.exports = (RED: registry.NodeAPI<NodeAPISettingsWithData>): void =>
{
    function setPowerNode (config: Record<string, any>)
    {
        // @ts-ignore
        RED.nodes.createNode(this, config as NodeDef);
        // @ts-ignore
        var node: Node = this;

        node.on("input", async (msg) =>
        {
            var device: Device | undefined;
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

            if (config.device == "all")
            {
                govee.devicesArray.forEach((arrayDevice) =>
                {
                    setDevicePower(arrayDevice);
                });
            } else if (device)
            {
                setDevicePower(device);
            }

            function setDevicePower (device: Device)
            {
                if (config.powerState == "on")
                {
                    device.actions.setOn().then(async () =>
                    {
                        node.send(msg);
                    }).catch((res) =>
                    {
                        RED.log.error(res);
                    });
                } else if (config.powerState == "off")
                {
                    device.actions.setOff().then(async () =>
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
            }
        });
    }
    RED.nodes.registerType("Set Power", setPowerNode);
};
