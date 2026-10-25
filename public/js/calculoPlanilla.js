let usuarioActual = null;
let periodos = [];
let periodoSeleccionado = null;
let detalleActual = [];
let ordenResultado = { columna: 'IdEmpleado', orden: 'asc' };

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

document.addEventListener('DOMContentLoaded', async () => {
    usuarioActual = aplicarPermisos('Calcular Planilla');
    if (!usuarioActual) return;

    await cargarPeriodos();

    document.getElementById('Periodo').addEventListener('change', alCambiarPeriodo);
    document.getElementById('btnCalcular').addEventListener('click', calcularPlanilla);
    document.getElementById('btnActualizarLista').addEventListener('click', async () => { await cargarPeriodos(); });
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);

    document.getElementById('filtroEmpleadoCalc').addEventListener('input', aplicarFiltrosYOrdenResultado);
    document.getElementById('filtroPuestoCalc').addEventListener('change', aplicarFiltrosYOrdenResultado);
    document.getElementById('btnLimpiarFiltrosCalc').addEventListener('click', limpiarFiltrosResultado);

    configurarEncabezadosOrdenables('tablaResultado', (col, ord) => {
        ordenResultado = { columna: col, orden: ord };
        aplicarFiltrosYOrdenResultado();
    }, ordenResultado);
});

function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function q(n) { return 'Q ' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function redondearMoneda(n) {
    return Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
}

async function cargarPeriodos() {
    try {
        const valorPrevio = document.getElementById('Periodo').value;
        const response = await fetch('/planilla/periodos', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al consultar períodos');
        periodos = await response.json();

        const cbo = document.getElementById('Periodo');
        cbo.innerHTML = '<option value="">-- Seleccione un Período --</option>';
        periodos.forEach(p => {
            const fIni = formatearFecha(p.FechaInicio);
            const fFin = formatearFecha(p.FechaFin);
            const texto = `${MESES[p.Mes]} ${p.Anio}  (${fIni} al ${fFin})${p.Procesado ? '  [Procesado]' : ''}`;
            cbo.add(new Option(texto, `${p.Anio}-${p.Mes}`));
        });
        if (valorPrevio) { cbo.value = valorPrevio; }
        alCambiarPeriodo();
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar los períodos de planilla.');
    }
}

function periodoActual() {
    const v = document.getElementById('Periodo').value;
    if (!v) return null;
    const [anio, mes] = v.split('-').map(Number);
    return periodos.find(p => p.Anio === anio && p.Mes === mes) || null;
}

async function alCambiarPeriodo() {
    periodoSeleccionado = periodoActual();
    const aviso = document.getElementById('mensajePeriodo');
    const btn = document.getElementById('btnCalcular');
    document.getElementById('seccionResultado').classList.add('d-none');

    if (!periodoSeleccionado) {
        aviso.classList.add('d-none');
        btn.disabled = true;
        return;
    }

    if (periodoSeleccionado.Procesado) {
        btn.disabled = true;
        aviso.className = 'alert alert-success py-2 mt-3 mb-0';
        aviso.textContent = `Este período ya fue procesado el ${formatearFechaHora(periodoSeleccionado.FechaHoraProcesada)}.`;
        await mostrarResultado(periodoSeleccionado.Anio, periodoSeleccionado.Mes);
    } else {
        btn.disabled = false;
        aviso.className = 'alert alert-info py-2 mt-3 mb-0';
        aviso.textContent = 'Este período aún no ha sido procesado.';
    }
}

async function calcularPlanilla() {
    const p = periodoActual();
    if (!p) return alert('Selecciona un período de planilla.');
    if (p.Procesado) return alert('Este período ya fue procesado.');

    if (!confirm(`¿Deseas calcular la planilla de ${MESES[p.Mes]} ${p.Anio}? Esta acción no se puede repetir para el mismo período.`)) return;

    const btn = document.getElementById('btnCalcular');
    btn.disabled = true;

    try {
        const response = await fetch('/planilla/calcular', {
            method: 'POST',
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify({ Anio: p.Anio, Mes: p.Mes, Usuario: usuarioActual.id })
        });
        const result = await response.json();

        if (response.ok) {
            alert('¡Planilla calculada exitosamente!');
            await cargarPeriodos();
        } else {
            alert(result.mensaje || 'Error al calcular la planilla');
            btn.disabled = false;
        }
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al comunicarse con el servidor.');
        btn.disabled = false;
    }
}

async function mostrarResultado(anio, mes) {
    try {
        const response = await fetch(`/planilla/resultado/${anio}/${mes}`, { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) return;
        const { cabecera, detalle } = await response.json();

        detalleActual = (detalle || []).map(d => {
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

        const totIngresos = detalleActual.reduce((acc, r) => acc + redondearMoneda((Number(r.IngresoSueldoBase) || 0) + (Number(r.IngresoBonificacionDecreto) || 0) + (Number(r.IngresoOtrosIngresos) || 0)), 0);
        const totDescuentos = detalleActual.reduce((acc, r) => acc + redondearMoneda(r.DescuentoIgss + r.DescuentoIsr + r.DescuentoInasistencias), 0);
        const totNeto = redondearMoneda(totIngresos - totDescuentos);

        document.getElementById('tituloResultado').textContent = `Planilla de ${MESES[mes]} ${anio}`;
        document.getElementById('totIngresos').textContent = q(detalleActual.length > 0 ? totIngresos : cabecera.TotalIngresos);
        document.getElementById('totDescuentos').textContent = q(detalleActual.length > 0 ? totDescuentos : cabecera.TotalDescuentos);
        document.getElementById('totNeto').textContent = q(detalleActual.length > 0 ? totNeto : cabecera.SalarioNeto);
        document.getElementById('fechaProceso').textContent = formatearFechaHora(cabecera.FechaHoraProcesada);

        const selPuestos = document.getElementById('filtroPuestoCalc');
        if (selPuestos) {
            const puestosUnicos = [...new Set(detalleActual.map(d => d.NombrePuesto).filter(Boolean))].sort();
            selPuestos.innerHTML = '<option value="">-- Todos los Puestos --</option>';
            puestosUnicos.forEach(p => selPuestos.add(new Option(p, p)));
        }

        aplicarFiltrosYOrdenResultado();
        document.getElementById('seccionResultado').classList.remove('d-none');
        aplicarPermisos('Calcular Planilla');
    } catch (error) {
        console.error(error);
    }
}

function limpiarFiltrosResultado() {
    document.getElementById('filtroEmpleadoCalc').value = '';
    document.getElementById('filtroPuestoCalc').value = '';
    aplicarFiltrosYOrdenResultado();
}

function aplicarFiltrosYOrdenResultado() {
    const texto = (document.getElementById('filtroEmpleadoCalc')?.value || '').trim().toLowerCase();
    const puesto = document.getElementById('filtroPuestoCalc')?.value;

    let filtrados = detalleActual.filter(d => {
        if (texto) {
            const coincideId = String(d.IdEmpleado).includes(texto);
            const coincideNom = (d.NombreEmpleado || '').toLowerCase().includes(texto);
            if (!coincideId && !coincideNom) return false;
        }
        if (puesto && d.NombrePuesto !== puesto) return false;
        return true;
    });

    const ordenados = ordenarLista(filtrados, ordenResultado.columna, ordenResultado.orden, 'IdEmpleado');
    dibujarTablaResultado(ordenados);
}

function dibujarTablaResultado(datos) {
    const tbody = document.getElementById('tablaResultadoBody');
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
            <td class="text-end fw-bold text-success">${q(d.SalarioNeto)}</td>`;
        tbody.appendChild(tr);
    });
}

function obtenerCabecerasSeguridad() {
    return { 'Content-Type': 'application/json', 'x-role-id': usuarioActual.idRole };
}

function exportarExcel() {
    const tabla = document.querySelector('#tablaResultado');
    let csv = [];
    for (let i = 0; i < tabla.rows.length; i++) {
        let fila = [];
        let columnas = tabla.rows[i].querySelectorAll('td, th');
        for (let j = 0; j < columnas.length; j++) {
            fila.push('"' + columnas[j].innerText.replace(/"/g, '""') + '"');
        }
        csv.push(fila.join(','));
    }
    const p = periodoSeleccionado;
    const blob = new Blob(['\uFEFF' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    enlace.href = window.URL.createObjectURL(blob);
    enlace.download = p ? `Planilla_${p.Anio}_${String(p.Mes).padStart(2, '0')}.csv` : 'Planilla.csv';
    enlace.click();
}
