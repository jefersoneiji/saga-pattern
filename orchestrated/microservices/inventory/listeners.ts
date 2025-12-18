import amqp from 'amqplib/callback_api';

import { compensate } from './compensate';
import { consumer } from './consumer';

if (!process.env.RABBITMQ_URL) {
    throw Error('RABBITMQ_URL is missing.');
};

const rabbit_url = process.env.RABBITMQ_URL;

amqp.connect(rabbit_url, (err, conn) => {
    if (err) {
        throw err;
    }

    conn.createChannel((err, channel) => consumer(err, channel));
    conn.createChannel((err, channel) => compensate(err, channel));

    console.debug(`[${new Date().toISOString()}] Inventory started!`);
});