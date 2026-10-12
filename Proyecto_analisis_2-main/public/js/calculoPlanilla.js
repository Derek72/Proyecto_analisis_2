let usuarioActual = null;
let periodos = [];
let periodoSeleccionado = null;

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
});

function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function q(n) { return 'Q ' + Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

async function cargarPeriodos() {
    try {
        const valorPrevio = document.getElementById('Periodo').value;
        const response = await fetch('/planilla/periodos', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al consultar períodos');
        periodos = await response.json();

        const cbo = document.getElementById('Periodo');
        cbo.innerHTML = '<option value="">-- Seleccione un Período --</option>';
        periodos.forEach(p => {
            const texto = `${MESES[p.Mes]} ${p.Anio}  (${p.FechaInicio} al ${p.FechaFin})${p.Procesado ? '  ✔ Procesado' : ''}`;
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
        aviso.textContent = `Este período ya fue procesado el ${periodoSeleccionado.FechaHoraProcesada}.`;
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

        document.getElementById('tituloResultado').textContent = `Planilla de ${MESES[mes]} ${anio}`;
        document.getElementById('totIngresos').textContent = q(cabecera.TotalIngresos);
        document.getElementById('totDescuentos').textContent = q(cabecera.TotalDescuentos);
        document.getElementById('totNeto').textContent = q(cabecera.SalarioNeto);
        document.getElementById('fechaProceso').textContent = cabecera.FechaHoraProcesada;

        const tbody = document.getElementById('tablaResultadoBody');
        tbody.innerHTML = '';
        detalle.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold text-start">${esc(d.NombreEmpleado)}</td>
                <td>${esc(d.FechaContratacion)}</td>
                <td>${esc(d.NombrePuesto)}</td>
                <td><span class="badge bg-success">${esc(d.NombreStatus)}</span></td>
                <td class="text-end">${q(d.IngresoSueldoBase)}</td>
                <td class="text-end">${q(d.IngresoBonificacionDecreto)}</td>
                <td class="text-end">${q(d.IngresoOtrosIngresos)}</td>
                <td class="text-end">${q(d.DescuentoIgss)}</td>
                <td class="text-end">${q(d.DescuentoIsr)}</td>
                <td class="text-end">${q(d.DescuentoInasistencias)}</td>
                <td class="text-end fw-bold">${q(d.SalarioNeto)}</td>`;
            tbody.appendChild(tr);
        });

        document.getElementById('seccionResultado').classList.remove('d-none');
        aplicarPermisos('Calcular Planilla');
    } catch (error) { console.error(error); }
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