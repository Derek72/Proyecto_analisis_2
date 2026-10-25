let usuarioActual = null;

document.addEventListener('DOMContentLoaded', () => {
    
    usuarioActual = aplicarPermisos('Generos'); 
    if (!usuarioActual) return;

    cargarGeneros();

    document.getElementById('btnCrear').addEventListener('click', guardarGenero);
    document.getElementById('btnActualizar').addEventListener('click', guardarGenero);
    document.getElementById('btnEliminarTop').addEventListener('click', eliminarDesdeFormulario);
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
    
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

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
        
        const generoJSON = JSON.stringify(genero).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${genero.IdGenero}</td>
            <td class="fw-bold">${genero.Nombre}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                    onclick="cargarParaEdicion('${generoJSON}')">
                    Editar
                </button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                    onclick="eliminarDesdeFormulario(${genero.IdGenero})">
                    Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    aplicarPermisos('Generos');
}

window.cargarParaEdicion = function(generoString) {
    const genero = JSON.parse(generoString);
    
    document.getElementById('IdGenero').value = genero.IdGenero;
    document.getElementById('Nombre').value = genero.Nombre;
    
    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formGenero').reset();
    document.getElementById('IdGenero').value = '';
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarGenero() {
    const idGenero = document.getElementById('IdGenero').value;
    const nombre = document.getElementById('Nombre').value.trim();

    if (!nombre) {
        return alert("Por favor, ingresa el nombre del género.");
    }

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

async function eliminarDesdeFormulario(idParam) {
    const id = idParam || document.getElementById('IdGenero').value;
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
