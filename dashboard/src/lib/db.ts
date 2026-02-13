import pg from 'pg'

// Fix BigInt serialization (pg returns bigint for bigserial/COUNT)
// @ts-ignore
BigInt.prototype.toJSON = function () {
    return Number(this);
};

// Raw pg pool — the only DB layer we use
// Use unix socket directly (no URL parsing issues)
const getPool = (() => {
    let instance: pg.Pool | null = null
    return () => {
        if (!instance) {
            instance = new pg.Pool({
                user: 'shad',
                database: 'openclaw_db',
                host: '/var/run/postgresql',
                max: 20,
                idleTimeoutMillis: 0,       // keep connections alive forever
                connectionTimeoutMillis: 10000,
            })
            // Log errors instead of crashing
            instance.on('error', (err) => {
                console.error('PG Pool error:', err.message)
            })
        }
        return instance
    }
})()

export const pool = new Proxy({} as pg.Pool, {
    get(_target, prop) {
        return (getPool() as any)[prop]
    }
})
