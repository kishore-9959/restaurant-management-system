const path = require('path');
const { sequelize } = require(path.join(__dirname, '../backend/shared/config/database'));

async function inspectProcedures() {
  try {
    await sequelize.authenticate();
    const [procs] = await sequelize.query(`
      SELECT ROUTINE_SCHEMA, ROUTINE_NAME, CREATED, LAST_ALTERED
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'PROCEDURE'
      ORDER BY ROUTINE_NAME
    `);
    console.log(`Stored procedures count: ${procs.length}`);
    procs.forEach(p => {
      console.log(`- ${p.ROUTINE_SCHEMA}.${p.ROUTINE_NAME} (Created: ${p.CREATED})`);
    });

    const [params] = await sequelize.query(`
      SELECT SPECIFIC_NAME, PARAMETER_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, PARAMETER_MODE
      FROM INFORMATION_SCHEMA.PARAMETERS
      ORDER BY SPECIFIC_NAME, ORDINAL_POSITION
    `);
    console.log(`\nParameters count: ${params.length}`);
    const paramMap = {};
    params.forEach(pm => {
      if (!paramMap[pm.SPECIFIC_NAME]) paramMap[pm.SPECIFIC_NAME] = [];
      paramMap[pm.SPECIFIC_NAME].push(`${pm.PARAMETER_MODE} ${pm.PARAMETER_NAME} ${pm.DATA_TYPE}${pm.CHARACTER_MAXIMUM_LENGTH ? '(' + pm.CHARACTER_MAXIMUM_LENGTH + ')' : ''}`);
    });
    for (const [proc, pList] of Object.entries(paramMap)) {
      console.log(`\n${proc}:\n  ${pList.join('\n  ')}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

inspectProcedures();

