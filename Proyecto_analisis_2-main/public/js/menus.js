let usuarioActual = null;

document.addEventListener('DOMContentLoaded', async () => {
    // ¡REVISA ESTE NOMBRE! Asegúrate de que coincida con el nombre en tu tabla "opcion" (ej. 'Menus' o 'Menús')
    usuarioActual = aplicarPermisos('Menus'); 
    if (!usuarioActual) return;

    // 1. Primero cargamos los módulos para que el ComboBox esté listo
    await cargarComboModulos();
    
    // 2. Luego cargamos los menús para llenar la tabla
    cargarMenus();

    document.getElementById('btnCrear').addEventListener('click', guardarMenu);
    document.getElementById('btnActualizar').addEventListener('click', guardarMenu);
    
    // Validamos si existen los botones extra en el HTML (Eliminar, Imprimir, Exportar)
    const btnEliminar = document.getElementById('btnEliminarTop');
    if(btnEliminar) btnEliminar.addEventListener('click', eliminarDesdeFormulario);
    
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
    
    const btnImprimir = document.getElementById('btnImprimir');
    if(btnImprimir) btnImprimir.addEventListener('click', () => window.print());
    
    const btnExportar = document.getElementById('btnExportar');
    if(btnExportar) btnExportar.addEventListener('click', exportarExcel);
});

// --- FUNCIÓN PARA LLENAR EL COMBOBOX ---
async function cargarComboModulos() {
    try {
        const response = await fetch('/catalogos/modulos', { 
            method: 'GET',
            headers: obtenerCabecerasSeguridad() 
        });
        if (!response.ok) throw new Error('Error al cargar módulos');
        
        const modulos = await response.json();
        const select = document.getElementById('IdModulo');
        
        // Limpiamos y ponemos una opción por defecto
        select.innerHTML = '<option value="">Seleccione un módulo...</option>';
        
        // Llenamos el select con los módulos de la base de datos
        modulos.forEach(mod => {
            select.innerHTML += `<option value="${mod.IdModulo}">${mod.Nombre}</option>`;
        });
    } catch (error) { 
        console.error('Error:', error);
        alert('Hubo un problema al cargar la lista de módulos.');
    }
}

// --- FUNCIONES CRUD DE MENÚS ---
async function cargarMenus() {
    try {
        const response = await fetch('/catalogos/menus', {
            method: 'GET',
            headers: obtenerCabecerasSeguridad()
        });
        if (!response.ok) throw new Error('Error al obtener los menús');
        const menus = await response.json();
        dibujarTabla(menus);
    } catch (error) {
        console.error("Error:", error);
        alert('Hubo un problema al cargar la información de los menús.');
    }
}

function dibujarTabla(menus) {
    const tbody = document.getElementById('tablaMenusBody');
    if(!tbody) return; // Por si el HTML no tiene la tabla completa aún
    
    tbody.innerHTML = '';

    menus.forEach(menu => {
        const menuJSON = JSON.stringify(menu).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        const tr = document.createElement('tr');
        
        // Usamos OrdenMenu para mostrarlo, asumiendo que tu columna se llama igual que en Módulos
        tr.innerHTML = `
            <td>${menu.IdMenu}</td>
            <td><span class="badge bg-info text-dark">Módulo ${menu.IdModulo}</span></td>
            <td class="fw-bold">${menu.Nombre}</td>
            <td><span class="badge bg-secondary">${menu.OrdenMenu}</span></td>
            <td>
                <button class="btn btn-sm btn-warning me-1" data-permiso="Cambio" 
                    onclick="cargarParaEdicion('${menuJSON}')">
                    Editar
                </button>
                <button class="btn btn-sm btn-danger" data-permiso="Baja" 
                    onclick="eliminarDesdeFormulario(${menu.IdMenu})">
                    Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    aplicarPermisos('Menus');
}

window.cargarParaEdicion = function(menuString) {
    const menu = JSON.parse(menuString);
    document.getElementById('IdMenu').value = menu.IdMenu;
    document.getElementById('IdModulo').value = menu.IdModulo;
    document.getElementById('Nombre').value = menu.Nombre;
    
    // Asignamos OrdenMenu al input que tiene id="OrdenMenu"
    document.getElementById('OrdenMenu').value = menu.OrdenMenu;
    
    const btnEliminar = document.getElementById('btnEliminarTop');
    if(btnEliminar) btnEliminar.classList.remove('d-none');
    mostrarBotonSegunModo(true);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarFormulario() {
    document.getElementById('formMenu').reset();
    document.getElementById('IdMenu').value = '';
    
    const btnEliminar = document.getElementById('btnEliminarTop');
    if(btnEliminar) btnEliminar.classList.add('d-none');
    mostrarBotonSegunModo(false);
}

async function guardarMenu() {
    const id = document.getElementById('IdMenu').value;
    const idModulo = document.getElementById('IdModulo').value;
    const nombre = document.getElementById('Nombre').value.trim();
    const ordenMenu = document.getElementById('OrdenMenu').value;

    if (!idModulo || !nombre || !ordenMenu) {
        return alert("Por favor, completa todos los campos (Módulo, Nombre y Orden).");
    }

    // Le enviamos "Orden" al backend
    const datos = { 
        IdModulo: parseInt(idModulo),
        Nombre: nombre, 
        OrdenMenu: parseInt(ordenMenu) 
    };
    
    if (id) datos.UsuarioModificacion = usuarioActual.id;
    else datos.UsuarioCreacion = usuarioActual.id;

    const url = id ? `/catalogos/menus/${id}` : '/catalogos/menus';
    const metodo = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: obtenerCabecerasSeguridad(),
            body: JSON.stringify(datos)
        });

        if (response.ok) {
            limpiarFormulario();
            cargarMenus();
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
    const id = idParam || document.getElementById('IdMenu').value;
    if (!id || !confirm('¿Estás seguro de eliminar este menú?')) return;

    try {
        const response = await fetch(`/catalogos/menus/${id}`, { 
            method: 'DELETE', 
            headers: obtenerCabecerasSeguridad() 
        });
        
        if (response.ok) {
            limpiarFormulario();
            cargarMenus();
        } else {
            const result = await response.json();
            alert(result.mensaje || 'Error al eliminar');
        }
    } catch (error) { 
        console.error(error); 
    }
}

// --- FUNCIONALIDADES EXTRA ---
function obtenerCabecerasSeguridad() {
    return { 'Content-Type': 'application/json', 'x-role-id': usuarioActual.idRole };
}

function exportarExcel() {
    const tabla = document.querySelector('#tablaMenus');
    if(!tabla) return;
    
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
    enlace.download = 'Menus.csv';
    enlace.click();
}