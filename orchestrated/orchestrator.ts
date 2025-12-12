import { order_saga_definition, saga_definition, step } from "./sagas/order-saga";
import { RabbitMQ } from './rabbitmq';
import { event_handler, saga_event } from "./handlers/event-handler";
import { sagas } from "./sagas";
import { saga_store as saga_store_class } from "./infra/saga-store";
import { Pool } from "pg";

export interface interface_saga_store {
    create(name: string, type: string, data: any): Promise<any>;
    get(id: string): Promise<{ type: string, step_index: number; }>;
    mark_completed(id: string): Promise<any>;
    update_step(id: string, next_step_name: string): Promise<any>;
    mark_compensated(id: string): Promise<any>;
}

export class saga_orchestrator {
    constructor(private store: interface_saga_store, private bus: RabbitMQ) { }

    async start(def: saga_definition, data: any) {
        const id = crypto.randomUUID();
        const saga = await this.store.create(def.name, id, data);
        console.log('SAGA RESULT FROM START IS: ', saga);
        await this.execute_step(saga, def.steps[0]);
    }

    async handle_event(event: saga_event) {
        console.log('HANDLING EVENT: ', event);
        const saga = await this.store.get(event.saga_id);
        if (!saga) throw new Error("Saga not found");

        const def = sagas[saga.type];
        if (!def) throw new Error(`Unknown saga type: ${saga.type}`);

        const step = def.steps[saga.step_index];
        
        if (event.success) {
            const next_step_name = step.on_success;
            await this.move_to_step({ ...saga, data: event.payload }, next_step_name, def);
        } else {
            const fail_step = step.on_failure;
            await this.execute_compensation(saga, fail_step, def);
        }
    }

    private async move_to_step(saga: { data: any, id: string; }, next_step_name: string, def: saga_definition) {
        if (next_step_name === "complete_saga") {
            return this.store.mark_completed(saga.id);
        }
        console.log('SAGA IN MOVE_TO_STEP IS: ', saga);

        const next_step = def.steps.find((s: { name: string; }) => s.name === next_step_name);
        if (!next_step) throw new Error('Next step is undefined');
        await this.store.update_step(saga.id, saga.step_index, saga.data);
        await this.execute_step(saga, next_step);
    }

    private async execute_step(saga: { data: any; id: string; }, step: step) {
        console.log('SAGA IN EXECUTE STEP IS: ', saga);
        const command = step.command(saga);
        console.log('COMMAND IN EXECUTE STEP IS: ', command);
        await this.bus.publish(
            command.exchange,
            command.routing_key,
            command.payload,
            { correlation_id: saga.id }
        );
    }

    private async execute_compensation(saga: { data: any; id: string; }, compensation_name: string, def: saga_definition) {
        const comp = def.compensations[compensation_name];
        const cmd = comp(saga);
        await this.bus.publish(
            cmd.exchange,
            cmd.routing_key,
            cmd.payload,
            { correlation_id: saga.id }
        );

        await this.store.mark_compensated(saga.id);
    }
}

const pool = new Pool({
    user: "postgres",
    password: "typebot",
    host: "localhost",
    port: 5432,
    database: "sagas"
});

const saga_store = new saga_store_class(pool);
const rabbitmq = new RabbitMQ('amqp://localhost');
await rabbitmq.connect();
await rabbitmq.ensure_exchange('inventory', 'topic');
await rabbitmq.ensure_exchange('payment', 'topic');
await rabbitmq.ensure_exchange('billing', 'topic');
await rabbitmq.ensure_exchange('shipping', 'topic');
await rabbitmq.ensure_exchange('orchestrator.events', 'topic');

const orchestrator = new saga_orchestrator(saga_store as any, rabbitmq);

const events = new event_handler(rabbitmq, orchestrator);
await events.start_consuming("orchestrator.events.queue");

const order = {
    order_id: '123456',
    user_id: '5465465adf',
    product_id: "54654ag",
    quantity: 50,
    amount: 30,
    address: "5th Avenue, New York, New York, USA"
};
orchestrator
    .start(order_saga_definition, order)
    .then(res => console.log('RES FROM START IS: ', res))
    .catch(err => console.error('ERROR FROM START IS: ', err));