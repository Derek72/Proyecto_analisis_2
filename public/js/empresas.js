let usuarioActual = null;

document.addEventListener('DOMContentLoaded', () => {
    usuarioActual = aplicarPermisos('Empresas');
    if (!usuarioActual) return;

    cargarEmpresas();

    document.getElementById('btnCrear').addEventListener('click', guardarEmpresa);
    document.getElementById('btnActualizar').addEventListener('click', guardarEmpresa);
    document.getElementById('btnEliminarTop').addEventListener('click', eliminarDesdeFormulario);
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
    
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

async function cargarEmpresas() {
    try {
        const response = await fetch('/catalogos/empresas', {
            method: 'GET',
            headers: obtenerCabecerasSeguridad()
        });

        if (!response.ok) throw new Error('Error al obtener empresas');

        const empresas = await response.json();
        dibujarTabla(empresas);

    } catch (error) {
        console.error("Fallo al cargar:", error);
        alert('Hubo un problema al cargar la información. Revisa la consola.');
    }
}

function dibujarTabla(empresas) {
    const tbody = document.getElementById('tablaEmpresasBody');
    tbody.innerHTML = '';

    empresas.forEach(empresa => {
        
        const empresaJSON = JSON.stringify(empresa).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${empresa.IdEmpresa}</td>
            <td class="fw-bold">${empresa.Nombre}</td>
            <td>${empresa.Nit}</td>
            <td>${empresa.Direccion}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                    onclick="cargarParaEdicion('${empresaJSON}')">
                    Editar
                </button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                    onclick="eliminarDesdeFormulario(${empresa.IdEmpresa})">
                    Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    aplicarPermisos('Empresas');
}

window.cargarParaEdicion = function(empresaString) {
    const empresa = JSON.parse(empresaString);
    
    document.getElementById('IdEmpresa').value = empresa.IdEmpresa;
    document.getElementById('Nombre').value = empresa.Nombre;
    document.getElementById('Nit').value = empresa.Nit;
    document.getElementById('Direccion').value = empresa.Direccion;
    
    document.getElementById('PasswordCantidadMayusculas').value = empresa.PasswordCantidadMayusculas;
    document.getElementById('PasswordCantidadMinusculas').value = empresa.PasswordCantidadMinusculas;
    document.getElementById('PasswordCantidadNumeros').value = empresa.PasswordCantidadNumeros;
    document.getElementById('PasswordCantidadCaracteresEspeciales').value = empresa.PasswordCantidadCaracteresEspeciales;
    document.getElementById('PasswordLargo').value = empresa.PasswordLargo;
    document.getElementById('PasswordIntentosAntesDeBloquear').value = empresa.PasswordIntentosAntesDeBloquear;
    document.getElementById('PasswordCantidadPreguntasValidar').value = empresa.PasswordCantidadPreguntasValidar;
    document.getElementById('PasswordCantidadCaducidadDias').value = empresa.PasswordCantidadCaducidadDias;

    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formEmpresa').reset();
    document.getElementById('IdEmpresa').value = '';
    
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarEmpresa() {
    const idEmpresa = document.getElementById('IdEmpresa').value;
    
    const empresaData = {
        Nombre: document.getElementById('Nombre').value,
        Nit: document.getElementById('Nit').value,
        Direccion: document.getElementById('Direccion').value,
        PasswordCantidadMayusculas: parseInt(document.getElementById('PasswordCantidadMayusculas').value) || 0,
        PasswordCantidadMinusculas: parseInt(document.getElementById('PasswordCantidadMinusculas').value) || 0,
        PasswordCantidadNumeros: parseInt(document.getElementById('PasswordCantidadNumeros').value) || 0,
        PasswordCantidadCaracteresEspeciales: parseInt(document.getElementById('PasswordCantidadCaracteresEspeciales').value) || 0,
        PasswordLargo: parseInt(document.getElementById('PasswordLargo').value) || 1,
        PasswordIntentosAntesDeBloquear: parseInt(document.getElementById('PasswordIntentosAntesDeBloquear').value) || 3,
        PasswordCantidadPreguntasValidar: parseInt(document.getElementById('PasswordCantidadPreguntasValidar').value) || 0,
        PasswordCantidadCaducidadDias: parseInt(document.getElementById('PasswordCantidadCaducidadDias').value) || 0
    };

    if (!empresaData.Nombre || !empresaData.Nit || !empresaData.Direccion) {
        return alert("Por favor, llena la información general de la empresa.");
    }

    if (idEmpresa) empresaData.UsuarioModificacion = usuarioActual.id;
    else empresaData.UsuarioCreacion = usuarioActual.id;

    const url = idEmpresa ? `/catalogos/empresas/${idEmpresa}` : '/catalogos/empresas';
    const metodo = idEmpresa ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(empresaData)
        });

        if (response.ok) {
            limpiarFormulario();
            cargarEmpresas();
        } else {
            const result = await response.json();
            alert(result.mensaje || 'Error al guardar la empresa');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor.');
    }
}

async function eliminarDesdeFormulario(idParam) {
    const id = idParam || document.getElementById('IdEmpresa').value;
    if (!id || !confirm('¿Estás seguro de eliminar esta empresa?')) return;

    try {
        const response = await fetch(`/catalogos/empresas/${id}`, { 
            method: 'DELETE', 
            headers: obtenerCabecerasSeguridad() 
        });
        
        if (response.ok) {
            limpiarFormulario();
            cargarEmpresas();
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
    const tabla = document.querySelector('#tablaEmpresas');
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
    enlace.download = 'Empresas.csv';
    enlace.click();
}