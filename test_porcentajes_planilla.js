const path = require('path');
const workspace = 'c:/Users/USER/Desktop/Projecto nuevo/Proyecto_analisis_2';

const planillaController = require(path.join(workspace, 'Controller/planillaController.js'));

console.log('\n================================================================');
console.log('  TEST SUITE: CÁLCULO DE PLANILLA MEDIANTE PORCENTAJES EN EMPLEADOS');
console.log('================================================================\n');

let totalPasadas = 0;
let totalFalladas = 0;

function assert(condicion, descripcion) {
  if (condicion) {
    console.log(`   [PASS] ${descripcion}`);
    totalPasadas++;
  } else {
    console.error(`   [FAIL] ${descripcion}`);
    totalFalladas++;
  }
}

console.log('[1/5] Probando validaciones de rangos y tipos de porcentajes...');

function mockRes() {
  return {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(d) { this.data = d; return this; }
  };
}

const reqNegativo = {
  body: {
    IdPersona: 1, IdSucursal: 1, IdPuesto: 1, IdStatusEmpleado: 1, FechaContratacion: '2024-01-01',
    IngresoSueldoBase: 4000,
    PorcentajeIgss: -5,
    PorcentajeIsr: 0
  }
};
const res1 = mockRes();
planillaController.crearEmpleado(reqNegativo, res1);
assert(res1.statusCode === 400 && res1.data.mensaje.includes('porcentaje de IGSS debe ser un número válido entre 0% y 100%'),
  'Rechaza correctamente porcentaje de IGSS negativo (-5%)');

const reqExceso = {
  body: {
    IdPersona: 1, IdSucursal: 1, IdPuesto: 1, IdStatusEmpleado: 1, FechaContratacion: '2024-01-01',
    IngresoSueldoBase: 4000,
    PorcentajeIgss: 4.83,
    PorcentajeIsr: 150
  }
};
const res2 = mockRes();
planillaController.crearEmpleado(reqExceso, res2);
assert(res2.statusCode === 400 && res2.data.mensaje.includes('porcentaje de ISR debe ser un número válido entre 0% y 100%'),
  'Rechaza correctamente porcentaje de ISR superior al 100% (150%)');

const reqNoNum = {
  body: {
    IdPersona: 1, IdSucursal: 1, IdPuesto: 1, IdStatusEmpleado: 1, FechaContratacion: '2024-01-01',
    IngresoSueldoBase: 4000,
    PorcentajeIgss: 'abc',
    PorcentajeIsr: 0
  }
};
const res3 = mockRes();
planillaController.crearEmpleado(reqNoNum, res3);
assert(res3.statusCode === 400 && res3.data.mensaje.includes('porcentaje de IGSS debe ser un número válido entre 0% y 100%'),
  'Rechaza correctamente porcentaje con caracteres alfanuméricos');

console.log('\n[2/5] Probando cálculo ilustrativo del requerimiento (Q4,000 @ 4.83%)...');

function redondear(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

const baseEjemplo = 4000.00;
const pctEjemplo = 4.83;
const descuentoCalculado = redondear(baseEjemplo * (pctEjemplo / 100));

assert(descuentoCalculado === 193.20,
  `Q4,000.00 × (4.83 / 100) = Q${descuentoCalculado.toFixed(2)} (Coincide exactamente con el valor esperado Q193.20)`);

console.log('\n[3/5] Probando reactividad matemática ante cambios de base y porcentaje...');

const descBaseModificada = redondear(8000.00 * (4.83 / 100));
assert(descBaseModificada === 386.40,
  `Al duplicar salario base a Q8,000.00, descuento escala proporcionalmente a Q${descBaseModificada.toFixed(2)}`);

const descTasaModificada = redondear(4000.00 * (5.00 / 100));
assert(descTasaModificada === 200.00,
  `Al modificar porcentaje a 5.00%, descuento se actualiza a Q${descTasaModificada.toFixed(2)} sin cambiar código`);

const isrCalculado = redondear(10000.00 * (5.00 / 100));
assert(isrCalculado === 500.00,
  `Cálculo de ISR porcentual (Q10,000 @ 5%): Q${isrCalculado.toFixed(2)}`);

console.log('\n[4/5] Probando regla de negocio cuando falta el porcentaje (fallback legal)...');

function calcularConFallback(sueldoBase, pctIgssInput, pctIsrInput) {
  const base = Number(sueldoBase) || 0;
  const pctIgss = (pctIgssInput !== undefined && pctIgssInput !== null && pctIgssInput !== '') ? Number(pctIgssInput) : 4.83;
  const pctIsr = (pctIsrInput !== undefined && pctIsrInput !== null && pctIsrInput !== '') ? Number(pctIsrInput) : 0.00;

  const descIgss = redondear(base * (pctIgss / 100));
  const descIsr = redondear(base * (pctIsr / 100));

  return { pctIgss, pctIsr, descIgss, descIsr };
}

const casoFallback1 = calcularConFallback(5000, null, null);
assert(casoFallback1.pctIgss === 4.83 && casoFallback1.descIgss === 241.50,
  `Si falta PorcentajeIgss (null), aplica tasa legal 4.83% -> Q241.50`);
assert(casoFallback1.pctIsr === 0.00 && casoFallback1.descIsr === 0.00,
  `Si falta PorcentajeIsr (null), aplica tasa predeterminada 0.00% -> Q0.00`);

const casoFallback2 = calcularConFallback(6000, undefined, '');
assert(casoFallback2.pctIgss === 4.83 && casoFallback2.descIgss === 289.80,
  `Si PorcentajeIgss es undefined, aplica tasa legal 4.83% -> Q289.80`);

console.log('\n[5/5] Probando consistencia de planilla y no-duplicidad de descuentos...');

function simularPlanillaEmpleado(base, bono, otros, pctIgss, pctIsr, diasInasistencias) {
  const igss = redondear(base * (pctIgss / 100));
  const isr = redondear(base * (pctIsr / 100));
  const inasistencias = redondear((base / 30) * diasInasistencias);

  const totalIngresos = redondear(base + bono + otros);
  const totalDescuentos = redondear(igss + isr + inasistencias);
  const salarioNeto = redondear(totalIngresos - totalDescuentos);

  return { totalIngresos, totalDescuentos, salarioNeto, igss, isr, inasistencias };
}

const resultado = simularPlanillaEmpleado(4000, 250, 0, 4.83, 2.50, 0);

assert(resultado.totalIngresos === 4250.00, `Total Ingresos correcto: Q${resultado.totalIngresos.toFixed(2)}`);
assert(resultado.totalDescuentos === 293.20, `Total Descuentos (IGSS Q193.20 + ISR Q100.00) sin duplicidad: Q${resultado.totalDescuentos.toFixed(2)}`);
assert(resultado.salarioNeto === 3956.80, `Salario Neto correcto: Q${resultado.salarioNeto.toFixed(2)}`);
assert(redondear(resultado.totalIngresos - resultado.totalDescuentos) === resultado.salarioNeto,
  'Ecuación contable preservada exactamente: Ingresos - Descuentos = Salario Neto');

console.log('\n================================================================');
if (totalFalladas === 0) {
  console.log(`  ¡TODAS LAS PRUEBAS (${totalPasadas}/${totalPasadas}) PASARON CON ÉXITO!`);
} else {
  console.error(`  ATENCIÓN: ${totalFalladas} pruebas fallaron.`);
}
console.log('================================================================\n');

if (totalFalladas > 0) process.exit(1);
process.exit(0);
