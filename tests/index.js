const net = require("net");
const Pool = require("../lib/index").default;

const server = new net.Server();
server.listen(3000, "127.0.0.1", function() {
    console.log("Socket server listen at %s %s", "127.0.0.1", "3000");
});
server.on("connect", function() {
    console.log("Socket server connectted");
});

const pool = new Pool({
    host: "127.0.0.1",
    port: 3000,
    maxActive: 5,
    maxIdle: 2,
    maxIdleTime: 30000,
    maxWait: 10000
});

setTimeout(function() {
    for (var i = 0; i < 10; i++) {
        (function(j) {
            pool.getResource().then(res => {
                console.log("res" + j);
            });
        })(i + 1);
    }
}, 5000);

setInterval(function() {
    server.getConnections(function(err, count) {
        console.log("connection count is: " + count);
    });
}, 5000);
