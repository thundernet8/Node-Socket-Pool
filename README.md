## Node-Socket-Pool [![Build Status](https://travis-ci.org/thundernet8/Node-Socket-Pool.svg?branch=master)](https://travis-ci.org/thundernet8/Node-Socket-Pool)

Socket connection pool for Node

## Install

```
npm install node-socket-pool
```
or
```
yarn add node-socket-pool
```

## Usage

### Get a client

``` typescript
import SocketPool from "node-socket-pool";

const pool = new SocketPool({
    host: "127.0.0.1",
    port: 3000,
    maxActive: 5,
    maxIdle: 2,
    maxIdleTime: 30000,
    maxWait: 10000
})

// in async function
const socketClient = await pool.getResource()

// or promise
pool.getResource().then(client => {

}).catch(err => {
    // handle err
})

```

### Options
``` typescript
host: string;
port: number;
// 最多维持连接数
maxActive?: number;
// 最多保留空闲连接数
maxIdle?: number;
// Socket连接最长空闲时间(毫秒)(超过时间后将返回资源池)
maxIdleTime?: number;
// pool中没有资源返回时，最大等待时间(毫秒)
maxWait?: number;
```

### Release
``` typescript
client.release();
```
or
``` typescript
pool.returnResource(client);
```

client will auto return to idle resource pool if no data transportation for a time up to maxIdleTime option