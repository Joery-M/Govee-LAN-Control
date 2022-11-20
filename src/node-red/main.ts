import * as registry from "@node-red/registry";
import { Node, NodeAPISettingsWithData, NodeDef, NodeInitializer, NodeMessage } from "node-red";

// Local scripts
import Govee from "../index";

//? Initialise the server
const govee = new Govee();

module.exports = (RED: registry.NodeAPI<NodeAPISettingsWithData>): void =>
{

    // Initialise Govee instance globally
    RED.events.addListener("runtime-event", (evt) =>
    {
        if (evt.id == "runtime-state" && evt.payload && evt.payload.state == "start")
        {
            console.log("A");
            RED.nodes.eachNode((node) =>
            {
                var types = ["Fade Color", "Set Brightness", "Set Color", "Set Power"];
                if (types.includes(node.type))
                {
                    RED.nodes.getNode(node.id).context().global.set("govee", govee);
                }
            });
        }
    });

    function discoverNode (this: Node, config: NodeDef)
    {
        RED.nodes.createNode(this, config);
        var node: Node = this;

        node.context().global.set("govee", govee);

        govee.on("deviceAdded", (device) =>
        {
            console.log("Device found, " + device.model, "on:", device.ip);
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