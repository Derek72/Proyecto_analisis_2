let usuarioActual = null;
let idEdicionActual = null;
let combos = { personas: [], sucursales: [], puestos: [], status: [] };
let empleados = [];
let igssEditadoManual = false;

const CAMPOS_NUM = ['IngresoSueldoBase', 'IngresoBonificacionDecreto', 'IngresoOtrosIngresos', 'DescuentoIgss', 'DescuentoIsr', 'DescuentoInasistencias'];

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

    // Sugerencia de IGSS (4.83%) mientras el usuario no lo escriba manualmente
    document.getElementById('DescuentoIgss').addEventListener('input', () => { igssEditadoManual = true; });
    document.getElementById('IngresoSueldoBase').addEventListener('input', (e) => {
        if (!igssEditadoManual) {
            const base = parseFloat(e.target.value);
            document.getElementById('DescuentoIgss').value = isNaN(base) ? 0 : (Math.round(base * 0.0483 * 100) / 100).toFixed(2);
        }
    });
});

function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function q(n) { return 'Q ' + Number(n).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

async function cargarCombos() {
    try {
        const response = await fetch('/planilla/empleados/combos', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al cargar las listas');
        combos = await response.json();

        llenarSelect('IdSucursal', combos.sucursales, 'IdSucursal', s => s.Nombre, '-- Seleccione una Sucursal --');
        llenarSelect('IdPuesto', combos.puestos, 'IdPuesto', p => `${p.Nombre} (${p.NombreDepartamento})`, '-- Seleccione un Puesto --');
        llenarSelect('IdStatusEmpleado', combos.status, 'IdStatusEmpleado', s => s.Nombre, '-- Seleccione un Status --');
        llenarPersonas(null);
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar las listas de selección.');
    }
}

function llenarSelect(id, lista, campoId, textoFn, placeholder) {
    const sel = document.getElementById(id);
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    lista.forEach(item => sel.add(new Option(textoFn(item), item[campoId])));
}

// Solo personas que aún no son empleados (más la persona del registro que se está editando)
function llenarPersonas(idEmpleadoEditando) {
    const disponibles = combos.personas.filter(p => !p.IdEmpleado || p.IdEmpleado === idEmpleadoEditando);
    llenarSelect('IdPersona', disponibles, 'IdPersona', p => p.NombreCompleto, '-- Seleccione una Persona --');
}

async function cargarEmpleados() {
    try {
        const response = await fetch('/planilla/empleados', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al consultar empleados');
        empleados = await response.json();
        dibujarTabla(empleados);
    } catch (error) { console.error(error); }
}

function dibujarTabla(datos) {
    const tbody = document.getElementById('tablaEmpleadosBody');
    tbody.innerHTML = '';

    datos.forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${e.IdEmpleado}</td>
            <td class="fw-bold text-start">${esc(e.NombrePersona)}</td>
            <td>${esc(e.NombreSucursal)}</td>
            <td>${esc(e.NombrePuesto)}</td>
            <td><span class="badge ${e.IdStatusEmpleado === 1 ? 'bg-success' : 'bg-secondary'}">${esc(e.NombreStatus)}</span></td>
            <td>${esc(e.FechaContratacion)}</td>
            <td class="text-end">${q(e.IngresoSueldoBase)}</td>
            <td class="text-end">${q(e.IngresoBonificacionDecreto)}</td>
            <td class="text-end">${q(e.IngresoOtrosIngresos)}</td>
            <td class="text-end">${q(e.DescuentoIgss)}</td>
            <td class="text-end">${q(e.DescuentoIsr)}</td>
            <td class="text-end">${q(e.DescuentoInasistencias)}</td>
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
    igssEditadoManual = true;

    llenarPersonas(id);
    document.getElementById('IdPersona').value = e.IdPersona;
    document.getElementById('IdSucursal').value = e.IdSucursal;
    document.getElementById('IdPuesto').value = e.IdPuesto;
    document.getElementById('IdStatusEmpleado').value = e.IdStatusEmpleado;
    document.getElementById('FechaContratacion').value = e.FechaContratacion;
    CAMPOS_NUM.forEach(c => { document.getElementById(c).value = e[c]; });

    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function limpiarFormulario() {
    document.getElementById('formEmpleado').reset();
    idEdicionActual = null;
    igssEditadoManual = false;
    llenarPersonas(null);
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarEmpleado() {
    const data = {
        IdPersona: document.getElementById('IdPersona').value,
        IdSucursal: document.getElementById('IdSucursal').value,
        IdPuesto: document.getElementById('IdPuesto').value,
        IdStatusEmpleado: document.getElementById('IdStatusEmpleado').value,
        FechaContratacion: document.getElementById('FechaContratacion').value
    };
    CAMPOS_NUM.forEach(c => { data[c] = document.getElementById(c).value; });

    if (!data.IdPersona || !data.IdSucursal || !data.IdPuesto || !data.IdStatusEmpleado || !data.FechaContratacion) {
        return alert('Por favor, completa Persona, Sucursal, Puesto, Status y Fecha de Contratación.');
    }
    if (!(parseFloat(data.IngresoSueldoBase) > 0)) return alert('El sueldo base debe ser mayor a cero.');
    for (const c of CAMPOS_NUM) {
        if (data[c] === '' || parseFloat(data[c]) < 0) return alert('Los montos no pueden estar vacíos ni ser negativos.');
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
