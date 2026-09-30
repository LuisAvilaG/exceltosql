import * as sql from 'mssql';

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
    if (pool && pool.connected) {
        return pool;
    }
    const config: sql.config = {
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      server: process.env.SQL_HOST || 'localhost',
      database: process.env.SQL_DATABASE,
      port: Number(process.env.SQL_PORT) || 1433,
      options: {
        encrypt: process.env.SQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === 'true',
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    };
    pool = await new sql.ConnectionPool(config).connect();
    pool.on('error', err => {
        console.error('SQL Pool Error', err);
        pool = null;
    });
    return pool;
}

const INT_COLUMNS = new Set(['MeraLocationId', 'MeraAreaId', 'MeraRevenueCenterId', 'MeraOrderType']);

type FilterInput = {
    filters?: Record<string, any>;
    dateRange?: { startDate?: string; endDate?: string };
};

/** Builds the WHERE clause shared by the viewer and the delete flow so both always match the same rows. */
export function buildWhere(request: sql.Request, { filters, dateRange }: FilterInput): string {
    const clauses: string[] = [];
    let i = 0;

    if (filters) {
        for (const [key, value] of Object.entries(filters)) {
            if (value === undefined || value === null || value === '') continue;
            if (!/^[a-zA-Z0-9_]+$/.test(key)) continue;
            if (Array.isArray(value)) {
                // Multi-select filter: exact match against any of the chosen values.
                if (value.length === 0) continue;
                const names = value.map((v, j) => {
                    const p = `param${i++}_${j}`;
                    if (INT_COLUMNS.has(key)) request.input(p, sql.Int, Number(v));
                    else request.input(p, sql.NVarChar(100), String(v));
                    return `@${p}`;
                });
                clauses.push(`[${key}] IN (${names.join(', ')})`);
                continue;
            }
            const p = `param${i++}`;
            clauses.push(`[${key}] LIKE @${p}`);
            request.input(p, `%${value}%`);
        }
    }
    if (dateRange?.startDate) {
        const p = `param${i++}`;
        clauses.push(`[SalesDate] >= @${p}`);
        request.input(p, sql.Date, new Date(dateRange.startDate));
    }
    if (dateRange?.endDate) {
        const p = `param${i++}`;
        clauses.push(`[SalesDate] <= @${p}`);
        request.input(p, sql.Date, new Date(dateRange.endDate));
    }
    return clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
}
