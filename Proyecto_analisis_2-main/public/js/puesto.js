let usuarioActual = null;
let idEdicionActual = null;

document.addEventListener('DOMContentLoaded', async () => {
    usuarioActual = aplicarPermisos('Puestos'); 
    if (!usuarioActual) return;

    await cargarCombosDepartamento();
    cargarPuestos();

    document.getElementById('btnCrear').addEventListener('click', guardarPuesto);
    document.getElementById('btnActualizar').addEventListener('click', guardarPuesto);
    document.getElementById('btnEliminarTop').addEventListener('click', () => eliminarPuesto());
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);

    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

async function cargarCombosDepartamento() {
    try {
        const response = await fetch('/catalogos/departamentos', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al cargar la lista de departamentos');
        
        const listaDepartamentos = await response.json();
        const cboDepartamento = document.getElementById('IdDepartamento');

        cboDepartamento.innerHTML = '<option value="">-- Seleccione un Departamento --</option>';

        listaDepartamentos.forEach(dep => {
            const option = new Option(dep.Nombre, dep.IdDepartamento);
            cboDepartamento.add(option);
        });
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar los departamentos.');
    }
}

async function cargarPuestos() {
    try {
        const response = await fetch('/catalogos/puestos', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al consultar puestos');
        const datos = await response.json();
        dibujarTabla(datos);
    } catch (error) { console.error(error); }
}

function dibujarTabla(datos) {
    const tbody = document.getElementById('tablaPuestosBody');
    tbody.innerHTML = '';

    datos.forEach(item => {
        const nombrePuesto = item.Nombre.replace(/'/g, "\\'");
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.IdPuesto}</td>
            <td class="fw-bold">${item.Nombre}</td>
            <td><span class="badge bg-secondary text-white">${item.NombreDepartamento}</span></td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                    onclick="cargarParaEdicion(${item.IdPuesto}, '${nombrePuesto}', ${item.IdDepartamento})">Editar</button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                    onclick="eliminarPuesto(${item.IdPuesto})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    aplicarPermisos('Puestos');
}

window.cargarParaEdicion = function(id, nombre, idDepartamento) {
    idEdicionActual = id;
    document.getElementById('Nombre').value = nombre;
    document.getElementById('IdDepartamento').value = idDepartamento;
    
    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formPuesto').reset();
    idEdicionActual = null;
    
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarPuesto() {
    const nombre = document.getElementById('Nombre').value.trim();
    const idDepartamento = document.getElementById('IdDepartamento').value;

    if (!nombre || !idDepartamento) {
        return alert('Por favor, completa todos los campos requeridos (Nombre y Departamento).');
    }

    const accion = idEdicionActual ? 'actualizar' : 'crear';
    if (!confirm(`¿Estás seguro de que deseas ${accion} este puesto?`)) return;

    const data = { Nombre: nombre, IdDepartamento: idDepartamento };

    if (idEdicionActual) data.UsuarioModificacion = usuarioActual.id;
    else data.UsuarioCreacion = usuarioActual.id;

    const url = idEdicionActual ? `/catalogos/puestos/${idEdicionActual}` : '/catalogos/puestos';
    const metodo = idEdicionActual ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`¡Puesto ${idEdicionActual ? 'actualizado' : 'creado'} exitosamente!`);
            limpiarFormulario();
            cargarPuestos();
        } else {
            alert(result.mensaje || 'Error al procesar la solicitud');
        }
    } catch (error) { 
        console.error(error); 
        alert('Ocurrió un error al comunicarse con el servidor.');
    }
}

async function eliminarPuesto(idParam) {
    const idEliminar = idParam || idEdicionActual;

    if (!idEliminar || !confirm('¿Estás seguro de eliminar este puesto? Esta acción no se puede deshacer.')) return;

    try {
        const response = await fetch(`/catalogos/puestos/${idEliminar}`, {
            method: 'DELETE',
            headers: obtenerCabecerasSeguridad()
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('¡Puesto eliminado exitosamente!');
            limpiarFormulario();
            cargarPuestos();
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
    const tabla = document.querySelector('#tablaPuestos');
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
    enlace.download = 'Puestos.csv';
    enlace.click();
}