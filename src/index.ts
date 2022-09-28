import { RemoteInfo, Socket } from 'dgram';
import { fade, setBrightness, setColor } from './commands/setColors';
import { setOff, setOn } from './commands/setOnOff';
import getSocket from './commands/createSocket';
import { EventEmitter } from 'events';
import * as ct from 'color-temperature';

export class Device
{
    constructor(data: Record<string, any>, GoveeInstance: Govee, socket: Socket)
    {
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
            colorKelvin: 0
        };

        this.socket = socket;
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
    state!: {
        isOn: number;
        brightness: number;
        color: Record<string, number>;
        colorKelvin: number;
    };
    readonly actions = new actions(this);
}

export interface fadeOptions
{
    time: number;
    color: colorOptions;
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

class actions
{
    constructor(device: Device)
    {
        this.device = device;
    }
    private device: Device;
    setRGB = (color: colorOptions): Promise<void> => { return setColor.call(this.device, color); };
    setBrightness = (brightness: string | number): Promise<void> => { return setBrightness.call(this.device, brightness); };
    fadeColor = (options: fadeOptions): Promise<void> => { return fade.call(this.device, eventEmitter, options); };
    setOff = (): Promise<void> => { return setOff.call(this.device); };
    setOn = (): Promise<void> => { return setOn.call(this.device); };
}

declare interface Govee
{
    on (event: 'ready', listener: Function): this;
    on (event: "deviceAdded", listener: (device: Device) => void): this;
    on (event: "newStatus", listener: (device: Device, data: DataResponseStatus) => void): this;
    on (event: string, listener: Function): this;
}

//TODO: I have no idea why i have to define the variables outside the class. I'm only able to access the "socket" when using "this"
var deviceList = new Map<string, Device>();
var eventEmitter: EventEmitter;
var socket: Socket;

class Govee extends EventEmitter
{
    constructor()
    {
        super();
        eventEmitter = this;
        this.discover();
    }


    async discover ()
    {
        socket = await getSocket();

        socket.on("message", this.receiveMessage);

        //? Now that we have a socket, we can scan (again)
        //* This can probably combined into 1, but i don't want to risk it, seeing as i have 1 govee device
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
        socket.send(message, 0, message.length, 4001, "239.255.255.250");
    }

    private receiveMessage (msg: Buffer, rinfo: RemoteInfo)
    {
        var msgRes: messageResponse = JSON.parse(msg.toString());
        var data = msgRes.msg.data;
        switch (msgRes.msg.cmd)
        {
            case "scan":
                var device = new Device(data, this, socket);
                deviceList.set(device.ip, device);
                // this.addDevice(newDevice)
                eventEmitter.emit("deviceAdded", device);
                break;

            case "devStatus":
                var device = deviceList.get(rinfo.address) || new Device(data, this, socket);
                device.state.brightness = data.brightness;
                device.state.isOn = data.onOff;
                device.state.color = data.color;

                if (!data.color.colorTemInKelvin) {
                    device.state.colorKelvin = ct.rgb2colorTemperature({red: data.color.r, green: data.color.g, blue: data.color.b})
                }else{
                    device.state.colorKelvin = data.color.colorTemInKelvin
                }
                
                eventEmitter.emit("newStatus", device, data);
                break;

            default:
                break;
        }
    }

    getDevicesMap ()
    {
        return deviceList;
    }
    getDevicesArray ()
    {
        return Array.from(deviceList.values());
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