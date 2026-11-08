/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - SHARED DATABASE CONNECTION
 * File: backend/shared/config/database.js
 * Description: Singleton Sequelize instance configured for Microsoft SQL Server
 *              connecting to the shared 'RestaurantManagementDB'.
 * ============================================================================
 */

const { Sequelize } = require('sequelize');
const config = require('./env');

const sequelize = new Sequelize(
  config.db.database,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'mssql',
    dialectOptions: {
      options: {
        encrypt: false, // Set true if using Azure SQL or encrypted connection
        trustServerCertificate: true, // Necessary for local development self-signed certs
        enableArithAbort: true,
        requestTimeout: 30000,
      },
    },
    pool: {
      max: config.db.pool.max,
      min: config.db.pool.min,
      acquire: config.db.pool.acquire,
      idle: config.db.pool.idle,
    },
    logging: config.isDevelopment ? (msg) => {
      // Avoid spamming stdout with SELECT 1 probes; log queries only when requested
      if (process.env.DB_LOG_QUERIES === 'true') {
        console.log(`[SQL] ${msg}`);
      }
    } : false,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
    },
  }
);

/**
 * Health check probe for database connectivity
 * @returns {Promise<{healthy: boolean, message: string, timestamp: string}>}
 */
async function testDbConnection() {
  try {
    await sequelize.authenticate();
    return {
      healthy: true,
      message: `Successfully authenticated with SQL Server (${config.db.database} on ${config.db.host}:${config.db.port})`,
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
  sequelize,
  Sequelize,
  testDbConnection,
};

