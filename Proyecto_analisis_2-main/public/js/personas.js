let usuarioActual = null;
let idEdicionActual = null;

document.addEventListener('DOMContentLoaded', async () => {
    usuarioActual = aplicarPermisos('Personas');
    if (!usuarioActual) return;

    await cargarCombosGenero();
    await cargarCombosEstadoCivil();
    cargarPersonas();

    document.getElementById('btnCrear').addEventListener('click', guardarPersona);
    document.getElementById('btnActualizar').addEventListener('click', guardarPersona);
    document.getElementById('btnEliminarTop').addEventListener('click', () => eliminarPersona());
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);

    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

async function cargarCombosGenero() {
    try {
        const response = await fetch('/catalogos/generos', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al cargar la lista de géneros');

        const lista = await response.json();
        const cbo = document.getElementById('IdGenero');
        cbo.innerHTML = '<option value="">-- Seleccione un Género --</option>';
        lista.forEach(g => cbo.add(new Option(g.Nombre, g.IdGenero)));
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar los géneros.');
    }
}

async function cargarCombosEstadoCivil() {
    try {
        const response = await fetch('/catalogos/estados-civiles', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al cargar la lista de estados civiles');

        const lista = await response.json();
        const cbo = document.getElementById('IdEstadoCivil');
        cbo.innerHTML = '<option value="">-- Seleccione un Estado Civil --</option>';
        lista.forEach(ec => cbo.add(new Option(ec.Nombre, ec.IdEstadoCivil)));
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar los estados civiles.');
    }
}

async function cargarPersonas() {
    try {
        const response = await fetch('/catalogos/personas', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al consultar personas');
        const datos = await response.json();
        dibujarTabla(datos);
    } catch (error) { console.error(error); }
}

function dibujarTabla(datos) {
    const tbody = document.getElementById('tablaPersonasBody');
    tbody.innerHTML = '';

    datos.forEach(item => {
        const dataString = JSON.stringify(item).replace(/"/g, '&quot;');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.IdPersona}</td>
            <td class="fw-bold">${item.Nombre}</td>
            <td>${item.Apellido}</td>
            <td><span class="badge bg-info text-dark">${item.NombreGenero}</span></td>
            <td><span class="badge bg-secondary">${item.NombreEstadoCivil}</span></td>
            <td>${item.Telefono || ''}</td>
            <td>${item.CorreoElectronico || ''}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                    onclick='cargarParaEdicion(${dataString})'>Editar</button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                    onclick="eliminarPersona(${item.IdPersona})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    aplicarPermisos('Personas');
}

window.cargarParaEdicion = function(item) {
    idEdicionActual = item.IdPersona;
    document.getElementById('Nombre').value = item.Nombre;
    document.getElementById('Apellido').value = item.Apellido;
    // La fecha viene como ISO (p.ej. 1990-05-10T00:00:00.000Z); el input date solo necesita la parte YYYY-MM-DD
    document.getElementById('FechaNacimiento').value = item.FechaNacimiento ? item.FechaNacimiento.substring(0, 10) : '';
    document.getElementById('IdGenero').value = item.IdGenero;
    document.getElementById('IdEstadoCivil').value = item.IdEstadoCivil;
    document.getElementById('Telefono').value = item.Telefono || '';
    document.getElementById('Direccion').value = item.Direccion || '';
    document.getElementById('CorreoElectronico').value = item.CorreoElectronico || '';

    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formPersona').reset();
    idEdicionActual = null;

    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarPersona() {
    if (document.getElementById('Telefono').value.length > 30) {
        return alert('El teléfono no puede exceder 30 caracteres.');
    }

    const data = {
        Nombre: document.getElementById('Nombre').value.trim(),
        Apellido: document.getElementById('Apellido').value.trim(),
        FechaNacimiento: document.getElementById('FechaNacimiento').value,
        IdGenero: document.getElementById('IdGenero').value,
        IdEstadoCivil: document.getElementById('IdEstadoCivil').value,
        Telefono: document.getElementById('Telefono').value.trim(),
        Direccion: document.getElementById('Direccion').value.trim(),
        CorreoElectronico: document.getElementById('CorreoElectronico').value.trim()
    };

    if (!data.Nombre || !data.Apellido || !data.FechaNacimiento || !data.IdGenero || !data.IdEstadoCivil) {
        return alert('Por favor, completa todos los campos requeridos (Nombre, Apellido, Fecha de Nacimiento, Género y Estado Civil).');
    }

    const accion = idEdicionActual ? 'actualizar' : 'crear';
    if (!confirm(`¿Estás seguro de que deseas ${accion} esta persona?`)) return;

    if (idEdicionActual) data.UsuarioModificacion = usuarioActual.id;
    else data.UsuarioCreacion = usuarioActual.id;

    const url = idEdicionActual ? `/catalogos/personas/${idEdicionActual}` : '/catalogos/personas';
    const metodo = idEdicionActual ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`¡Persona ${idEdicionActual ? 'actualizada' : 'creada'} exitosamente!`);
            limpiarFormulario();
            cargarPersonas();
        } else {
            alert(result.mensaje || 'Error al procesar la solicitud');
        }
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al comunicarse con el servidor.');
    }
}

async function eliminarPersona(idParam) {
    const idEliminar = idParam || idEdicionActual;

    if (!idEliminar || !confirm('¿Estás seguro de eliminar esta persona? Esta acción no se puede deshacer.')) return;

    try {
        const response = await fetch(`/catalogos/personas/${idEliminar}`, {
            method: 'DELETE',
            headers: obtenerCabecerasSeguridad()
        });

        const result = await response.json();

        if (response.ok) {
            alert('¡Persona eliminada exitosamente!');
            limpiarFormulario();
            cargarPersonas();
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
    const tabla = document.querySelector('#tablaPersonas');
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
    enlace.download = 'Personas.csv';
    enlace.click();
}
