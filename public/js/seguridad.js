// /js/seguridad.js

// --- PRIMERA FUNCIÓN ---
function aplicarPermisos(nombrePantalla) {
    const usuarioStr = localStorage.getItem('usuario');
    if (!usuarioStr) {
        window.location.href = '/index.html'; // No está logueado
        return null;
    }

    const usuario = JSON.parse(usuarioStr);
    const permisosModulo = usuario.permisos.find(p => p.Opcion === nombrePantalla);

    // Si no tiene permisos para consultar, lo sacamos de la pantalla
    if (!permisosModulo || permisosModulo.Consultar === 0) {
        alert("No tienes permisos para ver esta pantalla.");
        window.location.href = '/dashboard.html';
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

    return usuario;
} // <-- AQUÍ SE CIERRA LA PRIMERA FUNCIÓN


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