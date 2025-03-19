// Ejecutando funciones
document.getElementById("btn__iniciar-sesion").addEventListener("click", iniciarSesion);
document.getElementById("btn__registrarse").addEventListener("click", register);
window.addEventListener("resize", anchoPage);

// Declarando variables (actualizado a const/let)
const formulario_login = document.querySelector(".formulario__login");
const formulario_register = document.querySelector(".formulario__register");
const contenedor_login_register = document.querySelector(".contenedor__login-register");
const caja_trasera_login = document.querySelector(".caja__trasera-login");
const caja_trasera_register = document.querySelector(".caja__trasera-register");

// Función para manejar el responsive
function anchoPage() {
    if (window.innerWidth > 850) {
        caja_trasera_register.style.display = "block";
        caja_trasera_login.style.display = "block";
    } else {
        caja_trasera_register.style.display = "block";
        caja_trasera_register.style.opacity = "1";
        caja_trasera_login.style.display = "none";
        formulario_login.style.display = "block";
        contenedor_login_register.style.left = "0px";
        formulario_register.style.display = "none";   
    }
}

anchoPage();

// Funciones de transición entre formularios
function iniciarSesion() {
    if (window.innerWidth > 850) {
        formulario_login.style.display = "block";
        contenedor_login_register.style.left = "10px";
        formulario_register.style.display = "none";
        caja_trasera_register.style.opacity = "1";
        caja_trasera_login.style.opacity = "0";
    } else {
        formulario_login.style.display = "block";
        contenedor_login_register.style.left = "0px";
        formulario_register.style.display = "none";
        caja_trasera_register.style.display = "block";
        caja_trasera_login.style.display = "none";
    }
}

function register() {
    if (window.innerWidth > 850) {
        formulario_register.style.display = "block";
        contenedor_login_register.style.left = "410px";
        formulario_login.style.display = "none";
        caja_trasera_register.style.opacity = "0";
        caja_trasera_login.style.opacity = "1";
    } else {
        formulario_register.style.display = "block";
        contenedor_login_register.style.left = "0px";
        formulario_login.style.display = "none";
        caja_trasera_register.style.display = "none";
        caja_trasera_login.style.display = "block";
        caja_trasera_login.style.opacity = "1";
    }
}

// Manejo de formularios 
document.querySelector('.formulario__register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const data = {
        nombre: form.nombre.value,
        email: form.email.value,
        matricula: form.matricula.value,
        password: form.password.value
    };

    try {
        const response = await fetch('http://localhost:5500/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Registro exitoso!');
            form.reset();  // Limpiar el formulario
            iniciarSesion();  // Corregido: mostrar formulario de login
        } else {
            alert(result.error || 'Error en el registro');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor');
    }
});

document.querySelector('.formulario__login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    
    const data = {
        email: form.email.value,
        password: form.password.value
    };

    try {
        const response = await fetch('http://localhost:5500/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Almacenar token y datos necesarios
            localStorage.setItem('token', result.token);
            localStorage.setItem('studentId', result.id); // Guardar ID en localStorage
            window.location.href = `dashboard.html?id=${result.id}`; // Redirigir con ID
        } else {
            alert(result.error || 'Credenciales inválidas');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor');
    }
});

function mostrarError(mensaje) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = mensaje;
    errorDiv.classList.add('error-activo');
    setTimeout(() => errorDiv.classList.remove('error-activo'), 5000);
}
