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
        channel.assertExchange(exchange, 'topic', { durable: true });
        channel.assertQueue('commands.billing', { durable: true });
        channel.bindQueue('commands.billing', 'billing', 'invoice.generate');

        channel.consume('commands.billing', async msg => {
            const raw = msg?.content.toString();
            const command = JSON.parse(raw);
            console.log('[Billing] Received command: ', command);

            channel.ack(msg!);

            channel.publish(
                'orchestrator.events',
                'saga.reply.billing.success',
                Buffer.from(
                    JSON.stringify({
                        order_id: '12645',
                        amount: 10,
                        user_id: '1564ga',
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