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
            body: JSON.stringify({ Username: user, Password: pass })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            if (data.sesion) {
                localStorage.setItem('sesion', data.sesion);
            }

            if (data.requiereCambioPassword) {
                localStorage.setItem('mensajeCambioPassword', data.mensaje || 'Debes cambiar tu contraseña para continuar.');
                window.location.href = '/cambiar_password.html';
            } else {
                window.location.href = '/dashboard.html';
            }
        } else {
            divError.textContent = data.mensaje || data.error || 'Credenciales incorrectas.';
            divError.classList.remove('d-none');
        }

    } catch (error) {
        console.error('Error de conexión:', error);
        divError.textContent = 'Error de conexión con el servidor.';
        divError.classList.remove('d-none');
    }
});