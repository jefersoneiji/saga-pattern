interface saga {
    data: any;
}

export interface step {
    name: string;
    command: (saga: saga) => ({ exchange: string, routing_key: string, payload: any; });
    on_success: string;
    on_failure: string;
}

interface compensations {
    [index: string]: (saga: saga) => ({ exchange: string, routing_key: string, payload: any; });
}

export interface saga_definition {
    name: string;
    steps: Array<step>;
    compensations: compensations;
}


export const order_saga_definition: saga_definition = {
    name: "order_saga",
    steps: [
        {
            name: "reserve_product",
            command: saga => ({
                exchange: "inventory",
                routing_key: "inventory.reserve",
                payload: {
                    product_id: saga.data.product_id
                }
            }),
            on_success: "process_payment",
            on_failure: "fail_saga"
        },
        {
            name: "process_payment",
            command: saga => ({
                exchange: "payment",
                routing_key: "payment.charge",
                payload: {
                    order_id: saga.data.order_id,
                    amount: saga.data.amount,
                    user_id: saga.data.user_id,
                }
            }),
            on_success: "generate_invoice",
            on_failure: "compensate_release_product"
        },
        {
            name: "generate_invoice",
            command: saga => ({
                exchange: "billing",
                routing_key: "invoice.generate",
                payload: {
                    order_id: saga.data.order_id,
                    user_id: saga.data.user_id,
                }
            }),
            on_success: "ship_product",
            on_failure: "compensate_refund_payment"
        },
        {
            name: "ship_product",
            command: saga => ({
                exchange: "shipping",
                routing_key: "shipping.ship",
                payload: {
                    order_id: saga.data.order_id,
                    address: saga.data.address,
                }
            }),
            on_success: "complete_saga",
            on_failure: "compensate_revoke_invoice"
        }
    ],

    compensations: {
        compensate_release_product: saga => ({
            exchange: "inventory",
            routing_key: "inventory.release",
            payload: {
                product_id: saga.data.product_id,
                quantity: saga.data.quantity
            }
        }),
        compensate_refund_payment: saga => ({
            exchange: "payment",
            routing_key: "payment.refund",
            payload: {
                order_id: saga.data.order_id,
            }
        }),
        compensate_revoke_invoice: saga => ({
            exchange: "billing",
            routing_key: "invoice.revoke",
            payload: {
                invoice_id: saga.data.invoice_id,
            }
        })
    }
};