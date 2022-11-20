const dgram = require("dgram");

const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
});

const server = dgram.createSocket("udp4");

var checkTimeout;

var directPingList = [];

server.addListener("message", (msg) => {
    var data = JSON.parse(msg.toString());

    if (directPingList.includes(data.msg.data.ip)) {
        console.log(
            "Result: Received direct pong from " +
                data.msg.data.sku +
                " at address " +
                data.msg.data.ip
        );
        return;
    }

    console.log(
        "Result: Received pong from " +
            data.msg.data.sku +
            " at address " +
            data.msg.data.ip
    );

    console.log(
        "Test: Testing direct ping to " + data.msg.data.ip + " in 3 seconds"
    );
    setTimeout(() => {
        // Send ping directly to device

        server.send(
            JSON.stringify({
                msg: {
                    cmd: "scan",
                    data: {
                        account_topic: "reserve",
                    },
                },
            }),
            4001,
            data.msg.data.ip,
            (error) => {
                if (error) {
                    console.log(
                        "Error directly pinging " + data.msg.data.ip,
                        error
                    );
                    return;
                }

                // Add to list so we dont send direct ping again.
                directPingList.push(data.msg.data.ip);
            }
        );
    }, 3000);
    // Clear the timeout logging the status to the console
    clearTimeout(checkTimeout);
});

readline.question(`
    Issues may be present when letting Node.js auto-select a network interface.
    In the module the interface gets chosen by sending a multicast request to all interfaces (crude, i know)

    Would you like to enter an ip to bypass auto-selection? (Y)es / (N)o\n`.replace(/^ +/gm, ''),
    (answer) => {
        if (answer.toLowerCase().startsWith("y")) {
            function answerIP(answer) {
                var ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;

                if (ipRegex.test(answer)) {
                    var ip = answer;
                    server.bind(4002, ip);
                    readline.close();
                    console.log(" ");
                } else {
                    readline.question(
                        "\nPlease enter a valid IPv4 address\n",
                        answerIP
                    );
                }
            }
            readline.question("\nPlease enter an IPv4 address\n", answerIP);
        } else {
            server.bind(4002);
            console.log(" ");
            readline.close();
        }
    }
);

server.on("listening", () => {
    server.setBroadcast(true);

    // Send a scan event to the multicast address
    server.send(
        JSON.stringify({
            msg: {
                cmd: "scan",
                data: {
                    account_topic: "reserve",
                },
            },
        }),
        4001,
        "239.255.255.250",
        (error, bytes) => {
            if (error) {
                return console.log("Error: Error sending ping:" + error);
            }
            console.log("Test: Ping sent");
            checkTimeout = setTimeout(() => {
                console.log(
                    "Warning: No response received within 5 seconds. Please check to see if your device is on and if your network allows multicast to 239.255.255.250 on port 4001 and 4002."
                );
            }, 5000);
        }
    );
});

server.on("error", (err) => {
    console.log(`Error: Socket error:\n${err.stack}`);
    server.close();
});

server.on("close", () => {
    console.log("Server closed");
});
