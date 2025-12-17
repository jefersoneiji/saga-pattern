import { ConsumeMessage } from 'amqplib';

import { interface_orchestrator, saga_event } from '../../microservices/interfaces';
import { RabbitMQ } from '../rabbitmq';
import { order_saga_definition } from '../sagas/order-saga';

export class event_handler {
    constructor(
        private rabbit: RabbitMQ,
        private orchestrator: interface_orchestrator
    ) { }

    async start_consuming(queue_name = 'orchestrator.events.queue') {
        const routing_key = "saga.reply.#";
        const exchange = "orchestrator.events";

        const channel = this.rabbit.get_channel();

        await channel.assertExchange('orchestrator.events', 'topic', { durable: true });
        await channel.assertQueue("orchestrator.events.queue", { durable: true });
        await channel.bindQueue("orchestrator.events.queue", exchange, routing_key);

        await this.rabbit.consume(queue_name, async (msg: ConsumeMessage) => {
            const correlation_id = msg.properties.correlationId as string | undefined;
            if (!correlation_id) {
                console.warn('Received event without correlation_id, ignoring');
                return;
            }

            const routing_key = msg.fields.routingKey;
            const body = JSON.parse(msg.content.toString());

            const is_success = this._is_success_routing_key(routing_key, body);
            const event: saga_event = {
                saga_id: correlation_id,
                type: routing_key,
                name: msg.properties.type,
                success: is_success,
                payload: body
            };

            if (routing_key.includes(".compensate")) {
                await this.orchestrator.handle_compensation_event(event);
            }

            if (!routing_key.includes(".compensate")) {
                await this.orchestrator.handle_event(event);
            }
        });
    }

    async start_consuming_commands(queue_name = 'orchestrator.commands.queue') {
        const routing_key = "";
        const exchange = "orchestrator.commands";

        const channel = this.rabbit.get_channel();

        await channel.assertExchange('orchestrator.commands', 'topic', { durable: true });
        await channel.assertQueue("orchestrator.commands.queue", { durable: true });
        await channel.bindQueue("orchestrator.commands.queue", exchange, routing_key);

        await this.rabbit.consume(queue_name, async (msg: ConsumeMessage) => {
            if (msg.properties.type === 'START_ORDER_SAGA') {
                const saga_id = await this.orchestrator.start(order_saga_definition, JSON.parse(msg.content.toString()));
                console.log('SAGA INITIATED WITH ID: ', saga_id);
            }
        });
    }

    private _is_success_routing_key(routing_key: string, body: any) {
        if (routing_key.endsWith('.failed') || routing_key.includes('.failed')) return false;
        if (routing_key.endsWith('.error') || routing_key.includes('.error')) return false;

        if (typeof body?.success === 'boolean') return body.success;
        return true;
    }
}