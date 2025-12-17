import { interface_saga_store, saga_definition, interface_step, saga_event } from "../microservices/interfaces";
import { saga_store as saga_store_class } from "./infra/saga-store";
import { order_saga_definition } from "./sagas/order-saga";
import { event_handler } from "./handlers/event-handler";
import { RabbitMQ } from './rabbitmq';
import { sagas } from "./sagas";

import { Pool } from "pg";

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
        def;
        const compensation = def.compensations[`${event.name}`];
        if (!compensation) throw new Error(`Compensation not found for: ${event.name}`);

        const next_compensation = compensation({ data: event.payload }).next;
        if (next_compensation === "compensate_completed") {
            await this.store.mark_compensated(event.saga_id);
        }

        if (next_compensation !== "compensate_completed") {
            await this.execute_compensation({ data: event.payload, id: event.saga_id }, next_compensation, def);
        }
    }

    // DOCKERIZE APPLICATION
    // HOW TO INITIATE ORCHESTRATOR FROM A MICROSERVICE
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

    private async execute_step(saga: { data: any; id: string; }, step: interface_step) {
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
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    host: process.env.PG_HOST,
    port: process.env.PG_PORT as unknown as number,
    database: process.env.PG_DATABASE
});

const saga_store = new saga_store_class(pool);
const rabbitmq = new RabbitMQ(process.env.RABBITMQ_URL!);
await rabbitmq.connect();

const exchanges = ['inventory', 'payment', 'billing', 'shipping', 'orchestrator.events'];
await rabbitmq.ensure_exchanges(exchanges);

const orchestrator = new saga_orchestrator(saga_store as any, rabbitmq);

const events = new event_handler(rabbitmq, orchestrator);
await events.start_consuming("orchestrator.events.queue");

const order = {
    product_id: "9ec2f934-7e7b-4772-bdbe-f14a492af1d1",
};
orchestrator
    .start(order_saga_definition, order)
    .then(res => console.log('RES FROM START IS: ', res))
    .catch(err => console.error('ERROR FROM START IS: ', err));