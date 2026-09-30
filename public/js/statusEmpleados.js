let usuarioActual = null;

document.addEventListener('DOMContentLoaded', () => {
    // Validamos permisos con el módulo de seguridad
    usuarioActual = aplicarPermisos('Status Empleado'); 
    if (!usuarioActual) return;

    cargarStatusEmpleados();

    // Eventos de botones
    document.getElementById('btnCrear').addEventListener('click', guardarStatus);
    document.getElementById('btnActualizar').addEventListener('click', guardarStatus);
    document.getElementById('btnEliminarTop').addEventListener('click', eliminarDesdeFormulario);
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
    
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

async function cargarStatusEmpleados() {
    try {
        const response = await fetch('/catalogos/status-empleados', {
            method: 'GET',
            headers: obtenerCabecerasSeguridad()
        });
        if (!response.ok) throw new Error('Error al obtener los status');
        const datos = await response.json();
        dibujarTabla(datos);
    } catch (error) {
        console.error(error);
        alert('Hubo un problema al cargar la información.');
    }
}

function dibujarTabla(datos) {
    const tbody = document.getElementById('tablaStatusBody');
    tbody.innerHTML = '';

    datos.forEach(item => {
        const itemJSON = JSON.stringify(item).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.IdStatusEmpleado}</td>
            <td class="fw-bold">${item.Nombre}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                    onclick="cargarParaEdicion('${itemJSON}')">Editar</button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                    onclick="eliminarDesdeFormulario(${item.IdStatusEmpleado})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    aplicarPermisos('Status Empleado');
}

window.cargarParaEdicion = function(itemString) {
    const item = JSON.parse(itemString);
    document.getElementById('IdStatusEmpleado').value = item.IdStatusEmpleado;
    document.getElementById('Nombre').value = item.Nombre;
    
    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formStatus').reset();
    document.getElementById('IdStatusEmpleado').value = '';
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarStatus() {
    const idStatus = document.getElementById('IdStatusEmpleado').value;
    const nombre = document.getElementById('Nombre').value.trim();

    if (!nombre) return alert("Por favor, ingresa el nombre del status.");

    const data = { Nombre: nombre };
    if (idStatus) data.UsuarioModificacion = usuarioActual.id;
    else data.UsuarioCreacion = usuarioActual.id;

    const url = idStatus ? `/catalogos/status-empleados/${idStatus}` : '/catalogos/status-empleados';
    const metodo = idStatus ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(data)
        });

        if (response.ok) {
            limpiarFormulario();
            cargarStatusEmpleados();
        } else {
            const result = await response.json();
            alert(result.mensaje || 'Error al guardar');
        }
    } catch (error) { console.error(error); }
}

async function eliminarDesdeFormulario(idParam) {
    const id = idParam || document.getElementById('IdStatusEmpleado').value;
    if (!id || !confirm('¿Estás seguro de eliminar este status?')) return;

    try {
        const response = await fetch(`/catalogos/status-empleados/${id}`, { 
            method: 'DELETE', headers: obtenerCabecerasSeguridad() 
        });
        if (response.ok) {
            limpiarFormulario();
            cargarStatusEmpleados();
        } else {
            const result = await response.json();
            alert(result.mensaje || 'Error al eliminar');
        }
    } catch (error) { console.error(error); }
}

function obtenerCabecerasSeguridad() {
    return { 'Content-Type': 'application/json', 'x-role-id': usuarioActual.idRole };
}

function exportarExcel() {
    const tabla = document.querySelector('#tablaStatus');
    let csv = [];
    for (let i = 0; i < tabla.rows.length; i++) {
        let fila = [];
        let columnas = tabla.rows[i].querySelectorAll('td, th');
        for (let j = 0; j < columnas.length - 1; j++) {
            fila.push('"' + columnas[j].innerText.replace(/"/g, '""') + '"');
        }
        csv.push(fila.join(','));
    }
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    enlace.href = window.URL.createObjectURL(blob);
    enlace.download = 'StatusEmpleados.csv';
    enlace.click();
}