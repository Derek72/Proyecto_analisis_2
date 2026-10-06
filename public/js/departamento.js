let usuarioActual = null;
let idEdicionActual = null;

document.addEventListener('DOMContentLoaded', async () => {
    usuarioActual = aplicarPermisos('Departamentos'); 
    if (!usuarioActual) return;

    await cargarCombosEmpresa();
    cargarDepartamentos();

    document.getElementById('btnCrear').addEventListener('click', guardarDepartamento);
    document.getElementById('btnActualizar').addEventListener('click', guardarDepartamento);
    document.getElementById('btnEliminarTop').addEventListener('click', () => eliminarDepartamento());
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);

    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

async function cargarCombosEmpresa() {
    try {
        // Asegúrate de que esta ruta exista en tu backend para devolver las empresas
        const response = await fetch('/catalogos/empresas', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al cargar la lista de empresas');
        
        const listaEmpresas = await response.json();
        const cboEmpresa = document.getElementById('IdEmpresa');

        cboEmpresa.innerHTML = '<option value="">-- Seleccione una Empresa --</option>';

        listaEmpresas.forEach(empresa => {
            const option = new Option(empresa.Nombre, empresa.IdEmpresa);
            cboEmpresa.add(option);
        });
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar las empresas. Verifica que el endpoint /catalogos/empresas exista.');
    }
}

async function cargarDepartamentos() {
    try {
        const response = await fetch('/catalogos/departamentos', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al consultar departamentos');
        const datos = await response.json();
        dibujarTabla(datos);
    } catch (error) { console.error(error); }
}

function dibujarTabla(datos) {
    const tbody = document.getElementById('tablaDepartamentosBody');
    tbody.innerHTML = '';

    datos.forEach(item => {
        // Escapamos comillas simples por si el nombre de la empresa o departamento las tiene
        const nombreDep = item.Nombre.replace(/'/g, "\\'");
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.IdDepartamento}</td>
            <td class="fw-bold">${item.Nombre}</td>
            <td><span class="badge bg-info text-dark">${item.NombreEmpresa}</span></td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                    onclick="cargarParaEdicion(${item.IdDepartamento}, '${nombreDep}', ${item.IdEmpresa})">Editar</button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                    onclick="eliminarDepartamento(${item.IdDepartamento})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    aplicarPermisos('Departamentos');
}

window.cargarParaEdicion = function(id, nombre, idEmpresa) {
    idEdicionActual = id;
    document.getElementById('Nombre').value = nombre;
    document.getElementById('IdEmpresa').value = idEmpresa;
    
    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formDepartamento').reset();
    idEdicionActual = null;
    
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarDepartamento() {
    const nombre = document.getElementById('Nombre').value.trim();
    const idEmpresa = document.getElementById('IdEmpresa').value;

    if (!nombre || !idEmpresa) {
        return alert('Por favor, completa todos los campos requeridos (Nombre y Empresa).');
    }

    const accion = idEdicionActual ? 'actualizar' : 'crear';
    if (!confirm(`¿Estás seguro de que deseas ${accion} este departamento?`)) return;

    const data = { Nombre: nombre, IdEmpresa: idEmpresa };

    if (idEdicionActual) data.UsuarioModificacion = usuarioActual.id;
    else data.UsuarioCreacion = usuarioActual.id;

    const url = idEdicionActual ? `/catalogos/departamentos/${idEdicionActual}` : '/catalogos/departamentos';
    const metodo = idEdicionActual ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`¡Departamento ${idEdicionActual ? 'actualizado' : 'creado'} exitosamente!`);
            limpiarFormulario();
            cargarDepartamentos();
        } else {
            alert(result.mensaje || 'Error al procesar la solicitud');
        }
    } catch (error) { 
        console.error(error); 
        alert('Ocurrió un error al comunicarse con el servidor.');
    }
}

async function eliminarDepartamento(idParam) {
    const idEliminar = idParam || idEdicionActual;

    if (!idEliminar || !confirm('¿Estás seguro de eliminar este departamento? Esta acción no se puede deshacer.')) return;

    try {
        const response = await fetch(`/catalogos/departamentos/${idEliminar}`, {
            method: 'DELETE',
            headers: obtenerCabecerasSeguridad()
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('¡Departamento eliminado exitosamente!');
            limpiarFormulario();
            cargarDepartamentos();
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
    const tabla = document.querySelector('#tablaDepartamentos');
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
    enlace.download = 'Departamentos.csv';
    enlace.click();
}