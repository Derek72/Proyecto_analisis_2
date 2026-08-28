let usuarioActual = null;

document.addEventListener('DOMContentLoaded', () => {
    // Validamos permisos con el módulo de seguridad
    usuarioActual = aplicarPermisos('Generos'); 
    if (!usuarioActual) return;

    cargarGeneros();

    // Eventos de botones
    document.getElementById('btnGuardar').addEventListener('click', guardarGenero);
    document.getElementById('btnEliminarTop').addEventListener('click', eliminarDesdeFormulario);
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
    
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

// --- OBTENER Y DIBUJAR TABLA ---
async function cargarGeneros() {
    try {
        const response = await fetch('/catalogos/generos', {
            method: 'GET',
            headers: obtenerCabecerasSeguridad()
        });

        if (!response.ok) throw new Error('Error al obtener géneros');

        const generos = await response.json();
        dibujarTabla(generos);

    } catch (error) {
        console.error("Error al cargar géneros:", error);
        alert('Hubo un problema al cargar la información.');
    }
}

function dibujarTabla(generos) {
    const tbody = document.getElementById('tablaGenerosBody');
    tbody.innerHTML = '';

    generos.forEach(genero => {
        // Escapamos los datos por seguridad
        const generoJSON = JSON.stringify(genero).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${genero.IdGenero}</td>
            <td class="fw-bold">${genero.Nombre}</td>
            <td>
                <button class="btn btn-sm btn-warning" data-permiso="Cambio" 
                    onclick="cargarParaEdicion('${generoJSON}')">
                    Seleccionar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Re-evaluar permisos para los botones inyectados en la tabla
    aplicarPermisos('Generos');
}

// --- SUBIR DATOS AL FORMULARIO ---
window.cargarParaEdicion = function(generoString) {
    const genero = JSON.parse(generoString);
    
    document.getElementById('IdGenero').value = genero.IdGenero;
    document.getElementById('Nombre').value = genero.Nombre;
    
    // Mostramos el botón de eliminar
    document.getElementById('btnEliminarTop').classList.remove('d-none');
    
    // Subimos la pantalla suavemente
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- LIMPIAR FORMULARIO ---
function limpiarFormulario() {
    document.getElementById('formGenero').reset();
    document.getElementById('IdGenero').value = '';
    document.getElementById('btnEliminarTop').classList.add('d-none');
}

// --- GUARDAR (Alta / Cambio) ---
async function guardarGenero() {
    const idGenero = document.getElementById('IdGenero').value;
    // CAMBIO AQUÍ: Usamos id="Nombre"
    const nombre = document.getElementById('Nombre').value.trim();

    if (!nombre) {
        return alert("Por favor, ingresa el nombre del género.");
    }

    // CAMBIO AQUÍ: La propiedad ahora es Nombre
    const generoData = {
        Nombre: nombre
    };

    if (idGenero) generoData.UsuarioModificacion = usuarioActual.id;
    else generoData.UsuarioCreacion = usuarioActual.id;

    const url = idGenero ? `/catalogos/generos/${idGenero}` : '/catalogos/generos';
    const metodo = idGenero ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(generoData)
        });

        if (response.ok) {
            limpiarFormulario();
            cargarGeneros();
        } else {
            const result = await response.json();
            alert(result.mensaje || 'Error al guardar el género');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor.');
    }
}

// --- SUBIR DATOS AL FORMULARIO ---
window.cargarParaEdicion = function(generoString) {
    const genero = JSON.parse(generoString);
    
    document.getElementById('IdGenero').value = genero.IdGenero;
    // CAMBIO AQUÍ: .Nombre
    document.getElementById('Nombre').value = genero.Nombre;
    
    document.getElementById('btnEliminarTop').classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- ELIMINAR (Baja) ---
async function eliminarDesdeFormulario() {
    const id = document.getElementById('IdGenero').value;
    if (!id || !confirm('¿Estás seguro de eliminar este género?')) return;

    try {
        const response = await fetch(`/catalogos/generos/${id}`, { 
            method: 'DELETE', 
            headers: obtenerCabecerasSeguridad() 
        });
        
        if (response.ok) {
            limpiarFormulario();
            cargarGeneros();
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
    const tabla = document.querySelector('#tablaGeneros');
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
    enlace.download = 'Generos.csv';
    enlace.click();
}