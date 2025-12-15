import amqp from 'amqplib/callback_api';

amqp.connect('amqp://localhost', (err, conn) => {
    if (err) {
        throw err;
    }

    conn.createChannel((e, channel) => {
        if (e) {
            throw e;
        }

        const exchange = 'inventory';
        channel.assertExchange(exchange, 'topic', { durable: true });
        channel.assertQueue('commands.inventory', { durable: true });
        channel.bindQueue('commands.inventory', 'inventory', 'inventory.release');

        channel.consume('commands.inventory', async msg => {
            const raw = msg?.content.toString();
            const command = JSON.parse(raw!);
            console.log('[Inventory] Received command: ', command);

            channel.ack(msg!);

            channel.publish(
                'orchestrator.events',
                'saga.reply.compensate.inventory',
                Buffer.from(
                    JSON.stringify({
                        order_id: '12645',
                        amount: 10,
                        user_id: '1564ga',
                        success: true
                    })),
                {
                    correlationId: msg?.properties.correlationId as any,
                    type: 'compensate_release_product'
                }
            );
        });
    });
});