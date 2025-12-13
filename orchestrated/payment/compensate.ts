import amqp from 'amqplib/callback_api';

amqp.connect('amqp://localhost', (err, conn) => {
    if (err) {
        throw err;
    }

    conn.createChannel((e, channel) => {
        if (e) {
            throw e;
        }

        const exchange = 'payment';
        channel.assertExchange(exchange, 'topic', { durable: true });
        channel.assertQueue('commands.payment', { durable: true });
        channel.bindQueue('commands.payment', 'payment', 'payment.refund');

        channel.consume('commands.payment', async msg => {
            const raw = msg?.content.toString();
            const command = JSON.parse(raw!);
            console.log('[Payment] Received command: ', command);

            channel.ack(msg!);

            channel.publish(
                'orchestrator.events',
                'saga.reply.compensate.payment',
                Buffer.from(
                    JSON.stringify({
                        order_id: '12645',
                        amount: 10,
                        user_id: '1564ga',
                        success: true
                    })),
                {
                    correlationId: msg?.properties.correlationId as any,
                    type: 'compensate_refund_payment'
                }
            );
        });
    });
});