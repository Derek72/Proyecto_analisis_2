let usuarioActual = null;

document.addEventListener('DOMContentLoaded', async () => {
    // ¡Asegúrate de que este nombre coincida con el permiso en tu BD!
    usuarioActual = aplicarPermisos('Opciones'); 
    if (!usuarioActual) return;

    await cargarComboMenus();
    cargarOpciones();

    document.getElementById('btnGuardar').addEventListener('click', guardarOpcion);
    document.getElementById('btnEliminarTop').addEventListener('click', eliminarDesdeFormulario);
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
    
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

async function cargarComboMenus() {
    try {
        const response = await fetch('/catalogos/menus', { 
            method: 'GET',
            headers: obtenerCabecerasSeguridad() 
        });
        if (!response.ok) throw new Error('Error al cargar menús');
        
        const menus = await response.json();
        const select = document.getElementById('IdMenu');
        select.innerHTML = '<option value="">Seleccione un menú...</option>';
        
        menus.forEach(menu => {
            select.innerHTML += `<option value="${menu.IdMenu}">${menu.NombreModulo} - ${menu.Nombre}</option>`;
        });
    } catch (error) { console.error('Error:', error); }
}

async function cargarOpciones() {
    try {
        const response = await fetch('/catalogos/opciones', {
            method: 'GET', headers: obtenerCabecerasSeguridad()
        });
        if (!response.ok) throw new Error('Error al obtener opciones');
        const opciones = await response.json();
        dibujarTabla(opciones);
    } catch (error) { console.error(error); }
}

function dibujarTabla(opciones) {
    const tbody = document.getElementById('tablaOpcionesBody');
    tbody.innerHTML = '';

    opciones.forEach(opcion => {
        const opcionJSON = JSON.stringify(opcion).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${opcion.IdOpcion}</td>
            <td><span class="badge bg-info text-dark">${opcion.NombreMenu || opcion.IdMenu}</span></td>
            <td class="fw-bold">${opcion.Nombre}</td>
            <td class="text-muted small">${opcion.Pagina}</td>
            <td><span class="badge bg-secondary">${opcion.OrdenMenu}</span></td>
            <td>
                <button class="btn btn-sm btn-warning" data-permiso="Cambio" 
                    onclick="cargarParaEdicion('${opcionJSON}')">Seleccionar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    aplicarPermisos('Opciones');
}

window.cargarParaEdicion = function(opcionString) {
    const opcion = JSON.parse(opcionString);
    document.getElementById('IdOpcion').value = opcion.IdOpcion;
    document.getElementById('IdMenu').value = opcion.IdMenu;
    document.getElementById('Nombre').value = opcion.Nombre;
    document.getElementById('Pagina').value = opcion.Pagina;
    document.getElementById('OrdenMenu').value = opcion.OrdenMenu;
    
    document.getElementById('btnEliminarTop').classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formOpcion').reset();
    document.getElementById('IdOpcion').value = '';
    document.getElementById('btnEliminarTop').classList.add('d-none');
}

async function guardarOpcion() {
    const id = document.getElementById('IdOpcion').value;
    const datos = { 
        IdMenu: parseInt(document.getElementById('IdMenu').value),
        Nombre: document.getElementById('Nombre').value.trim(),
        Pagina: document.getElementById('Pagina').value.trim(),
        OrdenMenu: parseInt(document.getElementById('OrdenMenu').value)
    };
    
    if (!datos.IdMenu || !datos.Nombre || !datos.Pagina || !datos.OrdenMenu) {
        return alert("Completa todos los campos obligatorios.");
    }
    
    if (id) datos.UsuarioModificacion = usuarioActual.id;
    else datos.UsuarioCreacion = usuarioActual.id;

    const url = id ? `/catalogos/opciones/${id}` : '/catalogos/opciones';
    const metodo = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(datos)
        });
        if (response.ok) { limpiarFormulario(); cargarOpciones(); } 
        else { const result = await response.json(); alert(result.mensaje || 'Error al guardar'); }
    } catch (error) { console.error(error); }
}

async function eliminarDesdeFormulario() {
    const id = document.getElementById('IdOpcion').value;
    if (!id || !confirm('¿Eliminar esta opción?')) return;
    try {
        const response = await fetch(`/catalogos/opciones/${id}`, { 
            method: 'DELETE', headers: obtenerCabecerasSeguridad() 
        });
        if (response.ok) { limpiarFormulario(); cargarOpciones(); } 
        else { const result = await response.json(); alert(result.mensaje || 'Error al eliminar'); }
    } catch (error) { console.error(error); }
}

function obtenerCabecerasSeguridad() { return { 'Content-Type': 'application/json', 'x-role-id': usuarioActual.idRole }; }
function exportarExcel() { /* Lógica de exportar idéntica a los demás catálogos */ }