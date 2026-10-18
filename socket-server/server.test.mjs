import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { after, test } from 'node:test';
import { io as createClient } from 'socket.io-client';
import { createSocketApplication, verifySocketToken } from './server.mjs';

const appKey = 'test-application-key';
const application = createSocketApplication({ appKey });

await new Promise((resolve) =>
    application.httpServer.listen(0, '127.0.0.1', resolve),
);

const address = application.httpServer.address();
const socketUrl = `http://127.0.0.1:${address.port}`;

after(async () => {
    application.io.close();
});

function tokenFor(userId, expiresAt = Math.floor(Date.now() / 1000) + 30) {
    const payload = Buffer.from(
        JSON.stringify({ user_id: userId, expires_at: expiresAt }),
    ).toString('base64url');
    const signature = createHmac('sha256', appKey)
        .update(payload)
        .digest('hex');

    return `${payload}.${signature}`;
}

test('validates signed socket credentials and rejects expired or altered credentials', () => {
    assert.equal(verifySocketToken(tokenFor(12), appKey)?.user_id, 12);
    assert.equal(verifySocketToken(tokenFor(12, 1), appKey), null);
    assert.equal(verifySocketToken(`${tokenFor(12)}x`, appKey), null);
});

test('rejects socket connections without valid credentials', async () => {
    const client = createClient(socketUrl, {
        path: '/socket.io',
        auth: { token: 'invalid' },
        reconnection: false,
    });
    const [error] = await once(client, 'connect_error');

    assert.match(error.message, /unauthorized/);
    client.close();
});

test('delivers internal message events only to the addressed user room', async () => {
    const recipient = createClient(socketUrl, {
        path: '/socket.io',
        auth: { token: tokenFor(21) },
    });
    const other = createClient(socketUrl, {
        path: '/socket.io',
        auth: { token: tokenFor(22) },
    });
    await Promise.all([once(recipient, 'connect'), once(other, 'connect')]);

    const received = once(recipient, 'chat.message.created');
    const message = { id: 4, conversation_id: 8, body: 'hello' };
    const response = await fetch(`${socketUrl}/internal/emit`, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${appKey}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            event: 'chat.message.created',
            user_ids: [21],
            payload: { message_id: 4, message },
        }),
    });

    assert.equal(response.status, 202);
    assert.deepEqual((await received)[0], { message_id: 4, message });

    const readReceipt = once(recipient, 'chat.message.read');
    const readResponse = await fetch(`${socketUrl}/internal/emit`, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${appKey}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            event: 'chat.message.read',
            user_ids: [21],
            payload: { message_ids: [4] },
        }),
    });

    assert.equal(readResponse.status, 202);
    assert.deepEqual((await readReceipt)[0], { message_ids: [4] });

    recipient.close();
    other.close();
});

test('rejects unauthenticated internal event publishing', async () => {
    const response = await fetch(`${socketUrl}/internal/emit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            event: 'chat.message.created',
            user_ids: [21],
            payload: {},
        }),
    });

    assert.equal(response.status, 401);
});
