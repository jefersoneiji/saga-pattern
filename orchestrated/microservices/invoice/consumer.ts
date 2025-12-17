import amqp from 'amqplib/callback_api';

amqp.connect('amqp://localhost', (err, conn) => {
    if (err) {
        throw err;
    }

    conn.createChannel((e, channel) => {
        if (e) {
            throw e;
        }

        const exchange = 'billing';
        const routing_key = 'invoice.generate';
        const queue = 'commands.billing';

        channel.assertExchange(exchange, 'topic', { durable: true });
        channel.assertQueue(queue, { durable: true });
        channel.bindQueue(queue, exchange, routing_key);

        channel.consume(queue, async msg => {
            const raw = msg?.content.toString();
            const command = JSON.parse(raw!);
            console.log('[Invoice] Received command: ', command);

            channel.ack(msg!);

            channel.publish(
                'orchestrator.events',
                'saga.reply.billing.success',
                Buffer.from(
                    JSON.stringify({
                        order_id: "816c64e0-60ac-4a4e-bfa6-ca18914df0ed",
                        address: '5th Avenue, New York, NY, USA',
                        success: true
                    })),
                {
                    correlationId: msg?.properties.correlationId as any,
                    type: 'generate_invoice'
                }
            );
        });
    });
});