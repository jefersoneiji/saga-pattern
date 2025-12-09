class order_saga {
    start(orderId: string) {
        try {
            this.create_order(orderId);
            this.reserve_stock(orderId);
            this.process_payment(orderId);
            this.ship_order(orderId);
        } catch (error: any) {
            this.compensate_order(orderId, error);
        }
    }

    private create_order(orderId: string) {
        // Logic to create an order
        console.log(`Creating order ${orderId}`);
    }

    private reserve_stock(orderId: string) {
        // Logic to reserve stock
        console.log(`Reserving stock for order ${orderId}`);
    }

    private process_payment(orderId: string) {
        // Logic to process payment
        console.log(`Processing payment for order ${orderId}`);
    }

    private ship_order(orderId: string) {
        // Logic to ship the order
        console.log(`Shipping order ${orderId}`);
    }

    private compensate_order(orderId: string, error: Error) {
        // Logic to rollback the order
        console.log(`Order compensation due to ${error.message}`);
    }
}

const saga = new order_saga();
saga.start('123456');