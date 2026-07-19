# Carpeta assets/

Esta carpeta contiene los recursos multimedia del proyecto. Actualmente estas
subcarpetas están vacías y deben poblarse con los archivos reales:

- **models/**: aquí debe colocarse `Heart.glb` (el modelo 3D del corazón que
  referencia `index.html` en la sección "Zona Corazón 3D" del home, a través
  del componente `<model-viewer>`). Sin este archivo, esa zona del dashboard
  se verá vacía, pero el resto de la aplicación (navegación, simulador,
  módulos) funciona con total normalidad — el `<model-viewer>` falla de forma
  aislada si no encuentra el .glb.
- **icons/**: iconografía del proyecto (actualmente el dashboard usa emojis
  como marcador de posición: ⚡ 🩺 📈 📋 💉 ✅). Si se migra a Lucide Icons o
  Material Symbols como sugiere la guía de estilo, los SVG/archivos de esos
  sets irían aquí.
- **images/**: imágenes de apoyo para el contenido pedagógico de cada módulo.
- **videos/**: recursos audiovisuales para el contenido educativo.

Ninguna de estas subcarpetas es requerida para que el proyecto funcione hoy;
son la estructura preparada para el crecimiento planeado en PROJECT.md.
