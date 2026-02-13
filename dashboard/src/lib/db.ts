import pg from 'pg'

// Fix BigInt serialization (pg returns bigint for bigserial/COUNT)
// @ts-ignore
BigInt.prototype.toJSON = function () {
    return Number(this);
};

// Raw pg pool — the only DB layer we use
let _pool: pg.Pool | null = null
export const pool = new Proxy({} as pg.Pool, {
    get(_target, prop) {
        if (!_pool) {
            const url = (process.env.DATABASE_URL || '').replace(/[?&]schema=[^&]+/, '')
            _pool = new pg.Pool({
                connectionString: url,
            })
        }
        return (_pool as any)[prop]
    }
})
