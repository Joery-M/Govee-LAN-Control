import * as registry from "@node-red/registry";
import { Node, NodeAPISettingsWithData, NodeDef, NodeInitializer, NodeMessage } from "node-red";

// Local scripts
import Govee from "../index";

//? Initialise the server
export const govee = new Govee();

module.exports = (RED: registry.NodeAPI<NodeAPISettingsWithData>): void =>
{
    function discoverNode (config: NodeDef)
    {
        RED.nodes.createNode(this, config);
        var node: Node = this;

        node.context().global.set("govee", govee)

        govee.on("deviceAdded", (device) =>
        {
            console.log("Device found, ", device.model, "on:", device.ip);
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
        });
    }
    RED.nodes.registerType("Device Added", discoverNode);
};