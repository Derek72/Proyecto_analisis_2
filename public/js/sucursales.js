let usuarioActual;

document.addEventListener('DOMContentLoaded', () => {
    usuarioActual = aplicarPermisos('Sucursales');
    if (!usuarioActual) return;

    cargarEmpresasCombo();
    cargarSucursales();

    // Eventos de botones
    document.getElementById('btnCrear').addEventListener('click', guardarSucursal);
    document.getElementById('btnActualizar').addEventListener('click', guardarSucursal);
    document.getElementById('btnEliminarTop').addEventListener('click', eliminarDesdeFormulario);
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
    
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

// --- CARGAR EMPRESAS EN EL COMBOBOX ---
async function cargarEmpresasCombo() {
    try {
        const res = await fetch('/catalogos/empresas', { headers: obtenerCabecerasSeguridad() });
        const empresas = await res.json();
        const combo = document.getElementById('idEmpresa');
        
        empresas.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.IdEmpresa;
            option.textContent = emp.Nombre;
            combo.appendChild(option);
        });
    } catch (error) { console.error("Error al cargar empresas:", error); }
}

// --- CARGAR TABLA SUCURSALES ---
async function cargarSucursales() {
    try {
        const res = await fetch('/catalogos/sucursales', { headers: obtenerCabecerasSeguridad() });
        const sucursales = await res.json();
        const tbody = document.querySelector('#tablaSucursales tbody');
        tbody.innerHTML = '';

        sucursales.forEach(suc => {
            tbody.innerHTML += `
                <tr>
                    <td>${suc.IdSucursal}</td>
                    <td>${suc.Nombre}</td>
                    <td>${suc.Direccion}</td>
                    <td>${suc.NombreEmpresa}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                            onclick="cargarParaEdicion(${suc.IdSucursal}, '${suc.Nombre}', '${suc.Direccion}', ${suc.IdEmpresa})">
                            Editar
                        </button>
                        <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                            onclick="eliminarDesdeFormulario(${suc.IdSucursal})">
                            Eliminar
                        </button>
                    </td>
                </tr>
            `;
        });
        aplicarPermisos('Sucursales'); // Re-evaluar permisos por los botones inyectados
    } catch (error) { console.error("Error cargando sucursales:", error); }
}

// --- SUBIR DATOS AL FORMULARIO ---
window.cargarParaEdicion = function(id, nombre, direccion, idEmpresa) {
    document.getElementById('idSucursal').value = id;
    document.getElementById('nombre').value = nombre;
    document.getElementById('direccion').value = direccion;
    document.getElementById('idEmpresa').value = idEmpresa;
    
    // Mostramos el botón de eliminar porque ya hay un registro seleccionado
    const btnEliminar = document.getElementById('btnEliminarTop');
    btnEliminar.classList.remove('d-none');
    mostrarBotonSegunModo(true);
    
    // Desplazar la pantalla hacia arriba si la tabla es muy larga
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- LIMPIAR FORMULARIO ---
function limpiarFormulario() {
    document.getElementById('formSucursal').reset();
    document.getElementById('idSucursal').value = '';
    // Ocultar botón eliminar
    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

// --- GUARDAR (ALTA O CAMBIO) ---
async function guardarSucursal() {
    const id = document.getElementById('idSucursal').value;
    const datos = {
        Nombre: document.getElementById('nombre').value,
        Direccion: document.getElementById('direccion').value,
        IdEmpresa: document.getElementById('idEmpresa').value
    };

    if (!datos.Nombre || !datos.Direccion || !datos.IdEmpresa) {
        return alert("Todos los campos son obligatorios.");
    }

    if (id) datos.UsuarioModificacion = usuarioActual.id;
    else datos.UsuarioCreacion = usuarioActual.id;

    const url = id ? `/catalogos/sucursales/${id}` : '/catalogos/sucursales';
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(datos)
        });

        if (response.ok) {
            limpiarFormulario();
            cargarSucursales();
        } else {
            alert("Error al guardar la sucursal.");
        }
    } catch (error) { console.error(error); }
}

// --- ELIMINAR DESDE EL FORMULARIO ---
async function eliminarDesdeFormulario(idParam) {
    const id = idParam || document.getElementById('idSucursal').value;
    if (!id || !confirm('¿Estás seguro de eliminar esta sucursal?')) return;

    try {
        const response = await fetch(`/catalogos/sucursales/${id}`, { 
            method: 'DELETE', 
            headers: obtenerCabecerasSeguridad() 
        });
        
        if (response.ok) {
            limpiarFormulario();
            cargarSucursales();
        }
    } catch (error) { console.error(error); }
}

// --- EXPORTAR EXCEL ---
function exportarExcel() {
    const tabla = document.querySelector('table');
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
    enlace.download = 'Sucursales.csv';
    enlace.click();
}