
# Prestify 💰

Prestify es una aplicación web desarrollada en **Angular** diseñada para la gestión y simulación de préstamos y finanzas personales. Este proyecto forma parte de la evaluación para la materia de Ingeniería de Software.

## 🚀 Demo en Vivo
El proyecto se encuentra desplegado y listo para ser evaluado en producción a través de Netlify:
🔗 **[https://prestify20.netlify.app/landing](https://prestify20.netlify.app/landing)**

---

## 📂 Arquitectura y Estructura del Proyecto

La lógica del frontend está organizada bajo una arquitectura limpia basada en componentes reutilizables dentro de `src/app/components/`:

* **`landing`**: Pantalla de bienvenida pública y presentación del producto.
* **`dashboard`**: Panel de control principal contenedor para usuarios autenticados.
* **`catalog`**: Catálogo de servicios o productos financieros disponibles.
* **`checkout`**: Formulario y pasarela para la confirmación de solicitudes de dinero.
* **`history`**: Historial detallado de los movimientos y transacciones del usuario.
* **`ticket-modal`**: Componente modular para la visualización de comprobantes y tickets.
* **`profile`** *(En desarrollo)*: Sección dedicada a la gestión de datos personales del perfil de usuario.

---

## 🛠️ Desarrollo Local

### 1. Servidor de desarrollo
Para levantar el proyecto localmente, primero instalá las dependencias con `npm install` y luego ejecutá:
```bash
ng serve
