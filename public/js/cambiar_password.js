let usuarioActual = null;

// Revalida la sesión si el navegador restaura esta página desde su caché de historial
window.addEventListener('pageshow', function () {
    if (!localStorage.getItem('usuario')) {
        window.top.location.replace('/');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const usuarioStr = localStorage.getItem('usuario');
    if (!usuarioStr) { window.top.location.href = '/'; return; }
    usuarioActual = JSON.parse(usuarioStr);

    document.getElementById('formPassword').addEventListener('submit', cambiarPassword);
});

function mostrarMensaje(texto, tipo) {
    const div = document.getElementById('mensaje');
    div.textContent = texto;
    div.className = `alert alert-${tipo} text-center small p-2 mb-3`;
}

async function cambiarPassword(evento) {
    evento.preventDefault();

    const passwordActual = document.getElementById('PasswordActual').value;
    const passwordNueva = document.getElementById('PasswordNueva').value;
    const passwordConfirmar = document.getElementById('PasswordConfirmar').value;

    if (passwordNueva !== passwordConfirmar) {
        mostrarMensaje('La nueva contraseña y su confirmación no coinciden.', 'danger');
        return;
    }

    try {
        const response = await fetch(`/usuario/perfil/${usuarioActual.id}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ PasswordActual: passwordActual, PasswordNueva: passwordNueva })
        });
        const result = await response.json();

        if (response.ok) {
            mostrarMensaje('Contraseña actualizada correctamente.', 'success');
            document.getElementById('formPassword').reset();
        } else {
            mostrarMensaje(result.mensaje || 'No se pudo cambiar la contraseña.', 'danger');
        }
    } catch (error) {
        console.error(error);
        mostrarMensaje('Error de conexión con el servidor.', 'danger');
    }
}
