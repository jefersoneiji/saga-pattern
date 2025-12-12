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
        channel.assertExchange(exchange, 'topic', { durable: true });
        channel.assertQueue('commands.shipping', { durable: true });
        channel.bindQueue('commands.shipping', 'shipping', 'shipping.ship');

        channel.consume('commands.shipping', async msg => {
            const raw = msg?.content.toString();
            const command = JSON.parse(raw!);
            console.log('[Shipping] Received command: ', command);

            channel.ack(msg!);

            channel.publish(
                'orchestrator.events',
                'saga.reply.shipping.success',
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