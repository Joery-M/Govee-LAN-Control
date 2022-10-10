import * as registry from "@node-red/registry";
import { Node, NodeAPISettingsWithData, NodeDef } from "node-red";
import Govee, { colorOptions, Device, fadeOptions } from "../index";

var deviceIDregex = /([A-f0-9]{2}:){7}[A-z0-9]{2}/i;

//* https://regexr.com/38odc
var deviceIPregex = /\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b/ig;

module.exports = (RED: registry.NodeAPI<NodeAPISettingsWithData>): void =>
{
    function fadeColorNode (config: Record<string, any>)
    {
        RED.nodes.createNode(this, config as NodeDef);
        var node: Node = this;

        node.on("input", async (msg) =>
        {
            const govee = node.context().global.get("govee") as Govee;

            var device: Device;
            if (deviceIDregex.test(config.device))
            {
                device = govee.devicesArray.find((dev) => dev.deviceID == config.device);
            } else if (deviceIPregex.test(config.device))
            {
                device = govee.devicesMap.get(config.device);
            } else
            {
                RED.log.error("Unknown device ID or IP passed: " + config.device);
            }

            await device.updateValues()
            await new Promise<void>((resolve, reject) => {
                setTimeout(() => {
                    resolve()
                }, 100);
            });

            var payload = msg.payload as Record<string, any>;

            // defaults to please the typescript lords
            var newColor: fadeOptions = {
                time: config.time
            };

            // add values
            if (config.color !== "#000000")
            {
                newColor.color = {
                    hex: config.color
                };
            } else if (payload.color)
            {
                newColor.color = payload.color;
            }

            if (parseFloat(config.brightness))
            {
                newColor.brightness = parseFloat(config.brightness);
            } else
            {
                newColor.brightness = parseFloat(payload.brightness);
            }

            if (payload.time && config.time == "")
            {
                newColor.time = parseFloat(payload.time);
            } else
            {
                RED.log.error("Don't know where to get time value from for fade.");
            }

            //? If there is no brightness and no color, error out
            if (newColor.brightness == undefined && !newColor.color)
            {
                RED.log.error("No color/brightness values received for fade.");
                return;
            }

            device.actions.fadeColor(newColor).then(async () =>
            {
                await device.updateValues();
                setTimeout(() => {
                    node.send(msg);
                }, 1);
            }).catch((res) =>
            {
                RED.log.error(res);
            });
        });
    }
    RED.nodes.registerType("Fade Color", fadeColorNode);
};