import amqp from 'amqplib/callback_api';

amqp.connect('amqp://localhost', (err, conn) => {
    if (err) {
        throw err;
    }

    conn.createChannel((e, channel) => {
        if (e) {
            throw e;
        }

        const exchange = 'shipping';
        const routing_key = 'shipping.ship';
        const queue = 'commands.shipping';

        channel.assertExchange(exchange, 'topic', { durable: true });
        channel.assertQueue(queue, { durable: true });
        channel.bindQueue(queue, exchange, routing_key);

        channel.consume(queue, async msg => {
            const raw = msg?.content.toString();
            const command = JSON.parse(raw!);
            console.log('[Shipping] Received command: ', command);

            channel.ack(msg!);

            channel.publish(
                'orchestrator.events',
                'saga.reply.shipping.success',
                Buffer.from(
                    JSON.stringify({
                        shipping_id: "da01c8b5-2e32-4805-a1f2-8d633014908c",
                        order_id: "816c64e0-60ac-4a4e-bfa6-ca18914df0ed",
                        success: true
                    })),
                {
                    correlationId: msg?.properties.correlationId as any,
                    type: 'ship_product'
                }
            );
        });
    });
});