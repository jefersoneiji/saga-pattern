import { EventEmitter } from 'events';

const saga_events = new EventEmitter();

function create_order(orderId: string) {
    console.log('order_created');
    saga_events.emit('order_created', orderId);
}
function reserve_stock(orderId: string) {
    console.log('stock reserved');
    saga_events.emit('stock_reserved', orderId);
}
function process_payment(orderId: string) {
    console.log('payment processed');
    saga_events.emit('payment_processed', orderId);
}
function ship_order(orderId: string) {
    console.log('order shipped: ', orderId);
    console.log('order failed: ', orderId);
    saga_events.emit('order_failed', orderId);
}
function compensate_order(orderId: string) {
    console.log('order compensated: ', orderId);
}

saga_events.on('order_created', reserve_stock);
saga_events.on('stock_reserved', process_payment);
saga_events.on('payment_processed', ship_order);
saga_events.on('order_failed', compensate_order);

create_order('12345');