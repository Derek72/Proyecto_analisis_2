let usuarioActual = null;

document.addEventListener('DOMContentLoaded', () => {
    
    usuarioActual = aplicarPermisos('Estatus Usuario'); 
    if (!usuarioActual) return;

    cargarEstatus();

    document.getElementById('btnCrear').addEventListener('click', guardarEstatus);
    document.getElementById('btnActualizar').addEventListener('click', guardarEstatus);
    document.getElementById('btnEliminarTop').addEventListener('click', eliminarDesdeFormulario);
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
    
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

async function cargarEstatus() {
    try {
        const response = await fetch('/catalogos/estatus-usuarios', {
            method: 'GET',
            headers: obtenerCabecerasSeguridad()
        });

        if (!response.ok) throw new Error('Error al obtener los estatus');

        const estatusList = await response.json();
        dibujarTabla(estatusList);
    } catch (error) {
        console.error("Error:", error);
        alert('Hubo un problema al cargar la información.');
    }
}

function dibujarTabla(estatusList) {
    const tbody = document.getElementById('tablaEstatusBody');
    tbody.innerHTML = '';

    estatusList.forEach(estatus => {
        const estatusJSON = JSON.stringify(estatus).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${estatus.IdStatusUsuario}</td>
            <td class="fw-bold">${estatus.Nombre}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                    onclick="cargarParaEdicion('${estatusJSON}')">
                    Editar
                </button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                    onclick="eliminarDesdeFormulario(${estatus.IdStatusUsuario})">
                    Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    aplicarPermisos('Estatus Usuario');
}

window.cargarParaEdicion = function(estatusString) {
    const estatus = JSON.parse(estatusString);
    
    document.getElementById('IdStatusUsuario').value = estatus.IdStatusUsuario;
    document.getElementById('Nombre').value = estatus.Nombre;
    
    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formEstatus').reset();
    document.getElementById('IdStatusUsuario').value = '';
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarEstatus() {
    const id = document.getElementById('IdStatusUsuario').value;
    const nombre = document.getElementById('Nombre').value.trim();

    if (!nombre) return alert("Por favor, ingresa el nombre del estatus.");

    const datos = { Nombre: nombre };

    if (id) datos.UsuarioModificacion = usuarioActual.id;
    else datos.UsuarioCreacion = usuarioActual.id;

    const url = id ? `/catalogos/estatus-usuarios/${id}` : '/catalogos/estatus-usuarios';
    const metodo = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(datos)
        });

        if (response.ok) {
            limpiarFormulario();
            cargarEstatus();
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
    const id = idParam || document.getElementById('IdStatusUsuario').value;
    if (!id || !confirm('¿Estás seguro de eliminar este estatus?')) return;

    try {
        const response = await fetch(`/catalogos/estatus-usuarios/${id}`, { 
            method: 'DELETE', 
            headers: obtenerCabecerasSeguridad() 
        });
        
        if (response.ok) {
            limpiarFormulario();
            cargarEstatus();
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
    const tabla = document.querySelector('#tablaEstatus');
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
    enlace.download = 'Estatus_Usuarios.csv';
    enlace.click();
}