import { RemoteInfo, Socket } from 'dgram';
import { fade, setBrightness, setColor, updateValues } from './commands/setColors';
import { setOff, setOn } from './commands/setOnOff';
import getSocket from './commands/createSocket';
import { EventEmitter } from 'events';
import * as ct from 'color-temperature';

interface DeviceEventTypes
{
    updatedStatus: [data: DataResponseStatus, stateChanged: stateChangedOptions];
    destroyed: [];
}

export declare interface Device
{
    on<K extends keyof DeviceEventTypes> (
        event: K,
        listener: (...args: DeviceEventTypes[K]) => any,
    ): this;

    once<K extends keyof DeviceEventTypes> (
        event: K,
        listener: (...args: DeviceEventTypes[K]) => any,
    ): this;
}

export class Device extends EventEmitter
{
    constructor(data: Record<string, any>, GoveeInstance: Govee, socket: Socket)
    {
        super();
        deviceList.set(data.ip, this);

        this.model = data.sku;
        this.deviceID = data.device;
        this.ip = data.ip;
        this.versions = {
            BLEhardware: data.bleVersionHard,
            BLEsoftware: data.bleVersionSoft,
            WiFiHardware: data.wifiVersionHard,
            WiFiSoftware: data.wifiVersionSoft
        };

        this.state = {
            isOn: 0,
            brightness: 0,
            color: { "r": 0, "g": 0, "b": 0 },
            colorKelvin: 0,
            hasReceivedUpdates: false
        };

        this.socket = socket;
        this.updateTimer = setInterval(() =>
        {
            this.updateValues();
        }, 60000);
    }
    readonly ip: string;
    readonly deviceID: string;
    readonly model: string;
    readonly socket: Socket;
    readonly versions: {
        BLEhardware: string;
        BLEsoftware: string;
        WiFiHardware: string;
        WiFiSoftware: string;
    };
    public state!: {
        isOn: number;
        brightness: number;
        color: Record<string, number>;
        colorKelvin: number;
        hasReceivedUpdates: boolean;
    };
    readonly actions = new actions(this);
    readonly updateValues: Function = () => updateValues(this);
    private updateTimer: NodeJS.Timer;
    public destroy = () =>
    {
        this.emit("destroyed");
        clearTimeout(this.updateTimer);
    };
}

class actions
{
    constructor(device: Device)
    {
        this.device = device;
    }
    private device: Device;
    setColor = (color: colorOptions): Promise<void> => setColor.call(this.device, color);

    /**
     * @description
     * Pass a 0-100 value to set the brightness of the device.
     */
    setBrightness = (brightness: string | number): Promise<void> => setBrightness.call(this.device, brightness);

    /**
     * @description
     * #### Fade the color and brightness of your device.
     * **Warning**: This works by sending many many commands (At least every 10ms).
     * 
     * Before the code gets run for sending values, the state of the device gets updated.
     * ***
     * Usage:
     * ```js
     * fadeColor({
            time: 2000, // In milliseconds
            color: {
                hex: "#282c34" // Other options possible
            },
            brightness: 20 // 0-100
        });
     * ```
     */
    fadeColor = (options: fadeOptions): Promise<void> => fade.call(this.device, eventEmitter, options);

    /**
     * @description
     * Turn off a device.
     */
    setOff = (): Promise<void> => setOff.call(this.device);

    /**
     * @description
     * Turn on a device.
     */
    setOn = (): Promise<void> => setOn.call(this.device);
}

interface GoveeEventTypes
{
    ready: [];
    deviceAdded: [device: Device];
    deviceRemoved: [device: Device];
    updatedStatus: [device: Device, data: DataResponseStatus, stateChanged: stateChangedOptions];
}
declare interface Govee
{
    on<K extends keyof GoveeEventTypes> (
        event: K,
        listener: (...args: GoveeEventTypes[K]) => any,
    ): this;

    once<K extends keyof GoveeEventTypes> (
        event: K,
        listener: (...args: GoveeEventTypes[K]) => any,
    ): this;
}

//TODO: I have no idea why i have to define the variables outside the class. I'm only able to access the socket when using "this"
var deviceList = new Map<string, Device>();
var eventEmitter: EventEmitter;
export var udpSocket: Socket;

class Govee extends EventEmitter
{
    constructor(startDiscover: boolean = true)
    {
        super();
        eventEmitter = this;

        getSocket().then((socket) =>
        {
            udpSocket = socket;

            udpSocket.on("message", this.receiveMessage);

            //? Now that we have a socket, we can scan (again)
            //TODO: This can probably combined into 1, but i don't want to risk it, seeing as i have 1 govee device
            if (startDiscover)
            {
                this.discover();
            }
        });

        this.discoverInterval = setInterval(() =>
        {
            this.discover();
        }, 300000);
    }

    private discoverInterval: NodeJS.Timer;


    async discover ()
    {
        let message = JSON.stringify(
            {
                "msg": {
                    "cmd": "scan",
                    "data": {
                        "account_topic": "reserve",
                    }
                }
            }
        );
        udpSocket.send(message, 0, message.length, 4001, "239.255.255.250");
    }

    private async receiveMessage (msg: Buffer, rinfo: RemoteInfo)
    {
        var msgRes: messageResponse = JSON.parse(msg.toString());
        var data = msgRes.msg.data;
        switch (msgRes.msg.cmd)
        {
            case "scan":
                var oldList = deviceList;
                if (!deviceList.has(data.ip))
                {
                    var device = new Device(data, this, udpSocket);
                    device.updateValues();
                }
                oldList.forEach((device) =>
                {
                    if (!deviceList.has(device.ip))
                    {
                        eventEmitter.emit("deviceRemoved", device);
                        device.destroy();
                        deviceList.delete(device.ip);
                    }
                });
                break;

            case "devStatus":
                var device = deviceList.get(rinfo.address);

                var oldState = JSON.parse(JSON.stringify(device.state));
                device.state.brightness = data.brightness;
                device.state.isOn = data.onOff;
                device.state.color = data.color;

                if (!data.color.colorTemInKelvin)
                {
                    device.state.colorKelvin = ct.rgb2colorTemperature({ red: data.color.r, green: data.color.g, blue: data.color.b });
                } else
                {
                    device.state.colorKelvin = data.color.colorTemInKelvin;
                }

                var stateChanged: string[] = [];
                var colorChanged = oldState.color.r !== data.color.r || oldState.color.g !== data.color.g || oldState.color.b !== data.color.b;
                var brightnessChanged = oldState.brightness !== data.brightness;
                var onOffChanged = oldState.isOn !== data.onOff;

                //* This may seem like a weird way of doing things, but i want to first get the full state of the device, then i can say it has been added
                if (!device.state.hasReceivedUpdates)
                {
                    device.state.hasReceivedUpdates = true;
                    eventEmitter.emit("deviceAdded", device);
                }

                if (brightnessChanged)
                {
                    stateChanged.push("brightness");
                }
                if (colorChanged)
                {
                    stateChanged.push("color");
                }
                if (onOffChanged)
                {
                    stateChanged.push("onOff");
                }
                device.emit("updatedStatus", data, stateChanged);
                eventEmitter.emit("updatedStatus", device, data, stateChanged);
                break;

            default:
                break;
        }
    }


    public get devicesMap (): Map<string, Device>
    {
        return deviceList;
    }
    public get devicesArray (): Device[]
    {
        return Array.from(deviceList.values());
    }

    public updateAllDevices ()
    {
        updateValues(this.devicesArray[0], true);
    }

    public destroy ()
    {
        //? Loop over all devices and clear their timeouts
        deviceList.forEach((device) =>
        {
            device.destroy();
        });
        eventEmitter.removeAllListeners();
        deviceList = new Map<string, Device>();
        eventEmitter = undefined;
        udpSocket = undefined;
        clearInterval(this.discoverInterval)
    }
}

export default Govee;

interface messageResponse
{
    msg: {
        cmd: "devStatus" | "scan",
        data: Record<string, any>;
    };
}

export interface DataResponseStatus
{
    onOff: 0 | 1;
    brightness: number;
    color: {
        r: number;
        g: number;
        b: number;
    };
    colorTemInKelvin: number;
}

export type stateChangedOptions = ("onOff" | "brightness" | "color" | undefined)[];

export interface fadeOptions
{
    time: number;
    color?: colorOptions;
    brightness?: number;
}

interface colorOptionsHex
{
    hex: string;
    rgb?: never;
    hsl?: never;
    kelvin?: never;
}
interface colorOptionsRGB
{
    hex?: never;
    rgb: [number, number, number];
    hsl?: never;
    kelvin?: never;
}
interface colorOptionsHSL
{
    hex?: never;
    rgb?: never;
    hsl: [number, number, number];
    kelvin?: never;
}
interface colorOptionsKelvin
{
    hex?: never;
    rgb?: never;
    hsl?: never;
    kelvin: string | number;
}
export type colorOptions = colorOptionsHex | colorOptionsRGB | colorOptionsHSL | colorOptionsKelvin;