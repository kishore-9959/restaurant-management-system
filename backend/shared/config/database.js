/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - GLOBAL DATABASE CONFIGURATION
 * File: backend/shared/config/database.js
 * Description: Singleton Microsoft SQL Server connection pool and stored procedure
 *              execution helper using the 'mssql' package.
 * ============================================================================
 */

const sql = require('mssql');
const config = require('./env');

let pool = null;
let poolPromise = null;

const dbConfig = {
  user: config.db.user,
  password: config.db.password,
  server: config.db.host,
  port: Number(config.db.port),
  database: config.db.database,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 30000,
  },
  pool: {
    max: (config.db.pool && config.db.pool.max) || 10,
    min: (config.db.pool && config.db.pool.min) || 2,
    idleTimeoutMillis: (config.db.pool && config.db.pool.idle) || 30000,
    acquireTimeoutMillis: (config.db.pool && config.db.pool.acquire) || 30000,
  },
};

/**
 * Get or initialize the singleton SQL Server connection pool.
 * @returns {Promise<sql.ConnectionPool>}
 */
async function getPool() {
  if (pool && pool.connected) {
    return pool;
  }

  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then(p => {
        pool = p;
        pool.on('error', err => {
          console.error('[MSSQL POOL ERROR]', err.message);
        });
        return pool;
      })
      .catch(err => {
        poolPromise = null;
        throw err;
      });
  }

  return poolPromise;
}

/**
 * Gracefully close the singleton connection pool.
 */
async function closePool() {
  if (pool) {
    try {
      await pool.close();
    } catch (err) {
      console.error('[MSSQL CLOSE ERROR]', err.message);
    } finally {
      pool = null;
      poolPromise = null;
    }
  }
}

/**
 * Automatically maps JS values to MSSQL data types if explicit type not provided
 */
function inferSqlType(key, val) {
  if (val === null || val === undefined) return sql.NVarChar;
  if (typeof val === 'boolean') return sql.Bit;
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      if (key.toLowerCase().endsWith('id') || key.toLowerCase().includes('count') || key.toLowerCase().includes('limit') || key.toLowerCase().includes('offset')) {
        return Math.abs(val) > 2147483647 ? sql.BigInt : sql.Int;
      }
      return Math.abs(val) > 2147483647 ? sql.BigInt : sql.Int;
    }
    return sql.Decimal(12, 4);
  }
  if (val instanceof Date) return sql.DateTime2;
  return sql.NVarChar;
}

/**
 * Executes a SQL Server stored procedure with safe inputs and outputs.
 * 
 * @param {string} procedureName - Name of the stored procedure (e.g., 'dbo.usp_User_GetById')
 * @param {Object} inputs - Key-value map of input parameters
 * @param {Object} outputs - Key-value map of output parameter types
 * @returns {Promise<{recordset: Array, recordsets: Array, output: Object, rowsAffected: Array}>}
 */
async function executeProcedure(procedureName, inputs = {}, outputs = {}) {
  const p = await getPool();
  const request = p.request();

  // Bind input parameters
  for (const [key, value] of Object.entries(inputs)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && value.type && Object.prototype.hasOwnProperty.call(value, 'value')) {
        request.input(key, value.type, value.value);
      } else {
        request.input(key, value);
      }
    }
  }

  // Bind output parameters
  for (const [key, type] of Object.entries(outputs)) {
    request.output(key, type);
  }

  const result = await request.execute(procedureName);
  return {
    recordset: result.recordset || [],
    recordsets: result.recordsets || [],
    output: result.output || {},
    rowsAffected: result.rowsAffected || [0],
    returnValue: result.returnValue,
  };
}

/**
 * Executes a parameterized SQL query (for health probes or read queries).
 * 
 * @param {string} sqlText - SQL query string
 * @param {Object} params - Key-value parameter map
 * @returns {Promise<sql.IResult<any>>}
 */
async function query(sqlText, params = {}) {
  const p = await getPool();
  const request = p.request();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      request.input(key, value);
    }
  }
  return request.query(sqlText);
}

/**
 * Health check probe for database connectivity
 * @returns {Promise<{healthy: boolean, message: string, timestamp: string}>}
 */
async function testDbConnection() {
  try {
    const p = await getPool();
    await p.request().query('SELECT 1 AS [healthy]');
    return {
      healthy: true,
      message: `Successfully connected to SQL Server (${config.db.database} on ${config.db.host}:${config.db.port}) via mssql pool`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Database connection error: ${error.message}`,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = {
  sql,
  getPool,
  closePool,
  executeProcedure,
  query,
  testDbConnection,
};
