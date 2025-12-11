import { saga_definition, step } from "./sagas/order-saga";
import { RabbitMQ } from './rabbitmq';
import { saga_event } from "./handlers/event-handler";
import { sagas } from "./sagas";

interface saga_store {
    create(name: string, data: any): Promise<any>;
    get(id: string): Promise<{ type: string, step_index: number; }>;
    mark_completed(id: string): Promise<any>;
    update_step(id: string, next_step_name: string): Promise<any>;
    mark_compensated(id: string): Promise<any>;
}

export class saga_orchestrator {
    constructor(private store: saga_store, private bus: RabbitMQ) { }

    async start(def: saga_definition, data: any) {
        const saga = await this.store.create(def.name, data);
        await this.execute_step(saga, def.steps[0]);
    }

    async handle_event(event: saga_event) {
        const saga = await this.store.get(event.saga_id);
        if (!saga) throw new Error("Saga not found");

        const def = sagas[saga.type];
        if (!def) throw new Error(`Unknown saga type: ${saga.type}`);

        const step = def.steps[saga.step_index];

        if (event.success) {
            const next_step_name = step.on_success;
            await this.move_to_step(saga, next_step_name, def);
        } else {
            const fail_step = step.on_failure;
            await this.execute_compensation(saga, fail_step, def);
        }
    }

    private async move_to_step(saga: { data: any, id: string; }, next_step_name: string, def: saga_definition) {
        if (next_step_name === "complete_saga") {
            return this.store.mark_completed(saga.id);
        }

        const next_step = def.steps.find((s: { name: string; }) => s.name === next_step_name);
        if (!next_step) throw new Error('Next step is undefined');

        await this.store.update_step(saga.id, next_step.name);
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

        await this.store.mark_compensated(saga.id);
    }
}