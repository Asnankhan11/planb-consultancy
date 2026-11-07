'use strict';

const fs = require('node:fs');
const path = require('node:path');

function unavailableError() {
    return Object.assign(new Error('Persistent storage is unavailable. Please contact the team directly.'), { status: 503, code: 'STORAGE_UNAVAILABLE' });
}

function createDatabase() {
    const url = process.env.LIBSQL_URL || process.env.TURSO_DATABASE_URL;
    let driver;
    let mode = 'unavailable';
    if (url) {
        if (!/^https:\/\//.test(url) && !/^libsql:\/\//.test(url)) throw new Error('LIBSQL_URL must be a remote HTTPS or libsql URL.');
        const { createClient } = require('@libsql/client');
        const client = createClient({ url, authToken: process.env.LIBSQL_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN });
        mode = 'libsql';
        driver = {
            async execute(sql, args = []) {
                const result = await client.execute({ sql, args: args.map(v => v === undefined ? null : v) });
                return { rows: result.rows.map(row => Object.fromEntries(Object.entries(row))), lastID: Number(result.lastInsertRowid || 0), changes: result.rowsAffected };
            },
            async batch(statements) { await client.batch(statements.map(statement => typeof statement === 'string' ? statement : ({sql: statement.sql, args: (statement.args || []).map(value => value === undefined ? null : value)})), 'write'); },
            close: () => client.close()
        };
    } else if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
        // A real local database is for development only. Never copy a DB to ephemeral /tmp in production.
        const sqlite = require('sqlite3');
        const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '.data', 'planb.sqlite');
        if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        const connection = new sqlite.Database(dbPath);
        connection.configure('busyTimeout', 5000);
        mode = 'sqlite';
        driver = {
            execute(sql, args = []) {
                return new Promise((resolve, reject) => {
                    if (/^\s*(SELECT|PRAGMA|WITH)\b/i.test(sql)) {
                        connection.all(sql, args, (error, rows) => error ? reject(error) : resolve({ rows, changes: 0 }));
                    } else {
                        connection.run(sql, args, function (error) {
                            error ? reject(error) : resolve({ rows: [], lastID: this.lastID, changes: this.changes });
                        });
                    }
                });
            },
            async batch(statements) {
                await this.execute('BEGIN IMMEDIATE');
                try {
                    for (const statement of statements) await this.execute(typeof statement === 'string' ? statement : statement.sql, typeof statement === 'string' ? [] : statement.args);
                    await this.execute('COMMIT');
                } catch (error) { await this.execute('ROLLBACK').catch(() => {}); throw error; }
            },
            close: () => new Promise((resolve, reject) => connection.close(error => error ? reject(error) : resolve()))
        };
    }
    let queue = Promise.resolve();
    // Keep transactions and single statements ordered on a shared local connection.
    const run = operation => { const result = queue.then(operation); queue = result.catch(() => {}); return result; };
    return {
        mode,
        configured: Boolean(driver),
        available: Boolean(driver),
        async execute(sql, args) {
            if (!driver || !this.available) throw unavailableError();
            return run(() => driver.execute(sql, args));
        },
        async batch(statements) {
            if (!driver || !this.available) throw unavailableError();
            return run(() => driver.batch(statements));
        },
        async close() { if (driver) await driver.close(); }
    };
}

module.exports = { createDatabase, unavailableError };
