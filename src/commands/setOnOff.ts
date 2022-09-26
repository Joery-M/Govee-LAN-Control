import { Device } from "..";

export function setOff (this: Device): Promise<void>
{
    return new Promise((resolve, reject) =>
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
        this.socket?.send(message, 0, message.length, 4001, this.ip, () =>
        {
            resolve();
        });
    });
}

export function setOn (this: Device): Promise<void>
{
    return new Promise((resolve, reject) =>
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
        this.socket?.send(message, 0, message.length, 4001, this.ip, () =>
        {
            resolve();
        });
    });
}