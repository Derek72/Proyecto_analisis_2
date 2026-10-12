let usuarioActual = null;
let idEdicionActual = null;
let inasistencias = [];

document.addEventListener('DOMContentLoaded', async () => {
    usuarioActual = aplicarPermisos('Inasistencias de Empleados');
    if (!usuarioActual) return;

    await cargarEmpleados();
    cargarInasistencias();

    document.getElementById('btnCrear').addEventListener('click', guardarInasistencia);
    document.getElementById('btnActualizar').addEventListener('click', guardarInasistencia);
    document.getElementById('btnEliminarTop').addEventListener('click', () => eliminarInasistencia());
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function cargarEmpleados() {
    try {
        const response = await fetch('/planilla/inasistencias/empleados', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al cargar los empleados');
        const lista = await response.json();
        const cbo = document.getElementById('IdEmpleado');
        cbo.innerHTML = '<option value="">-- Seleccione un Empleado --</option>';
        lista.forEach(e => cbo.add(new Option(e.NombreCompleto, e.IdEmpleado)));
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar los empleados.');
    }
}

async function cargarInasistencias() {
    try {
        const response = await fetch('/planilla/inasistencias', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al consultar inasistencias');
        inasistencias = await response.json();
        dibujarTabla(inasistencias);
    } catch (error) { console.error(error); }
}

function dibujarTabla(datos) {
    const tbody = document.getElementById('tablaInasistenciasBody');
    tbody.innerHTML = '';

    datos.forEach(i => {
        const procesada = !!i.FechaProcesado;
        const acciones = procesada
            ? '<span class="text-muted small">Procesada</span>'
            : `<button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" onclick="cargarParaEdicion(${i.IdInasistencia})">Editar</button>
               <button class="btn btn-sm btn-danger" data-permiso="Baja" onclick="eliminarInasistencia(${i.IdInasistencia})">Eliminar</button>`;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i.IdInasistencia}</td>
            <td class="fw-bold text-start">${esc(i.NombreEmpleado)}</td>
            <td>${esc(i.FechaInicial)}</td>
            <td>${esc(i.FechaFinal)}</td>
            <td>${i.Dias}</td>
            <td class="text-start">${esc(i.MotivoInasistencia)}</td>
            <td><span class="badge ${procesada ? 'bg-success' : 'bg-warning text-dark'}">${procesada ? esc(i.FechaProcesado) : 'Pendiente'}</span></td>
            <td>${acciones}</td>`;
        tbody.appendChild(tr);
    });

    aplicarPermisos('Inasistencias de Empleados');
}

window.cargarParaEdicion = function (id) {
    const i = inasistencias.find(x => x.IdInasistencia === id);
    if (!i) return;
    idEdicionActual = id;
    document.getElementById('IdEmpleado').value = i.IdEmpleado;
    document.getElementById('FechaInicial').value = i.FechaInicial;
    document.getElementById('FechaFinal').value = i.FechaFinal;
    document.getElementById('MotivoInasistencia').value = i.MotivoInasistencia || '';
    document.getElementById('FechaProcesado').value = i.FechaProcesado || 'Pendiente';

    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function limpiarFormulario() {
    document.getElementById('formInasistencia').reset();
    document.getElementById('FechaProcesado').value = 'Pendiente';
    idEdicionActual = null;
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarInasistencia() {
    const data = {
        IdEmpleado: document.getElementById('IdEmpleado').value,
        FechaInicial: document.getElementById('FechaInicial').value,
        FechaFinal: document.getElementById('FechaFinal').value,
        MotivoInasistencia: document.getElementById('MotivoInasistencia').value.trim()
    };

    if (!data.IdEmpleado || !data.FechaInicial || !data.FechaFinal || !data.MotivoInasistencia) {
        return alert('Por favor, completa Empleado, Fecha Inicial, Fecha Final y Motivo.');
    }
    if (data.FechaFinal < data.FechaInicial) {
        return alert('La fecha final no puede ser anterior a la fecha inicial.');
    }

    const accion = idEdicionActual ? 'actualizar' : 'registrar';
    if (!confirm(`¿Estás seguro de que deseas ${accion} esta inasistencia?`)) return;

    if (idEdicionActual) data.UsuarioModificacion = usuarioActual.id;
    else data.UsuarioCreacion = usuarioActual.id;

    const url = idEdicionActual ? `/planilla/inasistencias/${idEdicionActual}` : '/planilla/inasistencias';
    const metodo = idEdicionActual ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, { method: metodo, headers: obtenerCabecerasSeguridad(), body: JSON.stringify(data) });
        const result = await response.json();

        if (response.ok) {
            alert(`¡Inasistencia ${idEdicionActual ? 'actualizada' : 'registrada'} exitosamente!`);
            limpiarFormulario();
            cargarInasistencias();
        } else {
            alert(result.mensaje || 'Error al procesar la solicitud');
        }
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al comunicarse con el servidor.');
    }
}

async function eliminarInasistencia(idParam) {
    const idEliminar = idParam || idEdicionActual;
    if (!idEliminar || !confirm('¿Estás seguro de eliminar esta inasistencia? Esta acción no se puede deshacer.')) return;

    try {
        const response = await fetch(`/planilla/inasistencias/${idEliminar}`, { method: 'DELETE', headers: obtenerCabecerasSeguridad() });
        const result = await response.json();

        if (response.ok) {
            alert('¡Inasistencia eliminada exitosamente!');
            limpiarFormulario();
            cargarInasistencias();
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
    const tabla = document.querySelector('#tablaInasistencias');
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
    enlace.download = 'InasistenciasEmpleados.csv';
    enlace.click();
}
