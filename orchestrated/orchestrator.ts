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
    update_step(id: string, next_step_index: number, new_data?: Record<string, any>): Promise<any>;
    mark_compensated(id: string): Promise<any>;
}

export class saga_orchestrator {
    constructor(private store: interface_saga_store, private bus: RabbitMQ) { }

    async start(def: saga_definition, data: any) {
        const id = crypto.randomUUID();
        const saga = await this.store.create(def.name, id, data);

        await this.execute_step(saga, def.steps[0]);
        return { saga_id: id };
    }

    async handle_event(event: saga_event) {
        const first_saga = await this.store.get(event.saga_id);
        if (!first_saga) throw new Error("Saga not found");

        const def = sagas[first_saga.type];
        if (!def) throw new Error(`Unknown saga type: ${first_saga.type}`);

        const step = def.steps.find(elem => elem.name === event.name)!;

        if (event.success) {
            const next_step_name = step.on_success;
            await this.move_to_step({ id: event.saga_id, data: event.payload }, next_step_name, def);
        } else {
            const fail_step = step.on_failure;
            await this.execute_compensation({ id: event.saga_id, data: event.payload }, fail_step, def);
        }
    }

    async handle_compensation_event(event: saga_event) {
        const first_saga = await this.store.get(event.saga_id);
        if (!first_saga) throw new Error('Saga not found');

        const def = sagas[first_saga.type];
        if (!def) throw new Error(`Unknown saga type: ${first_saga.type}`);

        const compensation = def.compensations[`${event.name}`];
        if (!compensation) throw new Error(`Compensation not found for: ${event.name}`);

        const next_compensation = compensation({ data: event.payload }).next;
        if (next_compensation === "compensate_completed") {
            await this.store.mark_compensated(event.saga_id);
            return;
        }
        await this.execute_compensation({ data: event.payload, id: event.saga_id }, next_compensation, def);
    }

    // STANDARDIZE INTERFACES ACROSS FUNCTIONS/CLASSES
    // CLOSE CONNECTION IN CONSUMERS
    // CREATE PUBLISHERS IN MICRO-SERVICES
    // REVIEW IMPLEMENTATION

    private async move_to_step(saga: { data: any, id: string; }, next_step_name: string, def: saga_definition) {
        if (next_step_name === "complete_saga") {
            return this.store.mark_completed(saga.id);
        }

        const next_step = def.steps.find((s: { name: string; }) => s.name === next_step_name);
        const next_step_index = def.steps.findIndex((s: { name: string; }) => s.name === next_step_name);

        if (!next_step) throw new Error('Next step is undefined');
        await this.store.update_step(saga.id, next_step_index, saga.data);
        await this.execute_step(saga, next_step);
    }

    private async execute_step(saga: { data: any; id: string; }, step: step) {
        const command = step.command(saga);
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

const exchanges = ['inventory', 'payment', 'billing', 'shipping', 'orchestrator.events'];
await rabbitmq.ensure_exchanges(exchanges);

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