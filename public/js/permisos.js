let usuarioActual = null;
let matrizActual = [];       
let filasModificadas = {};   

const PERMISOS_COLUMNAS = ['Consultar', 'Alta', 'Baja', 'Cambio', 'Imprimir', 'Exportar'];

document.addEventListener('DOMContentLoaded', async () => {
    
    usuarioActual = aplicarPermisos('Asignar Opciones a un Role');
    if (!usuarioActual) return;

    await Promise.all([cargarComboRoles(), cargarComboModulos()]);

    document.getElementById('IdRole').addEventListener('change', intentarCargarMatriz);
    document.getElementById('IdModulo').addEventListener('change', intentarCargarMatriz);
    document.getElementById('btnGuardar').addEventListener('click', guardarMatriz);
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
});

async function cargarComboRoles() {
    try {
        const response = await fetch('/seguridad/roles', {
            method: 'GET',
            headers: obtenerCabecerasSeguridad()
        });
        if (!response.ok) throw new Error('Error al cargar roles');
        const roles = await response.json();

        const select = document.getElementById('IdRole');
        select.innerHTML = '<option value="">Seleccione un rol...</option>';
        roles.forEach(rol => {
            select.innerHTML += `<option value="${rol.IdRole}">${rol.Nombre}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
        alert('No se pudieron cargar los roles.');
    }
}

async function cargarComboModulos() {
    try {
        const response = await fetch('/seguridad/modulos', {
            method: 'GET',
            headers: obtenerCabecerasSeguridad()
        });
        if (!response.ok) throw new Error('Error al cargar módulos');
        const modulos = await response.json();

        const select = document.getElementById('IdModulo');
        select.innerHTML = '<option value="">Seleccione un módulo...</option>';
        modulos.forEach(modulo => {
            select.innerHTML += `<option value="${modulo.IdModulo}">${modulo.Nombre}</option>`;
        });
    } catch (error) {
        console.error('Error:', error);
        alert('No se pudieron cargar los módulos.');
    }
}

function intentarCargarMatriz() {
    const idRole = document.getElementById('IdRole').value;
    const idModulo = document.getElementById('IdModulo').value;

    if (!idRole || !idModulo) {
        matrizActual = [];
        filasModificadas = {};
        document.getElementById('mensajeEstado').textContent = 'Selecciona un Rol y un Módulo para ver sus opciones.';
        document.getElementById('tablaPermisosBody').innerHTML =
            '<tr><td colspan="7" class="text-muted py-4">No hay datos que mostrar todavía.</td></tr>';
        actualizarEstadoBotonGuardar();
        return;
    }

    cargarMatriz(idRole, idModulo);
}

async function cargarMatriz(idRole, idModulo) {
    const tbody = document.getElementById('tablaPermisosBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-muted py-4">Cargando opciones...</td></tr>';

    try {
        const response = await fetch(`/seguridad/permisos/${idRole}/${idModulo}`, {
            method: 'GET',
            headers: obtenerCabecerasSeguridad()
        });
        if (!response.ok) throw new Error('Error al obtener la matriz de permisos');

        matrizActual = await response.json();
        filasModificadas = {};
        dibujarTabla(matrizActual);
        actualizarEstadoBotonGuardar();

        const nombreModulo = document.getElementById('IdModulo').selectedOptions[0].text;
        const nombreRole = document.getElementById('IdRole').selectedOptions[0].text;
        document.getElementById('mensajeEstado').textContent =
            `Mostrando ${matrizActual.length} opción(es) del módulo "${nombreModulo}" para el rol "${nombreRole}".`;
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-danger py-4">Ocurrió un error al cargar las opciones.</td></tr>';
    }
}

function dibujarTabla(filas) {
    const tbody = document.getElementById('tablaPermisosBody');
    tbody.innerHTML = '';

    if (!filas.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-muted py-4">Este módulo no tiene opciones registradas.</td></tr>';
        return;
    }

    filas.forEach(fila => {
        const tr = document.createElement('tr');
        tr.id = `fila-opcion-${fila.IdOpcion}`;

        let celdasCheckbox = '';
        PERMISOS_COLUMNAS.forEach(permiso => {
            const marcado = Number(fila[permiso]) === 1 ? 'checked' : '';
            celdasCheckbox += `
                <td>
                    <input type="checkbox" class="form-check-input" ${marcado}
                        data-id-opcion="${fila.IdOpcion}" data-permiso="${permiso}">
                </td>
            `;
        });

        tr.innerHTML = `
            <td class="text-start">
                <span class="fw-bold">${fila.NombreOpcion}</span>
                <span class="badge bg-secondary ms-1">${fila.NombreMenu}</span>
            </td>
            ${celdasCheckbox}
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        chk.addEventListener('change', manejarCambioCheckbox);
    });
}

function manejarCambioCheckbox(evento) {
    const chk = evento.target;
    const idOpcion = chk.getAttribute('data-id-opcion');
    const permiso = chk.getAttribute('data-permiso');

    const filaOriginal = matrizActual.find(f => String(f.IdOpcion) === String(idOpcion));
    if (!filaOriginal) return;

    if (!filasModificadas[idOpcion]) {
        
        filasModificadas[idOpcion] = {
            IdOpcion: filaOriginal.IdOpcion,
            Consultar: Number(filaOriginal.Consultar),
            Alta: Number(filaOriginal.Alta),
            Baja: Number(filaOriginal.Baja),
            Cambio: Number(filaOriginal.Cambio),
            Imprimir: Number(filaOriginal.Imprimir),
            Exportar: Number(filaOriginal.Exportar)
        };
    }

    filasModificadas[idOpcion][permiso] = chk.checked ? 1 : 0;

    document.getElementById(`fila-opcion-${idOpcion}`).classList.add('fila-modificada');
    actualizarEstadoBotonGuardar();
}

function actualizarEstadoBotonGuardar() {
    const btnGuardar = document.getElementById('btnGuardar');
    const hayPendientes = Object.keys(filasModificadas).length > 0;
    
    if (btnGuardar.classList.contains('d-none')) return;
    btnGuardar.disabled = !hayPendientes;
}

async function guardarMatriz() {
    const idRole = document.getElementById('IdRole').value;
    const cambios = Object.values(filasModificadas);

    if (!idRole || cambios.length === 0) return;

    const permisos = cambios.map(cambio => ({
        IdRole: idRole,
        IdOpcion: cambio.IdOpcion,
        Consultar: cambio.Consultar,
        Alta: cambio.Alta,
        Baja: cambio.Baja,
        Cambio: cambio.Cambio,
        Imprimir: cambio.Imprimir,
        Exportar: cambio.Exportar,
        Usuario: usuarioActual.id
    }));

    const btnGuardar = document.getElementById('btnGuardar');
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="bi bi-hourglass-split"></i> Guardando...';

    try {
        const response = await fetch('/seguridad/permisos', {
            method: 'POST',
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(permisos)
        });

        if (response.ok) {
            const idModulo = document.getElementById('IdModulo').value;
            await cargarMatriz(idRole, idModulo); 
            document.getElementById('mensajeEstado').textContent = 'Permisos guardados correctamente.';
        } else {
            const result = await response.json();
            alert(result.mensaje || 'Error al guardar los permisos.');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor.');
    } finally {
        btnGuardar.innerHTML = '<i class="bi bi-save"></i> Guardar';
        actualizarEstadoBotonGuardar();
    }
}

function obtenerCabecerasSeguridad() {
    return { 'Content-Type': 'application/json', 'x-role-id': usuarioActual.idRole };
}

function exportarExcel() {
    const tabla = document.querySelector('#tablaPermisos');
    let csv = [];

    for (let i = 0; i < tabla.rows.length; i++) {
        let fila = [];
        let columnas = tabla.rows[i].querySelectorAll('td, th');

        columnas.forEach(columna => {
            const checkbox = columna.querySelector('input[type="checkbox"]');
            
            const valor = checkbox ? (checkbox.checked ? 'Sí' : 'No') : columna.innerText;
            fila.push('"' + valor.replace(/"/g, '""') + '"');
        });

        csv.push(fila.join(','));
    }

    const blob = new Blob(['\uFEFF' + csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const enlace = document.createElement('a');
    enlace.href = window.URL.createObjectURL(blob);
    enlace.download = 'Permisos.csv';
    enlace.click();
}
