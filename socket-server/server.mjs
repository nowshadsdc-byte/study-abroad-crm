import { Buffer } from 'node:buffer';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

const allowedEvents = new Set(['chat.message.created', 'chat.message.read']);

export function verifySocketToken(token, appKey, now = Date.now()) {
    if (typeof token !== 'string' || !appKey) {
        return null;
    }

    const [payload, signature, extra] = token.split('.');

    if (!payload || !signature || extra) {
        return null;
    }

    if (!/^[a-f0-9]{64}$/i.test(signature)) {
        return null;
    }

    const expected = createHmac('sha256', appKey).update(payload).digest();
    let received;

    try {
        received = Buffer.from(signature, 'hex');
    } catch {
        return null;
    }

    if (
        expected.length !== received.length ||
        !timingSafeEqual(expected, received)
    ) {
        return null;
    }

    try {
        const decoded = JSON.parse(
            Buffer.from(payload, 'base64url').toString('utf8'),
        );

        if (
            !Number.isInteger(decoded.user_id) ||
            decoded.user_id < 1 ||
            decoded.expires_at * 1000 <= now
        ) {
            return null;
        }

        return decoded;
    } catch {
        return null;
    }
}

export function createSocketApplication({ appKey }) {
    const httpServer = createServer((request, response) => {
        if (request.method === 'GET' && request.url === '/health') {
            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(JSON.stringify({ status: 'ok' }));

            return;
        }

        if (request.method !== 'POST' || request.url !== '/internal/emit') {
            response.writeHead(404).end();

            return;
        }

        const authorization = request.headers.authorization ?? '';
        const expectedToken = Buffer.from(appKey ?? '');
        const receivedToken = Buffer.from(
            authorization.replace(/^Bearer\s+/i, ''),
        );

        if (
            !authorization.toLowerCase().startsWith('bearer ') ||
            expectedToken.length === 0 ||
            expectedToken.length !== receivedToken.length ||
            !timingSafeEqual(expectedToken, receivedToken)
        ) {
            response.writeHead(401).end();

            return;
        }

        let body = '';
        request.on('data', (chunk) => {
            body += chunk;

            if (body.length > 100_000) {
                request.destroy();
            }
        });
        request.on('end', () => {
            try {
                const message = JSON.parse(body);

                if (
                    !allowedEvents.has(message.event) ||
                    !Array.isArray(message.user_ids) ||
                    message.user_ids.some(
                        (id) => !Number.isInteger(id) || id < 1,
                    )
                ) {
                    response.writeHead(422).end();

                    return;
                }

                for (const userId of new Set(message.user_ids)) {
                    io.to(`user:${userId}`).emit(
                        message.event,
                        message.payload ?? {},
                    );
                }

                response.writeHead(202, { 'content-type': 'application/json' });
                response.end(JSON.stringify({ accepted: true }));
            } catch {
                response.writeHead(400).end();
            }
        });
    });

    const io = new Server(httpServer, {
        path: '/socket.io',
        serveClient: false,
    });

    io.use((socket, next) => {
        const identity = verifySocketToken(
            socket.handshake.auth?.token,
            appKey,
        );

        if (!identity) {
            next(new Error('unauthorized'));

            return;
        }

        socket.data.userId = identity.user_id;
        socket.data.expiresAt = identity.expires_at;
        next();
    });

    io.on('connection', (socket) => {
        socket.join(`user:${socket.data.userId}`);
        socket.data.expiryTimer = setTimeout(
            () => socket.disconnect(true),
            Math.max(0, socket.data.expiresAt * 1000 - Date.now()),
        );
        socket.on('disconnect', () => clearTimeout(socket.data.expiryTimer));
    });

    return { httpServer, io };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const { httpServer } = createSocketApplication({
        appKey: process.env.APP_KEY,
    });
    const port = Number(process.env.PORT ?? 3000);

    httpServer.listen(port, '0.0.0.0', () => {
        process.stdout.write(`Chat Socket.IO listening on ${port}\n`);
    });
}
