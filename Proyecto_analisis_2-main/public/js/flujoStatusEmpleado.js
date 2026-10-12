let usuarioActual = null;
let esModoEdicion = false;

document.addEventListener('DOMContentLoaded', async () => {
    usuarioActual = aplicarPermisos('Flujos Status Empleado'); 
    if (!usuarioActual) return;

    await cargarCombosStatus();
    cargarFlujos();

    document.getElementById('btnCrear').addEventListener('click', guardarFlujo);
    document.getElementById('btnActualizar').addEventListener('click', guardarFlujo);
    document.getElementById('btnEliminarTop').addEventListener('click', () => eliminarFlujo());
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);

    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

async function cargarCombosStatus() {
    try {
        const response = await fetch('/catalogos/status-empleados', {
            headers: obtenerCabecerasSeguridad()
        });
        if (!response.ok) throw new Error('Error al cargar la lista de status');
        
        const listaStatus = await response.json();
        
        const cboActual = document.getElementById('IdStatusActual');
        const cboNuevo = document.getElementById('IdStatusNuevo');

        cboActual.innerHTML = '<option value="">-- Seleccione --</option>';
        cboNuevo.innerHTML = '<option value="">-- Seleccione --</option>';

        listaStatus.forEach(item => {
            const opt1 = new Option(item.Nombre, item.IdStatusEmpleado);
            const opt2 = new Option(item.Nombre, item.IdStatusEmpleado);
            cboActual.add(opt1);
            cboNuevo.add(opt2);
        });
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar los comboboxes de Status Empleado.');
    }
}

async function cargarFlujos() {
    try {
        const response = await fetch('/catalogos/flujos-status', {
            headers: obtenerCabecerasSeguridad()
        });
        if (!response.ok) throw new Error('Error al consultar flujos');
        const datos = await response.json();
        dibujarTabla(datos);
    } catch (error) {
        console.error(error);
    }
}

function dibujarTabla(datos) {
    const tbody = document.getElementById('tablaFlujosBody');
    tbody.innerHTML = '';

    datos.forEach(item => {
        const itemJSON = JSON.stringify(item).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge bg-secondary">${item.StatusActual}</span></td>
            <td><i class="bi bi-arrow-right text-primary fs-5"></i></td>
            <td><span class="badge bg-info text-dark">${item.StatusNuevo}</span></td>
            <td class="fw-bold">${item.NombreEvento}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                    onclick="cargarParaEdicion('${itemJSON}')">Editar</button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                    onclick="eliminarFlujo(${item.IdStatusActual}, ${item.IdStatusNuevo})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    aplicarPermisos('Flujos Status Empleado');
}

window.cargarParaEdicion = function(itemString) {
    const item = JSON.parse(itemString);
    
    document.getElementById('IdStatusActual').value = item.IdStatusActual;
    document.getElementById('IdStatusNuevo').value = item.IdStatusNuevo;
    document.getElementById('NombreEvento').value = item.NombreEvento;

    // Bloqueamos los combos durante la edición para proteger la clave primaria compuesta
    document.getElementById('IdStatusActual').disabled = true;
    document.getElementById('IdStatusNuevo').disabled = true;
    
    esModoEdicion = true;
    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formFlujo').reset();
    document.getElementById('IdStatusActual').disabled = false;
    document.getElementById('IdStatusNuevo').disabled = false;
    
    esModoEdicion = false;
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarFlujo() {
    const idActual = document.getElementById('IdStatusActual').value;
    const idNuevo = document.getElementById('IdStatusNuevo').value;
    const nombreEvento = document.getElementById('NombreEvento').value.trim();

    if (!idActual || !idNuevo || !nombreEvento) {
        return alert('Por favor, completa todos los campos requeridos.');
    }

    if (idActual === idNuevo) {
        return alert('El status actual y el nuevo no pueden ser el mismo.');
    }

    const data = {
        IdStatusActual: idActual,
        IdStatusNuevo: idNuevo,
        NombreEvento: nombreEvento
    };

    if (esModoEdicion) data.UsuarioModificacion = usuarioActual.id;
    else data.UsuarioCreacion = usuarioActual.id;

    const url = esModoEdicion 
        ? `/catalogos/flujos-status/${idActual}/${idNuevo}` 
        : '/catalogos/flujos-status';
    const metodo = esModoEdicion ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            limpiarFormulario();
            cargarFlujos();
        } else {
            alert(result.mensaje || 'Error al procesar la solicitud');
        }
    } catch (error) { 
        console.error(error); 
    }
}

async function eliminarFlujo(idActParam, idNueParam) {
    const idActual = idActParam || document.getElementById('IdStatusActual').value;
    const idNuevo = idNueParam || document.getElementById('IdStatusNuevo').value;

    if (!idActual || !idNuevo || !confirm('¿Estás seguro de eliminar esta transición de status?')) return;

    try {
        const response = await fetch(`/catalogos/flujos-status/${idActual}/${idNuevo}`, {
            method: 'DELETE',
            headers: obtenerCabecerasSeguridad()
        });
        
        if (response.ok) {
            limpiarFormulario();
            cargarFlujos();
        } else {
            const result = await response.json();
            alert(result.mensaje || 'Error al eliminar');
        }
    } catch (error) { 
        console.error(error); 
    }
}

function obtenerCabecerasSeguridad() {
    return { 'Content-Type': 'application/json', 'x-role-id': usuarioActual.idRole };
}

function exportarExcel() {
    const tabla = document.querySelector('#tablaFlujos');
    let csv = [];
    for (let i = 0; i < tabla.rows.length; i++) {
        let fila = [];
        let columnas = tabla.rows[i].querySelectorAll('td, th');
        for (let j = 0; j < columnas.length - 1; j++) {
            if (j !== 1) { // Omitir la columna del icono de flecha
                fila.push('"' + columnas[j].innerText.replace(/"/g, '""') + '"');
            }
        }
        csv.push(fila.join(','));
    }
    const blob = new Blob(['\uFEFF' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    enlace.href = window.URL.createObjectURL(blob);
    enlace.download = 'FlujoStatusEmpleados.csv';
    enlace.click();
}