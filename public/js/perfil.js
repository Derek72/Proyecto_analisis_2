let usuarioActual = null;

window.addEventListener('pageshow', function () {
    if (!localStorage.getItem('usuario')) {
        window.top.location.replace('/');
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const usuarioStr = localStorage.getItem('usuario');
    if (!usuarioStr) { window.top.location.href = '/'; return; }
    usuarioActual = JSON.parse(usuarioStr);

    await cargarComboGeneros();
    await cargarPerfil();

    document.getElementById('formPerfil').addEventListener('submit', guardarPerfil);
});

function mostrarMensaje(texto, tipo) {
    const div = document.getElementById('mensaje');
    div.textContent = texto;
    div.className = `alert alert-${tipo} text-center small p-2 mb-3`;
}

async function cargarComboGeneros() {
    try {
        const response = await fetch('/usuario/generos-lista');
        const generos = await response.json();
        const select = document.getElementById('IdGenero');
        select.innerHTML = '';
        generos.forEach(genero => {
            select.innerHTML += `<option value="${genero.IdGenero}">${genero.Nombre}</option>`;
        });
    } catch (error) { console.error('Error al cargar géneros:', error); }
}

async function cargarPerfil() {
    try {
        const response = await fetch(`/usuario/perfil/${usuarioActual.id}`);
        if (!response.ok) throw new Error('No se pudo cargar el perfil');
        const perfil = await response.json();

        document.getElementById('IdUsuario').value = perfil.IdUsuario;
        document.getElementById('NombreRole').value = perfil.NombreRole;
        document.getElementById('Nombre').value = perfil.Nombre;
        document.getElementById('Apellido').value = perfil.Apellido;
        document.getElementById('CorreoElectronico').value = perfil.CorreoElectronico || '';
        document.getElementById('TelefonoMovil').value = perfil.TelefonoMovil || '';
        document.getElementById('IdGenero').value = perfil.IdGenero || '';

        if (perfil.FechaNacimiento) {
            document.getElementById('FechaNacimiento').value = perfil.FechaNacimiento.split('T')[0];
        }
    } catch (error) {
        console.error(error);
        mostrarMensaje('No se pudo cargar tu perfil.', 'danger');
    }
}

async function guardarPerfil(evento) {
    evento.preventDefault();

    const datos = {
        Nombre: document.getElementById('Nombre').value.trim(),
        Apellido: document.getElementById('Apellido').value.trim(),
        FechaNacimiento: document.getElementById('FechaNacimiento').value,
        CorreoElectronico: document.getElementById('CorreoElectronico').value.trim(),
        TelefonoMovil: document.getElementById('TelefonoMovil').value.trim(),
        IdGenero: document.getElementById('IdGenero').value
    };

    try {
        const response = await fetch(`/usuario/perfil/${usuarioActual.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        const result = await response.json();

        if (response.ok) {
            mostrarMensaje('Perfil actualizado correctamente.', 'success');

            usuarioActual.nombre = `${datos.Nombre} ${datos.Apellido}`;
            localStorage.setItem('usuario', JSON.stringify(usuarioActual));
        } else {
            mostrarMensaje(result.mensaje || 'No se pudo actualizar el perfil.', 'danger');
        }
    } catch (error) {
        console.error(error);
        mostrarMensaje('Error de conexión con el servidor.', 'danger');
    }
}
