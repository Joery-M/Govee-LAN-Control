import { createSocket, Socket } from 'node:dgram';
import { networkInterfaces } from 'os';
const address = '239.255.255.250';
const port = 4002;


//? Loop over all network interfaces (that apply) to find one with Govee devices.
export function getGoveeDeviceSocket (): Promise<Socket | undefined> {
    return new Promise((resolve, _reject) =>
    {
        const nets = networkInterfaces();
        var sockets: Socket[] = []
        var isResolved = false

        //* Modified from https://stackoverflow.com/a/8440736/11186759
        for (const name of Object.keys(nets))
        {
            nets[name]?.forEach((net) =>
            {
                const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
                if (net.family === familyV4Value && !net.internal)
                {
                    let socket = createSocket({
                        type: 'udp4',
                        reuseAddr: true // for testing multiple instances on localhost
                    });
                    sockets.push(socket)

                    socket.once('message', (_msg, _remote) =>
                    {
                        resolve(socket);
                        isResolved = true
                    });


                    socket.bind(port, net.address);

                    socket.on("listening", function ()
                    {
                        socket.setBroadcast(true);
                        socket.setMulticastTTL(128);
                        socket.addMembership(address);
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
                        socket.send(message, 0, message.length, 4001, address);
                    });
                }
            });
        }

        setTimeout(() => {
            if (!isResolved) {
                sockets.forEach((socket)=>{
                    socket.close()
                })
                resolve(undefined)
            }
        }, 5000);
    });
};
