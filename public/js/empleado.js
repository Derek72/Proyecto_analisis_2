let usuarioActual = null;
let idEdicionActual = null;
let combos = { personas: [], sucursales: [], puestos: [], status: [] };
let empleados = [];

let ordenActual = { columna: 'IdEmpleado', orden: 'asc' };

document.addEventListener('DOMContentLoaded', async () => {
    usuarioActual = aplicarPermisos('Empleados');
    if (!usuarioActual) return;

    await cargarCombos();
    await cargarEmpleados();

    document.getElementById('btnCrear').addEventListener('click', guardarEmpleado);
    document.getElementById('btnActualizar').addEventListener('click', guardarEmpleado);
    document.getElementById('btnEliminarTop').addEventListener('click', () => eliminarEmpleado());
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);

    document.getElementById('filtroTexto').addEventListener('input', aplicarFiltrosYOrden);
    document.getElementById('filtroPuesto').addEventListener('change', aplicarFiltrosYOrden);
    document.getElementById('filtroStatus').addEventListener('change', aplicarFiltrosYOrden);
    document.getElementById('filtroSucursal').addEventListener('change', aplicarFiltrosYOrden);
    document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);

    configurarEncabezadosOrdenables('tablaEmpleados', (col, ord) => {
        ordenActual = { columna: col, orden: ord };
        aplicarFiltrosYOrden();
    }, ordenActual);

    const idsCalculo = [
        'IngresoSueldoBase', 'IngresoBonificacionDecreto', 'IngresoOtrosIngresos',
        'PorcentajeIgss'
    ];
    idsCalculo.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', recalcularDescuentosPorcentuales);
    });

    recalcularDescuentosPorcentuales();
});

function redondearMoneda(n) {
    return Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
}

function calcularIsrAutomatico(sueldoBase) {
    const base = Number(sueldoBase) || 0;
    if (base <= 0) return { porcentaje: 5, monto: 0 };
    const porcentaje = base <= 30000 ? 5 : 7;
    const monto = redondearMoneda(base * (porcentaje / 100));
    return { porcentaje, monto };
}

function calcularDescuentoDiarioAutomatico(sueldoBase) {
    const base = Number(sueldoBase) || 0;
    if (base <= 0) return 0;
    return redondearMoneda(base / 30);
}

function recalcularDescuentosPorcentuales() {
    const base = parseFloat(document.getElementById('IngresoSueldoBase').value) || 0;
    const bono = parseFloat(document.getElementById('IngresoBonificacionDecreto').value) || 0;
    const otros = parseFloat(document.getElementById('IngresoOtrosIngresos').value) || 0;
    const pctIgss = parseFloat(document.getElementById('PorcentajeIgss').value) || 0;

    const montoIgss = redondearMoneda(base * (pctIgss / 100));
    const isrInfo = calcularIsrAutomatico(base);
    const descDiario = calcularDescuentoDiarioAutomatico(base);
    const totalIngresos = redondearMoneda(base + bono + otros);
    const totalDescuentos = redondearMoneda(montoIgss + isrInfo.monto);
    const efectivo = redondearMoneda(totalIngresos - totalDescuentos);

    document.getElementById('DescuentoIgss').value = montoIgss.toFixed(2);
    document.getElementById('PorcentajeIsr').value = isrInfo.porcentaje.toFixed(2);
    document.getElementById('DescuentoIsr').value = isrInfo.monto.toFixed(2);

    const campoDescDiario = document.getElementById('DescuentoInasistencias');
    if (campoDescDiario) {
        campoDescDiario.value = q(descDiario);
        campoDescDiario.dataset.valorNumerico = descDiario.toFixed(2);
    }

    const campoEfectivo = document.getElementById('Efectivo');
    if (campoEfectivo) {
        campoEfectivo.value = q(efectivo);
    }
}

function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function q(n) { return 'Q ' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

async function cargarCombos() {
    try {
        const response = await fetch('/planilla/empleados/combos', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al cargar las listas');
        combos = await response.json();

        llenarSelect('IdSucursal', combos.sucursales, 'IdSucursal', s => s.Nombre, '-- Seleccione una Sucursal --');
        llenarSelect('IdPuesto', combos.puestos, 'IdPuesto', p => `${p.Nombre} (${p.NombreDepartamento})`, '-- Seleccione un Puesto --');
        llenarSelect('IdStatusEmpleado', combos.status, 'IdStatusEmpleado', s => s.Nombre, '-- Seleccione un Status --');
        llenarPersonas(null);

        llenarSelect('filtroPuesto', combos.puestos, 'IdPuesto', p => p.Nombre, '-- Todos los Puestos --');
        llenarSelect('filtroStatus', combos.status, 'IdStatusEmpleado', s => s.Nombre, '-- Todos los Estados --');
        llenarSelect('filtroSucursal', combos.sucursales, 'IdSucursal', s => s.Nombre, '-- Todas las Sucursales --');
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar las listas de selección.');
    }
}

function llenarSelect(id, lista, campoId, textoFn, placeholder) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    lista.forEach(item => sel.add(new Option(textoFn(item), item[campoId])));
}

function llenarPersonas(idEmpleadoEditando) {
    const disponibles = combos.personas.filter(p => !p.IdEmpleado || p.IdEmpleado === idEmpleadoEditando);
    llenarSelect('IdPersona', disponibles, 'IdPersona', p => p.NombreCompleto, '-- Seleccione una Persona --');
}

async function cargarEmpleados() {
    try {
        const response = await fetch('/planilla/empleados', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al consultar empleados');
        empleados = (await response.json()).map(e => {
            const base = Number(e.IngresoSueldoBase) || 0;
            const bono = Number(e.IngresoBonificacionDecreto) || 0;
            const otros = Number(e.IngresoOtrosIngresos) || 0;
            const pctIgss = Number(e.PorcentajeIgss ?? 4.83);
            const igss = (Number(e.DescuentoIgss) > 0) ? redondearMoneda(e.DescuentoIgss) : redondearMoneda(base * (pctIgss / 100));
            const isrInfo = calcularIsrAutomatico(base);
            const descDiario = calcularDescuentoDiarioAutomatico(base);
            const efectivoCalc = redondearMoneda((base + bono + otros) - (igss + isrInfo.monto));
            return {
                ...e,
                PorcentajeIgss: pctIgss,
                DescuentoIgss: igss,
                PorcentajeIsr: isrInfo.porcentaje,
                DescuentoIsr: isrInfo.monto,
                DescuentoDiario: descDiario,
                DescuentoInasistencias: descDiario,
                Efectivo: efectivoCalc
            };
        });
        aplicarFiltrosYOrden();
    } catch (error) { console.error(error); }
}

function limpiarFiltros() {
    document.getElementById('filtroTexto').value = '';
    document.getElementById('filtroPuesto').value = '';
    document.getElementById('filtroStatus').value = '';
    document.getElementById('filtroSucursal').value = '';
    aplicarFiltrosYOrden();
}

function aplicarFiltrosYOrden() {
    const texto = (document.getElementById('filtroTexto')?.value || '').trim().toLowerCase();
    const idPuesto = document.getElementById('filtroPuesto')?.value;
    const idStatus = document.getElementById('filtroStatus')?.value;
    const idSucursal = document.getElementById('filtroSucursal')?.value;

    let filtrados = empleados.filter(e => {
        if (texto) {
            const coincideId = String(e.IdEmpleado).includes(texto);
            const coincideNombre = (e.NombrePersona || '').toLowerCase().includes(texto);
            if (!coincideId && !coincideNombre) return false;
        }
        if (idPuesto && String(e.IdPuesto) !== String(idPuesto)) return false;
        if (idStatus && String(e.IdStatusEmpleado) !== String(idStatus)) return false;
        if (idSucursal && String(e.IdSucursal) !== String(idSucursal)) return false;
        return true;
    });

    const ordenados = ordenarLista(filtrados, ordenActual.columna, ordenActual.orden, 'IdEmpleado');
    dibujarTabla(ordenados);
}

function dibujarTabla(datos) {
    const tbody = document.getElementById('tablaEmpleadosBody');
    tbody.innerHTML = '';

    if (!datos || datos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="16" class="text-center text-muted py-4">
                    <i class="bi bi-search me-2"></i>No se encontraron empleados que coincidan con los criterios de búsqueda.
                </td>
            </tr>`;
        return;
    }

    datos.forEach(e => {
        const pctIgss = Number(e.PorcentajeIgss ?? 4.83).toFixed(2);
        const pctIsr = Number(e.PorcentajeIsr ?? 5.00).toFixed(2);
        const fechaFormateada = formatearFecha(e.FechaContratacion);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold">${e.IdEmpleado}</td>
            <td class="fw-bold text-start">${esc(e.NombrePersona)}</td>
            <td>${esc(e.NombreSucursal)}</td>
            <td>${esc(e.NombrePuesto)}</td>
            <td><span class="badge ${e.IdStatusEmpleado === 1 ? 'bg-success' : 'bg-secondary'}">${esc(e.NombreStatus)}</span></td>
            <td>${esc(fechaFormateada)}</td>
            <td class="text-end">${q(e.IngresoSueldoBase)}</td>
            <td class="text-end">${q(e.IngresoBonificacionDecreto)}</td>
            <td class="text-end">${q(e.IngresoOtrosIngresos)}</td>
            <td class="text-center"><span class="badge bg-primary bg-opacity-10 text-primary">${pctIgss}%</span></td>
            <td class="text-end text-danger">${q(e.DescuentoIgss)}</td>
            <td class="text-center"><span class="badge bg-primary bg-opacity-10 text-primary">${pctIsr}%</span></td>
            <td class="text-end text-danger">${q(e.DescuentoIsr)}</td>
            <td class="text-end text-danger">${q(e.DescuentoInasistencias)}</td>
            <td class="text-end fw-bold text-success">${q(e.Efectivo)}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" onclick="cargarParaEdicion(${e.IdEmpleado})">Editar</button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" onclick="eliminarEmpleado(${e.IdEmpleado})">Eliminar</button>
            </td>`;
        tbody.appendChild(tr);
    });

    aplicarPermisos('Empleados');
}

window.cargarParaEdicion = function (id) {
    const e = empleados.find(x => x.IdEmpleado === id);
    if (!e) return;
    idEdicionActual = id;

    llenarPersonas(id);
    document.getElementById('IdPersona').value = e.IdPersona;
    document.getElementById('IdSucursal').value = e.IdSucursal;
    document.getElementById('IdPuesto').value = e.IdPuesto;
    document.getElementById('IdStatusEmpleado').value = e.IdStatusEmpleado;
    document.getElementById('FechaContratacion').value = (e.FechaContratacion || '').slice(0, 10);
    document.getElementById('IngresoSueldoBase').value = e.IngresoSueldoBase;
    document.getElementById('IngresoBonificacionDecreto').value = e.IngresoBonificacionDecreto;
    document.getElementById('IngresoOtrosIngresos').value = e.IngresoOtrosIngresos;
    document.getElementById('PorcentajeIgss').value = Number(e.PorcentajeIgss ?? 4.83).toFixed(2);

    recalcularDescuentosPorcentuales();

    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function limpiarFormulario() {
    document.getElementById('formEmpleado').reset();
    idEdicionActual = null;
    llenarPersonas(null);
    document.getElementById('FechaContratacion').value = '';
    document.getElementById('PorcentajeIgss').value = '4.83';
    document.getElementById('PorcentajeIsr').value = '5.00';
    if (document.getElementById('PorcentajeInasistencias')) {
        document.getElementById('PorcentajeInasistencias').value = '100.00';
    }
    document.getElementById('DescuentoIgss').value = '0.00';
    document.getElementById('DescuentoIsr').value = '0.00';
    document.getElementById('DescuentoInasistencias').value = 'Q 0.00';
    document.getElementById('IngresoBonificacionDecreto').value = '250';
    document.getElementById('IngresoOtrosIngresos').value = '0';
    recalcularDescuentosPorcentuales();
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarEmpleado() {
    const sueldoBase = parseFloat(document.getElementById('IngresoSueldoBase').value);
    const isrInfo = calcularIsrAutomatico(sueldoBase);
    const descDiario = calcularDescuentoDiarioAutomatico(sueldoBase);

    const data = {
        IdPersona: document.getElementById('IdPersona').value,
        IdSucursal: document.getElementById('IdSucursal').value,
        IdPuesto: document.getElementById('IdPuesto').value,
        IdStatusEmpleado: document.getElementById('IdStatusEmpleado').value,
        FechaContratacion: document.getElementById('FechaContratacion').value,
        IngresoSueldoBase: document.getElementById('IngresoSueldoBase').value,
        IngresoBonificacionDecreto: document.getElementById('IngresoBonificacionDecreto').value,
        IngresoOtrosIngresos: document.getElementById('IngresoOtrosIngresos').value,
        PorcentajeIgss: document.getElementById('PorcentajeIgss').value,
        DescuentoIgss: document.getElementById('DescuentoIgss').value,
        PorcentajeIsr: isrInfo.porcentaje.toFixed(2),
        DescuentoIsr: isrInfo.monto.toFixed(2),
        PorcentajeInasistencias: '100.00',
        DescuentoInasistencias: descDiario.toFixed(2)
    };

    if (!data.IdPersona || !data.IdSucursal || !data.IdPuesto || !data.IdStatusEmpleado || !data.FechaContratacion) {
        return alert('Por favor, completa Persona, Sucursal, Puesto, Status y Fecha de Contratación (DD/MM/AAAA).');
    }
    if (!(sueldoBase > 0)) return alert('El sueldo base debe ser mayor a cero.');

    const pctIgss = parseFloat(data.PorcentajeIgss);
    if (isNaN(pctIgss) || pctIgss < 0 || pctIgss > 100) {
        return alert('El porcentaje de IGSS debe ser un número válido entre 0% y 100%.');
    }

    const accion = idEdicionActual ? 'actualizar' : 'crear';
    if (!confirm(`¿Estás seguro de que deseas ${accion} este empleado?`)) return;

    if (idEdicionActual) data.UsuarioModificacion = usuarioActual.id;
    else data.UsuarioCreacion = usuarioActual.id;

    const url = idEdicionActual ? `/planilla/empleados/${idEdicionActual}` : '/planilla/empleados';
    const metodo = idEdicionActual ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, { method: metodo, headers: obtenerCabecerasSeguridad(), body: JSON.stringify(data) });
        const result = await response.json();

        if (response.ok) {
            alert(`¡Empleado ${idEdicionActual ? 'actualizado' : 'creado'} exitosamente!`);
            await cargarCombos();
            limpiarFormulario();
            cargarEmpleados();
        } else {
            alert(result.mensaje || 'Error al procesar la solicitud');
        }
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al comunicarse con el servidor.');
    }
}

async function eliminarEmpleado(idParam) {
    const idEliminar = idParam || idEdicionActual;
    if (!idEliminar || !confirm('¿Estás seguro de eliminar este empleado? Esta acción no se puede deshacer.')) return;

    try {
        const response = await fetch(`/planilla/empleados/${idEliminar}`, { method: 'DELETE', headers: obtenerCabecerasSeguridad() });
        const result = await response.json();

        if (response.ok) {
            alert('¡Empleado eliminado exitosamente!');
            await cargarCombos();
            limpiarFormulario();
            cargarEmpleados();
        } else {
            alert(result.mensaje || 'Error al eliminar');
        }
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al comunicarse con el servidor.');
    }
}

function obtenerCabecerasSeguridad() {
    return { 'Content-Type': 'application/json', 'x-role-id': usuarioActual.idRole };
}

function exportarExcel() {
    const tabla = document.querySelector('#tablaEmpleados');
    let csv = [];
    for (let i = 0; i < tabla.rows.length; i++) {
        let fila = [];
        let columnas = tabla.rows[i].querySelectorAll('td, th');
        for (let j = 0; j < columnas.length - 1; j++) {
            fila.push('"' + columnas[j].innerText.replace(/"/g, '""') + '"');
        }
        csv.push(fila.join(','));
    }
    const blob = new Blob(['\uFEFF' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    enlace.href = window.URL.createObjectURL(blob);
    enlace.download = 'Empleados.csv';
    enlace.click();
}
