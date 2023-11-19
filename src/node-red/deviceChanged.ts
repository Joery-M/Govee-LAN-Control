import * as registry from "@node-red/registry";
import { Node, NodeAPISettingsWithData, NodeDef } from "node-red";
import { Device, DeviceState, stateChangedOptions } from "../index";
import { govee } from "./globalData";

var deviceIDregex = /([A-f0-9]{2}:){7}[A-z0-9]{2}/i;
//* https://regexr.com/38odc
var deviceIPregex = /\b(?:(?:2(?:[0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9])\.){3}(?:(?:2([0-4][0-9]|5[0-5])|[0-1]?[0-9]?[0-9]))\b/ig;

module.exports = (RED: registry.NodeAPI<NodeAPISettingsWithData>): void =>
{
    function deviceChangedNode (config: Record<string, any>)
    {
        // @ts-ignore
        RED.nodes.createNode(this, config as NodeDef);
        // @ts-ignore
        var node: Node = this;

        node.on("close", () =>
        {
            govee.removeListener("updatedStatus", handleDeviceChange)
        });

        govee.on("updatedStatus", handleDeviceChange);

        function handleDeviceChange (device: Device, _data: DeviceState, stateChanged: stateChangedOptions)
        {
            if (stateChanged.length == 0)
            {
                return;
            }
            // Check with filter
            var filter: string[] = config.trigger.split(",");
            var hasFilterMatch = false;
            stateChanged.forEach(item =>
            {
                if (item !== undefined && filter.includes(item))
                {
                    hasFilterMatch = true;
                }
            });
            if (!hasFilterMatch)
            {
                return;
            }
            // console.log("Device got changed: " + device.model);

            var configDevice: Device | undefined;
            if (deviceIDregex.test(config.device))
            {
                configDevice = govee.devicesArray.find((dev) => dev.deviceID == config.device);
            } else if (deviceIPregex.test(config.device))
            {
                configDevice = govee.devicesMap.get(config.device);
            }

            // These checks are for the selection, if there is no device selected, trigger the output on all devices,
            // but if there are devices defined in the config, check if it are the same device.
            if (configDevice != undefined)
            {
                if (configDevice.deviceID == device.deviceID)
                {
                    node.send({
                        payload: {
                            ip: device.ip,
                            id: device.deviceID,
                            model: device.model,
                            state: device.state,
                            versions: device.versions,
                        },
                        topic: "GoveeDeviceChange"
                    });
                }
            } else
            {
                node.send({
                    payload: {
                        ip: device.ip,
                        id: device.deviceID,
                        model: device.model,
                        state: device.state,
                        versions: device.versions,
                    },
                    topic: "GoveeDeviceChange"
                });
            }

        } {

        }
    }
    RED.nodes.registerType("Device Changed", deviceChangedNode);
};
