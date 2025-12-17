import amqp from 'amqplib/callback_api';

const order = {
    product_id: "9ec2f934-7e7b-4772-bdbe-f14a492af1d1",
};


amqp.connect('amqp://localhost', (err, conn) => {
    if (err) {
        throw err;
    }

    conn.createChannel((e, channel) => {
        if (e) {
            throw e;
        }

        const exchange = 'orchestrator.commands';
        const routing_key = '';
        const queue = 'orchestrator.commands.queue';

        channel.assertExchange(exchange, 'topic', { durable: true });
        channel.assertQueue(queue, { durable: true });
        channel.bindQueue(queue, exchange, routing_key);

        channel.publish(
            'orchestrator.commands',
            '',
            Buffer.from(
                JSON.stringify(order)),
            {
                type: 'START_ORDER_SAGA'
            }
        );
    });
});