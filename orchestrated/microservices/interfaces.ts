export interface interface_saga_store {
    create(name: string, type: string, data: any): Promise<any>;
    get(id: string): Promise<{ type: string, step_index: number; } | null>;
    mark_completed(id: string): Promise<any>;
    update_step(id: string, next_step_index: number, new_data?: Record<string, any>): Promise<any>;
    mark_compensated(id: string): Promise<any>;
}

export interface saga_state {
    id: string;
    type: string;
    step_index: number;
    status: saga_status;
    data: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export type saga_status = 'pending' | 'running' | 'completed' | 'failed' | 'compensating';

interface saga {
    data: any;
}

export interface compensations {
    [index: string]: (saga: saga) => ({
        exchange: string,
        routing_key: string,
        payload: any; next: string;
    });
}

export interface interface_step {
    name: string;
    command: (saga: saga) => ({
        exchange: string,
        routing_key: string,
        payload: any;
    });
    on_success: string;
    on_failure: string;
}

export interface saga_definition {
    name: string;
    steps: Array<interface_step>;
    compensations: compensations;
}

export interface saga_event {
    saga_id: string;
    name: string,
    type: string;
    success: string;
    payload: any;
}

export interface interface_orchestrator {
    handle_event: (e: saga_event) => Promise<void>;
    handle_compensation_event: (e: saga_event) => Promise<void>;
}

export interface publish_options {
    correlation_id?: string,
    reply_to?: string,
    persistent?: boolean,
    expiration_ms?: number;
}