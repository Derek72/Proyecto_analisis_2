document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const divError = document.getElementById('mensajeError');

    divError.classList.add('d-none');

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // Se envían Username y Password con Mayúscula inicial para tu backend
            body: JSON.stringify({ Username: user, Password: pass })
        });

        const data = await response.json();

        if (response.ok) {
            // Guardamos la información básica del usuario en el navegador
            localStorage.setItem('usuario', JSON.stringify(data.usuario));

            if (data.requiereCambioPassword) {
                // La contraseña caducó (o el administrador la reseteó): debe cambiarla
                // antes de poder usar el sistema.
                localStorage.setItem('mensajeCambioPassword', data.mensaje || 'Debes cambiar tu contraseña para continuar.');
                window.location.href = '/cambiar_password.html';
            } else {
                // Redirección exitosa al Dashboard
                window.location.href = '/dashboard.html';
            }
        } else {
            // Muestra los mensajes personalizados que programaste en tu controlador (intentos, bloqueos, etc.)
            divError.textContent = data.mensaje || data.error || "Credenciales incorrectas.";
            divError.classList.remove('d-none');
        }

    } catch (error) {
        console.error("Error de conexión:", error);
        divError.textContent = "Error de conexión con el servidor.";
        divError.classList.remove('d-none');
    }
});