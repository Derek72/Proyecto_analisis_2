let usuarioActual = null;

document.addEventListener('DOMContentLoaded', () => {
    
    usuarioActual = aplicarPermisos('Roles'); 
    if (!usuarioActual) return;

    cargarRoles();

    document.getElementById('btnCrear').addEventListener('click', guardarRol);
    document.getElementById('btnActualizar').addEventListener('click', guardarRol);
    document.getElementById('btnEliminarTop').addEventListener('click', eliminarDesdeFormulario);
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
    
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

async function cargarRoles() {
    try {
        const response = await fetch('/catalogos/roles', {
            method: 'GET',
            headers: obtenerCabecerasSeguridad()
        });
        if (!response.ok) throw new Error('Error al obtener los roles');
        const roles = await response.json();
        dibujarTabla(roles);
    } catch (error) {
        console.error("Error:", error);
        alert('Hubo un problema al cargar la información.');
    }
}

function dibujarTabla(roles) {
    const tbody = document.getElementById('tablaRolesBody');
    tbody.innerHTML = '';

    roles.forEach(rol => {
        const rolJSON = JSON.stringify(rol).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${rol.IdRole}</td>
            <td class="fw-bold">${rol.Nombre}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                    onclick="cargarParaEdicion('${rolJSON}')">
                    Editar
                </button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                    onclick="eliminarDesdeFormulario(${rol.IdRole})">
                    Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    aplicarPermisos('Roles');
}

window.cargarParaEdicion = function(rolString) {
    const rol = JSON.parse(rolString);
    document.getElementById('IdRole').value = rol.IdRole;
    document.getElementById('Nombre').value = rol.Nombre;
    
    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formRole').reset();
    document.getElementById('IdRole').value = '';
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarRol() {
    const id = document.getElementById('IdRole').value;
    const nombre = document.getElementById('Nombre').value.trim();

    if (!nombre) return alert("Por favor, ingresa el nombre del rol.");

    const datos = { Nombre: nombre };
    if (id) datos.UsuarioModificacion = usuarioActual.id;
    else datos.UsuarioCreacion = usuarioActual.id;

    const url = id ? `/catalogos/roles/${id}` : '/catalogos/roles';
    const metodo = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(datos)
        });

        if (response.ok) {
            limpiarFormulario();
            cargarRoles();
        } else {
            const result = await response.json();
            alert(result.mensaje || 'Error al guardar');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor.');
    }
}

async function eliminarDesdeFormulario(idParam) {
    const id = idParam || document.getElementById('IdRole').value;
    if (!id || !confirm('¿Estás seguro de eliminar este rol? Toma en cuenta que podría afectar a los usuarios asignados a él.')) return;

    try {
        const response = await fetch(`/catalogos/roles/${id}`, { 
            method: 'DELETE', 
            headers: obtenerCabecerasSeguridad() 
        });
        
        if (response.ok) {
            limpiarFormulario();
            cargarRoles();
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
    const tabla = document.querySelector('#tablaRoles');
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
    enlace.download = 'Roles.csv';
    enlace.click();
}