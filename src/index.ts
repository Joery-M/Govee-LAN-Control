import { RemoteInfo, Socket, createSocket } from 'dgram';
import { fade, setBrightness, setColor, updateValues } from './commands/setColors';
import { setOff, setOn } from './commands/setOnOff';
import getSocket from './commands/createSocket';
import { EventEmitter } from 'events';
import * as ct from 'color-temperature';

export interface DeviceState
{
    isOn: number,
    brightness: number,
    color: { "r": number, "g": number, "b": number; },
    colorKelvin: number,
    hasReceivedUpdates: boolean;
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
        }, 6000);

        // When the status gets changes, emit it on the main class aswell
        this.on("updatedStatus", (data, stateChanged) =>
        {
            GoveeInstance.emit("updatedStatus", this, data, stateChanged);
        });

        this.goveeInstance = GoveeInstance;
    }
    readonly ip: string;
    readonly deviceID: string;
    readonly model: string;
    readonly socket: Socket;
    readonly goveeInstance: Govee;
    readonly versions: {
        BLEhardware: string;
        BLEsoftware: string;
        WiFiHardware: string;
        WiFiSoftware: string;
    };
    public state: DeviceState;
    readonly actions = new actions(this);
    readonly updateValues = async () => await updateValues(this);
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
    fadeColor = (options: fadeOptions): Promise<void> =>
    {
        this.cancelFade();

        return fade.call(this.device, eventEmitter, options);
    };

    /**
     * @description Cancels the current fade action
     * 
     * @param rejectPromises Reject active fade promise
     */
    cancelFade = (rejectPromises: boolean = false) => this.device.emit("fadeCancel", rejectPromises);

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

class GoveeConfig
{
    /**
     * Automatically start searching for devices when the UDP socket is made.
     * @default true
     */
    startDiscover?: boolean = true;
    /**
     * The interval (in ms) at which new devices will be scanned for.
     * @default 60000 (1 minute)
     */
    discoverInterval?: number = 60000;
}

//  TODO: I have no idea why i have to define the variables outside the class. But when they're inside the class, they're always undefined outside of the constructor.
//? Edit: I do see it now (anonymous functions), but i haven't changed it yet.
var deviceList = new Map<string, Device>();
var eventEmitter: EventEmitter;
var udpSocket: Socket;

class Govee extends EventEmitter
{
    private config?: GoveeConfig;
    private isReady = false;
    constructor(config?: GoveeConfig)
    {
        super();
        eventEmitter = this;
        this.config = config;

        this.getSocket().then(() =>
        {
            this.emit("ready");
            this.isReady = true;
        });

        var discoverInterval = 60_000;

        if (config && config.discoverInterval)
        {
            discoverInterval = config.discoverInterval;
        }

        this.once("ready", () =>
        {
            this.discoverInterval = setInterval(() =>
            {
                this.discover();
            }, discoverInterval);
        });
    }

    private discoverInterval: NodeJS.Timer;

    private getSocket = (): Promise<void> =>
    {
        return new Promise<void>((resolve, reject) =>
        {
            getSocket().then(async (socket) =>
            {
                if (!socket)
                {
                    console.error("UDP Socket was not estabilished whilst trying to discover new devices.\n\nIs the server able to access UDP port 4001 and 4002 on address 239.255.255.250?");
                    var whileSocket = undefined;
                    while (whileSocket == undefined)
                    {
                        whileSocket = await getSocket();
                        if (whileSocket == undefined)
                        {
                            console.error("UDP Socket was not estabilished whilst trying to discover new devices.\n\nIs the server able to access UDP port 4001 and 4002 on address 239.255.255.250?");
                        }
                    }
                    udpSocket = whileSocket;
                } else
                {
                    udpSocket = socket;
                }

                udpSocket.on("message", this.receiveMessage);

                //? Now that we have a socket, we can scan (again)
                //TODO: Creating the socket and scanning can probably combined into 1, but i don't want to risk it, seeing as i have 1 govee device
                if (!this.config || this.config.startDiscover)
                {
                    this.discover();
                }
                if (!this.isReady)
                {
                    this.emit("ready");
                    this.isReady = true;
                }
                resolve();
            });
        });
    };


    /**
     * @description
     * Use this function to re-send the command to scan for devices.
     * 
     * Note that you typically don't have to run this command yourself. 
     */
    public discover = () =>
    {
        if (!udpSocket)
        {
            console.error("UDP Socket was not estabilished whilst trying to discover new devices.\n\nIs the server able to access UDP port 4001 and 4002 on address 239.255.255.250?");
            return;
        }
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
        deviceList.forEach((dev) =>
        {
            udpSocket.send(message, 0, message.length, 4003, dev.ip);
            this.discoverTimes[dev.ip] ||= 0;
            this.discoverTimes[dev.ip]++;

            if (this.discoverTimes[dev.ip] >= 5)
            {
                eventEmitter.emit("deviceRemoved", dev);
                dev.destroy();
                deviceList.delete(dev.ip);
            }
        });
    };

    private discoverTimes: Map<string, number> = new Map();

    private receiveMessage = async (msg: Buffer, rinfo: RemoteInfo) =>
    {
        var msgRes: messageResponse = JSON.parse(msg.toString());
        if (!udpSocket)
        {
            return;
        }
        var data = msgRes.msg.data;
        switch (msgRes.msg.cmd)
        {
            case "scan":
                var oldList = Array.from(deviceList.values());
                if (!deviceList.has(data.ip))
                {
                    var device = new Device(data, this, udpSocket);
                    device.updateValues();
                }
                this.discoverTimes[data.ip] = 0;
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

                var stateChanged: stateChangedOptions = [];
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
                device.emit("updatedStatus", device.state, stateChanged as stateChangedOptions);
                // eventEmitter.emit("updatedStatus", device, device.state, stateChanged);
                break;

            default:
                break;
        }
    };


    /**
     * A map of devices where the devices' IP is the key, and the Device object is the value.
     */
    public get devicesMap (): Map<string, Device>
    {
        return deviceList;
    }
    /**
     * An array of all devices.
     */
    public get devicesArray (): Device[]
    {
        return Array.from(deviceList.values());
    }

    /**
     * Retrieve the values of all devices.
     */
    public async updateAllDevices ()
    {
        const updatePromises = this.devicesArray.map((device) => device.updateValues);
        await Promise.all(updatePromises);
        return;
    }

    public destroy ()
    {
        eventEmitter.removeAllListeners();
        deviceList = new Map<string, Device>();
        eventEmitter = undefined;
        udpSocket.close();
        udpSocket = undefined;
        clearInterval(this.discoverInterval);
        //? Loop over all devices and clear their timeouts
        deviceList.forEach((device) =>
        {
            device.destroy();
        });
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


type DeviceEventTypes =
    {
        updatedStatus: (data: DeviceState, stateChanged: stateChangedOptions) => void;
        fadeCancel: (rejectPromises: boolean) => void;
        destroyed: () => void;
    };

export declare interface Device
{
    addListener<E extends keyof DeviceEventTypes> (event: E, listener: DeviceEventTypes[E]): this;
    on<E extends keyof DeviceEventTypes> (event: E, listener: DeviceEventTypes[E]): this;
    once<E extends keyof DeviceEventTypes> (event: E, listener: DeviceEventTypes[E]): this;
    prependListener<E extends keyof DeviceEventTypes> (event: E, listener: DeviceEventTypes[E]): this;
    prependOnceListener<E extends keyof DeviceEventTypes> (event: E, listener: DeviceEventTypes[E]): this;

    off<E extends keyof DeviceEventTypes> (event: E, listener: DeviceEventTypes[E]): this;
    removeAllListeners<E extends keyof DeviceEventTypes> (event?: E): this;
    removeListener<E extends keyof DeviceEventTypes> (event: E, listener: DeviceEventTypes[E]): this;

    emit<E extends keyof DeviceEventTypes> (event: E, ...args: Parameters<DeviceEventTypes[E]>): boolean;
    // The sloppy `eventNames()` return type is to mitigate type incompatibilities - see #5
    eventNames (): (keyof DeviceEventTypes | string | symbol)[];
    rawListeners<E extends keyof DeviceEventTypes> (event: E): DeviceEventTypes[E][];
    listeners<E extends keyof DeviceEventTypes> (event: E): DeviceEventTypes[E][];
    listenerCount<E extends keyof DeviceEventTypes> (event: E): number;

    getMaxListeners (): number;
    setMaxListeners (maxListeners: number): this;
}

type GoveeEventTypes = {
    ready: () => void;
    deviceAdded: (device: Device) => void;
    deviceRemoved: (device: Device) => void;
    updatedStatus: (device: Device, data: DeviceState, stateChanged: stateChangedOptions) => void;
};

interface Govee
{
    addListener<E extends keyof GoveeEventTypes> (event: E, listener: GoveeEventTypes[E]): this;
    on<E extends keyof GoveeEventTypes> (event: E, listener: GoveeEventTypes[E]): this;
    once<E extends keyof GoveeEventTypes> (event: E, listener: GoveeEventTypes[E]): this;
    prependListener<E extends keyof GoveeEventTypes> (event: E, listener: GoveeEventTypes[E]): this;
    prependOnceListener<E extends keyof GoveeEventTypes> (event: E, listener: GoveeEventTypes[E]): this;

    off<E extends keyof GoveeEventTypes> (event: E, listener: GoveeEventTypes[E]): this;
    removeAllListeners<E extends keyof GoveeEventTypes> (event?: E): this;
    removeListener<E extends keyof GoveeEventTypes> (event: E, listener: GoveeEventTypes[E]): this;

    emit<E extends keyof GoveeEventTypes> (event: E, ...args: Parameters<GoveeEventTypes[E]>): boolean;
    // The sloppy `eventNames()` return type is to mitigate type incompatibilities - see #5
    eventNames (): (keyof GoveeEventTypes | string | symbol)[];
    rawListeners<E extends keyof GoveeEventTypes> (event: E): GoveeEventTypes[E][];
    listeners<E extends keyof GoveeEventTypes> (event: E): GoveeEventTypes[E][];
    listenerCount<E extends keyof GoveeEventTypes> (event: E): number;

    getMaxListeners (): number;
    setMaxListeners (maxListeners: number): this;
}