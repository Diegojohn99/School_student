document.addEventListener('DOMContentLoaded', async () => {
    const loadStudentData = async () => {
        try {
            const studentId = localStorage.getItem('studentId');
            if (!studentId) throw new Error('No hay sesión activa');
            
            const response = await fetch(`/api/students/${studentId}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Error al cargar datos");
            }
            
            const { data: student } = await response.json();
            
            // Actualizar UI
            document.querySelectorAll('#student-name').forEach(el => {
                el.textContent = student.nombre;
            });
            document.querySelectorAll('#student-id').forEach(el => {
                el.textContent = `Matrícula: ${student.matricula}`;
            });
            
        } catch (error) {
            console.error('Error:', error);
            if (error.message.includes("Failed to fetch")) {
                showError("Error de conexión con el servidor");
            } else {
                window.location.href = 'index.html';
            }
        }
    };

     // Manejo del menú hamburguesa
     const setupMenu = () => {
        const sidebar = document.querySelector('.sidebar');
        const hamburger = document.querySelector('.menu-hamburguesa');
        const closeBtn = document.querySelector('.cerrar-menu');
    
        if (hamburger) {
            hamburger.addEventListener('click', (e) => {
                e.stopPropagation(); // ¡Importante! Evita cierre inmediato
                sidebar.classList.toggle('active');
            });
        }
    
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                sidebar.classList.remove('active');
            });
        }
    
        // Cerrar al hacer clic fuera (actualizado)
        document.addEventListener('click', (e) => {
            if (
                !sidebar.contains(e.target) && 
                !hamburger.contains(e.target) &&
                sidebar.classList.contains('active')
            ) {
                sidebar.classList.remove('active');
            }
        });
    
        // Cerrar en pantallas grandes
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('active');
            }
        });
    };

    // Resaltar enlace activo
    const markActiveLink = () => {
        const currentPage = location.pathname.split('/').pop();
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });
    };

    await loadStudentData();
    setupMenu();
    markActiveLink();
});