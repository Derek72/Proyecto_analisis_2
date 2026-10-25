let usuarioActual = null;
let esEdicion = false;
let usuarios = [];
let usuariosFiltrados = [];
let columnaOrdenActual = 'IdUsuario';
let direccionOrdenActual = 'asc';

document.addEventListener('DOMContentLoaded', async () => {
    usuarioActual = aplicarPermisos('Usuarios'); 
    if (!usuarioActual) return;

    await cargarMultiplesCombos();
    await cargarUsuarios();

    document.getElementById('IdEmpresa').addEventListener('change', async (e) => {
        await cargarSucursalesPorEmpresa(e.target.value);
    });

    document.getElementById('btnCrear').addEventListener('click', guardarUsuario);
    document.getElementById('btnActualizar').addEventListener('click', guardarUsuario);
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
    document.getElementById('btnEliminarTop').addEventListener('click', () => {
        const idUsuario = document.getElementById('IdUsuario').value;
        if (idUsuario) eliminarUsuario(idUsuario);
    });

    document.getElementById('filtroTexto').addEventListener('input', aplicarFiltros);
    document.getElementById('filtroRole').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroStatus').addEventListener('change', aplicarFiltros);
    document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);

    configurarEncabezadosOrdenables('tablaUsuarios', (columna, direccion) => {
        columnaOrdenActual = columna;
        direccionOrdenActual = direccion;
        usuariosFiltrados = ordenarLista(usuariosFiltrados, columnaOrdenActual, direccionOrdenActual, 'IdUsuario');
        dibujarTabla(usuariosFiltrados);
    }, { columna: columnaOrdenActual, direccion: direccionOrdenActual });
});

async function cargarMultiplesCombos() {
    try {
        const headers = obtenerCabecerasSeguridad();

        const [resRoles, resGeneros, resEstatus, resEmpresas] = await Promise.all([
            fetch('/catalogos/roles', { headers }),
            fetch('/catalogos/generos', { headers }),
            fetch('/catalogos/estatus-usuarios', { headers }),
            fetch('/catalogos/empresas', { headers })
        ]);

        if (resRoles.ok) {
            const dataRoles = await resRoles.json();
            llenarSelect('IdRole', dataRoles, 'IdRole', 'Nombre');
            const fRole = document.getElementById('filtroRole');
            if (fRole) {
                fRole.innerHTML = '<option value="">Todos los roles</option>';
                dataRoles.forEach(r => fRole.add(new Option(r.Nombre, r.IdRole)));
            }
        }
        if (resGeneros.ok) llenarSelect('IdGenero', await resGeneros.json(), 'IdGenero', 'Nombre');
        if (resEstatus.ok) {
            const dataStatus = await resEstatus.json();
            llenarSelect('IdStatusUsuario', dataStatus, 'IdStatusUsuario', 'Nombre');
            const fStatus = document.getElementById('filtroStatus');
            if (fStatus) {
                fStatus.innerHTML = '<option value="">Todos los estatus</option>';
                dataStatus.forEach(s => fStatus.add(new Option(s.Nombre, s.IdStatusUsuario)));
            }
        }
        if (resEmpresas.ok) llenarSelect('IdEmpresa', await resEmpresas.json(), 'IdEmpresa', 'Nombre');

    } catch (error) {
        console.error('Error al cargar catálogos en los ComboBoxes:', error);
    }
}

function llenarSelect(elementId, datos, valueKey, textKey) {
    const select = document.getElementById(elementId);
    select.innerHTML = '<option value="">Seleccione una opción...</option>';
    datos.forEach(item => {
        select.innerHTML += `<option value="${item[valueKey]}">${item[textKey]}</option>`;
    });
}

async function cargarSucursalesPorEmpresa(idEmpresa, idSucursalSeleccionar = null) {
    const selectSucursal = document.getElementById('IdSucursal');
    
    if (!idEmpresa) {
        selectSucursal.innerHTML = '<option value="">Seleccione primero una empresa...</option>';
        selectSucursal.disabled = true;
        return;
    }
    
    try {
        const resp = await fetch(`/catalogos/sucursales/empresa/${idEmpresa}`, { headers: obtenerCabecerasSeguridad() });
        if (!resp.ok) throw new Error('Error al consultar sucursales');
        
        const sucursales = await resp.json();
        
        selectSucursal.innerHTML = '<option value="">Seleccione sucursal...</option>';
        sucursales.forEach(s => {
            selectSucursal.innerHTML += `<option value="${s.IdSucursal}">${s.Nombre}</option>`;
        });
        
        selectSucursal.disabled = false;

        if (idSucursalSeleccionar) {
            selectSucursal.value = idSucursalSeleccionar;
        }
    } catch (error) {
        console.error('Error al cargar sucursales:', error);
        selectSucursal.innerHTML = '<option value="">Error al cargar sucursales</option>';
        selectSucursal.disabled = true;
    }
}

async function cargarUsuarios() {
    try {
        const response = await fetch('/catalogos/usuarios', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('No se pudo obtener la lista de usuarios');

        usuarios = await response.json();
        aplicarFiltros();
    } catch (error) {
        console.error('Error al cargar la tabla de usuarios:', error);
    }
}

function aplicarFiltros() {
    const texto = (document.getElementById('filtroTexto')?.value || '').toLowerCase().trim();
    const idRol = document.getElementById('filtroRole')?.value;
    const idStatus = document.getElementById('filtroStatus')?.value;

    usuariosFiltrados = usuarios.filter(u => {
        if (texto) {
            const idStr = String(u.IdUsuario || '').toLowerCase();
            const nomStr = String(u.Nombre || '').toLowerCase();
            const apeStr = String(u.Apellido || '').toLowerCase();
            const corrStr = String(u.CorreoElectronico || '').toLowerCase();
            if (!idStr.includes(texto) && !nomStr.includes(texto) && !apeStr.includes(texto) && !corrStr.includes(texto)) {
                return false;
            }
        }

        if (idRol && String(u.IdRole) !== String(idRol)) return false;
        if (idStatus && String(u.IdStatusUsuario) !== String(idStatus)) return false;

        return true;
    });

    usuariosFiltrados = ordenarLista(usuariosFiltrados, columnaOrdenActual, direccionOrdenActual, 'IdUsuario');
    dibujarTabla(usuariosFiltrados);
}

function limpiarFiltros() {
    document.getElementById('filtroTexto').value = '';
    document.getElementById('filtroRole').value = '';
    document.getElementById('filtroStatus').value = '';
    aplicarFiltros();
}

function dibujarTabla(datos) {
    const tbody = document.getElementById('tablaUsuariosBody');
    tbody.innerHTML = '';

    const badge = document.getElementById('badgeContadorUsuarios');
    if (badge) {
        badge.textContent = `Mostrando ${datos.length} de ${usuarios.length} registros`;
    }

    if (!datos || datos.length === 0) {
        const trVacio = document.createElement('tr');
        trVacio.innerHTML = `<td colspan="7" class="text-muted p-4"><i class="bi bi-info-circle me-1"></i>No se encontraron registros que coincidan con los criterios de búsqueda.</td>`;
        tbody.appendChild(trVacio);
        return;
    }

    datos.forEach(u => {
        const tr = document.createElement('tr');
        const dataString = JSON.stringify(u).replace(/"/g, '&quot;');

        const btnEditar = tienePermiso('Cambio')
            ? `<button class="btn btn-sm btn-warning me-1" onclick="cargarParaEdicion('${dataString}')">Editar</button>`
            : '';
        const btnEliminar = tienePermiso('Baja')
            ? `<button class="btn btn-sm btn-danger" onclick="eliminarUsuario('${u.IdUsuario}')">Eliminar</button>`
            : '';

        const fechaNacEsp = typeof formatearFecha === 'function' ? formatearFecha(u.FechaNacimiento) : u.FechaNacimiento;
        const statusBadge = u.NombreStatus
            ? `<span class="badge ${u.NombreStatus.toLowerCase().includes('activo') ? 'bg-success' : 'bg-secondary'}">${u.NombreStatus}</span>`
            : '';

        tr.innerHTML = `
            <td><strong>${u.IdUsuario}</strong></td>
            <td>${u.Nombre} ${u.Apellido || ''}</td>
            <td>${fechaNacEsp || ''}</td>
            <td>${u.CorreoElectronico}</td>
            <td>${u.NombreRole || u.IdRole}</td>
            <td>${statusBadge}</td>
            <td>
                ${btnEditar}
                ${btnEliminar}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.cargarParaEdicion = async function(usuarioString) {
    const u = typeof usuarioString === 'string' ? JSON.parse(usuarioString) : usuarioString;
    esEdicion = true;

    const inputId = document.getElementById('IdUsuario');
    inputId.value = u.IdUsuario;
    inputId.readOnly = true;

    document.getElementById('Nombre').value = u.Nombre || '';
    document.getElementById('Apellido').value = u.Apellido || '';
    document.getElementById('FechaNacimiento').value = u.FechaNacimiento ? u.FechaNacimiento.split('T')[0] : '';
    document.getElementById('CorreoElectronico').value = u.CorreoElectronico || '';
    document.getElementById('TelefonoMovil').value = u.TelefonoMovil || '';
    document.getElementById('Password').value = ''; 
    document.getElementById('Fotografia').value = u.Fotografia || '';
    document.getElementById('Pregunta').value = u.Pregunta || '';
    document.getElementById('Respuesta').value = u.Respuesta || '';
    document.getElementById('IdRole').value = u.IdRole || '';
    document.getElementById('IdStatusUsuario').value = u.IdStatusUsuario || '';
    document.getElementById('IdGenero').value = u.IdGenero || '';

    if (u.IdEmpresa) {
        document.getElementById('IdEmpresa').value = u.IdEmpresa;
        await cargarSucursalesPorEmpresa(u.IdEmpresa, u.IdSucursal);
    }

    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

async function guardarUsuario() {
    const idUsuario = document.getElementById('IdUsuario').value.trim();
    
    if (!idUsuario) {
        alert('Por favor ingrese un ID de Usuario.');
        return;
    }

    const datos = {
        IdUsuario: idUsuario,
        Nombre: document.getElementById('Nombre').value.trim(),
        Apellido: document.getElementById('Apellido').value.trim(),
        FechaNacimiento: document.getElementById('FechaNacimiento').value,
        IdGenero: parseInt(document.getElementById('IdGenero').value),
        CorreoElectronico: document.getElementById('CorreoElectronico').value.trim(),
        TelefonoMovil: document.getElementById('TelefonoMovil').value.trim(),
        Pregunta: document.getElementById('Pregunta').value.trim(),
        Respuesta: document.getElementById('Respuesta').value.trim(),
        IdRole: parseInt(document.getElementById('IdRole').value),
        IdStatusUsuario: parseInt(document.getElementById('IdStatusUsuario').value),
        IdSucursal: parseInt(document.getElementById('IdSucursal').value),
        Fotografia: document.getElementById('Fotografia').value.trim()
    };

    const pass = document.getElementById('Password').value;
    if (pass) datos.Password = pass;

    if (esEdicion) {
        datos.UsuarioModificacion = usuarioActual.id || usuarioActual.IdUsuario;
    } else {
        if (!datos.Password) {
            alert('La contraseña es obligatoria para un nuevo usuario.');
            return;
        }
        datos.UsuarioCreacion = usuarioActual.id || usuarioActual.IdUsuario;
    }

    const url = esEdicion ? `/catalogos/usuarios/${idUsuario}` : '/catalogos/usuarios';
    const metodo = esEdicion ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(datos)
        });
        
        const resData = await response.json();

        if (response.ok) {
            alert(resData.mensaje || 'Operación realizada con éxito');
            limpiarFormulario();
            cargarUsuarios();
        } else {
            alert(resData.mensaje || 'Ocurrió un error al procesar la solicitud');
        }
    } catch (error) {
        console.error('Error al guardar usuario:', error);
        alert('Error de conexión al servidor.');
    }
}

async function eliminarUsuario(idUsuario) {
    if (!confirm(`¿Está seguro de que desea eliminar al usuario "${idUsuario}"?`)) return;

    try {
        const response = await fetch(`/catalogos/usuarios/${idUsuario}`, {
            method: 'DELETE',
            headers: obtenerCabecerasSeguridad()
        });

        const resData = await response.json();

        if (response.ok) {
            alert(resData.mensaje || 'Usuario eliminado');
            limpiarFormulario();
            cargarUsuarios();
        } else {
            alert(resData.mensaje || 'No se pudo eliminar el usuario');
        }
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        alert('Error al conectar con el servidor.');
    }
}

function limpiarFormulario() {
    esEdicion = false;
    document.getElementById('formUsuario').reset();
    
    const inputId = document.getElementById('IdUsuario');
    inputId.readOnly = false;
    
    const selectSucursal = document.getElementById('IdSucursal');
    selectSucursal.innerHTML = '<option value="">Seleccione primero una empresa...</option>';
    selectSucursal.disabled = true;

    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

function obtenerCabecerasSeguridad() {
    return {
        'Content-Type': 'application/json',
        'x-role-id': usuarioActual.idRole || usuarioActual.IdRole
    };
}