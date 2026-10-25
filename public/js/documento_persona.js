let usuarioActual = null;
let idPersonaEdicionActual = null;
let idTipoDocumentoEdicionActual = null;
let documentos = [];
let documentosFiltrados = [];
let columnaOrdenActual = 'NombrePersona';
let direccionOrdenActual = 'asc';

document.addEventListener('DOMContentLoaded', async () => {
    usuarioActual = aplicarPermisos('Documentos de Personas');
    if (!usuarioActual) return;

    await cargarCombosPersona();
    await cargarCombosTipoDocumento();
    cargarDocumentos();

    document.getElementById('btnCrear').addEventListener('click', guardarDocumento);
    document.getElementById('btnActualizar').addEventListener('click', guardarDocumento);
    document.getElementById('btnEliminarTop').addEventListener('click', () => eliminarDocumento());
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);

    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);

    document.getElementById('filtroTexto').addEventListener('input', aplicarFiltros);
    document.getElementById('filtroTipoDoc').addEventListener('change', aplicarFiltros);
    document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);

    configurarEncabezadosOrdenables('tablaDocumentos', (columna, direccion) => {
        columnaOrdenActual = columna;
        direccionOrdenActual = direccion;
        documentosFiltrados = ordenarLista(documentosFiltrados, columnaOrdenActual, direccionOrdenActual, 'IdPersona');
        dibujarTabla(documentosFiltrados);
    }, { columna: columnaOrdenActual, direccion: direccionOrdenActual });
});

async function cargarCombosPersona() {
    try {
        const response = await fetch('/catalogos/personas', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al cargar la lista de personas');

        const lista = await response.json();
        const cbo = document.getElementById('IdPersona');
        cbo.innerHTML = '<option value="">-- Seleccione una Persona --</option>';
        lista.forEach(p => cbo.add(new Option(`${p.Nombre} ${p.Apellido}`, p.IdPersona)));
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar las personas.');
    }
}

async function cargarCombosTipoDocumento() {
    try {
        const response = await fetch('/catalogos/tipos-documentos', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al cargar los tipos de documento');

        const lista = await response.json();
        const cbo = document.getElementById('IdTipoDocumento');
        cbo.innerHTML = '<option value="">-- Seleccione un Tipo de Documento --</option>';
        lista.forEach(td => cbo.add(new Option(td.Nombre, td.IdTipoDocumento)));

        const fCbo = document.getElementById('filtroTipoDoc');
        if (fCbo) {
            fCbo.innerHTML = '<option value="">Todos los tipos</option>';
            lista.forEach(td => fCbo.add(new Option(td.Nombre, td.IdTipoDocumento)));
        }
    } catch (error) {
        console.error(error);
        alert('No se pudieron cargar los tipos de documento.');
    }
}

async function cargarDocumentos() {
    try {
        const response = await fetch('/catalogos/documentos-persona', { headers: obtenerCabecerasSeguridad() });
        if (!response.ok) throw new Error('Error al consultar documentos de personas');
        documentos = await response.json();
        aplicarFiltros();
    } catch (error) { console.error(error); }
}

function aplicarFiltros() {
    const texto = (document.getElementById('filtroTexto')?.value || '').toLowerCase().trim();
    const idTipo = document.getElementById('filtroTipoDoc')?.value;

    documentosFiltrados = documentos.filter(item => {
        if (texto) {
            const nomPers = `${item.NombrePersona || ''} ${item.ApellidoPersona || ''}`.toLowerCase();
            const noDoc = String(item.NoDocumento || '').toLowerCase();
            if (!nomPers.includes(texto) && !noDoc.includes(texto)) {
                return false;
            }
        }

        if (idTipo && String(item.IdTipoDocumento) !== String(idTipo)) return false;

        return true;
    });

    documentosFiltrados = ordenarLista(documentosFiltrados, columnaOrdenActual, direccionOrdenActual, 'IdPersona');
    dibujarTabla(documentosFiltrados);
}

function limpiarFiltros() {
    document.getElementById('filtroTexto').value = '';
    document.getElementById('filtroTipoDoc').value = '';
    aplicarFiltros();
}

function dibujarTabla(datos) {
    const tbody = document.getElementById('tablaDocumentosBody');
    tbody.innerHTML = '';

    const badge = document.getElementById('badgeContadorDocs');
    if (badge) {
        badge.textContent = `Mostrando ${datos.length} de ${documentos.length} registros`;
    }

    if (!datos || datos.length === 0) {
        const trVacio = document.createElement('tr');
        trVacio.innerHTML = `<td colspan="4" class="text-muted p-4"><i class="bi bi-info-circle me-1"></i>No se encontraron registros que coincidan con los criterios de búsqueda.</td>`;
        tbody.appendChild(trVacio);
        return;
    }

    datos.forEach(item => {
        const noDoc = (item.NoDocumento || '').replace(/'/g, "\\'");
        const nombrePersona = `${item.NombrePersona} ${item.ApellidoPersona}`.replace(/'/g, "\\'");
        const nombreTipo = item.NombreTipoDocumento.replace(/'/g, "\\'");

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.NombrePersona} ${item.ApellidoPersona}</td>
            <td><span class="badge bg-info text-dark">${item.NombreTipoDocumento}</span></td>
            <td class="fw-bold">${item.NoDocumento}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                    onclick="cargarParaEdicion(${item.IdPersona}, ${item.IdTipoDocumento}, '${nombrePersona}', '${nombreTipo}', '${noDoc}')">Editar</button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                    onclick="eliminarDocumento(${item.IdPersona}, ${item.IdTipoDocumento})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    aplicarPermisos('Documentos de Personas');
}

window.cargarParaEdicion = function(idPersona, idTipoDocumento, nombrePersona, nombreTipo, noDocumento) {
    idPersonaEdicionActual = idPersona;
    idTipoDocumentoEdicionActual = idTipoDocumento;

    document.getElementById('IdPersona').value = idPersona;
    document.getElementById('IdTipoDocumento').value = idTipoDocumento;
    document.getElementById('NoDocumento').value = noDocumento;

    document.getElementById('IdPersona').disabled = true;
    document.getElementById('IdTipoDocumento').disabled = true;
    document.getElementById('avisoEdicion').style.display = 'block';

    document.getElementById('btnEliminarTop').classList.remove('d-none');
    mostrarBotonSegunModo(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formDocumentoPersona').reset();
    idPersonaEdicionActual = null;
    idTipoDocumentoEdicionActual = null;

    document.getElementById('IdPersona').disabled = false;
    document.getElementById('IdTipoDocumento').disabled = false;
    document.getElementById('avisoEdicion').style.display = 'none';

    document.getElementById('btnEliminarTop').classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarDocumento() {
    const idPersona = document.getElementById('IdPersona').value;
    const idTipoDocumento = document.getElementById('IdTipoDocumento').value;
    const noDocumento = document.getElementById('NoDocumento').value.trim();

    if (!idPersona || !idTipoDocumento || !noDocumento) {
        return alert('Por favor, completa todos los campos requeridos (Persona, Tipo de Documento y Número de Documento).');
    }

    const estaEditando = idPersonaEdicionActual && idTipoDocumentoEdicionActual;
    const accion = estaEditando ? 'actualizar' : 'crear';
    if (!confirm(`¿Estás seguro de que deseas ${accion} este documento?`)) return;

    const data = { NoDocumento: noDocumento };

    if (estaEditando) {
        data.UsuarioModificacion = usuarioActual.id;
    } else {
        data.IdPersona = idPersona;
        data.IdTipoDocumento = idTipoDocumento;
        data.UsuarioCreacion = usuarioActual.id;
    }

    const url = estaEditando
        ? `/catalogos/documentos-persona/${idPersonaEdicionActual}/${idTipoDocumentoEdicionActual}`
        : '/catalogos/documentos-persona';
    const metodo = estaEditando ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`¡Documento ${estaEditando ? 'actualizado' : 'creado'} exitosamente!`);
            limpiarFormulario();
            cargarDocumentos();
        } else {
            alert(result.mensaje || 'Error al procesar la solicitud');
        }
    } catch (error) {
        console.error(error);
        alert('Ocurrió un error al comunicarse con el servidor.');
    }
}

async function eliminarDocumento(idPersonaParam, idTipoDocumentoParam) {
    const idPersona = idPersonaParam || idPersonaEdicionActual;
    const idTipoDocumento = idTipoDocumentoParam || idTipoDocumentoEdicionActual;

    if (!idPersona || !idTipoDocumento || !confirm('¿Estás seguro de eliminar este documento? Esta acción no se puede deshacer.')) return;

    try {
        const response = await fetch(`/catalogos/documentos-persona/${idPersona}/${idTipoDocumento}`, {
            method: 'DELETE',
            headers: obtenerCabecerasSeguridad()
        });

        const result = await response.json();

        if (response.ok) {
            alert('¡Documento eliminado exitosamente!');
            limpiarFormulario();
            cargarDocumentos();
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
    const tabla = document.querySelector('#tablaDocumentos');
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
    enlace.download = 'DocumentosDePersonas.csv';
    enlace.click();
}
