let idUsuarioActual = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('formPaso1').addEventListener('submit', pedirPregunta);
    document.getElementById('formPaso2').addEventListener('submit', restablecer);
});

function mostrarMensaje(texto, tipo) {
    const div = document.getElementById('mensaje');
    div.textContent = texto;
    div.className = `alert alert-${tipo} text-center small p-2 mb-3`;
}

async function pedirPregunta(evento) {
    evento.preventDefault();
    const idUsuario = document.getElementById('idUsuario').value.trim();
    if (!idUsuario) return;

    try {
        const response = await fetch(`/auth/pregunta/${encodeURIComponent(idUsuario)}`);
        const data = await response.json();

        if (!response.ok) {
            mostrarMensaje(data.mensaje || 'No se pudo continuar.', 'danger');
            return;
        }

        idUsuarioActual = idUsuario;
        document.getElementById('labelPregunta').textContent = data.Pregunta;
        document.getElementById('formPaso1').classList.add('d-none');
        document.getElementById('formPaso2').classList.remove('d-none');
        document.getElementById('mensaje').classList.add('d-none');
    } catch (error) {
        console.error(error);
        mostrarMensaje('Error de conexión con el servidor.', 'danger');
    }
}

async function restablecer(evento) {
    evento.preventDefault();
    const respuesta = document.getElementById('respuesta').value.trim();
    const nuevaPassword = document.getElementById('nuevaPassword').value;
    const confirmarPassword = document.getElementById('confirmarPassword').value;

    if (nuevaPassword !== confirmarPassword) {
        mostrarMensaje('Las contraseñas no coinciden.', 'danger');
        return;
    }

    try {
        const response = await fetch('/auth/recuperar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                IdUsuario: idUsuarioActual,
                Respuesta: respuesta,
                NuevaPassword: nuevaPassword
            })
        });
        const data = await response.json();

        if (!response.ok) {
            mostrarMensaje(data.mensaje || 'No se pudo restablecer la contraseña.', 'danger');
            return;
        }

        mostrarMensaje('¡Contraseña restablecida! Redirigiendo al login...', 'success');
        setTimeout(() => { window.location.href = '/'; }, 2000);
    } catch (error) {
        console.error(error);
        mostrarMensaje('Error de conexión con el servidor.', 'danger');
    }
}
