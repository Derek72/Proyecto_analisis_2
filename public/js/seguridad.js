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