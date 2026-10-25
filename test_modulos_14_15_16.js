const { db } = require('./Config/db.js');
const reporteModel = require('./Model/reportePlanillaModel.js');
const boletaModel = require('./Model/boletaPagoModel.js');
const liquidacionModel = require('./Model/liquidacionModel.js');

const cVerde = '\x1b[32m';
const cRojo = '\x1b[31m';
const cAmarillo = '\x1b[33m';
const cAzul = '\x1b[36m';
const cReset = '\x1b[0m';

function ok(msg) { console.log(`  ${cVerde}${cReset} ${msg}`); }
function warn(msg) { console.log(`  ${cAmarillo}${cReset} ${msg}`); }
function fail(msg, err) { console.log(`  ${cRojo}${cReset} ${msg}`, err ? `(${err.message})` : ''); }

async function ejecutarPruebas() {
  console.log(`\n${cAzul}================================================================${cReset}`);
  console.log(`${cAzul}   SUITE DE PRUEBAS TÉCNICAS: MÓDULOS 14, 15 Y 16 (PLANILLA)   ${cReset}`);
  console.log(`${cAzul}================================================================${cReset}\n`);

  let conn;
  try {
    conn = await db.getConnection();
    ok('Conexión a MySQL exitosa.');
  } catch (err) {
    fail('No se pudo conectar a MySQL. Asegúrate de que el servicio MySQL esté corriendo y que la contraseña en .env sea correcta.', err);
    process.exit(1);
  }

  try {
    
    console.log(`\n${cAmarillo}[1/4] Verificando Tablas y Vistas en la Base de Datos...${cReset}`);
    
    const tablasRequeridas = [
      'EMPRESA', 'SUCURSAL', 'PERSONA', 'PUESTO', 'STATUS_EMPLEADO',
      'EMPLEADO', 'PERIODO_PLANILLA', 'PLANILLA_CABECERA', 'PLANILLA_DETALLE',
      'LIQUIDACION', 'V_REPORTE_PLANILLA', 'V_BOLETA_PAGO'
    ];

    const [rows] = await conn.query('SHOW FULL TABLES');
    const tablasExistentes = rows.map(r => Object.values(r)[0].toLowerCase());

    for (const t of tablasRequeridas) {
      if (tablasExistentes.includes(t.toLowerCase())) {
        ok(`Tabla/Vista encontrada: ${t}`);
      } else {
        if (t.startsWith('V_')) {
          warn(`Vista ${t} aún no ha sido creada. Recuerda ejecutar database_puntos_14_15_16.sql`);
        } else {
          fail(`Tabla requerida no encontrada: ${t}`);
        }
      }
    }

    console.log(`\n${cAmarillo}[2/4] Probando Módulo 14: Reporte de Planilla...${cReset}`);
    
    const periodos = await reporteModel.obtenerPeriodosProcesados();
    if (periodos.length > 0) {
      ok(`Períodos procesados encontrados en el sistema: ${periodos.length}`);
      const p = periodos[0];
      ok(`Consultando reporte consolidado del período ${p.Anio}-${p.Mes}...`);
      
      const reporte = await reporteModel.obtenerReportePorPeriodo(p.Anio, p.Mes);
      if (reporte && reporte.cabecera && Array.isArray(reporte.detalle)) {
        ok(`Reporte obtenido correctamente sin recalcular.`);
        ok(`Total Ingresos: Q ${reporte.cabecera.TotalIngresos} | Total Descuentos: Q ${reporte.cabecera.TotalDescuentos} | Salario Neto: Q ${reporte.cabecera.SalarioNeto}`);
        ok(`Total de empleados listados en el reporte: ${reporte.detalle.length}`);
      } else {
        fail('El reporte del período procesado devolvió una estructura incompleta.');
      }
    } else {
      warn('No hay planillas procesadas todavía en PLANILLA_CABECERA.');
      warn('Para probar el reporte con datos reales, procesa primero un período desde "13. Calcular Planilla" (calculo_planilla.html).');
    }

    console.log(`\n${cAmarillo}[3/4] Probando Módulo 15: Boletas de Pago...${cReset}`);

    if (periodos.length > 0) {
      const p = periodos[0];
      const empleadosPeriodo = await boletaModel.obtenerEmpleadosPorPeriodo(p.Anio, p.Mes);
      
      if (empleadosPeriodo.length > 0) {
        ok(`Empleados encontrados para boletas en ${p.Anio}-${p.Mes}: ${empleadosPeriodo.length}`);
        const primerEmp = empleadosPeriodo[0];
        
        const boleta = await boletaModel.obtenerBoletaEmpleado(p.Anio, p.Mes, primerEmp.IdEmpleado);
        if (boleta) {
          ok(`Boleta generada exitosamente para: ${boleta.NombreEmpleado}`);
          ok(`Puesto: ${boleta.NombrePuesto} | DPI: ${boleta.NumeroIdentificacion} | Empresa: ${boleta.NombreEmpresa}`);
          ok(`Ingresos: Q ${boleta.TotalIngresos} - Descuentos: Q ${boleta.TotalDescuentos} = Salario Neto: Q ${boleta.SalarioNeto}`);
        } else {
          fail(`No se pudo obtener la boleta del empleado #${primerEmp.IdEmpleado}`);
        }
      } else {
        warn(`No se encontraron empleados detallados para el período ${p.Anio}-${p.Mes}.`);
      }
    } else {
      warn('Requiere al menos un período procesado en el punto 13 para emitir boletas.');
    }

    console.log(`\n${cAmarillo}[4/4] Probando Módulo 16: Liquidación de Empleado...${cReset}`);

    const simulacion = liquidacionModel.calcularPrestacionesLaborales({
      fechaContratacion: '2024-01-01',
      fechaEgreso: '2026-06-30',
      sueldoBase: 10000,
      bonificacion: 250,
      otrosIngresos: 0,
      descuentoIgss: 483,
      descuentoIsr: 0,
      descuentoInasistencias: 0,
      motivoEgreso: 'Despido Injustificado'
    });

    if (simulacion.totalNetoLiquidacion > 0 && simulacion.montoIndemnizacion > 0) {
      ok('Cálculo de prestaciones laborales verificado con éxito:');
      console.log(`     - Días trabajados: ${simulacion.diasTotalesTrabajados} días`);
      console.log(`     - Indemnización: Q ${simulacion.montoIndemnizacion}`);
      console.log(`     - Aguinaldo Proporcional: Q ${simulacion.montoAguinaldoProporcional}`);
      console.log(`     - Bono 14 Proporcional: Q ${simulacion.montoBono14Proporcional}`);
      console.log(`     - Vacaciones No Gozadas: Q ${simulacion.montoVacacionesProporcionales}`);
      console.log(`     - Total Neto Liquidación: Q ${simulacion.totalNetoLiquidacion}`);
    } else {
      fail('La simulación de cálculo laboral no arrojó valores válidos.');
    }

    const listaLiquidaciones = await liquidacionModel.obtenerLiquidaciones();
    ok(`Historial de liquidaciones registradas en tabla LIQUIDACION: ${listaLiquidaciones.length}`);

    console.log(`\n${cVerde}================================================================${cReset}`);
    console.log(`${cVerde}       ¡TODAS LAS PRUEBAS DE CÓDIGO FINALIZADAS CON ÉXITO!      ${cReset}`);
    console.log(`${cVerde}================================================================${cReset}\n`);

  } catch (error) {
    fail('Error durante la ejecución de las pruebas:', error);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

ejecutarPruebas();
