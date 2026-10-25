let usuarioActual = null;
let periodosDisponibles = [];
let empleadosPeriodo = [];
let boletaActual = null;

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function q(n) {
    return 'Q ' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

document.addEventListener('DOMContentLoaded', async () => {
    usuarioActual = aplicarPermisos('Boletas de Pago');
    if (!usuarioActual) return;

    await cargarPeriodos();

    document.getElementById('cboPeriodo').addEventListener('change', alCambiarPeriodo);
    document.getElementById('cboEmpleado').addEventListener('change', alCambiarEmpleado);
    document.getElementById('btnConsultar').addEventListener('click', consultarBoleta);
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
});

async function cargarPeriodos() {
    try {
        const cbo = document.getElementById('cboPeriodo');
        cbo.innerHTML = '<option value="">Cargando períodos...</option>';

        const res = await fetch('/planilla/boletas/periodos', { headers: obtenerCabecerasSeguridad() });
        if (!res.ok) throw new Error('Error al cargar períodos');
        periodosDisponibles = await res.json();

        cbo.innerHTML = '<option value="">-- Seleccione un Período --</option>';
        periodosDisponibles.forEach(p => {
            const fechaProcStr = p.FechaHoraProcesada ? formatearFechaHora(p.FechaHoraProcesada) : '';
            const estado = p.Procesado ? `  [Procesado (${fechaProcStr})]` : '  (Sin procesar)';
            const fIni = typeof formatearFecha === 'function' ? formatearFecha(p.FechaInicio) : p.FechaInicio;
            const fFin = typeof formatearFecha === 'function' ? formatearFecha(p.FechaFin) : p.FechaFin;
            const texto = `${MESES[p.Mes]} ${p.Anio} (${fIni} al ${fFin})${estado}`;
            cbo.add(new Option(texto, `${p.Anio}-${p.Mes}`));
        });
    } catch (e) {
        console.error(e);
        alert('No se pudieron obtener los períodos de planilla.');
    }
}

async function alCambiarPeriodo() {
    const val = document.getElementById('cboPeriodo').value;
    const cboEmp = document.getElementById('cboEmpleado');
    const btnCons = document.getElementById('btnConsultar');
    const btnImp = document.getElementById('btnImprimir');
    document.getElementById('seccionBoleta').classList.add('d-none');
    btnImp.disabled = true;

    if (!val) {
        cboEmp.innerHTML = '<option value="">-- Seleccione un período primero --</option>';
        cboEmp.disabled = true;
        btnCons.disabled = true;
        return;
    }

    const [anio, mes] = val.split('-').map(Number);
    const p = periodosDisponibles.find(x => x.Anio === anio && x.Mes === mes);

    if (p && !p.Procesado) {
        cboEmp.innerHTML = '<option value="">(Período sin procesar - Debe calcular la planilla primero)</option>';
        cboEmp.disabled = true;
        btnCons.disabled = true;
        return;
    }

    cboEmp.innerHTML = '<option value="">Cargando empleados del período...</option>';
    cboEmp.disabled = true;

    try {
        const res = await fetch(`/planilla/boletas/periodo/${anio}/${mes}/empleados`, { headers: obtenerCabecerasSeguridad() });
        if (!res.ok) throw new Error('Error al consultar empleados del período');
        empleadosPeriodo = await res.json();

        cboEmp.innerHTML = '<option value="">-- Seleccione un Empleado --</option>';
        if (empleadosPeriodo.length === 0) {
            cboEmp.innerHTML = '<option value="">(No hay empleados en este período)</option>';
            return;
        }

        empleadosPeriodo.forEach(emp => {
            cboEmp.add(new Option(`${emp.NombreEmpleado} (${emp.NombrePuesto})`, emp.IdEmpleado));
        });
        cboEmp.disabled = false;
    } catch (e) {
        console.error(e);
        alert('Error al cargar empleados del período.');
    }
}

function alCambiarEmpleado() {
    const val = document.getElementById('cboEmpleado').value;
    document.getElementById('btnConsultar').disabled = !val;
    document.getElementById('seccionBoleta').classList.add('d-none');
    document.getElementById('btnImprimir').disabled = true;
}

async function consultarBoleta() {
    const valPer = document.getElementById('cboPeriodo').value;
    const idEmp = document.getElementById('cboEmpleado').value;
    if (!valPer || !idEmp) return;

    const [anio, mes] = valPer.split('-');
    const btn = document.getElementById('btnConsultar');
    btn.disabled = true;

    try {
        const res = await fetch(`/planilla/boletas/${anio}/${mes}/${idEmp}`, { headers: obtenerCabecerasSeguridad() });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.mensaje || 'Error al obtener la boleta de pago');
        }

        boletaActual = await res.json();
        renderizarBoleta(boletaActual);
        document.getElementById('btnImprimir').disabled = false;
    } catch (e) {
        alert(e.message);
        document.getElementById('seccionBoleta').classList.add('d-none');
    } finally {
        btn.disabled = false;
    }
}

function renderizarBoleta(b) {
    document.getElementById('lblEmpresa').textContent = b.NombreEmpresa || 'EMPRESA PRINCIPAL';
    document.getElementById('lblNitEmpresa').textContent = b.NitEmpresa || 'C/F';
    document.getElementById('lblSucursal').textContent = b.NombreSucursal || 'Central';
    document.getElementById('lblPeriodoTexto').textContent = `${MESES[b.Mes]} ${b.Anio}`;
    document.getElementById('lblFechaInicio').textContent = typeof formatearFecha === 'function' ? formatearFecha(b.FechaInicioPeriodo) : b.FechaInicioPeriodo;
    document.getElementById('lblFechaFin').textContent = typeof formatearFecha === 'function' ? formatearFecha(b.FechaFinPeriodo) : b.FechaFinPeriodo;

    document.getElementById('lblNombreEmpleado').textContent = b.NombreEmpleado;
    document.getElementById('lblNombrePuesto').textContent = b.NombrePuesto;
    document.getElementById('lblIdentificacion').textContent = b.NumeroIdentificacion;
    document.getElementById('lblDepartamento').textContent = b.NombreDepartamento;
    document.getElementById('lblFechaContratacion').textContent = typeof formatearFecha === 'function' ? formatearFecha(b.FechaContratacion) : b.FechaContratacion;
    document.getElementById('lblCuentaBancaria').textContent = b.NombreBanco ? `${b.NombreBanco} - ${b.NumeroDeCuenta}` : 'Cheque / Efectivo';

    document.getElementById('lblSueldoBase').textContent = q(b.IngresoSueldoBase);
    document.getElementById('lblBonoDecreto').textContent = q(b.IngresoBonificacionDecreto);
    document.getElementById('lblOtrosIngresos').textContent = q(b.IngresoOtrosIngresos);
    document.getElementById('lblTotalIngresos').textContent = q(b.TotalIngresos);

    document.getElementById('lblPorcentajeIgss').textContent = `${Number(b.PorcentajeIgss ?? 4.83).toFixed(2)}%`;
    document.getElementById('lblDescIgss').textContent = q(b.DescuentoIgss);
    document.getElementById('lblPorcentajeIsr').textContent = `${Number(b.PorcentajeIsr ?? 5.00).toFixed(2)}%`;
    document.getElementById('lblDescIsr').textContent = q(b.DescuentoIsr);
    document.getElementById('lblDescInasistencias').textContent = q(b.DescuentoInasistencias);
    document.getElementById('lblTotalDescuentos').textContent = q(b.TotalDescuentos);

    document.getElementById('lblSalarioNeto').textContent = q(b.SalarioNeto);

    document.getElementById('seccionBoleta').classList.remove('d-none');
    aplicarPermisos('Boletas de Pago');
}

function obtenerCabecerasSeguridad() {
    return { 'Content-Type': 'application/json', 'x-role-id': usuarioActual.idRole };
}
