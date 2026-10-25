let usuarioActual = null;
let idEdicionActual = null;

document.addEventListener('DOMContentLoaded', () => {
    
    usuarioActual = aplicarPermisos('Tipos de Documentos'); 
    if (!usuarioActual) return;

    cargarTipos();

    document.getElementById('btnCrear').addEventListener('click', guardarTipo);
    document.getElementById('btnActualizar').addEventListener('click', guardarTipo);
    document.getElementById('btnEliminarTop').addEventListener('click', () => eliminarTipo());
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);

    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

async function cargarTipos() {
    try {
        const response = await fetch('/catalogos/tipos-documentos', {
            headers: obtenerCabecerasSeguridad()
        });
        if (!response.ok) throw new Error('Error al consultar tipos de documentos');
        const datos = await response.json();
        dibujarTabla(datos);
    } catch (error) {
        console.error(error);
    }
}

function dibujarTabla(datos) {
    const tbody = document.getElementById('tablaTiposBody');
    tbody.innerHTML = '';

    datos.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.IdTipoDocumento}</td>
            <td class="fw-bold">${item.Nombre}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                    onclick="cargarParaEdicion(${item.IdTipoDocumento}, '${item.Nombre}')">Editar</button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                    onclick="eliminarTipo(${item.IdTipoDocumento})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    aplicarPermisos('Tipos de Documentos');
}

window.cargarParaEdicion = function(id, nombre) {
    idEdicionActual = id;
    document.getElementById('Nombre').value = nombre;
    
    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formTipoDocumento').reset();
    idEdicionActual = null;
    
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarTipo() {
    const nombre = document.getElementById('Nombre').value.trim();

    if (!nombre) {
        return alert('Por favor, ingresa el nombre del tipo de documento.');
    }

    const accion = idEdicionActual ? 'actualizar' : 'crear';
    if (!confirm(`¿Estás seguro de que deseas ${accion} este tipo de documento?`)) {
        return; 
    }

    const data = { Nombre: nombre };

    if (idEdicionActual) data.UsuarioModificacion = usuarioActual.id;
    else data.UsuarioCreacion = usuarioActual.id;

    const url = idEdicionActual ? `/catalogos/tipos-documentos/${idEdicionActual}` : '/catalogos/tipos-documentos';
    const metodo = idEdicionActual ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            
            alert(`¡Tipo de documento ${idEdicionActual ? 'actualizado' : 'creado'} exitosamente!`);
            limpiarFormulario();
            cargarTipos();
        } else {
            alert(result.mensaje || 'Error al procesar la solicitud');
        }
    } catch (error) { 
        console.error(error); 
        alert('Ocurrió un error al comunicarse con el servidor.');
    }
}

async function eliminarTipo(idParam) {
    const idEliminar = idParam || idEdicionActual;

    if (!idEliminar || !confirm('¿Estás seguro de eliminar este tipo de documento?')) {
        return;
    }

    try {
        const response = await fetch(`/catalogos/tipos-documentos/${idEliminar}`, {
            method: 'DELETE',
            headers: obtenerCabecerasSeguridad()
        });
        
        const result = await response.json();
        
        if (response.ok) {
            
            alert('¡Tipo de documento eliminado exitosamente!');
            limpiarFormulario();
            cargarTipos();
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
    const tabla = document.querySelector('#tablaTipos');
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
    enlace.download = 'TiposDeDocumentos.csv';
    enlace.click();
}