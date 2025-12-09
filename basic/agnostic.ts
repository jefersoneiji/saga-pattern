interface saga_step {
    execute(): Promise<void>;
    compensate(): Promise<void>;
}

class saga_orchestrator {
    private steps: saga_step[] = [];

    add_step(step: saga_step) {
        this.steps.push(step);
    }

    private async compensate() {
        for (const step of this.steps.reverse()) {
            await step.compensate();
        }
    }

    async execute() {
        for (const step of this.steps) {
            try {
                await step.execute();
            } catch (error) {
                await this.compensate();
                throw error;
            }
        }
    }
}

class order_creation_step implements saga_step {
    async execute(): Promise<void> { console.log('order creation executed.'); }

    async compensate(): Promise<void> { console.log('order creation compensated.'); }
}

class payment_processing_step implements saga_step {
    async execute(): Promise<void> {
        console.log('payment processing executed.');
        throw Error('Credit card refused.');
    }

    async compensate(): Promise<void> { console.log('payment processing compensated.'); }
}

const saga = new saga_orchestrator();

saga.add_step(new order_creation_step());
saga.add_step(new payment_processing_step());

saga
    .execute()
    .then(() => console.log('Saga executed successfully.'))
    .catch((error) => console.error(`Saga execution failed: ${error}`));
