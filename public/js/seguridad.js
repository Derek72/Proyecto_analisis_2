// /js/seguridad.js

// --- GUARD CONTRA BFCACHE ---
// Si el navegador restaura esta página desde su caché de historial (botón Atrás/Adelante)
// sin volver a cargarla de verdad, este listener revisa otra vez si sigue habiendo sesión.
// Se ejecuta automáticamente en TODA página que incluya este archivo.
window.addEventListener('pageshow', function () {
    if (!localStorage.getItem('usuario')) {
        window.top.location.replace('/');
    }
});

// --- PRIMERA FUNCIÓN ---
function aplicarPermisos(nombrePantalla) {
    const usuarioStr = localStorage.getItem('usuario');
    if (!usuarioStr) {
        window.top.location.href = '/'; // No está logueado
        return null;
    }

    const usuario = JSON.parse(usuarioStr);
    const permisosModulo = usuario.permisos.find(p => p.Opcion === nombrePantalla);

    // Si no tiene permisos para consultar, lo sacamos de la pantalla
    if (!permisosModulo || permisosModulo.Consultar === 0) {
        alert("No tienes permisos para ver esta pantalla.");
        // Usamos window.top porque estas páginas se cargan dentro del <iframe name="contentFrame">
        // del dashboard. Si usáramos window.location aquí, navegaríamos solo el iframe y
        // terminaríamos cargando dashboard.html (con su propio sidebar) DENTRO del iframe,
        // duplicando visualmente el menú.
        window.top.location.href = '/dashboard.html';
        return null;
    }

    // Buscamos todos los botones que requieran permiso y los evaluamos
    const elementosProtegidos = document.querySelectorAll('[data-permiso]');
    elementosProtegidos.forEach(elemento => {
        const accionRequerida = elemento.getAttribute('data-permiso');
        
        // Si el valor en la base de datos es 0 (falso), ocultamos el botón
        if (permisosModulo[accionRequerida] === 0) {
            elemento.classList.add('d-none'); // Clase de Bootstrap para ocultar
        }
    });

    // Guardamos los permisos de esta pantalla en global para que las pantallas
    // que agregan botones DESPUÉS (p.ej. filas de tabla creadas dinámicamente,
    // como Editar/Eliminar por usuario en la lista) también puedan consultarlos,
    // ya que ese contenido no existe todavía cuando corre el querySelectorAll de arriba.
    window.permisosPantallaActual = permisosModulo;

    return usuario;
} // <-- AQUÍ SE CIERRA LA PRIMERA FUNCIÓN

// Oculta un elemento (botón, ícono, etc.) si la pantalla actual no tiene el
// permiso indicado. Pensado para usarse al construir HTML dinámico (filas de
// tabla) después de que aplicarPermisos() ya corrió.
function tienePermiso(accion) {
    if (!window.permisosPantallaActual) return false; // por seguridad, si aún no se sabe, se oculta
    return window.permisosPantallaActual[accion] !== 0;
}


// --- SEGUNDA FUNCIÓN ---
// Muestra/oculta el par de botones "Crear" (Alta) y "Actualizar" (Cambio)
// según el modo del formulario (esEdicion) Y según el permiso real del rol.
// Así los dos botones quedan separados: uno nunca sustituye al otro y cada
// uno respeta su propio permiso, en vez de depender los dos únicamente de "Alta".
function mostrarBotonSegunModo(esEdicion, idBotonCrear = 'btnCrear', idBotonActualizar = 'btnActualizar') {
    const btnCrear = document.getElementById(idBotonCrear);
    const btnActualizar = document.getElementById(idBotonActualizar);

    if (btnCrear) {
        btnCrear.classList.toggle('d-none', esEdicion || !tienePermiso('Alta'));
    }
    if (btnActualizar) {
        btnActualizar.classList.toggle('d-none', !esEdicion || !tienePermiso('Cambio'));
    }
}

// --- MENÚ LATERAL DE 3 NIVELES (Módulo > Menú > Opción) ---
// Se arma en base a los permisos que ya vienen en localStorage.usuario.permisos
// (ver authController.login -> roleOpcionModel.obtenerPermisosPorRole), que
// ahora trae la jerarquía completa. Solo se pintan los nodos donde el rol
// tiene Consultar = 1; un Módulo o Menú sin ninguna Opción visible no aparece.
function construirMenuLateral(idContenedor = 'menuLateral') {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor) return;

    const usuarioStr = localStorage.getItem('usuario');
    if (!usuarioStr) return;

    const usuario = JSON.parse(usuarioStr);
    const permisos = (usuario.permisos || []).filter(p => p.Consultar == 1);

    // Agrupar por Módulo -> Menú
    const modulos = new Map();
    permisos.forEach(p => {
        if (!modulos.has(p.IdModulo)) {
            modulos.set(p.IdModulo, { nombre: p.NombreModulo, menus: new Map() });
        }
        const modulo = modulos.get(p.IdModulo);
        if (!modulo.menus.has(p.IdMenu)) {
            modulo.menus.set(p.IdMenu, { nombre: p.NombreMenu, opciones: [] });
        }
        modulo.menus.get(p.IdMenu).opciones.push(p);
    });

    if (modulos.size === 0) {
        contenedor.innerHTML = '<div class="text-muted small px-2">Sin opciones asignadas a tu rol.</div>';
        return;
    }

    let html = '';
    modulos.forEach((modulo, idModulo) => {
        const idColapsoModulo = `modCollapse${idModulo}`;
        html += `
            <div class="mb-2">
                <div class="menu-title fw-bold mb-1 d-flex justify-content-between align-items-center px-1"
                     style="cursor:pointer" data-bs-toggle="collapse" data-bs-target="#${idColapsoModulo}">
                    <span><i class="bi bi-folder2 me-1"></i>${modulo.nombre}</span>
                    <i class="bi bi-chevron-down small"></i>
                </div>
                <div class="collapse show" id="${idColapsoModulo}">`;

        modulo.menus.forEach((menu, idMenu) => {
            const idColapsoMenu = `menuCollapse${idMenu}`;
            html += `
                    <div class="ms-2 mb-1">
                        <div class="small text-muted fw-semibold px-2 py-1 d-flex justify-content-between align-items-center"
                             style="cursor:pointer" data-bs-toggle="collapse" data-bs-target="#${idColapsoMenu}">
                            <span>${menu.nombre}</span>
                            <i class="bi bi-chevron-down"></i>
                        </div>
                        <div class="collapse show" id="${idColapsoMenu}">
                            <ul class="nav flex-column ms-3">`;

            menu.opciones.forEach(op => {
                html += `
                                <li class="nav-item">
                                    <a class="nav-link py-1" href="/${op.Pagina}" target="contentFrame">
                                        <i class="bi bi-dot"></i>${op.Opcion}
                                    </a>
                                </li>`;
            });

            html += `
                            </ul>
                        </div>
                    </div>`;
        });

        html += `
                </div>
            </div>`;
    });

    contenedor.innerHTML = html;
}

function obtenerCabecerasSeguridad() {
    const usuarioStr = localStorage.getItem('usuario');
    const cabeceras = {
        'Content-Type': 'application/json'
    };
    
    if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        // Enviamos el idRole para tu middleware
        if (usuario.idRole) {
            cabeceras['x-role-id'] = usuario.idRole.toString();
        }
        // Si tienes un token JWT guardado, también lo envía
        if (usuario.token) {
            cabeceras['Authorization'] = `Bearer ${usuario.token}`;
        }
    }
    
    return cabeceras;
} // <-- AQUÍ SE CIERRA LA SEGUNDA FUNCIÓN