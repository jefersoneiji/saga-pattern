import { ConsumeMessage } from 'amqplib';
import { RabbitMQ } from '../rabbitmq';

export interface saga_event {
    saga_id: string;
    type: string;
    success: string;
    payload: any;
}

export class event_handler {
    constructor(
        private rabbit: RabbitMQ,
        private orchestrator: { handle_event: (e: saga_event) => Promise<void>; }
    ) { }

    async start_consuming(queue_name = 'orchestrator.events') {
        await this.rabbit.consume(queue_name, async (msg: ConsumeMessage) => {
            const correlation_id = msg.properties.correlationId as string | undefined;
            if (!correlation_id) {
                console.warn('Received event without correlation_id, ignoring');
                return;
            }

            const routing_key = (msg.fields as any).routing_key as string;
            const body = JSON.parse(msg.content.toString());

            const is_success = this._is_success_routing_key(routing_key, body);

            const event: saga_event = {
                saga_id: correlation_id,
                type: routing_key,
                success: is_success,
                payload: body
            };
            await this.orchestrator.handle_event(event);
        });
    }

    private _is_success_routing_key(routing_key: string, body: any) {
        if (routing_key.endsWith('.failed') || routing_key.includes('.failed')) return false;
        if (routing_key.endsWith('.error') || routing_key.includes('.error')) return false;

        if (typeof body?.success === 'boolean') return body.success;
        return true;
    }
}