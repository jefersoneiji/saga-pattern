import amqp, { ChannelModel, Channel, Options, ConsumeMessage } from 'amqplib';

export interface PublishOptions {
    correlation_id?: string,
    reply_to?: string,
    persistent?: boolean,
    expiration_ms?: number;
}

export class RabbitMQ {
    private conn?: ChannelModel;
    private ch?: Channel;

    constructor(private url: string) { }

    get_channel(): Channel {
        if (!this.ch) {
            throw new Error("RabbitMQ channel not initialized. Call connect() first.");
        }

        return this.ch;
    }
    
    async connect() {
        this.conn = await amqp.connect(this.url);
        this.ch = await this.conn.createChannel();
    }

    async ensure_exchange(exchange: string, type: 'direct' | 'topic' | 'fanout' = 'direct') {
        if (!this.ch) throw new Error('Not connected');
        await this.ch.assertExchange(exchange, type, { durable: true });
    }

    async publish(exchange: string, routing_key: string, payload: any, opts: PublishOptions = {}) {
        if (!this.ch) throw new Error('Not connected');
        const content = Buffer.from(JSON.stringify(payload));
        const options: Options.Publish = {
            correlationId: opts.correlation_id,
            replyTo: opts.reply_to,
            persistent: opts.persistent ?? true,
        } as Options.Publish;

        if (opts.expiration_ms) options.expiration = String(opts.expiration_ms);

        this.ch.publish(exchange, routing_key, content, options);
    }

    async consume(queue: string, on_message: (msg: ConsumeMessage) => Promise<void>, opts: { noAck?: boolean; } = {}) {
        if (!this.ch) throw new Error('Not connected');

        await this.ch.assertQueue(queue, { durable: true });
        await this.ch.consume(
            queue,
            async msg => {
                if (!msg) return;
                try {
                    await on_message(msg);
                    if (!opts.noAck) this.ch!.ack(msg);
                } catch (error) {
                    console.error('Error processing message: ', error);
                    if (!opts.noAck) this.ch!.nack(msg, false, false);
                }
            },
            { noAck: opts.noAck ?? false }
        );
    }

    async close() {
        await this.ch?.close();
        await this.conn?.close();
    }
}