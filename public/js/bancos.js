let usuarioActual = null;
let idEdicionActual = null;

document.addEventListener('DOMContentLoaded', () => {
    usuarioActual = aplicarPermisos('Bancos');
    if (!usuarioActual) return;

    cargarBancos();

    document.getElementById('btnCrear').addEventListener('click', guardarBanco);
    document.getElementById('btnActualizar').addEventListener('click', guardarBanco);
    document.getElementById('btnEliminarTop').addEventListener('click', () => eliminarBanco());
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);

    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

async function cargarBancos() {
    try {
        const response = await fetch('/catalogos/bancos', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al consultar bancos');
        const datos = await response.json();
        dibujarTabla(datos);
    } catch (error) {
        console.error(error);
    }
}

function dibujarTabla(datos) {
    const tbody = document.getElementById('tablaBancosBody');
    tbody.innerHTML = '';

    datos.forEach(item => {
        const nombreBanco = item.Nombre.replace(/'/g, "\\'");
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.IdBanco}</td>
            <td class="fw-bold">${item.Nombre}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                    onclick="cargarParaEdicion(${item.IdBanco}, '${nombreBanco}')">Editar</button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                    onclick="eliminarBanco(${item.IdBanco})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    aplicarPermisos('Bancos');
}

window.cargarParaEdicion = function(id, nombre) {
    idEdicionActual = id;
    document.getElementById('Nombre').value = nombre;

    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formBanco').reset();
    idEdicionActual = null;

    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarBanco() {
    const nombre = document.getElementById('Nombre').value.trim();

    if (!nombre) {
        return alert('Por favor, ingresa el nombre del banco.');
    }

    const accion = idEdicionActual ? 'actualizar' : 'crear';
    if (!confirm(`¿Estás seguro de que deseas ${accion} este banco?`)) return;

    const data = { Nombre: nombre };

    if (idEdicionActual) data.UsuarioModificacion = usuarioActual.id;
    else data.UsuarioCreacion = usuarioActual.id;

    const url = idEdicionActual ? `/catalogos/bancos/${idEdicionActual}` : '/catalogos/bancos';
    const metodo = idEdicionActual ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`¡Banco ${idEdicionActual ? 'actualizado' : 'creado'} exitosamente!`);
            limpiarFormulario();
            cargarBancos();
        } else {
            alert(result.mensaje || 'Error al procesar la solicitud');
        }
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al comunicarse con el servidor.');
    }
}

async function eliminarBanco(idParam) {
    const idEliminar = idParam || idEdicionActual;

    if (!idEliminar || !confirm('¿Estás seguro de eliminar este banco? Esta acción no se puede deshacer.')) return;

    try {
        const response = await fetch(`/catalogos/bancos/${idEliminar}`, {
            method: 'DELETE',
            headers: obtenerCabecerasSeguridad()
        });

        const result = await response.json();

        if (response.ok) {
            alert('¡Banco eliminado exitosamente!');
            limpiarFormulario();
            cargarBancos();
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
    const tabla = document.querySelector('#tablaBancos');
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
    enlace.download = 'Bancos.csv';
    enlace.click();
}
