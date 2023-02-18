import * as registry from "@node-red/registry";
import { Node, NodeAPISettingsWithData, NodeDef, NodeInitializer, NodeMessage } from "node-red";
import { govee } from "./globalData";

// Local scripts
import { Device } from "../index";

module.exports = (RED: registry.NodeAPI<NodeAPISettingsWithData>): void =>
{
    function discoverNode (this: Node, config: NodeDef)
    {
        RED.nodes.createNode(this, config);
        var node: Node = this;


        node.on("close", () =>
        {
            govee.removeListener("deviceAdded", handleDeviceAdded);
        });

        govee.on("deviceAdded", handleDeviceAdded);

        function handleDeviceAdded (device: Device)
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
        }
    }
    RED.nodes.registerType("Device Added", discoverNode);


    RED.httpNode.get("/govee/devices", (req, res) =>
    {
        console.log("Govee HTTP: Devices list requested");
        var deviceArray = govee.devicesArray.map((device) =>
        {
            var entry: any = {};
            entry.state = device.state;
            entry.ip = device.ip;
            entry.deviceID = device.deviceID;
            entry.model = device.model;
            return entry;
        });
        res.status(200).send(deviceArray);
    });

    var devicesBeingIdentified: string[] = [];
    RED.httpNode.get("/govee/identifyDevice", async (req, res) =>
    {
        console.log("Govee HTTP: Device requested to identify");

        var deviceId: string = new URL(req.url, `http://${req.headers.host}`).searchParams.get("device");
        var device = govee.devicesArray.find((dev) => dev.deviceID == deviceId);
        if (!device && deviceId !== "all")
        {
            RED.log.error("Device \"" + deviceId + "\" got requested to be identified, but could not be found.");
            return res.status(500).send();
        }
        res.status(200).send();

        if (deviceId == "all")
        {
            govee.devicesArray.forEach((arrayDevice) =>
            {
                blinkDevice(arrayDevice);
            });
        } else
        {
            blinkDevice(device);
        }
    });

    async function blinkDevice (device: Device)
    {
        if (devicesBeingIdentified.includes(device.deviceID))
        {
            return;
        }

        var origState = JSON.parse(JSON.stringify(device.state));

        devicesBeingIdentified.push(device.deviceID);

        device.actions.setBrightness(100);
        device.actions.setColor({ rgb: [255, 0, 0] });
        await sleep(500);
        device.actions.setBrightness(origState.brightness);
        device.actions.setColor({ rgb: [origState.color.r, origState.color.g, origState.color.b] });
        await sleep(500);
        device.actions.setBrightness(100);
        device.actions.setColor({ rgb: [0, 255, 0] });
        await sleep(500);
        device.actions.setBrightness(origState.brightness);
        device.actions.setColor({ rgb: [origState.color.r, origState.color.g, origState.color.b] });
        await sleep(500);
        device.actions.setBrightness(100);
        device.actions.setColor({ rgb: [0, 0, 255] });
        await sleep(500);
        device.actions.setBrightness(origState.brightness);
        device.actions.setColor({ rgb: [origState.color.r, origState.color.g, origState.color.b] });

        devicesBeingIdentified.splice(devicesBeingIdentified.indexOf(device.deviceID), 1);
    }
};

function sleep (time: number)
{
    return new Promise<void>((resolve, reject) =>
    {
        setTimeout(() =>
        {
            resolve();
        }, time);
    });
}