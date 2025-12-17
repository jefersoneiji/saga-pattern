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
                'saga.reply.shipping.failed',
                Buffer.from(
                    JSON.stringify({
                        order_id: '12645',
                        amount: 10,
                        user_id: '1564ga',
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