let usuarioActual = null;
let periodosDisponibles = [];
let reporteActual = null;
let ordenReporte = { columna: 'IdEmpleado', orden: 'asc' };

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function q(n) {
    return 'Q ' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function redondearMoneda(n) {
    return Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
}

document.addEventListener('DOMContentLoaded', async () => {
    usuarioActual = aplicarPermisos('Reporte de Planilla');
    if (!usuarioActual) return;

    await cargarPeriodos();

    document.getElementById('cboPeriodo').addEventListener('change', alCambiarPeriodo);
    document.getElementById('btnConsultar').addEventListener('click', consultarReporte);
    document.getElementById('btnRecargar').addEventListener('click', cargarPeriodos);
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);

    document.getElementById('filtroEmpleadoRep').addEventListener('input', aplicarFiltrosYOrdenReporte);
    document.getElementById('filtroPuestoRep').addEventListener('change', aplicarFiltrosYOrdenReporte);
    document.getElementById('btnLimpiarFiltrosRep').addEventListener('click', limpiarFiltrosReporte);

    configurarEncabezadosOrdenables('tablaReporte', (col, ord) => {
        ordenReporte = { columna: col, orden: ord };
        aplicarFiltrosYOrdenReporte();
    }, ordenReporte);
});

async function cargarPeriodos() {
    try {
        const cbo = document.getElementById('cboPeriodo');
        cbo.innerHTML = '<option value="">Cargando períodos...</option>';

        const res = await fetch('/planilla/reporte/periodos', { headers: obtenerCabecerasSeguridad() });
        if (!res.ok) throw new Error('Error al cargar períodos');
        periodosDisponibles = await res.json();

        cbo.innerHTML = '<option value="">-- Seleccione un Período --</option>';
        if (periodosDisponibles.length === 0) {
            cbo.innerHTML = '<option value="">(No hay períodos en la base de datos)</option>';
            return;
        }

        periodosDisponibles.forEach(p => {
            const fIni = formatearFecha(p.FechaInicio);
            const fFin = formatearFecha(p.FechaFin);
            const fProc = p.FechaHoraProcesada ? formatearFechaHora(p.FechaHoraProcesada) : '';
            const estado = p.Procesado ? `  [Procesado (${fProc})]` : '  (Sin procesar)';
            const texto = `${MESES[p.Mes]} ${p.Anio} (${fIni} al ${fFin})${estado}`;
            cbo.add(new Option(texto, `${p.Anio}-${p.Mes}`));
        });
    } catch (error) {
        console.error(error);
        alert('No se pudieron consultar los períodos de planilla.');
    }
}

function alCambiarPeriodo() {
    const val = document.getElementById('cboPeriodo').value;
    const alerta = document.getElementById('alertaPeriodo');
    const btnConsultar = document.getElementById('btnConsultar');
    document.getElementById('seccionReporte').classList.add('d-none');
    document.getElementById('btnImprimir').disabled = true;
    document.getElementById('btnExportar').disabled = true;

    if (!val) {
        alerta.classList.add('d-none');
        btnConsultar.disabled = false;
        return;
    }

    const [anio, mes] = val.split('-').map(Number);
    const p = periodosDisponibles.find(x => x.Anio === anio && x.Mes === mes);

    if (p && !p.Procesado) {
        alerta.className = 'alert alert-warning py-2 mt-3 mb-0';
        alerta.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i> El período <strong>${MESES[mes]} ${anio}</strong> aún no ha sido procesado. Para ver su reporte consolidado, primero debe calcularse en <a href="/calculo_planilla.html" class="alert-link">13. Calcular Planilla</a>.`;
        alerta.classList.remove('d-none');
        btnConsultar.disabled = true;
    } else {
        const fProc = p.FechaHoraProcesada ? formatearFechaHora(p.FechaHoraProcesada) : '';
        alerta.className = 'alert alert-success py-2 mt-3 mb-0';
        alerta.innerHTML = `<i class="bi bi-check-circle me-1"></i> Período procesado el <strong>${fProc}</strong>. Pulsa "Consultar" para ver los detalles.`;
        alerta.classList.remove('d-none');
        btnConsultar.disabled = false;
    }
}

async function consultarReporte() {
    const val = document.getElementById('cboPeriodo').value;
    if (!val) {
        alert('Por favor selecciona un período de planilla.');
        return;
    }

    const [anio, mes] = val.split('-');
    const btn = document.getElementById('btnConsultar');
    btn.disabled = true;

    try {
        const res = await fetch(`/planilla/reporte/consolidado/${anio}/${mes}`, { headers: obtenerCabecerasSeguridad() });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.mensaje || 'Error al obtener reporte');
        }

        reporteActual = await res.json();
        renderizarReporte(reporteActual, Number(anio), Number(mes));

        document.getElementById('btnImprimir').disabled = false;
        document.getElementById('btnExportar').disabled = false;
    } catch (error) {
        alert(error.message);
        document.getElementById('seccionReporte').classList.add('d-none');
    } finally {
        btn.disabled = false;
    }
}

function renderizarReporte(data, anio, mes) {
    const { cabecera, detalle } = data;

    reporteActual.detalle = (detalle || []).map(d => {
        const base = Number(d.IngresoSueldoBase) || 0;
        const bono = Number(d.IngresoBonificacionDecreto) || 0;
        const otros = Number(d.IngresoOtrosIngresos) || 0;
        const pctIgss = Number(d.PorcentajeIgss ?? 4.83);
        const igss = Number(d.DescuentoIgss) > 0 ? redondearMoneda(d.DescuentoIgss) : redondearMoneda(base * (pctIgss / 100));
        const pctIsr = base <= 30000 ? 5 : 7;
        const isr = Number(d.DescuentoIsr) > 0 ? redondearMoneda(d.DescuentoIsr) : redondearMoneda(base * (pctIsr / 100));
        const inas = redondearMoneda(d.DescuentoInasistencias || 0);
        const neto = redondearMoneda((base + bono + otros) - (igss + isr + inas));
        return {
            ...d,
            PorcentajeIgss: pctIgss,
            DescuentoIgss: igss,
            PorcentajeIsr: pctIsr,
            DescuentoIsr: isr,
            DescuentoInasistencias: inas,
            SalarioNeto: neto
        };
    });

    const totIng = reporteActual.detalle.reduce((acc, r) => acc + redondearMoneda((Number(r.IngresoSueldoBase) || 0) + (Number(r.IngresoBonificacionDecreto) || 0) + (Number(r.IngresoOtrosIngresos) || 0)), 0);
    const totDesc = reporteActual.detalle.reduce((acc, r) => acc + redondearMoneda(r.DescuentoIgss + r.DescuentoIsr + r.DescuentoInasistencias), 0);
    const totNeto = redondearMoneda(totIng - totDesc);

    document.getElementById('lblTituloPeriodo').textContent = `Planilla Consolidada - ${MESES[mes]} ${anio}`;
    document.getElementById('lblSubtituloPeriodo').textContent = `Procesada el: ${formatearFechaHora(cabecera.FechaHoraProcesada)} por: ${cabecera.UsuarioCreacion || 'sistema'}`;
    document.getElementById('badgeEmpleados').textContent = `${reporteActual.detalle.length} Empleados`;

    document.getElementById('kpiTotalIngresos').textContent = q(reporteActual.detalle.length > 0 ? totIng : cabecera.TotalIngresos);
    document.getElementById('kpiTotalDescuentos').textContent = q(reporteActual.detalle.length > 0 ? totDesc : cabecera.TotalDescuentos);
    document.getElementById('kpiSalarioNeto').textContent = q(reporteActual.detalle.length > 0 ? totNeto : cabecera.SalarioNeto);

    const selPuestos = document.getElementById('filtroPuestoRep');
    if (selPuestos) {
        const puestos = [...new Set(reporteActual.detalle.map(d => d.NombrePuesto).filter(Boolean))].sort();
        selPuestos.innerHTML = '<option value="">-- Todos los Puestos --</option>';
        puestos.forEach(p => selPuestos.add(new Option(p, p)));
    }

    aplicarFiltrosYOrdenReporte();
    document.getElementById('seccionReporte').classList.remove('d-none');
    aplicarPermisos('Reporte de Planilla');
}

function limpiarFiltrosReporte() {
    document.getElementById('filtroEmpleadoRep').value = '';
    document.getElementById('filtroPuestoRep').value = '';
    aplicarFiltrosYOrdenReporte();
}

function aplicarFiltrosYOrdenReporte() {
    if (!reporteActual || !reporteActual.detalle) return;

    const texto = (document.getElementById('filtroEmpleadoRep')?.value || '').trim().toLowerCase();
    const puesto = document.getElementById('filtroPuestoRep')?.value;

    let filtrados = reporteActual.detalle.filter(d => {
        if (texto) {
            const coincideId = String(d.IdEmpleado).includes(texto);
            const coincideNom = (d.NombreEmpleado || '').toLowerCase().includes(texto);
            if (!coincideId && !coincideNom) return false;
        }
        if (puesto && d.NombrePuesto !== puesto) return false;
        return true;
    });

    const ordenados = ordenarLista(filtrados, ordenReporte.columna, ordenReporte.orden, 'IdEmpleado');
    dibujarTablaReporte(ordenados);
}

function dibujarTablaReporte(datos) {
    const tbody = document.getElementById('tablaReporteBody');
    tbody.innerHTML = '';

    if (!datos || datos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="14" class="text-center text-muted py-4">
                    <i class="bi bi-search me-2"></i>No se encontraron empleados que coincidan con los criterios de búsqueda.
                </td>
            </tr>`;
        return;
    }

    datos.forEach(d => {
        const pctIgss = Number(d.PorcentajeIgss ?? 4.83).toFixed(2);
        const pctIsr = Number(d.PorcentajeIsr ?? 5.00).toFixed(2);
        const fContratacion = formatearFecha(d.FechaContratacion);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold">${d.IdEmpleado}</td>
            <td class="fw-bold text-start">${esc(d.NombreEmpleado)}</td>
            <td>${esc(fContratacion)}</td>
            <td>${esc(d.NombrePuesto)}</td>
            <td><span class="badge bg-success">${esc(d.NombreStatus)}</span></td>
            <td class="text-end">${q(d.IngresoSueldoBase)}</td>
            <td class="text-end">${q(d.IngresoBonificacionDecreto)}</td>
            <td class="text-end">${q(d.IngresoOtrosIngresos)}</td>
            <td class="text-center"><span class="badge bg-primary bg-opacity-10 text-primary">${pctIgss}%</span></td>
            <td class="text-end text-danger">${q(d.DescuentoIgss)}</td>
            <td class="text-center"><span class="badge bg-primary bg-opacity-10 text-primary">${pctIsr}%</span></td>
            <td class="text-end text-danger">${q(d.DescuentoIsr)}</td>
            <td class="text-end text-danger">${q(d.DescuentoInasistencias)}</td>
            <td class="text-end fw-bold text-success">${q(d.SalarioNeto)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function exportarExcel() {
    if (!reporteActual || !reporteActual.detalle) return;

    const val = document.getElementById('cboPeriodo').value;
    const tabla = document.querySelector('#tablaReporte');
    let csv = [];

    for (let i = 0; i < tabla.rows.length; i++) {
        let fila = [];
        let cols = tabla.rows[i].querySelectorAll('td, th');
        for (let j = 0; j < cols.length; j++) {
            fila.push('"' + cols[j].innerText.replace(/"/g, '""').trim() + '"');
        }
        csv.push(fila.join(','));
    }

    csv.push('');
    csv.push(`"TOTAL DE INGRESOS GENERAL","${reporteActual.cabecera.TotalIngresos}"`);
    csv.push(`"TOTAL DE DESCUENTOS GENERAL","${reporteActual.cabecera.TotalDescuentos}"`);
    csv.push(`"SALARIO NETO GENERAL","${reporteActual.cabecera.SalarioNeto}"`);

    const blob = new Blob(['\uFEFF' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    enlace.href = window.URL.createObjectURL(blob);
    enlace.download = `Reporte_Planilla_${val}.csv`;
    enlace.click();
}
