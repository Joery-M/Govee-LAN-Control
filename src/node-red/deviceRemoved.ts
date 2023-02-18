import * as registry from "@node-red/registry";
import { Node, NodeAPISettingsWithData, NodeDef } from "node-red";
import Govee, { Device } from "../index";
import { govee } from "./globalData";

module.exports = (RED: registry.NodeAPI<NodeAPISettingsWithData>): void =>
{
    function deviceRemovedNode (config: NodeDef)
    {
        RED.nodes.createNode(this, config);
        var node: Node = this;

        node.on("close", () =>
        {
            govee.removeListener("deviceRemoved", handleDeviceRemoved);
        });
        govee.on("deviceRemoved", handleDeviceRemoved);

        function handleDeviceRemoved (device: Device)
        {
            // console.log("Device got removed: " + device.model);
            node.send({
                payload: {
                    ip: device.ip,
                    id: device.deviceID,
                    model: device.model,
                    state: device.state,
                    versions: device.versions,
                },
                topic: "GoveeDiscovery"
            });
        }
    }
    RED.nodes.registerType("Device Removed", deviceRemovedNode);
};