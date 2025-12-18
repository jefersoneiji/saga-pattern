import amqp from 'amqplib/callback_api';

// amqp.connect('amqp://localhost', (err, conn) => {
//     if (err) {
//         throw err;
//     }

//     conn.createChannel((e, channel) => {
//         if (e) {
//             throw e;
//         }

//         const exchange = 'inventory';
//         const routing_key = 'inventory.reserve';
//         const queue = 'commands.inventory';

//         channel.assertExchange(exchange, 'topic', { durable: true });
//         channel.assertQueue(queue, { durable: true });
//         channel.bindQueue(queue, exchange, routing_key);

//         channel.consume(queue, async msg => {
//             const raw = msg?.content.toString();
//             const command = JSON.parse(raw!);
//             console.log('[Inventory] Received command: ', command);

//             channel.ack(msg!);

//             channel.publish(
//                 'orchestrator.events',
//                 'saga.reply.inventory.success',
//                 Buffer.from(
//                     JSON.stringify({
//                         order_id: "816c64e0-60ac-4a4e-bfa6-ca18914df0ed",
//                         amount: 500,
//                         user_id: "6942bd701485b0c89623f19e",
//                         success: true,
//                     })),
//                 {
//                     correlationId: msg?.properties.correlationId as any,
//                     type: 'reserve_product'
//                 }
//             );
//         });
//     });
// });

export const consumer = (e: any, channel: amqp.Channel) => {
    if (e) throw e;

    const exchange = 'inventory';
    const routing_key = 'inventory.reserve';
    const queue = 'commands.inventory';

    channel.assertExchange(exchange, 'topic', { durable: true });
    channel.assertQueue(queue, { durable: true });
    channel.bindQueue(queue, exchange, routing_key);

    channel.consume(queue, async msg => {
        const raw = msg?.content.toString();
        const command = JSON.parse(raw!);
        console.log('[Inventory] Received command: ', command);

        channel.ack(msg!);

        channel.publish(
            'orchestrator.events',
            'saga.reply.inventory.success',
            Buffer.from(
                JSON.stringify({
                    order_id: "816c64e0-60ac-4a4e-bfa6-ca18914df0ed",
                    amount: 500,
                    user_id: "6942bd701485b0c89623f19e",
                    success: true,
                })),
            {
                correlationId: msg?.properties.correlationId as any,
                type: 'reserve_product'
            }
        );
    });
};