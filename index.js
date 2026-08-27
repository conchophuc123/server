const http = require('http');

// Tạo phản hồi HTTP đơn giản để không bị treo load trên trình duyệt
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('GD Multiplayer Server is Running!');
});

const sio = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let playerTemplate = {
    id: Number,
    x: Number,
    y: Number,
    rotation: Number,
    scale: Number,
    flip: Boolean,
    tag: Number,
    gamemode: Number,
    cube: Number,
    ship: Number,
    ball: Number,
    ufo: Number,
    wave: Number,
    robot: Number,
    spider: Number,
    col1: [Number, Number, Number],
    col2: [Number, Number, Number],
    glow: Boolean,
    level: Number,
    lastFrame: Number
};

let customTagCount = 10001;
let players = [];

function customTag() {
    customTagCount++;
    return customTagCount;
}

const maxFPS = 240;

sio.on('connection', socket => {
    console.log("Socket connected:", socket.id);
    
    socket.on('join', async (level) => {
        level = parseInt(level);
        if (isNaN(level)) return;
        socket.join(level);
        const tag = customTag();
        let playerObj = {
            id: socket.id,
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            flip: false,
            tag,
            gamemode: 0,
            cube: 1,
            ship: 1,
            ball: 1,
            ufo: 1,
            wave: 1,
            robot: 1,
            spider: 1,
            col1: [255, 255, 255],
            col2: [255, 255, 255],
            glow: 0,
            level,
            lastFrame: 0
        };
        
        setTimeout(() => {
            socket.emit('tag', tag);
        }, 1000);
        
        players.push(playerObj);
        players.forEach(function (player) {
            if (player.id == socket.id) {
                socket.to(level).emit('player', player);
            }
        });
        console.log(`Socket joined (${tag}), current players: ${players.length}`);
    });

    socket.on('receive', async () => {
        const player = players.find(p => p.id == socket.id);
        if (!player) return;
        const curr_players = players.filter(p => p.level == player.level);
        if (!curr_players.length) return;
        curr_players.filter(p => p.id != socket.id).forEach(function (other_player) {
            socket.emit('update', other_player);
        });
    });

    socket.on('update', async (pos) => {
        const player = players.find(p => p.id == socket.id);
        if (!player) return;
        const curr_players = players.filter(p => p.level == player.level);
        if (!curr_players.length) return;

        if (player.scale > 2) return;
        if (player.y < -2) return;
        if (player.gamemode < 0 || player.gamemode > 6) return;

        const currentTime = Date.now();
        const elapsedTime = currentTime - player.lastFrame;
        if (elapsedTime >= (1000 / maxFPS)) {
            player.x = pos.x;
            player.y = pos.y;
            player.rotation = pos.rotation;
            player.scale = pos.scale;
            player.flip = pos.flip;
            player.gamemode = pos.gamemode;

            player.cube = pos.cube;
            player.ship = pos.ship;
            player.ball = pos.ball;
            player.ufo = pos.ufo;
            player.wave = pos.wave;
            player.robot = pos.robot;
            player.spider = pos.spider;
            player.col1 = pos.col1;
            player.col2 = pos.col2;
            player.glow = pos.glow;

            curr_players.filter(p => p.id != socket.id).forEach(function (other_player) {
                socket.to(other_player.id).emit('update', player);
            });
            player.lastFrame = currentTime;
        }
    });

    socket.on('disconnect', async () => {
        console.log("Socket disconnected:", socket.id);
        const player = players.find(p => p.id === socket.id);
        if (!player) return;
        player.y = -100;
        socket.broadcast.to(player.level).emit('left', player);
        players.splice(players.indexOf(player), 1);
    });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, async () => {
    console.log(`Server Listening on port @${PORT}`);
});
