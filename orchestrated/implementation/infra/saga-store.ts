import { Pool } from 'pg';
import { interface_saga_store, saga_state, saga_status } from '../interfaces';

export class saga_store implements interface_saga_store {
    constructor(private pool: Pool) { }

    async create(type: string, id: string, data: Record<string, any>): Promise<saga_state> {
        const now = new Date().toISOString();
        const step_index = 0;
        const status: saga_status = 'running';

        await this.pool.query(
            `INSERT INTO sagas(id, type, step_index, status, data, created_at, updated_at)
            VALUES($1,$2,$3,$4,$5,$6,$7)`,
            [id, type, step_index, status, data, now, now]
        );

        return {
            id,
            type,
            step_index,
            status,
            data,
            created_at: now,
            updated_at: now,
        };
    }

    async get(id: string): Promise<saga_state | null> {
        const { rows } = await this.pool.query(`SELECT * FROM sagas WHERE id = $1`, [id]);
        if (rows.length === 0) return null;
        const r = rows[0];

        return {
            id: r.id,
            type: r.type,
            step_index: r.step_index,
            status: r.status,
            data: r.data,
            created_at: r.created_at,
            updated_at: r.updated_at
        };
    }

    async update_step(id: string, step_index: number, new_data?: Record<string, any>): Promise<void> {
        const now = new Date().toISOString();
        await this.pool.query(
            `UPDATE sagas SET step_index = $2, data = COALESCE(data || $3::jsonb, $3::jsonb), updated_at = $4 WHERE id = $1`,
            [id, step_index, JSON.stringify(new_data || {}), now]
        );
    }

    async mark_completed(id: string): Promise<void> {
        const now = new Date().toISOString();
        await this.pool.query(`UPDATE sagas SET status = $2, updated_at = $3 WHERE id = $1`, [id, 'complete', now]);
    }

    async mark_compensated(id: string): Promise<void> {
        const now = new Date().toISOString();
        await this.pool.query(`UPDATE sagas SET status = $2, updated_at = $3 WHERE id = $1`, [id, 'compensated', now]);
    }

    async fail(id: string, reason?: string): Promise<void> {
        const now = new Date().toISOString();
        await this.pool.query(
            `UPDATE sagas SET status = $2, data = COALESCE(data || $3::jsonb, $3::jsonb), updated_at = $4 WHERE id = $1`,
            [id, 'failed', JSON.stringify({ failure_reason: reason }), now]
        );
    }
} 