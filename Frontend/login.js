document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault(); // Evita que la página se recargue

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const alertaContainer = document.getElementById('alerta-container');

  alertaContainer.innerHTML = '';

  try {
  const response = await fetch('http://127.0.0.1:3000/auth', {      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ Username: username, Password: password })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      
      // Mensaje de éxito temporal antes de redirigir
      alertaContainer.innerHTML = `<div class="alert alert-success">${data.mensaje} Redirigiendo...</div>`;
      
      setTimeout(() => {
        window.location.href = 'dashboard.html'; 
      }, 1000);

    } else {
      alertaContainer.innerHTML = `<div class="alert alert-danger">${data.mensaje || data.error}</div>`;
    }

  } catch (error) {
    console.error('Error de conexión:', error);
    alertaContainer.innerHTML = `<div class="alert alert-warning">Error al conectar con el servidor. Revisa si el backend está encendido.</div>`;
  }
});