import { Device } from "..";

export function setOff (this: Device): Promise<void>
{
    var device = this;
    return new Promise((resolve, _reject) =>
    {
        let message = JSON.stringify(
            {
                msg: {
                    cmd: "turn",
                    data: {
                        value: 0
                    }
                }
            }
        );
        device.socket?.send(message, 0, message.length, 4003, device.ip, async () =>
        {
            device.state.isOn = 0;
            device.emit("updatedStatus", device.state, ["onOff"])
            resolve();
        });
    });
}

/**
 * @description
 * Turn on a light.
 */
export function setOn (this: Device): Promise<void>
{
    var device = this;
    return new Promise((resolve, _reject) =>
    {
        let message = JSON.stringify(
            {
                msg: {
                    cmd: "turn",
                    data: {
                        value: 1
                    }
                }
            }
        );
        device.socket?.send(message, 0, message.length, 4003, device.ip, () =>
        {
            device.state.isOn = 1;
            device.emit("updatedStatus", device.state, ["onOff"])
            resolve();
        });
    });
}
