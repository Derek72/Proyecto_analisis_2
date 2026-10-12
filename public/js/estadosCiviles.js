let usuarioActual = null;

document.addEventListener('DOMContentLoaded', () => {
    // Validamos permisos con el módulo de seguridad
    usuarioActual = aplicarPermisos('Estados Civiles'); 
    if (!usuarioActual) return;

    cargarEstadosCiviles();

    // Eventos de botones
    document.getElementById('btnCrear').addEventListener('click', guardarEstadoCivil);
    document.getElementById('btnActualizar').addEventListener('click', guardarEstadoCivil);
    document.getElementById('btnEliminarTop').addEventListener('click', eliminarDesdeFormulario);
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
    
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

// --- OBTENER Y DIBUJAR TABLA ---
async function cargarEstadosCiviles() {
    try {
        const response = await fetch('/catalogos/estados-civiles', {
            method: 'GET',
            headers: obtenerCabecerasSeguridad()
        });

        if (!response.ok) throw new Error('Error al obtener estados civiles');

        const estadosCiviles = await response.json();
        dibujarTabla(estadosCiviles);

    } catch (error) {
        console.error("Error al cargar estados civiles:", error);
        alert('Hubo un problema al cargar la información.');
    }
}

function dibujarTabla(estadosCiviles) {
    const tbody = document.getElementById('tablaEstadosCivilesBody');
    tbody.innerHTML = '';

    estadosCiviles.forEach(item => {
        // Escapamos los datos por seguridad
        const itemJSON = JSON.stringify(item).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.IdEstadoCivil}</td>
            <td class="fw-bold">${item.Nombre}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                    onclick="cargarParaEdicion('${itemJSON}')">
                    Editar
                </button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                    onclick="eliminarDesdeFormulario(${item.IdEstadoCivil})">
                    Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Re-evaluar permisos para los botones inyectados en la tabla
    aplicarPermisos('Estados Civiles');
}

// --- SUBIR DATOS AL FORMULARIO ---
window.cargarParaEdicion = function(itemString) {
    const item = JSON.parse(itemString);
    
    document.getElementById('IdEstadoCivil').value = item.IdEstadoCivil;
    document.getElementById('Nombre').value = item.Nombre;
    
    // Mostramos el botón de eliminar
    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    
    // Subimos la pantalla suavemente
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- LIMPIAR FORMULARIO ---
function limpiarFormulario() {
    document.getElementById('formEstadoCivil').reset();
    document.getElementById('IdEstadoCivil').value = '';
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

// --- GUARDAR (Alta / Cambio) ---
async function guardarEstadoCivil() {
    const idEstadoCivil = document.getElementById('IdEstadoCivil').value;
    const nombre = document.getElementById('Nombre').value.trim();

    if (!nombre) {
        return alert("Por favor, ingresa el nombre del estado civil.");
    }

    const estadoCivilData = {
        Nombre: nombre
    };

    if (idEstadoCivil) estadoCivilData.UsuarioModificacion = usuarioActual.id;
    else estadoCivilData.UsuarioCreacion = usuarioActual.id;

    const url = idEstadoCivil ? `/catalogos/estados-civiles/${idEstadoCivil}` : '/catalogos/estados-civiles';
    const metodo = idEstadoCivil ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(estadoCivilData)
        });

        if (response.ok) {
            limpiarFormulario();
            cargarEstadosCiviles();
        } else {
            const result = await response.json();
            alert(result.mensaje || 'Error al guardar el estado civil');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor.');
    }
}

// --- ELIMINAR (Baja) ---
async function eliminarDesdeFormulario(idParam) {
    const id = idParam || document.getElementById('IdEstadoCivil').value;
    if (!id || !confirm('¿Estás seguro de eliminar este estado civil?')) return;

    try {
        const response = await fetch(`/catalogos/estados-civiles/${id}`, { 
            method: 'DELETE', 
            headers: obtenerCabecerasSeguridad() 
        });
        
        if (response.ok) {
            limpiarFormulario();
            cargarEstadosCiviles();
        } else {
            const result = await response.json();
            alert(result.mensaje || 'Error al eliminar');
        }
    } catch (error) { console.error(error); }
}

// --- UTILIDADES ---
function obtenerCabecerasSeguridad() {
    return {
        'Content-Type': 'application/json',
        'x-role-id': usuarioActual.idRole
    };
}

function exportarExcel() {
    const tabla = document.querySelector('#tablaEstadosCiviles');
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
    enlace.download = 'EstadosCiviles.csv';
    enlace.click();
}