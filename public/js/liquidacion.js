function fechaLocalIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let usuarioActual = null;
let empleadosDisponibles = [];
let puestosDisponibles = [];
let historialLiquidaciones = [];
let liquidacionSeleccionada = null;
let ordenHistorial = { columna: 'IdLiquidacion', orden: 'asc' };

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function redondear(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function q(n) {
    return 'Q ' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function normalizarAFechaIso(valor) {
    if (!valor) return '';
    const s = String(valor).trim();
    const mEsp = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mEsp) return `${mEsp[3]}-${mEsp[2].padStart(2, '0')}-${mEsp[1].padStart(2, '0')}`;
    const mIso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (mIso) return `${mIso[1]}-${mIso[2].padStart(2, '0')}-${mIso[3].padStart(2, '0')}`;
    return s;
}

function formatearFechaIsoAEsp(valor) {
    if (!valor) return '';
    const iso = normalizarAFechaIso(valor);
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return valor;
}

document.addEventListener('DOMContentLoaded', async () => {
    usuarioActual = aplicarPermisos('Liquidacion de Empleado');
    if (!usuarioActual) return;

    const hoy = fechaLocalIso();
    document.getElementById('FechaEgreso').value = hoy;
    document.getElementById('FechaLiquidacion').value = hoy;

    await cargarCombos();
    await cargarHistorial();

    document.getElementById('IdEmpleado').addEventListener('change', alSeleccionarEmpleado);

    const inputsRecalculo = [
        'FechaEgreso', 'FechaLiquidacion', 'MotivoEgreso',
        'DiasInasistencia', 'IngresoSueldoBase'
    ];
    inputsRecalculo.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                validarFechasUi();
                calcularDescuentoInasistenciaLocal();
                recalcularLiquidacion();
            });
            el.addEventListener('change', () => {
                validarFechasUi();
                calcularDescuentoInasistenciaLocal();
                recalcularLiquidacion();
            });
        }
    });

    document.getElementById('formLiquidacion').addEventListener('submit', guardarLiquidacion);
    document.getElementById('btnActualizar').addEventListener('click', actualizarLiquidacion);
    document.getElementById('btnCancelarEdicion').addEventListener('click', limpiarFormulario);

    document.getElementById('btnVerFormulario').addEventListener('click', () => conmutarVista('formulario'));
    document.getElementById('btnVerHistorial').addEventListener('click', () => conmutarVista('historial'));
    document.getElementById('btnImprimirActa').addEventListener('click', () => window.print());
    document.getElementById('btnExportarExcel').addEventListener('click', exportarHistorialExcel);

    document.getElementById('filtroTextoLiq').addEventListener('input', aplicarFiltrosYOrdenHistorial);
    document.getElementById('filtroMotivoLiq').addEventListener('change', aplicarFiltrosYOrdenHistorial);
    document.getElementById('filtroFechaDesdeLiq').addEventListener('change', aplicarFiltrosYOrdenHistorial);
    document.getElementById('filtroFechaHastaLiq').addEventListener('change', aplicarFiltrosYOrdenHistorial);
    document.getElementById('btnLimpiarFiltrosLiq').addEventListener('click', limpiarFiltrosHistorial);

    configurarEncabezadosOrdenables('tablaHistorial', (col, ord) => {
        ordenHistorial = { columna: col, orden: ord };
        aplicarFiltrosYOrdenHistorial();
    }, ordenHistorial);
});

function validarFechasUi() {
    const id = Number(document.getElementById('IdEmpleado').value);
    const fEgresoIso = normalizarAFechaIso(document.getElementById('FechaEgreso').value);
    const alertaFechas = document.getElementById('alertaFechasLiquidacion');
    const btnGuardar = document.getElementById('btnGuardar');
    const btnActualizar = document.getElementById('btnActualizar');

    if (!alertaFechas) return true;

    alertaFechas.classList.add('d-none');
    alertaFechas.innerHTML = '';

    if (!id || !fEgresoIso) return true;

    const emp = empleadosDisponibles.find(e => e.IdEmpleado === id);
    if (!emp) return true;

    const fContraIso = normalizarAFechaIso(emp.FechaContratacion);
    if (fContraIso && fEgresoIso <= fContraIso) {
        const msg = `La fecha de egreso (${formatearFechaIsoAEsp(fEgresoIso)}) debe ser estrictamente posterior a la fecha de contratación (${formatearFechaIsoAEsp(fContraIso)}).`;
        alertaFechas.innerHTML = `<i class="bi bi-calendar-x me-2"></i><strong>Fecha no permitida:</strong> ${msg}`;
        alertaFechas.classList.remove('d-none');
        if (btnGuardar) btnGuardar.disabled = true;
        if (btnActualizar) btnActualizar.disabled = true;
        return false;
    }

    if (emp.UltimaFechaFinPlanilla) {
        const fFinPeriodoIso = normalizarAFechaIso(emp.UltimaFechaFinPlanilla);
        if (fFinPeriodoIso && fEgresoIso <= fFinPeriodoIso) {
            const nomMes = MESES[emp.UltimoMesPlanilla] || `Mes ${emp.UltimoMesPlanilla}`;
            const msg = `La fecha de egreso (${formatearFechaIsoAEsp(fEgresoIso)}) debe ser posterior al último período de planilla calculado del empleado (${nomMes} ${emp.UltimoAnioPlanilla || ''}, finalizado el ${formatearFechaIsoAEsp(fFinPeriodoIso)}).`;
            alertaFechas.innerHTML = `<i class="bi bi-calendar-x me-2"></i><strong>Fecha no permitida:</strong> ${msg}`;
            alertaFechas.classList.remove('d-none');
            if (btnGuardar) btnGuardar.disabled = true;
            if (btnActualizar) btnActualizar.disabled = true;
            return false;
        }
    }

    if (emp.IdStatusEmpleado === 1) {
        if (btnGuardar) btnGuardar.disabled = false;
        if (btnActualizar) btnActualizar.disabled = false;
    }
    return true;
}

function calcularDescuentoInasistenciaLocal() {
    const base = parseFloat(document.getElementById('IngresoSueldoBase')?.value) || 0;
    const rawDias = document.getElementById('DiasInasistencia')?.value ?? '';
    const alertaInas = document.getElementById('alertaValidacionInasistencia');
    const detalleTexto = document.getElementById('detalleFormulaInasistencia');
    const inputSalarioDiario = document.getElementById('SalarioDiario');
    const inputDescDiarioVista = document.getElementById('DescuentoDiarioVista');
    const inputDescInas = document.getElementById('DescuentoInasistencias');

    const salarioDiario = base > 0 ? redondear(base / 30) : 0;
    if (inputSalarioDiario) {
        inputSalarioDiario.value = salarioDiario.toFixed(2);
    }
    if (inputDescDiarioVista) {
        inputDescDiarioVista.value = salarioDiario.toFixed(2);
    }

    if (alertaInas) {
        alertaInas.classList.add('d-none');
        alertaInas.textContent = '';
    }

    const dias = rawDias === '' ? 0 : Number(rawDias);

    if (isNaN(dias) || dias < 0) {
        if (alertaInas) {
            alertaInas.textContent = 'La cantidad de días faltados no puede ser negativa ni tener un valor inválido.';
            alertaInas.classList.remove('d-none');
        }
        if (inputDescInas) inputDescInas.value = '0.00';
        return { valido: false, descuentoTotal: 0 };
    }

    const diasVal = Math.max(0, dias);
    const descuentoTotal = diasVal > 0 ? redondear(salarioDiario * diasVal) : 0;

    if (inputDescInas) {
        inputDescInas.value = descuentoTotal.toFixed(2);
    }

    if (detalleTexto) {
        if (base > 0) {
            detalleTexto.innerHTML = `<strong>Cálculo:</strong> Salario diario: ${q(salarioDiario)} | Días faltados: ${diasVal} | <strong>Descuento total:</strong> <span class="text-danger fw-bold">${q(descuentoTotal)}</span>`;
        } else {
            detalleTexto.textContent = 'Seleccione un empleado e ingrese los días faltados para calcular el descuento automáticamente.';
        }
    }

    const elCalcInas = document.getElementById('calcDescuentoInasistencias');
    if (elCalcInas) {
        elCalcInas.textContent = '- ' + q(descuentoTotal);
    }

    return {
        valido: true,
        salarioDiario,
        porcentajeInasistencias: 100,
        diasFaltados: diasVal,
        descuentoPorDia: salarioDiario,
        descuentoTotal
    };
}

function conmutarVista(vista) {
    const vForm = document.getElementById('vistaFormulario');
    const vHist = document.getElementById('vistaHistorial');

    if (vista === 'formulario') {
        vForm.classList.remove('d-none');
        vHist.classList.add('d-none');
    } else {
        vForm.classList.add('d-none');
        vHist.classList.remove('d-none');
        cargarHistorial();
    }
}

async function cargarCombos() {
    try {
        const resEmp = await fetch('/planilla/empleados', { headers: obtenerCabecerasSeguridad() });
        const resCombos = await fetch('/planilla/empleados/combos', { headers: obtenerCabecerasSeguridad() });

        if (!resEmp.ok || !resCombos.ok) throw new Error('Error al cargar datos maestros');

        empleadosDisponibles = await resEmp.json();
        const dataCombos = await resCombos.json();
        puestosDisponibles = dataCombos.puestos || [];

        const cboEmp = document.getElementById('IdEmpleado');
        cboEmp.innerHTML = '<option value="">-- Seleccione un Empleado --</option>';
        empleadosDisponibles.forEach(e => {
            const statusBadge = e.IdStatusEmpleado === 1 ? ' (Activo)' : ` (${e.NombreStatus || 'Inactivo'})`;
            cboEmp.add(new Option(`${e.NombrePersona} - ${e.NombrePuesto}${statusBadge}`, e.IdEmpleado));
        });
    } catch (e) {
        console.error(e);
        alert('Error al cargar catálogos de empleados.');
    }
}

function alSeleccionarEmpleado() {
    const id = Number(document.getElementById('IdEmpleado').value);
    const alerta = document.getElementById('alertaEstadoEmpleado');
    const alertaFechas = document.getElementById('alertaFechasLiquidacion');
    const btnGuardar = document.getElementById('btnGuardar');

    if (alertaFechas) {
        alertaFechas.classList.add('d-none');
        alertaFechas.innerHTML = '';
    }

    if (!id) {
        if (alerta) alerta.classList.add('d-none');
        limpiarFormulario();
        return;
    }

    const emp = empleadosDisponibles.find(e => e.IdEmpleado === id);
    if (!emp) {
        if (alerta) alerta.classList.add('d-none');
        limpiarFormulario();
        return;
    }

    const salarioDiario = redondear(Number(emp.IngresoSueldoBase || 0) / 30);

    if (emp.IdStatusEmpleado !== 1) {
        if (alerta) {
            alerta.className = 'alert alert-danger py-2 mb-3';
            alerta.innerHTML = `<i class="bi bi-x-circle-fill me-2"></i><strong>No es posible continuar con la liquidación:</strong> El empleado no se encuentra activo (su estado actual es <em>${esc(emp.NombreStatus || 'Inactivo')}</em>). Solo se permite liquidar a empleados en estado activo.`;
            alerta.classList.remove('d-none');
        }
        btnGuardar.disabled = true;

        document.getElementById('NombrePuesto').value = emp.NombrePuesto || '';
        document.getElementById('IdPuesto').value = emp.IdPuesto || '';
        document.getElementById('FechaContratacion').value = emp.FechaContratacion || '';
        document.getElementById('IngresoSueldoBase').value = Number(emp.IngresoSueldoBase || 0).toFixed(2);
        if (document.getElementById('SalarioDiario')) {
            document.getElementById('SalarioDiario').value = salarioDiario.toFixed(2);
        }
        if (document.getElementById('DescuentoDiarioVista')) {
            document.getElementById('DescuentoDiarioVista').value = salarioDiario.toFixed(2);
        }
        document.getElementById('IngresoBonificacionDecreto').value = Number(emp.IngresoBonificacionDecreto || 0).toFixed(2);
        document.getElementById('IngresoOtrosIngresos').value = Number(emp.IngresoOtrosIngresos || 0).toFixed(2);
        document.getElementById('DescuentoIgss').value = Number(emp.DescuentoIgss || 0).toFixed(2);
        document.getElementById('DescuentoIsr').value = Number(emp.DescuentoIsr || 0).toFixed(2);
        if (document.getElementById('DiasInasistencia')) {
            document.getElementById('DiasInasistencia').value = '0';
        }
        document.getElementById('DescuentoInasistencias').value = '0.00';

        resetearPanelResumen();
        return;
    }

    if (alerta) alerta.classList.add('d-none');
    btnGuardar.disabled = false;

    document.getElementById('NombrePuesto').value = emp.NombrePuesto;
    document.getElementById('IdPuesto').value = emp.IdPuesto;
    document.getElementById('FechaContratacion').value = emp.FechaContratacion;
    document.getElementById('IngresoSueldoBase').value = Number(emp.IngresoSueldoBase).toFixed(2);
    if (document.getElementById('SalarioDiario')) {
        document.getElementById('SalarioDiario').value = salarioDiario.toFixed(2);
    }
    if (document.getElementById('DescuentoDiarioVista')) {
        document.getElementById('DescuentoDiarioVista').value = salarioDiario.toFixed(2);
    }
    document.getElementById('IngresoBonificacionDecreto').value = Number(emp.IngresoBonificacionDecreto).toFixed(2);
    document.getElementById('IngresoOtrosIngresos').value = Number(emp.IngresoOtrosIngresos).toFixed(2);
    document.getElementById('DescuentoIgss').value = Number(emp.DescuentoIgss).toFixed(2);
    document.getElementById('DescuentoIsr').value = Number(emp.DescuentoIsr).toFixed(2);
    if (document.getElementById('DiasInasistencia')) {
        document.getElementById('DiasInasistencia').value = '0';
    }

    validarFechasUi();
    calcularDescuentoInasistenciaLocal();
    recalcularLiquidacion();
}

function resetearPanelResumen() {
    document.getElementById('calcDiasTrabajados').textContent = '0 días';
    document.getElementById('calcIndemnizacion').textContent = 'Q 0.00';
    document.getElementById('calcAguinaldo').textContent = 'Q 0.00';
    document.getElementById('calcBono14').textContent = 'Q 0.00';
    document.getElementById('calcVacaciones').textContent = 'Q 0.00';
    document.getElementById('calcSalarioNetoPendiente').textContent = 'Q 0.00';
    if (document.getElementById('calcDescuentoInasistencias')) {
        document.getElementById('calcDescuentoInasistencias').textContent = 'Q 0.00';
    }
    document.getElementById('calcTotalDescuentos').textContent = 'Q 0.00';
    document.getElementById('calcTotalIngresos').textContent = 'Q 0.00';
    document.getElementById('calcTotalNetoLiquidacion').textContent = 'Q 0.00';
}

async function recalcularLiquidacion() {
    const id = Number(document.getElementById('IdEmpleado').value);
    const idLiqui = document.getElementById('IdLiquidacion').value;
    const emp = empleadosDisponibles.find(e => e.IdEmpleado === id);

    if (!idLiqui && (!emp || emp.IdStatusEmpleado !== 1)) {
        return;
    }

    const fechasValidas = validarFechasUi();
    if (!fechasValidas) {
        return;
    }

    const resInasLocal = calcularDescuentoInasistenciaLocal();
    if (!resInasLocal.valido) {
        return;
    }

    const fEgreso = document.getElementById('FechaEgreso').value;
    if (!fEgreso) return;

    const payload = obtenerValoresFormulario();

    try {
        const res = await fetch('/planilla/liquidaciones/simular', {
            method: 'POST',
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            console.warn('Simulación no completada:', err.mensaje);
            return;
        }
        const c = await res.json();

        if (c.descuentoInasistencias !== undefined) {
            document.getElementById('DescuentoInasistencias').value = Number(c.descuentoInasistencias).toFixed(2);
        }

        document.getElementById('calcDiasTrabajados').textContent = `${c.diasTotalesTrabajados} días`;
        document.getElementById('calcIndemnizacion').textContent = q(c.montoIndemnizacion);
        document.getElementById('calcAguinaldo').textContent = q(c.montoAguinaldoProporcional);
        document.getElementById('calcBono14').textContent = q(c.montoBono14Proporcional);
        document.getElementById('calcVacaciones').textContent = q(c.montoVacacionesProporcionales);
        document.getElementById('calcSalarioNetoPendiente').textContent = q(c.salarioNetoPendiente);
        if (document.getElementById('calcDescuentoInasistencias')) {
            document.getElementById('calcDescuentoInasistencias').textContent = '- ' + q(c.descuentoInasistencias ?? payload.DescuentoInasistencias);
        }
        document.getElementById('calcTotalDescuentos').textContent = '- ' + q(c.totalDescuentos);
        document.getElementById('calcTotalIngresos').textContent = q(c.totalIngresos);
        document.getElementById('calcTotalNetoLiquidacion').textContent = q(c.totalNetoLiquidacion);
    } catch (e) {
        console.error('Error al simular liquidación:', e);
    }
}

function obtenerValoresFormulario() {
    const resInas = calcularDescuentoInasistenciaLocal();
    return {
        IdLiquidacion: document.getElementById('IdLiquidacion').value || undefined,
        IdEmpleado: Number(document.getElementById('IdEmpleado').value),
        IdPuesto: Number(document.getElementById('IdPuesto').value),
        FechaContratacion: document.getElementById('FechaContratacion').value,
        FechaEgreso: document.getElementById('FechaEgreso').value,
        FechaLiquidacion: document.getElementById('FechaLiquidacion').value,
        MotivoEgreso: document.getElementById('MotivoEgreso').value,
        IngresoSueldoBase: Number(document.getElementById('IngresoSueldoBase').value) || 0,
        IngresoBonificacionDecreto: Number(document.getElementById('IngresoBonificacionDecreto').value) || 0,
        IngresoOtrosIngresos: Number(document.getElementById('IngresoOtrosIngresos').value) || 0,
        DescuentoIgss: Number(document.getElementById('DescuentoIgss').value) || 0,
        DescuentoIsr: Number(document.getElementById('DescuentoIsr').value) || 0,
        PorcentajeInasistencias: 100,
        DiasFaltados: Number(document.getElementById('DiasInasistencia')?.value ?? 0),
        DiasInasistencia: Number(document.getElementById('DiasInasistencia')?.value ?? 0),
        DescuentoInasistencias: resInas.valido ? resInas.descuentoTotal : (Number(document.getElementById('DescuentoInasistencias').value) || 0),
        Observaciones: document.getElementById('Observaciones').value,
        UsuarioCreacion: usuarioActual?.id || usuarioActual?.Username || 'admin'
    };
}

async function guardarLiquidacion(e) {
    e.preventDefault();

    const idEmp = Number(document.getElementById('IdEmpleado').value);
    if (!idEmp) {
        alert('Por favor selecciona un empleado a liquidar.');
        return;
    }

    const emp = empleadosDisponibles.find(x => x.IdEmpleado === idEmp);
    if (!emp || emp.IdStatusEmpleado !== 1) {
        alert('No es posible continuar con la liquidación: el empleado no se encuentra activo.');
        return;
    }

    if (!validarFechasUi()) {
        const msg = document.getElementById('alertaFechasLiquidacion')?.textContent;
        alert(msg || 'La fecha de egreso no cumple con las validaciones obligatorias.');
        return;
    }

    const fEgreso = document.getElementById('FechaEgreso').value;
    const fLiquidacion = document.getElementById('FechaLiquidacion').value;
    if (!fEgreso || !fLiquidacion) {
        alert('Por favor ingresa fechas válidas en formato DD/MM/AAAA para egreso y liquidación.');
        return;
    }

    const resInas = calcularDescuentoInasistenciaLocal();
    if (!resInas.valido) {
        alert(document.getElementById('alertaValidacionInasistencia')?.textContent || 'Verifique los datos del cálculo de inasistencias.');
        return;
    }

    if (!confirm('¿Confirma que desea procesar la liquidación laboral formal? Esta operación actualizará el estatus del empleado en la empresa a Inactivo y registrará el evento en el historial laboral.')) {
        return;
    }

    const payload = obtenerValoresFormulario();
    try {
        const res = await fetch('/planilla/liquidaciones', {
            method: 'POST',
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
            alert('¡Liquidación laboral registrada y formalizada exitosamente!');
            document.getElementById('btnImprimirActa').disabled = false;
            limpiarFormulario();
            await cargarCombos();
            conmutarVista('historial');
        } else {
            alert(data.mensaje || 'Error al procesar la liquidación');
        }
    } catch (e) {
        console.error(e);
        alert('Ocurrió un error al comunicarse con el servidor.');
    }
}

async function actualizarLiquidacion() {
    const id = document.getElementById('IdLiquidacion').value;
    if (!id) return;

    if (!validarFechasUi()) {
        const msg = document.getElementById('alertaFechasLiquidacion')?.textContent;
        alert(msg || 'La fecha de egreso no cumple con las validaciones obligatorias.');
        return;
    }

    const resInas = calcularDescuentoInasistenciaLocal();
    if (!resInas.valido) {
        alert(document.getElementById('alertaValidacionInasistencia')?.textContent || 'Verifique los datos del cálculo de inasistencias.');
        return;
    }

    if (!confirm(`¿Desea actualizar los datos de la liquidación #${id}?`)) return;

    const payload = obtenerValoresFormulario();
    payload.UsuarioModificacion = usuarioActual?.id || usuarioActual?.Username || 'admin';

    try {
        const res = await fetch(`/planilla/liquidaciones/${id}`, {
            method: 'PUT',
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
            alert('¡Liquidación actualizada con éxito!');
            limpiarFormulario();
            conmutarVista('historial');
        } else {
            alert(data.mensaje || 'Error al actualizar');
        }
    } catch (e) {
        console.error(e);
        alert('Error de conexión al actualizar la liquidación.');
    }
}

async function cargarHistorial() {
    try {
        const res = await fetch('/planilla/liquidaciones', { headers: obtenerCabecerasSeguridad() });
        if (!res.ok) return;
        historialLiquidaciones = await res.json();
        aplicarFiltrosYOrdenHistorial();
    } catch (e) {
        console.error(e);
    }
}

function limpiarFiltrosHistorial() {
    document.getElementById('filtroTextoLiq').value = '';
    document.getElementById('filtroMotivoLiq').value = '';
    document.getElementById('filtroFechaDesdeLiq').value = '';
    document.getElementById('filtroFechaHastaLiq').value = '';
    aplicarFiltrosYOrdenHistorial();
}

function aplicarFiltrosYOrdenHistorial() {
    const texto = (document.getElementById('filtroTextoLiq')?.value || '').trim().toLowerCase();
    const motivo = document.getElementById('filtroMotivoLiq')?.value;
    const desde = document.getElementById('filtroFechaDesdeLiq')?.value;
    const hasta = document.getElementById('filtroFechaHastaLiq')?.value;

    let filtrados = (historialLiquidaciones || []).filter(item => {
        if (texto) {
            const coincideId = String(item.IdLiquidacion).includes(texto);
            const coincideNombre = (item.NombreEmpleado || '').toLowerCase().includes(texto);
            if (!coincideId && !coincideNombre) return false;
        }
        if (motivo && item.MotivoEgreso !== motivo) return false;
        if (desde && item.FechaLiquidacion < desde) return false;
        if (hasta && item.FechaLiquidacion > hasta) return false;
        return true;
    });

    const ordenados = ordenarLista(filtrados, ordenHistorial.columna, ordenHistorial.orden, 'IdLiquidacion');
    dibujarTablaHistorial(ordenados);
}

function dibujarTablaHistorial(datos) {
    const tbody = document.getElementById('tablaHistorialBody');
    tbody.innerHTML = '';

    if (!datos || datos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center text-muted py-4">
                    <i class="bi bi-search me-2"></i>No se encontraron liquidaciones que coincidan con los criterios de búsqueda.
                </td>
            </tr>`;
        return;
    }

    datos.forEach(item => {
        const fContratacion = formatearFecha(item.FechaContratacion);
        const fEgreso = formatearFecha(item.FechaEgreso);
        const fLiquidacion = formatearFecha(item.FechaLiquidacion);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-center fw-bold">#${item.IdLiquidacion}</td>
            <td class="fw-bold">${esc(item.NombreEmpleado)}</td>
            <td>${esc(item.NombrePuesto)}</td>
            <td class="text-center">${fContratacion}</td>
            <td class="text-center">${fEgreso}</td>
            <td class="text-center">${fLiquidacion}</td>
            <td><span class="badge bg-secondary">${esc(item.MotivoEgreso)}</span></td>
            <td class="text-end fw-bold text-success">${q(item.TotalNetoLiquidacion)}</td>
            <td class="text-center">${esc(item.UsuarioCreacion)}</td>
            <td class="text-center no-print">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editarLiquidacion(${item.IdLiquidacion})" title="Editar" data-permiso="Cambio">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarLiquidacion(${item.IdLiquidacion})" title="Eliminar" data-permiso="Baja">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    aplicarPermisos('Liquidacion de Empleado');
}

window.editarLiquidacion = async function (id) {
    try {
        const res = await fetch(`/planilla/liquidaciones/${id}`, { headers: obtenerCabecerasSeguridad() });
        if (!res.ok) throw new Error('Error al cargar detalle');
        const l = await res.json();

        const alerta = document.getElementById('alertaEstadoEmpleado');
        if (alerta) {
            alerta.classList.add('d-none');
            alerta.innerHTML = '';
        }

        const alertaFechas = document.getElementById('alertaFechasLiquidacion');
        if (alertaFechas) {
            alertaFechas.classList.add('d-none');
            alertaFechas.innerHTML = '';
        }

        const salarioDiario = redondear(Number(l.IngresoSueldoBase || 0) / 30);
        const diasFaltados = (l.DiasFaltados !== undefined && l.DiasFaltados !== null)
            ? Number(l.DiasFaltados)
            : (salarioDiario > 0 ? redondear(Number(l.DescuentoInasistencias || 0) / salarioDiario) : 0);

        document.getElementById('IdLiquidacion').value = l.IdLiquidacion;
        document.getElementById('IdEmpleado').value = l.IdEmpleado;
        document.getElementById('NombrePuesto').value = l.NombrePuesto || '';
        document.getElementById('IdPuesto').value = l.IdPuesto;
        document.getElementById('FechaContratacion').value = (l.FechaContratacion || '').slice(0, 10);
        document.getElementById('FechaEgreso').value = (l.FechaEgreso || '').slice(0, 10);
        document.getElementById('FechaLiquidacion').value = (l.FechaLiquidacion || '').slice(0, 10);
        document.getElementById('MotivoEgreso').value = l.MotivoEgreso;
        document.getElementById('IngresoSueldoBase').value = Number(l.IngresoSueldoBase).toFixed(2);
        if (document.getElementById('SalarioDiario')) {
            document.getElementById('SalarioDiario').value = salarioDiario.toFixed(2);
        }
        if (document.getElementById('DescuentoDiarioVista')) {
            document.getElementById('DescuentoDiarioVista').value = salarioDiario.toFixed(2);
        }
        document.getElementById('IngresoBonificacionDecreto').value = Number(l.IngresoBonificacionDecreto).toFixed(2);
        document.getElementById('IngresoOtrosIngresos').value = Number(l.IngresoOtrosIngresos).toFixed(2);
        document.getElementById('DescuentoIgss').value = Number(l.DescuentoIgss).toFixed(2);
        document.getElementById('DescuentoIsr').value = Number(l.DescuentoIsr).toFixed(2);
        if (document.getElementById('DiasInasistencia')) {
            document.getElementById('DiasInasistencia').value = diasFaltados;
        }
        document.getElementById('DescuentoInasistencias').value = Number(l.DescuentoInasistencias).toFixed(2);
        document.getElementById('Observaciones').value = l.Observaciones || '';

        document.getElementById('btnGuardar').classList.add('d-none');
        document.getElementById('btnActualizar').classList.remove('d-none');
        document.getElementById('btnImprimirActa').disabled = false;

        conmutarVista('formulario');
        validarFechasUi();
        calcularDescuentoInasistenciaLocal();
        recalcularLiquidacion();
    } catch (e) {
        alert(e.message);
    }
};

window.eliminarLiquidacion = async function (id) {
    if (!confirm(`¿Está seguro de eliminar el registro de liquidación #${id}?`)) return;

    try {
        const res = await fetch(`/planilla/liquidaciones/${id}`, {
            method: 'DELETE',
            headers: obtenerCabecerasSeguridad()
        });
        if (res.ok) {
            alert('Liquidación eliminada.');
            cargarHistorial();
        } else {
            alert('No se pudo eliminar la liquidación.');
        }
    } catch (e) {
        alert('Error al comunicarse con el servidor.');
    }
};

function limpiarFormulario() {
    document.getElementById('formLiquidacion').reset();
    document.getElementById('IdLiquidacion').value = '';
    const hoy = fechaLocalIso();
    document.getElementById('FechaEgreso').value = hoy;
    document.getElementById('FechaLiquidacion').value = hoy;
    document.getElementById('NombrePuesto').value = '';
    document.getElementById('IdPuesto').value = '';
    document.getElementById('FechaContratacion').value = '';
    document.getElementById('IngresoSueldoBase').value = '';
    if (document.getElementById('SalarioDiario')) {
        document.getElementById('SalarioDiario').value = '0.00';
    }
    if (document.getElementById('DescuentoDiarioVista')) {
        document.getElementById('DescuentoDiarioVista').value = '0.00';
    }
    document.getElementById('IngresoBonificacionDecreto').value = '';
    document.getElementById('IngresoOtrosIngresos').value = '';
    document.getElementById('DescuentoIgss').value = '';
    document.getElementById('DescuentoIsr').value = '';
    if (document.getElementById('DiasInasistencia')) {
        document.getElementById('DiasInasistencia').value = '0';
    }
    document.getElementById('DescuentoInasistencias').value = '0.00';

    const alerta = document.getElementById('alertaEstadoEmpleado');
    if (alerta) {
        alerta.classList.add('d-none');
        alerta.innerHTML = '';
    }

    const alertaFechas = document.getElementById('alertaFechasLiquidacion');
    if (alertaFechas) {
        alertaFechas.classList.add('d-none');
        alertaFechas.innerHTML = '';
    }

    const alertaInas = document.getElementById('alertaValidacionInasistencia');
    if (alertaInas) {
        alertaInas.classList.add('d-none');
        alertaInas.textContent = '';
    }

    const detalleTexto = document.getElementById('detalleFormulaInasistencia');
    if (detalleTexto) {
        detalleTexto.textContent = 'Seleccione un empleado e ingrese los días faltados para calcular el descuento automáticamente.';
    }

    const btnGuardar = document.getElementById('btnGuardar');
    btnGuardar.classList.remove('d-none');
    btnGuardar.disabled = false;
    document.getElementById('btnActualizar').classList.add('d-none');

    resetearPanelResumen();
}

function exportarHistorialExcel() {
    if (!historialLiquidaciones || historialLiquidaciones.length === 0) {
        alert('No hay liquidaciones para exportar.');
        return;
    }

    const headers = ['No.', 'Empleado', 'Puesto', 'Fecha Contratacion (DD/MM/AAAA)', 'Fecha Egreso (DD/MM/AAAA)', 'Fecha Liquidacion (DD/MM/AAAA)', 'Motivo', 'Total Neto Pagado', 'Registrado Por'];
    const rows = historialLiquidaciones.map(item => [
        item.IdLiquidacion,
        `"${item.NombreEmpleado}"`,
        `"${item.NombrePuesto}"`,
        `"${formatearFecha(item.FechaContratacion)}"`,
        `"${formatearFecha(item.FechaEgreso)}"`,
        `"${formatearFecha(item.FechaLiquidacion)}"`,
        `"${item.MotivoEgreso}"`,
        item.TotalNetoLiquidacion,
        `"${item.UsuarioCreacion}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    enlace.href = window.URL.createObjectURL(blob);
    enlace.download = `Historial_Liquidaciones_${fechaLocalIso()}.csv`;
    enlace.click();
}
