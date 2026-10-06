let usuarioActual = null;

document.addEventListener('DOMContentLoaded', () => {
    // ¡REVISA ESTE NOMBRE! Debe coincidir exactamente con el de tu BD
    usuarioActual = aplicarPermisos('Modulos'); 
    if (!usuarioActual) return;

    cargarModulos();

    document.getElementById('btnCrear').addEventListener('click', guardarModulo);
    document.getElementById('btnActualizar').addEventListener('click', guardarModulo);
    document.getElementById('btnEliminarTop').addEventListener('click', eliminarDesdeFormulario);
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
    
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

async function cargarModulos() {
    try {
        const response = await fetch('/catalogos/modulos', {
            method: 'GET',
            headers: obtenerCabecerasSeguridad()
        });
        if (!response.ok) throw new Error('Error al obtener los módulos');
        const modulos = await response.json();
        dibujarTabla(modulos);
    } catch (error) {
        console.error("Error:", error);
        alert('Hubo un problema al cargar la información.');
    }
}

function dibujarTabla(modulos) {
    const tbody = document.getElementById('tablaModulosBody');
    tbody.innerHTML = '';

    modulos.forEach(modulo => {
        const moduloJSON = JSON.stringify(modulo).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${modulo.IdModulo}</td>
            <td class="fw-bold">${modulo.Nombre}</td>
            <td><span class="badge bg-secondary">${modulo.OrdenMenu}</span></td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                    onclick="cargarParaEdicion('${moduloJSON}')">
                    Editar
                </button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                    onclick="eliminarDesdeFormulario(${modulo.IdModulo})">
                    Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    aplicarPermisos('Modulos');
}

window.cargarParaEdicion = function(moduloString) {
    const modulo = JSON.parse(moduloString);
    document.getElementById('IdModulo').value = modulo.IdModulo;
    document.getElementById('Nombre').value = modulo.Nombre;
    document.getElementById('OrdenMenu').value = modulo.OrdenMenu;
    
    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formModulo').reset();
    document.getElementById('IdModulo').value = '';
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarModulo() {
    const id = document.getElementById('IdModulo').value;
    const nombre = document.getElementById('Nombre').value.trim();
    const orden = document.getElementById('OrdenMenu').value;

    if (!nombre || !orden) return alert("Por favor, ingresa el nombre y el orden del módulo.");

    const datos = { Nombre: nombre, OrdenMenu: parseInt(orden) };
    if (id) datos.UsuarioModificacion = usuarioActual.id;
    else datos.UsuarioCreacion = usuarioActual.id;

    const url = id ? `/catalogos/modulos/${id}` : '/catalogos/modulos';
    const metodo = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(datos)
        });

        if (response.ok) {
            limpiarFormulario();
            cargarModulos();
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
    const id = idParam || document.getElementById('IdModulo').value;
    if (!id || !confirm('¿Estás seguro de eliminar este módulo?')) return;

    try {
        const response = await fetch(`/catalogos/modulos/${id}`, { 
            method: 'DELETE', 
            headers: obtenerCabecerasSeguridad() 
        });
        
        if (response.ok) {
            limpiarFormulario();
            cargarModulos();
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
    const tabla = document.querySelector('#tablaModulos');
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
    enlace.download = 'Modulos.csv';
    enlace.click();
}